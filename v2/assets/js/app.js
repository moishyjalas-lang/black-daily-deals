/* Black Daily Deals — site engine.
   Deals and categories live in assets/js/deals.js. This file draws every page from them. */
(function () {
  'use strict';

  /* ================= SETTINGS (fill these in, nothing else to change) ================= */
  var CONFIG = {
    // Google sign-in: paste the "Client ID" from Google Cloud here. Empty = email sign-in only.
    GOOGLE_CLIENT_ID: '426235659035-nktej4ugb450g4f67ocbce07c5c8j5lj.apps.googleusercontent.com',
    // Google only allows sign-in from addresses listed on the Google Cloud client. Add the new domain there and here when it is bought.
    GOOGLE_ORIGINS: ['https://moishyjalas-lang.github.io'],
    // Where sign-ups, alerts, reports and deal submissions are sent (FormSubmit / Formspree / MailerLite URL).
    // Empty = they are kept in the visitor's browser and sent the moment this is filled in.
    FORM_ENDPOINT: '',
    AMAZON_TAG: 'blackdailydeals-20',
    BLACK_FRIDAY: '2026-11-27T00:00:00-05:00',
    SITE_NAME: 'Black Daily Deals',
    PREVIEW: true // shows the "preview prices" notice until real deals go in
  };
  window.BDD_CONFIG = CONFIG;

  var CATS = window.BDD_CATEGORIES || [];
  var DEALS = window.BDD_DEALS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute('data-page') || 'home';
  var pageCat = document.body.getAttribute('data-cat') || '';

  /* ================= storage ================= */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('bdd_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('bdd_' + k, JSON.stringify(v)); } catch (e) {} },
    sget: function (k) { try { return sessionStorage.getItem('bdd_' + k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem('bdd_' + k, v); } catch (e) {} }
  };

  /* ================= helpers ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function pct(d) { return d.was > d.price ? Math.round((1 - d.price / d.was) * 100) : 0; }
  function img(d, w) { return d.imgUrl || ('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(d.img) + '?width=' + (w || 600)); }
  function catById(id) { for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i]; return null; }
  function dealById(id) { for (var i = 0; i < DEALS.length; i++) if (DEALS[i].id === id) return DEALS[i]; return null; }
  function subName(c, sid) { if (!c) return ''; for (var i = 0; i < c.subs.length; i++) if (c.subs[i].id === sid) return c.subs[i].name; return ''; }
  function qs(name) { var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function buyUrl(d) {
    if (d.asin) return 'https://www.amazon.com/dp/' + d.asin + '?tag=' + CONFIG.AMAZON_TAG;
    return d.url || '#';
  }
  function etNow() { return new Date(); }
  function dayIndex() { // changes every midnight New York time
    var ms = Date.now() - 5 * 3600 * 1000;
    return Math.floor(ms / 86400000);
  }
  function nextMidnightET() { var d = dayIndex() + 1; return new Date(d * 86400000 + 5 * 3600 * 1000); }
  function endsText(d) {
    if (!d.ends) return '';
    var end = new Date(d.ends + 'T23:59:59-05:00'), diff = end - Date.now();
    if (diff < 0) return 'Expired';
    var days = Math.floor(diff / 86400000);
    if (days === 0) return 'Ends tonight';
    if (days === 1) return 'Ends tomorrow';
    return 'Ends in ' + days + ' days';
  }
  function isExpired(d) { return d.ends && new Date(d.ends + 'T23:59:59-05:00') < Date.now(); }
  function isNew(d) { return d.added && (Date.now() - new Date(d.added + 'T00:00:00-05:00')) < 36 * 3600000; }
  function score(d) { var v = votes()[d.id] || 0; return (d.votes || 0) + v * 5 + pct(d); }
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  // rotate a list by today's date so the page looks fresh every day
  function rotate(list, salt) {
    var n = list.length; if (!n) return list;
    var k = (dayIndex() * 7 + (salt || 0)) % n;
    return list.slice(k).concat(list.slice(0, k));
  }

  /* ================= user data ================= */
  function user() { return store.get('user', null); }
  function saved() { return store.get('saved', []); }
  function votes() { return store.get('votes', {}); }
  function hidden() { return store.get('hiddenStores', []); }
  function visible(list) { var h = hidden(); return list.filter(function (d) { return h.indexOf(d.store) < 0 && !isExpired(d); }); }

  /* ================= sending forms ================= */
  function send(kind, data) {
    var payload = Object.assign({ _subject: 'Black Daily Deals: ' + kind, type: kind, page: location.href, time: new Date().toISOString() }, data);
    var q = store.get('outbox', []);
    if (!CONFIG.FORM_ENDPOINT) { q.push(payload); store.set('outbox', q); return Promise.resolve(true); }
    return fetch(CONFIG.FORM_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; }).catch(function () { q.push(payload); store.set('outbox', q); return false; });
  }
  function flushOutbox() {
    if (!CONFIG.FORM_ENDPOINT) return;
    var q = store.get('outbox', []); if (!q.length) return;
    store.set('outbox', []);
    q.forEach(function (p) { send(p.type, p); });
  }

  /* ================= icons ================= */
  var I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M7 11v9H4v-9h3zm0 0 4-8c1.7 0 2.6 1 2.3 2.6L12.8 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M17 13V4h3v9h-3zm0 0-4 8c-1.7 0-2.6-1-2.3-2.6l.5-3.4H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ================= header / footer / modals ================= */
  function header() {
    var nav = CATS.map(function (c) {
      return '<li><a href="' + c.page + '"' + (pageCat === c.id ? ' class="active"' : '') + '>' + esc(c.name) + '</a></li>';
    }).join('');
    var notice = CONFIG.PREVIEW ? '<div class="notice">Preview: these are sample deals and prices while the site gets ready for Black Friday, November 27.</div>' : '';
    return notice +
      '<header class="site-head"><div class="wrap">' +
      '<div class="head-row">' +
      '<a class="brand" href="index.html" aria-label="Black Daily Deals home"><img src="assets/img/brand/emblem.png" alt="Black Daily Deals"><span class="brand-name">Black <span>Daily</span> Deals</span></a>' +
      '<form class="search" action="deals.html" role="search"><input name="q" type="search" placeholder="Search deals: TV, AirPods, drill..." value="' + esc(qs('q')) + '" aria-label="Search deals"><button aria-label="Search">' + I.search + '</button></form>' +
      '<div class="head-actions">' +
      '<a class="icon-btn" href="account.html#alerts" aria-label="Deal alerts" title="Deal alerts">' + I.bell + '</a>' +
      '<a class="icon-btn" href="account.html#saved" aria-label="Saved deals" title="Saved deals">' + I.heart + '<span class="count" id="saved-count"></span></a>' +
      '<div class="account" id="account"></div>' +
      '</div></div>' +
      '<form class="search mobile" action="deals.html" role="search"><input name="q" type="search" placeholder="Search deals" value="' + esc(qs('q')) + '" aria-label="Search deals"><button aria-label="Search">' + I.search + '</button></form>' +
      '</div>' +
      '<nav class="cat-nav" aria-label="Categories"><div class="wrap"><ul><li><a href="index.html"' + (page === 'home' ? ' class="active"' : '') + '>Home</a></li><li><a href="deals.html"' + (page === 'deals' ? ' class="active"' : '') + '>All Deals</a></li>' + nav + '</ul></div></nav>' +
      '</header>';
  }

  function footer() {
    var cats = CATS.map(function (c) { return '<a href="' + c.page + '">' + esc(c.name) + '</a>'; }).join('');
    return '<footer class="site-foot"><div class="wrap">' +
      '<div class="foot-grid">' +
      '<div><a class="brand" href="index.html"><img src="assets/img/brand/emblem.png" alt=""><span class="brand-name">Black <span>Daily</span> Deals</span></a>' +
      '<p class="muted" style="margin-top:14px;font-size:14px;max-width:320px">Black Friday prices, every single day. One hand-checked deal every morning, the top ten every day, and alerts for what you want.</p></div>' +
      '<div><h5>Shop</h5>' + cats + '</div>' +
      '<div><h5>Your account</h5><a href="account.html">Sign in / Account</a><a href="account.html#saved">Saved deals</a><a href="account.html#alerts">Deal alerts</a><a href="index.html#subscribe">Daily deals email</a><a href="guide.html">Black Friday Survival Guide</a></div>' +
      '<div><h5>Company</h5><a href="about.html">About us</a><a href="about.html#money">How we make money</a><a href="submit.html">Brands: submit a deal</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="credits.html">Photo credits</a></div>' +
      '</div>' +
      '<div class="foot-bottom"><span>&copy; ' + new Date().getFullYear() + ' Black Daily Deals. As an Amazon Associate we earn from qualifying purchases. Prices can change at any time; always check the store before you buy.</span></div>' +
      '</div></footer>' +
      modals();
  }

  function modals() {
    return '<div class="modal" id="signin-modal" role="dialog" aria-modal="true" aria-labelledby="signin-title"><div class="modal-card">' +
      '<button class="modal-x" data-close aria-label="Close">' + I.x + '</button>' +
      '<h3 id="signin-title">Join Black Daily Deals</h3><p class="muted" style="font-size:14px">Sign in once and stay signed in. Save deals, get alerts, and get the daily deals email.</p>' +
      '<div style="margin-top:18px" id="gbtn"></div>' +
      '<div class="or" id="gor">or use your email</div>' +
      '<form class="form" id="email-signin"><input class="field" name="name" placeholder="Your first name" required autocomplete="given-name"><input class="field" name="email" type="email" placeholder="Your email" required autocomplete="email">' +
      '<label class="check fine" style="color:#bbb"><input type="checkbox" name="daily" checked> Send me the daily deals email</label>' +
      '<button class="btn btn-gold btn-lg" type="submit">Continue</button><p class="fine">Free. No spam. Unsubscribe any time.</p></form>' +
      '</div></div>' +
      '<div class="modal" id="report-modal" role="dialog" aria-modal="true"><div class="modal-card">' +
      '<button class="modal-x" data-close aria-label="Close">' + I.x + '</button>' +
      '<h3>Report a bad deal</h3><p class="muted" style="font-size:14px">Price changed, sold out, or not a real deal? Tell us and we will check it.</p>' +
      '<form class="form" id="report-form" style="margin-top:14px"><input type="hidden" name="deal"><select class="field" name="reason"><option>Price went up</option><option>Sold out</option><option>Link is broken</option><option>Not a real deal</option><option>Something else</option></select><textarea class="field" name="note" placeholder="Anything else? (optional)"></textarea><button class="btn btn-gold" type="submit">Send report</button></form>' +
      '</div></div>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  }

  function renderAccount() {
    var el = $('#account'); if (!el) return;
    var u = user();
    if (!u) { el.innerHTML = '<button class="btn btn-gold btn-signin" data-signin>Sign in</button>'; return; }
    var pic = u.picture ? '<img class="avatar" src="' + esc(u.picture) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar">' + esc((u.name || u.email || '?').charAt(0).toUpperCase()) + '</span>';
    el.innerHTML = '<button class="avatar-btn" id="avatar-btn" aria-haspopup="true" aria-expanded="false">' + pic + '<span class="avatar-name">' + esc((u.name || '').split(' ')[0] || 'Account') + '</span></button>' +
      '<div class="menu" id="acct-menu"><div class="who"><b>' + esc(u.name || 'Deal hunter') + '</b><small>' + esc(u.email || '') + '</small></div>' +
      '<a href="account.html#saved">Saved deals</a><a href="account.html#alerts">Deal alerts</a><a href="account.html#stores">Hidden stores</a><a href="account.html">My account</a><button data-signout>Sign out</button></div>';
  }

  function updateCounts() { var c = $('#saved-count'); if (c) c.textContent = saved().length || ''; }

  /* ================= sign in ================= */
  function openModal(id) { var m = $('#' + id); if (m) { m.classList.add('open'); var f = $('input,select', m); if (f && id !== 'signin-modal') f.focus(); } }
  function closeModals() { $$('.modal.open').forEach(function (m) { m.classList.remove('open'); }); }

  function signIn(u, method) {
    u.method = method; u.since = u.since || new Date().toISOString();
    store.set('user', u);
    renderAccount(); closeModals();
    toast('Welcome, ' + ((u.name || '').split(' ')[0] || 'friend') + '! You are signed in.');
    send('New member', { name: u.name, email: u.email, method: method, daily_email: u.daily !== false ? 'yes' : 'no' });
    document.dispatchEvent(new Event('bdd:user'));
  }
  function signOut() {
    store.set('user', null);
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
    renderAccount(); toast('Signed out.'); document.dispatchEvent(new Event('bdd:user'));
  }
  function parseJwt(t) {
    try { var b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return null; }
  }
  function setupGoogle() {
    var holder = $('#gbtn'), or = $('#gor');
    if (!CONFIG.GOOGLE_CLIENT_ID || (CONFIG.GOOGLE_ORIGINS || []).indexOf(location.origin) < 0) { if (holder) holder.style.display = 'none'; if (or) or.style.display = 'none'; return; }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        auto_select: true,
        callback: function (r) {
          var p = parseJwt(r.credential); if (!p) return;
          signIn({ name: p.name, email: p.email, picture: p.picture, verified: p.email_verified }, 'google');
        }
      });
      if (holder) google.accounts.id.renderButton(holder, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 300 });
      if (!user()) google.accounts.id.prompt();
    };
    document.head.appendChild(s);
  }

  /* ================= deal card ================= */
  function card(d) {
    var off = pct(d), s = saved().indexOf(d.id) >= 0, v = votes()[d.id] || 0, e = endsText(d);
    var tags = (d.hot ? '<span class="tag hot">Hot</span>' : '') + (isNew(d) ? '<span class="tag new">New</span>' : '') + (off ? '<span class="tag pct">-' + off + '%</span>' : '');
    var dots = (d.colors || []).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('');
    var vlabel = { real: 'Real Deal', good: 'Good Deal', meh: 'Meh' }[d.verdict] || '';
    return '<article class="card" data-id="' + esc(d.id) + '">' +
      '<a class="photo" href="deal.html?id=' + encodeURIComponent(d.id) + '"><img loading="lazy" src="' + img(d, 500) + '" alt="' + esc(d.name) + '"><div class="tags">' + tags + '</div></a>' +
      '<button class="save' + (s ? ' on' : '') + '" data-save="' + esc(d.id) + '" aria-label="Save deal">' + I.heart + '</button>' +
      '<div class="body">' +
      '<div class="meta"><span class="store">' + esc(d.store) + '</span>' + (e ? '<span>' + e + '</span>' : '') + '</div>' +
      '<h3><a href="deal.html?id=' + encodeURIComponent(d.id) + '">' + esc(d.name) + '</a></h3>' +
      '<p class="desc">' + esc(d.desc) + '</p>' +
      '<div class="price-row"><span class="price">' + money(d.price) + '</span>' + (d.was > d.price ? '<span class="was">' + money(d.was) + '</span>' : '') + '</div>' +
      (vlabel ? '<span class="verdict ' + d.verdict + '">' + vlabel + '</span>' : '') +
      '<div class="foot"><a class="btn btn-gold btn-sm" href="' + esc(buyUrl(d)) + '" target="_blank" rel="sponsored noopener">' + I.cart.replace('<svg', '<svg width="16" height="16"') + ' Get deal</a>' +
      '<button class="mini' + (v > 0 ? ' voted' : '') + '" data-vote="1" data-id="' + esc(d.id) + '" aria-label="Good deal">' + I.up + '</button>' +
      '<button class="mini' + (v < 0 ? ' voted' : '') + '" data-vote="-1" data-id="' + esc(d.id) + '" aria-label="Bad deal">' + I.down + '</button>' +
      '<button class="mini" data-share="' + esc(d.id) + '" aria-label="Share">' + I.share + '</button></div>' +
      '</div></article>';
  }
  function grid(list, emptyMsg) {
    if (!list.length) return '<div class="empty"><b>No deals here right now</b>' + (emptyMsg || 'New deals land every morning. Turn on an alert and we will tell you first.') + '</div>';
    return list.map(card).join('');
  }

  /* ================= actions ================= */
  function toggleSave(id) {
    var s = saved(), i = s.indexOf(id);
    if (i >= 0) { s.splice(i, 1); toast('Removed from saved deals'); }
    else { s.push(id); toast(user() ? 'Saved! Find it under Saved deals.' : 'Saved on this device. Sign in to keep it everywhere.'); }
    store.set('saved', s); updateCounts();
    $$('[data-save="' + id + '"]').forEach(function (b) { b.classList.toggle('on', i < 0); });
    if (page === 'account') renderAccountPage();
  }
  function vote(id, val) {
    var v = votes(); v[id] = v[id] === val ? 0 : val; store.set('votes', v);
    $$('[data-vote][data-id="' + id + '"]').forEach(function (b) { b.classList.toggle('voted', Number(b.getAttribute('data-vote')) === v[id]); });
    toast(v[id] ? 'Thanks for voting!' : 'Vote removed');
  }
  function share(id) {
    var d = dealById(id); if (!d) return;
    var url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'deal.html?id=' + encodeURIComponent(id);
    var text = d.name + ' for ' + money(d.price) + ' on Black Daily Deals';
    if (navigator.share) { navigator.share({ title: d.name, text: text, url: url }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(text + ' ' + url); toast('Link copied. Paste it anywhere to share.'); } catch (e) { prompt('Copy this link:', url); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-save],[data-vote],[data-share],[data-signin],[data-signout],[data-close],[data-report],#avatar-btn,.modal,[data-filter-toggle]') : null;
    var menu = $('#acct-menu');
    if (menu && (!t || t.id !== 'avatar-btn') && !e.target.closest('#acct-menu')) menu.classList.remove('open');
    if (!t) return;
    if (t.hasAttribute('data-save')) { e.preventDefault(); toggleSave(t.getAttribute('data-save')); }
    else if (t.hasAttribute('data-vote')) { vote(t.getAttribute('data-id'), Number(t.getAttribute('data-vote'))); }
    else if (t.hasAttribute('data-share')) { share(t.getAttribute('data-share')); }
    else if (t.hasAttribute('data-signin')) { openModal('signin-modal'); }
    else if (t.hasAttribute('data-signout')) { signOut(); }
    else if (t.hasAttribute('data-close')) { closeModals(); }
    else if (t.hasAttribute('data-report')) { var f = $('#report-form'); f.deal.value = t.getAttribute('data-report'); openModal('report-modal'); }
    else if (t.hasAttribute('data-filter-toggle')) { var fl = $('.filters'); if (fl) fl.classList.toggle('open'); }
    else if (t.id === 'avatar-btn') { menu.classList.toggle('open'); t.setAttribute('aria-expanded', menu.classList.contains('open')); }
    else if (t.classList.contains('modal') && e.target === t) { closeModals(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModals(); var m = $('#acct-menu'); if (m) m.classList.remove('open'); } });

  function bindForms() {
    var f = $('#email-signin');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      signIn({ name: f.name.value.trim(), email: f.email.value.trim(), daily: f.daily.checked }, 'email');
      f.reset();
    });
    var r = $('#report-form');
    if (r) r.addEventListener('submit', function (e) {
      e.preventDefault(); var u = user();
      send('Bad deal report', { deal: r.deal.value, reason: r.reason.value, note: r.note.value, from: u ? u.email : '' });
      closeModals(); r.reset(); toast('Thanks! We will check that deal.');
    });
    $$('form[data-subscribe]').forEach(function (sf) {
      sf.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = sf.email.value.trim(), name = sf.name ? sf.name.value.trim() : '';
        send('Daily email sign-up', { email: email, name: name });
        var u = user(); if (!u) store.set('user', { name: name, email: email, method: 'subscribe', daily: true, since: new Date().toISOString() });
        renderAccount();
        sf.innerHTML = CONFIG.FORM_ENDPOINT
          ? '<p class="ok">You are in! Check your inbox and tap the link to confirm your email.</p>'
          : '<p class="ok">You are on the list! The daily email starts soon. We will send you a short email to confirm it is really you.</p>';
      });
    });
  }

  /* ================= countdown ================= */
  function countdown(el) {
    if (!el) return;
    var bf = new Date(CONFIG.BLACK_FRIDAY), title = $('.count-title', el.parentNode);
    function tick() {
      var target = bf, label = 'Black Friday starts in';
      if (Date.now() >= bf) { target = nextMidnightET(); label = "Today's deals end in"; }
      if (title) title.textContent = label;
      var s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      var parts = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      var names = ['Days', 'Hours', 'Min', 'Sec'];
      el.innerHTML = parts.map(function (p, i) { return '<div class="unit"><div class="num">' + String(p).padStart(2, '0') + '</div><div class="lbl">' + names[i] + '</div></div>'; }).join('');
    }
    tick(); setInterval(tick, 1000);
  }
  function dealTimer(el) {
    if (!el) return;
    function tick() {
      var s = Math.max(0, Math.floor((nextMidnightET() - Date.now()) / 1000));
      el.textContent = 'New deal in ' + Math.floor(s / 3600) + 'h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + 'm ' + String(s % 60).padStart(2, '0') + 's';
    }
    tick(); setInterval(tick, 1000);
  }

  /* ================= pages ================= */
  function dealOfTheDay() {
    var picks = DEALS.filter(function (d) { return d.featured && !isExpired(d); });
    if (!picks.length) picks = visible(DEALS);
    return picks[dayIndex() % picks.length];
  }

  function renderHome() {
    var d = dealOfTheDay();
    var dotd = $('#dotd');
    if (dotd && d) {
      dotd.innerHTML = '<div class="photo"><img class="ribbon" src="assets/img/brand/deal-of-the-day.png" alt="Deal of the Day"><img src="' + img(d, 800) + '" alt="' + esc(d.name) + '"></div>' +
        '<div class="info"><span class="eyebrow">Crazy Deal of the Day</span><div class="store">' + esc(d.store) + ' &middot; ' + esc(subName(catById(d.cat), d.sub) || '') + '</div><h3>' + esc(d.name) + '</h3><p class="muted">' + esc(d.why || d.desc) + '</p>' +
        '<div class="price-row"><span class="price">' + money(d.price) + '</span>' + (d.was > d.price ? '<span class="was">' + money(d.was) + '</span><span class="off">Save ' + pct(d) + '%</span>' : '') + '</div>' +
        '<div class="ends" id="dotd-timer"></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-gold btn-lg" href="' + esc(buyUrl(d)) + '" target="_blank" rel="sponsored noopener">Get this deal</a><button class="btn btn-dark btn-lg" data-save="' + esc(d.id) + '">Save it</button></div></div>';
      dealTimer($('#dotd-timer'));
    }
    var jump = $('#hero-tags');
    if (jump) jump.innerHTML = CATS.map(function (c) { return '<a class="chip" href="' + c.page + '">' + esc(c.name) + '</a>'; }).join('');
    var tiles = $('#cat-tiles');
    if (tiles) tiles.innerHTML = CATS.map(function (c) {
      var n = DEALS.filter(function (x) { return x.cat === c.id; }).length;
      var cover = dealById(c.cover) || DEALS.filter(function (x) { return x.cat === c.id; })[0];
      return '<a class="cat-tile" href="' + c.page + '"><div class="pic">' + (cover ? '<img loading="lazy" src="' + img(cover, 300) + '" alt="">' : '<img src="assets/img/brand/cart.png" alt="">') + '</div><b>' + esc(c.name) + '</b><small>' + n + ' deals &middot; ' + c.subs.length + ' sections</small></a>';
    }).join('');
    var top = $('#top-ten');
    if (top) {
      var best = visible(DEALS).sort(function (a, b) { return score(b) - score(a); }).slice(0, 16);
      top.innerHTML = grid(rotate(best, 3).slice(0, 8));
    }
    var hot = $('#trending');
    if (hot) hot.innerHTML = grid(rotate(visible(DEALS).filter(function (x) { return x.hot; }), 1).slice(0, 4));
    var best2 = $('#best-by-cat');
    if (best2) best2.innerHTML = grid(CATS.map(function (c) {
      return visible(DEALS).filter(function (x) { return x.cat === c.id; }).sort(function (a, b) { return pct(b) - pct(a); })[0];
    }).filter(Boolean).slice(0, 8));
    wheel();
  }

  function wheel() {
    var w = $('#wheel'), btn = $('#spin'), out = $('#wheel-result'); if (!w || !btn) return;
    var today = dayIndex(), last = store.get('spin', null);
    function show(id) {
      var d = dealById(id); if (!d) return;
      out.innerHTML = '<p class="muted" style="margin-bottom:12px">Your spin landed on:</p>' + '<div style="max-width:300px">' + card(d) + '</div>';
    }
    if (last && last.day === today) { btn.textContent = 'Come back tomorrow for a new spin'; btn.disabled = true; btn.style.opacity = .6; show(last.id); return; }
    btn.addEventListener('click', function () {
      var pool = visible(DEALS), d = pool[Math.floor(Math.random() * pool.length)];
      w.style.transform = 'rotate(' + (1440 + Math.floor(Math.random() * 360)) + 'deg)';
      btn.disabled = true;
      setTimeout(function () { store.set('spin', { day: today, id: d.id }); show(d.id); btn.textContent = 'Come back tomorrow for a new spin'; btn.style.opacity = .6; }, 4300);
    });
  }

  /* filters used by category + all-deals pages */
  function renderListing() {
    var cat = catById(pageCat), q = qs('q').toLowerCase(), sub = qs('sub');
    var head = $('#page-head');
    if (head) {
      var title = cat ? cat.name : (q ? 'Results for "' + qs('q') + '"' : 'All Deals');
      var subtitle = cat ? cat.blurb : (q ? 'Every deal that matches your search.' : 'Every live deal on the site, in one place.');
      var chips = cat ? '<div class="subcats"><a class="chip' + (!sub ? ' on' : '') + '" href="' + cat.page + '">All ' + esc(cat.name) + '</a>' + cat.subs.map(function (s) {
        var n = visible(DEALS).filter(function (x) { return x.cat === cat.id && x.sub === s.id; }).length;
        return '<a class="chip' + (sub === s.id ? ' on' : '') + '" href="' + cat.page + '?sub=' + s.id + '">' + esc(s.name) + ' <span class="n">' + n + '</span></a>';
      }).join('') + '</div>' : '';
      var top = cat ? visible(DEALS).filter(function (x) { return x.cat === cat.id && (!sub || x.sub === sub); }).sort(function (a, b) { return pct(b) - pct(a); })[0] : null;
      var bestStrip = top ? '<a class="best-strip" href="deal.html?id=' + encodeURIComponent(top.id) + '"><span class="bs-pic"><img src="' + img(top, 240) + '" alt=""></span><span class="bs-info"><span class="bs-eye">Best deal in ' + esc(sub ? subName(cat, sub) : cat.name) + '</span><b>' + esc(top.name) + '</b><span class="bs-row"><span class="price">' + money(top.price) + '</span>' + (top.was > top.price ? '<span class="was">' + money(top.was) + '</span><span class="off">-' + pct(top) + '%</span>' : '') + '</span></span><span class="btn btn-gold bs-cta">See deal</span></a>' : '';
      var crumb = '<div class="crumbs"><a class="back" href="javascript:history.length>1?history.back():location.href=\'index.html\'">' + I.back + ' Back</a><a href="index.html">Home</a><span>/</span>' +
        (cat ? (sub ? '<a href="' + cat.page + '">' + esc(cat.name) + '</a><span>/</span><span>' + esc(subName(cat, sub)) + '</span>' : '<span>' + esc(cat.name) + '</span>') : '<span>' + (q ? 'Search' : 'All Deals') + '</span>') + '</div>';
      head.innerHTML = '<div class="wrap">' + crumb + '<h1 class="display">' + esc(sub ? subName(cat, sub) : title) + '</h1><p class="sub">' + esc(subtitle) + '</p>' + chips + bestStrip + '</div>';
      if (cat) document.title = (sub ? subName(cat, sub) + ' - ' : '') + cat.name + ' Deals | Black Daily Deals';
    }
    var base = DEALS.filter(function (d) {
      if (cat && d.cat !== cat.id) return false;
      if (sub && d.sub !== sub) return false;
      if (q) { var hay = (d.name + ' ' + d.brand + ' ' + d.store + ' ' + d.desc + ' ' + d.cat + ' ' + d.sub + ' ' + (catById(d.cat) || {}).name).toLowerCase(); return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; }); }
      return true;
    });
    var stores = base.map(function (d) { return d.store; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).sort();
    var fl = $('#filters');
    if (fl) {
      fl.innerHTML = '<h4>Store</h4>' + stores.map(function (s) { return '<label class="check"><input type="checkbox" name="store" value="' + esc(s) + '" checked> ' + esc(s) + '</label>'; }).join('') +
        '<h4>Price</h4><div class="range"><input type="number" name="min" placeholder="Min $" min="0"><input type="number" name="max" placeholder="Max $" min="0"></div>' +
        '<h4>Discount</h4>' + [0, 20, 30, 40].map(function (p, i) { return '<label class="check"><input type="radio" name="disc" value="' + p + '"' + (i ? '' : ' checked') + '> ' + (p ? p + '% off or more' : 'Any discount') + '</label>'; }).join('') +
        '<h4>Verdict</h4><label class="check"><input type="checkbox" name="realonly"> Real Deals only</label>';
    }
    function apply() {
      var picked = $$('input[name=store]:checked', fl).map(function (i) { return i.value; });
      var min = Number(($('input[name=min]', fl) || {}).value) || 0, max = Number(($('input[name=max]', fl) || {}).value) || Infinity;
      var disc = Number((($('input[name=disc]:checked', fl)) || {}).value) || 0, real = ($('input[name=realonly]', fl) || {}).checked;
      var list = visible(base).filter(function (d) { return picked.indexOf(d.store) >= 0 && d.price >= min && d.price <= max && pct(d) >= disc && (!real || d.verdict === 'real'); });
      var sort = ($('#sort') || {}).value || 'popular';
      list.sort(function (a, b) {
        if (sort === 'discount') return pct(b) - pct(a);
        if (sort === 'newest') return (b.added || '').localeCompare(a.added || '');
        if (sort === 'low') return a.price - b.price;
        if (sort === 'high') return b.price - a.price;
        if (sort === 'ending') return (a.ends || '9999').localeCompare(b.ends || '9999');
        return score(b) - score(a);
      });
      $('#results').innerHTML = grid(list, q ? 'Try a shorter word, or turn on an alert for "' + esc(qs('q')) + '" and we will email you when it drops.' : '');
      var c = $('#result-count'); if (c) c.textContent = list.length + (list.length === 1 ? ' deal' : ' deals');
    }
    if (fl) fl.addEventListener('input', apply);
    var so = $('#sort'); if (so) so.addEventListener('change', apply);
    apply();
  }

  function renderDeal() {
    var d = dealById(qs('id')), box = $('#deal');
    if (!box) return;
    if (!d) { box.innerHTML = '<div class="empty" style="margin:40px 0"><b>That deal is gone</b>It may have sold out. <a class="gold" href="deals.html">See today\'s deals</a></div>'; return; }
    var c = catById(d.cat), off = pct(d), e = endsText(d);
    document.title = d.name + ' - ' + money(d.price) + ' | Black Daily Deals';
    var vtext = { real: 'Real Deal', good: 'Good Deal', meh: 'Meh' }[d.verdict] || '';
    box.innerHTML = '<div class="crumbs" style="padding-top:24px"><a class="back" href="javascript:history.length>1?history.back():location.href=\'' + (c ? c.page : 'index.html') + '\'">' + I.back + ' Back</a><a href="index.html">Home</a><span>/</span>' + (c ? '<a href="' + c.page + '">' + esc(c.name) + '</a><span>/</span><a href="' + c.page + '?sub=' + d.sub + '">' + esc(subName(c, d.sub)) + '</a>' : '') + '</div>' +
      '<div class="detail"><div class="photo"><div class="tags">' + (d.hot ? '<span class="tag hot">Hot</span>' : '') + (off ? '<span class="tag pct">-' + off + '%</span>' : '') + '</div><img src="' + img(d, 900) + '" alt="' + esc(d.name) + '"></div>' +
      '<div><div class="store">' + esc(d.store) + ' &middot; ' + esc(d.brand || '') + '</div><h1>' + esc(d.name) + '</h1>' +
      (vtext ? '<span class="verdict ' + d.verdict + '">' + vtext + '</span>' : '') +
      '<div class="price-row" style="margin-top:16px"><span class="price">' + money(d.price) + '</span>' + (d.was > d.price ? '<span class="was">' + money(d.was) + '</span><span class="off">Save ' + money(d.was - d.price) + '</span>' : '') + '</div>' +
      (e ? '<p class="ends" style="margin-top:10px">' + e + '</p>' : '') +
      '<div class="actions"><a class="btn btn-gold btn-lg" href="' + esc(buyUrl(d)) + '" target="_blank" rel="sponsored noopener">Get this deal at ' + esc(d.store) + '</a><button class="btn btn-dark btn-lg" data-save="' + esc(d.id) + '">' + I.heart.replace('<svg', '<svg width="18" height="18"') + ' Save</button><button class="btn btn-dark btn-lg" data-share="' + esc(d.id) + '">Share</button></div>' +
      '<div class="box"><h4>Why we picked it</h4><p class="muted">' + esc(d.why || d.desc) + '</p></div>' +
      '<div class="box"><h4>Good to know</h4><p class="muted">' + esc(d.desc) + ' You buy on ' + esc(d.store) + '\'s own website; we never take payment. Prices can change, so check the final price at checkout.</p></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-dark btn-sm" data-vote="1" data-id="' + esc(d.id) + '">' + I.up.replace('<svg', '<svg width="16" height="16"') + ' Good deal</button><button class="btn btn-dark btn-sm" data-vote="-1" data-id="' + esc(d.id) + '">' + I.down.replace('<svg', '<svg width="16" height="16"') + ' Not great</button><button class="btn btn-dark btn-sm" data-report="' + esc(d.id) + '">Report a problem</button></div>' +
      '</div></div>';
    var more = $('#more');
    if (more) more.innerHTML = grid(visible(DEALS).filter(function (x) { return x.cat === d.cat && x.id !== d.id; }).slice(0, 4));
  }

  function renderAccountPage() {
    var box = $('#acct'); if (!box) return;
    var u = user();
    var hello = u ? '<div class="box" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' + (u.picture ? '<img class="avatar" style="width:56px;height:56px" src="' + esc(u.picture) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar" style="width:56px;height:56px;font-size:22px">' + esc((u.name || u.email || '?').charAt(0).toUpperCase()) + '</span>') +
      '<div style="flex:1"><b style="font-size:18px">' + esc(u.name || 'Deal hunter') + '</b><div class="muted">' + esc(u.email || '') + ' &middot; signed in' + (u.method === 'google' ? ' with Google' : '') + '</div></div><button class="btn btn-dark btn-sm" data-signout>Sign out</button></div>'
      : '<div class="box" style="text-align:center;padding:34px"><h2 class="display" style="font-size:34px">Sign in once. Stay signed in.</h2><p class="muted" style="margin:8px 0 18px">Save deals, set alerts, and get the daily deals email.</p><button class="btn btn-gold btn-lg" data-signin>Sign in or join free</button></div>';
    var s = saved().map(dealById).filter(Boolean);
    var al = store.get('alerts', []);
    var allStores = DEALS.map(function (d) { return d.store; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort();
    var hid = hidden();
    box.innerHTML = hello +
      '<section id="saved" style="margin-top:34px"><div class="sec-head"><div><h2 class="display">Saved deals</h2><p>Tap the heart on any deal to keep it here.</p></div></div><div class="grid">' + grid(s, 'Tap the heart on any deal and it shows up here.') + '</div></section>' +
      '<section id="alerts" style="margin-top:40px"><div class="sec-head"><div><h2 class="display">Deal alerts</h2><p>Tell us what you want. We email you when it drops.</p></div></div>' +
      '<div class="box"><form class="form alert-form" id="alert-form"><input class="field" name="kw" placeholder="What are you looking for? e.g. OLED TV, AirPods, DeWalt" required><select class="field" name="cat"><option value="">Any category</option>' + CATS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select><button class="btn btn-gold btn-lg">Add alert</button></form>' +
      '<div id="alert-list" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' + (al.length ? al.map(function (a, i) { return '<span class="chip">' + esc(a.kw) + (a.cat ? ' in ' + esc((catById(a.cat) || {}).name) : '') + ' <button data-del-alert="' + i + '" aria-label="Remove alert" style="margin-left:6px;color:var(--muted)">&times;</button></span>'; }).join('') : '<span class="muted">No alerts yet.</span>') + '</div></div></section>' +
      '<section id="stores" style="margin-top:40px"><div class="sec-head"><div><h2 class="display">Hide stores</h2><p>Don\'t want to see a store? Untick it and its deals disappear everywhere.</p></div></div><div class="box" id="store-box" style="display:flex;gap:18px;flex-wrap:wrap">' +
      allStores.map(function (st) { return '<label class="check"><input type="checkbox" value="' + esc(st) + '"' + (hid.indexOf(st) < 0 ? ' checked' : '') + '> ' + esc(st) + '</label>'; }).join('') + '</div></section>';
    var af = $('#alert-form');
    af.addEventListener('submit', function (e) {
      e.preventDefault(); if (!user()) { openModal('signin-modal'); toast('Sign in first so we know where to email you.'); return; }
      var list = store.get('alerts', []); list.push({ kw: af.kw.value.trim(), cat: af.cat.value }); store.set('alerts', list);
      send('Deal alert', { email: user().email, keyword: af.kw.value.trim(), category: af.cat.value });
      toast('Alert saved. We will email you when it drops.'); renderAccountPage();
    });
    $$('[data-del-alert]').forEach(function (b) { b.addEventListener('click', function () { var list = store.get('alerts', []); list.splice(Number(b.getAttribute('data-del-alert')), 1); store.set('alerts', list); renderAccountPage(); }); });
    $$('#store-box input').forEach(function (c) { c.addEventListener('change', function () { var h = $$('#store-box input').filter(function (x) { return !x.checked; }).map(function (x) { return x.value; }); store.set('hiddenStores', h); toast('Saved.'); }); });
    if (location.hash) { var t = $(location.hash); if (t) setTimeout(function () { t.scrollIntoView({ behavior: 'smooth' }); }, 50); }
  }

  function renderSubmit() {
    var f = $('#submit-form'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}; $$('input,textarea,select', f).forEach(function (i) { if (i.name) data[i.name] = i.value; });
      send('Brand deal submission', data);
      f.innerHTML = '<p class="ok">Thanks! We will look at your deal and reply by email.</p>';
    });
  }

  function credit(file) { var c = (window.BDD_CREDITS || {})[file]; return c ? 'Photo: ' + c[0] + ', ' + c[1] : 'Photo from Wikimedia Commons'; }

  function renderCredits() {
    var box = $('#credits'); if (!box) return;
    box.innerHTML = '<ul>' + DEALS.filter(function (d) { return d.img; }).map(function (d) {
      var c = (window.BDD_CREDITS || {})[d.img] || ['see file page', 'see file page'];
      return '<li><b>' + esc(d.name) + '</b>: photo by ' + esc(c[0]) + ', ' + esc(c[1]) + ', via <a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(d.img) + '" target="_blank" rel="noopener">Wikimedia Commons</a>.</li>';
    }).join('') + '</ul>';
  }

  /* ================= welcome screen (once per visit) ================= */
  function welcome() {
    if (page !== 'home' || store.sget('welcomed')) return;
    store.sset('welcomed', '1');
    var w = document.createElement('div'); w.className = 'welcome open'; w.setAttribute('role', 'dialog');
    var sparks = ''; for (var i = 0; i < 26; i++) sparks += '<span class="spark" style="left:' + (Math.random() * 100) + '%;bottom:-10px;animation-duration:' + (4 + Math.random() * 5) + 's;animation-delay:' + (Math.random() * 4) + 's"></span>';
    var u = user();
    w.innerHTML = sparks + '<img class="emblem" src="assets/img/brand/emblem.png" alt="">' +
      '<h1 class="display">Black <span>Daily</span> Deals</h1><p>Black Friday prices. Every single day.</p>' +
      '<div class="row"><button class="btn btn-gold btn-lg" id="w-go">Show me the deals</button>' + (u ? '' : '<button class="btn btn-dark btn-lg" id="w-join">Sign in free</button>') + '</div>';
    document.body.appendChild(w);
    function close() { w.style.transition = 'opacity .4s'; w.style.opacity = 0; setTimeout(function () { w.remove(); }, 400); }
    $('#w-go', w).addEventListener('click', close);
    var j = $('#w-join', w); if (j) j.addEventListener('click', function () { close(); openModal('signin-modal'); });
  }

  /* ================= boot ================= */
  var h = $('#site-head'); if (h) h.outerHTML = header();
  var f = $('#site-foot'); if (f) f.outerHTML = footer();
  renderAccount(); updateCounts(); bindForms(); setupGoogle(); flushOutbox();
  countdown($('#countdown'));
  if (page === 'home') renderHome();
  if (page === 'category' || page === 'deals') renderListing();
  if (page === 'deal') renderDeal();
  if (page === 'account') { renderAccountPage(); document.addEventListener('bdd:user', renderAccountPage); }
  if (page === 'submit') renderSubmit();
  if (page === 'credits') renderCredits();
  welcome();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
