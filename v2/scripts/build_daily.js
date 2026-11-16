#!/usr/bin/env node
/*
  Builds the daily "Top 10 deals" email and RSS feed from assets/js/deals.js.

  Run:   node v2/scripts/build_daily.js
  Makes: v2/feed.xml          (RSS feed: one item per day, for RSS-to-email in MailerLite, Brevo, Mailchimp...)
         v2/email/today.html  (the same email as a web page, for a preview or to paste into any email tool)

  SITE_URL can be set to the real domain once it is bought, for example:
         SITE_URL=https://blackdailydeals.com/ node v2/scripts/build_daily.js
  The GitHub workflow .github/workflows/daily-deals-email.yml runs this every morning.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE = (process.env.SITE_URL || 'https://moishyjalas-lang.github.io/black-daily-deals/v2/').replace(/\/?$/, '/');
const TAG = 'blackdailydeals-20';

// load the same data the website uses
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/js/deals.js'), 'utf8'), sandbox);
const CATS = sandbox.window.BDD_CATEGORIES;
const DEALS = sandbox.window.BDD_DEALS;

// same rules as assets/js/app.js
const now = Date.now();
const dayIndex = Math.floor((now - 5 * 3600 * 1000) / 86400000); // New York day
const pct = d => (d.was > d.price ? Math.round((1 - d.price / d.was) * 100) : 0);
const expired = d => d.ends && new Date(d.ends + 'T23:59:59-05:00').getTime() < now;
const score = d => (d.votes || 0) + pct(d);
const money = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = (d, w) => d.imgUrl || 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(d.img) + '?width=' + w;
const buy = d => (d.asin ? 'https://www.amazon.com/dp/' + d.asin + '?tag=' + TAG : d.url);
const page = d => SITE + 'deal.html?id=' + encodeURIComponent(d.id);
const catName = id => (CATS.find(c => c.id === id) || {}).name || '';

const live = DEALS.filter(d => !expired(d));
const picks = live.filter(d => d.featured);
const dotd = (picks.length ? picks : live)[dayIndex % (picks.length || live.length)];
const top10 = live.filter(d => d !== dotd).sort((a, b) => score(b) - score(a)).slice(0, 10);

const nyDate = new Date(now - 5 * 3600 * 1000);
const dateLong = nyDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const dateKey = nyDate.toISOString().slice(0, 10);

/* ---------- email body (table layout so it looks right in Gmail, Outlook, Apple Mail) ---------- */
function row(d, n) {
  return `
  <tr><td style="padding:10px 0;border-top:1px solid #23232b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      <td width="110" valign="top"><a href="${esc(page(d))}"><img src="${esc(img(d, 220))}" width="100" alt="${esc(d.name)}" style="display:block;width:100px;height:auto;border-radius:10px;background:#fff"></a></td>
      <td valign="top" style="padding-left:12px;font-family:Arial,Helvetica,sans-serif">
        <div style="color:#8a8a99;font-size:12px;text-transform:uppercase;letter-spacing:.5px">${n}. ${esc(catName(d.cat))} &middot; ${esc(d.store)}</div>
        <a href="${esc(page(d))}" style="color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;line-height:1.3">${esc(d.name)}</a>
        <div style="margin-top:4px"><span style="color:#ffc928;font-size:20px;font-weight:bold">${money(d.price)}</span>
        ${d.was > d.price ? `<span style="color:#77778a;text-decoration:line-through;margin-left:6px">${money(d.was)}</span> <span style="color:#ff5a5a;font-weight:bold;margin-left:6px">-${pct(d)}%</span>` : ''}</div>
        <a href="${esc(buy(d))}" style="display:inline-block;margin-top:8px;background:#ffc928;color:#111;font-weight:bold;font-size:13px;padding:8px 14px;border-radius:8px;text-decoration:none">Get deal</a>
      </td></tr></table>
  </td></tr>`;
}

const body = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07070a"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#111116;border-radius:16px;font-family:Arial,Helvetica,sans-serif">
  <tr><td style="padding:22px 24px 6px" align="left">
    <a href="${SITE}"><img src="${SITE}assets/img/brand/emblem.png" width="44" height="44" alt="Black Daily Deals" style="vertical-align:middle;border-radius:10px"></a>
    <span style="color:#fff;font-size:20px;font-weight:bold;vertical-align:middle;margin-left:8px">BLACK <span style="color:#ffc928">DAILY</span> DEALS</span>
    <div style="color:#8a8a99;font-size:13px;margin-top:10px">${esc(dateLong)} &middot; Black Friday prices, every single day</div>
  </td></tr>
  <tr><td style="padding:14px 24px">
    <div style="background:#1a1a22;border:1px solid #ffc928;border-radius:14px;padding:16px">
      <div style="color:#ffc928;font-size:12px;font-weight:bold;letter-spacing:1px">CRAZY DEAL OF THE DAY</div>
      <a href="${esc(page(dotd))}"><img src="${esc(img(dotd, 560))}" width="520" alt="${esc(dotd.name)}" style="display:block;width:100%;max-width:520px;height:auto;margin:12px 0;border-radius:10px;background:#fff"></a>
      <div style="color:#fff;font-size:20px;font-weight:bold">${esc(dotd.name)}</div>
      <div style="color:#b9b9c6;font-size:14px;margin:6px 0">${esc(dotd.why || dotd.desc)}</div>
      <span style="color:#ffc928;font-size:26px;font-weight:bold">${money(dotd.price)}</span>
      ${dotd.was > dotd.price ? `<span style="color:#77778a;text-decoration:line-through;margin-left:8px">${money(dotd.was)}</span> <span style="color:#ff5a5a;font-weight:bold;margin-left:6px">Save ${pct(dotd)}%</span>` : ''}
      <div><a href="${esc(buy(dotd))}" style="display:inline-block;margin-top:12px;background:#ffc928;color:#111;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none">Get this deal</a></div>
    </div>
  </td></tr>
  <tr><td style="padding:6px 24px 0;color:#fff;font-size:18px;font-weight:bold">Today's top 10</td></tr>
  <tr><td style="padding:0 24px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${top10.map((d, i) => row(d, i + 1)).join('')}</table></td></tr>
  <tr><td align="center" style="padding:10px 24px 22px">
    <a href="${SITE}deals.html" style="display:inline-block;background:#23232b;color:#fff;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none">See all deals</a>
    <div style="color:#6b6b7a;font-size:11px;margin-top:16px;line-height:1.5">Prices can change at any time. Check the store before you buy.<br>As an Amazon Associate we earn from qualifying purchases.<br><a href="${SITE}account.html" style="color:#8a8a99">Manage your alerts</a></div>
  </td></tr>
</table></td></tr></table>`;

const subject = `${dotd.name} for ${money(dotd.price)} + today's top 10 deals`;

fs.mkdirSync(path.join(ROOT, 'email'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'email/today.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#07070a">${body}</body></html>\n`);

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Black Daily Deals: Top 10 every morning</title>
  <link>${SITE}</link>
  <atom:link href="${SITE}feed.xml" rel="self" type="application/rss+xml"/>
  <description>The Crazy Deal of the Day and the ten best deals, every morning.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>
  <item>
    <title>${esc(subject)}</title>
    <link>${SITE}email/today.html?d=${dateKey}</link>
    <guid isPermaLink="false">bdd-daily-${dateKey}</guid>
    <pubDate>${new Date(now).toUTCString()}</pubDate>
    <description><![CDATA[${body}]]></description>
  </item>
</channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'feed.xml'), rss);
console.log('Built daily email for', dateKey, '| Deal of the Day:', dotd.name, '| top 10:', top10.length);
