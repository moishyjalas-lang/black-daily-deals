#!/usr/bin/env python3
"""Builds every page shell of Black Daily Deals from one template.
Run:  python3 scripts/make_pages.py   (from the v2 folder). Deals live in assets/js/deals.js."""
import os, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#07070a">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/icons/favicon-32.png">
<link rel="apple-touch-icon" href="assets/img/icons/apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="Black Daily Deals: Top 10 every morning" href="feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Daily Deals">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="assets/img/brand/emblem.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>"""

def page(fname, title, desc, body_attrs, main):
    html = head(title, desc) + f"""
<body {body_attrs}>
<div id="site-head"></div>
<main>
{main}
</main>
<div id="site-foot"></div>
<script src="assets/js/deals.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
"""
    open(os.path.join(ROOT, fname), 'w').write(html)

SIGNUP = """<section class="section" id="subscribe"><div class="wrap"><div class="signup">
  <div><span class="eyebrow">Free daily email</span><h2 class="display">Get the top 10 deals<br>every morning</h2>
  <p>One short email at 7 AM with the ten best deals of the day. Nothing else.</p>
  <ul class="perks"><li>The Crazy Deal of the Day before anyone else</li><li>Early access to Black Friday deals</li><li>Price-drop alerts for the things you want</li></ul></div>
  <form class="form" data-subscribe><input class="field" name="name" placeholder="First name" autocomplete="given-name"><input class="field" name="email" type="email" placeholder="Your email" required autocomplete="email"><button class="btn btn-gold btn-lg" type="submit">Send me the daily deals</button><p class="fine">Free. One email a day. Unsubscribe any time.</p></form>
</div></div></section>"""

HOME = """<section class="hero"><div class="wrap hero-grid">
  <div>
    <span class="eyebrow">Black Friday every day</span>
    <h1 class="display">Black Friday prices.<br><em>Every single day.</em></h1>
    <p class="lead">Hand-picked deals from the stores you already shop. A new Crazy Deal of the Day every morning, the top ten every day, and alerts for what you want.</p>
    <div class="hero-cta"><a class="btn btn-gold btn-lg" href="#today">See today's deals</a><button class="btn btn-dark btn-lg" data-signin>Sign in free</button></div>
    <div class="count-title">Black Friday starts in</div><div class="countdown" id="countdown"></div>
  </div>
  <div class="hero-badge"><img src="assets/img/brand/deal-of-the-day.png" alt="Deal of the Day"></div>
</div></section>

<section class="section" id="today"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Crazy Deal of the Day</h2><p>One deal, checked by hand. A new one every midnight.</p></div></div>
  <div class="dotd" id="dotd"></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Shop by category</h2><p>Pick a category, then a section inside it.</p></div><a class="link-more" href="deals.html">All deals</a></div>
  <div class="cat-tiles" id="cat-tiles"></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Today's top deals</h2><p>The deals people like most right now.</p></div><a class="link-more" href="deals.html">See all</a></div>
  <div class="grid" id="top-ten"></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Why people come back every day</h2></div></div>
  <div class="reasons">
    <div class="reason"><div class="n">01</div><b>A new deal every morning</b><p>The Crazy Deal of the Day changes at midnight.</p></div>
    <div class="reason"><div class="n">02</div><b>Alerts that work for you</b><p>Tell us what you want. We email you when it drops.</p></div>
    <div class="reason"><div class="n">03</div><b>Only real deals</b><p>Every deal gets a verdict: Real Deal, Good Deal or Meh.</p></div>
    <div class="reason"><div class="n">04</div><b>Spin the Deal Wheel</b><p>One free spin a day for a surprise deal.</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Best deal in every category</h2><p>The biggest discount in each section today.</p></div></div>
  <div class="grid" id="best-by-cat"></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="wheel-box">
    <div class="wheel-wrap"><div class="pointer"></div><div class="wheel" id="wheel"></div><div class="wheel-hub"><img src="assets/img/brand/cart.png" alt=""></div></div>
    <div><span class="eyebrow">Once a day</span><h2 class="display" style="font-size:clamp(30px,3.6vw,44px);margin:12px 0 8px">Spin the Deal Wheel</h2><p class="muted">One free spin every day. Land on a surprise deal.</p>
    <button class="btn btn-gold btn-lg" id="spin" style="margin-top:18px">Spin now</button><div id="wheel-result" style="margin-top:20px"></div></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head"><div><h2 class="display">Trending now</h2><p>Hot deals going fast.</p></div></div>
  <div class="grid" id="trending"></div>
</div></section>
""" + SIGNUP

def listing(intro=''):
    return """<section class="page-head" id="page-head"></section>
<div class="wrap layout">
  <aside class="filters" id="filters"></aside>
  <div>
    <div class="toolbar"><div><button class="btn btn-dark btn-sm filter-toggle" data-filter-toggle>Filters</button> <span class="muted" id="result-count"></span></div>
    <label class="muted" style="display:flex;gap:8px;align-items:center">Sort by <select id="sort"><option value="popular">Most popular</option><option value="discount">Biggest discount</option><option value="newest">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="ending">Ending soon</option></select></label></div>
    <div class="grid" id="results"></div>
  </div>
</div>
""" + SIGNUP

def prose(title, sub, html):
    return f"""<section class="page-head"><div class="wrap"><div class="crumbs"><a class="back" href="index.html">&larr; Home</a></div><h1 class="display">{title}</h1><p class="sub">{sub}</p></div></section>
<div class="wrap"><div class="prose">{html}</div></div>"""

# categories from deals.js
src = open(os.path.join(ROOT, 'assets/js/deals.js')).read()
cats = re.findall(r"\{ id: '([^']+)', name: '([^']+)', page: '([^']+)'", src)

page('index.html', 'Black Daily Deals | Black Friday prices every day', 'Black Friday prices every single day. A hand-checked Crazy Deal of the Day, the top deals every day, and alerts for what you want.', 'data-page="home"', HOME)
for cid, name, fname in cats:
    page(fname, f'{name} Deals | Black Daily Deals', f'The best {name.lower()} deals today, checked by hand.', f'data-page="category" data-cat="{cid}"', listing())
page('deals.html', 'All Deals | Black Daily Deals', 'Every live deal on Black Daily Deals.', 'data-page="deals"', listing())
page('deal.html', 'Deal | Black Daily Deals', 'Deal details.', 'data-page="deal"', '<div class="wrap"><div id="deal"></div><section class="section"><div class="sec-head"><div><h2 class="display">More like this</h2></div></div><div class="grid" id="more"></div></section></div>')
page('account.html', 'My Account | Black Daily Deals', 'Your saved deals, alerts and settings.', 'data-page="account"', '<section class="page-head"><div class="wrap"><div class="crumbs"><a class="back" href="index.html">&larr; Home</a></div><h1 class="display">My account</h1><p class="sub">Saved deals, alerts and settings.</p></div></section><div class="wrap" style="padding-top:30px;padding-bottom:60px"><div id="acct"></div></div>')

page('guide.html', 'Black Friday Survival Guide | Black Daily Deals', 'How to find real Black Friday deals and skip the fake ones.', 'data-page="guide"', prose('Black Friday Survival Guide', 'How to get the real deals and skip the fake ones.', """
<h2>1. Make a list before the sales start</h2><p>Write down what you actually need and the most you will pay. Set a deal alert for each one in your account and we will email you when it drops.</p>
<h2>2. Check the price history</h2><p>Some stores raise prices in October so the "sale" looks bigger. A real deal is lower than the price over the last few months, not just lower than the "was" price.</p>
<h2>3. Watch for the verdict</h2><p>Every deal here gets a verdict. <b>Real Deal</b> means the lowest or near-lowest price we have seen. <b>Good Deal</b> means a fair discount. <b>Meh</b> means you can probably wait.</p>
<h2>4. Look at the model number</h2><p>Some TVs and laptops are made just for Black Friday with cheaper parts. Compare the full model number before you buy.</p>
<h2>5. Know the return rules</h2><p>Most big stores give extra time to return holiday buys. Keep your receipt email.</p>
<h2>6. Pay smart</h2><p>Use a credit card for buyer protection. Never pay a store by wire transfer or gift card.</p>
<h2>7. Do not panic-buy</h2><p>Big deals come back on Cyber Monday and in the weeks after. That is why we post deals every day, all year.</p>"""))

page('about.html', 'About | Black Daily Deals', 'Who we are and how we make money.', 'data-page="about"', prose('About Black Daily Deals', 'Black Friday prices, every single day.', """
<h2>What we do</h2><p>Black Friday is one day a year. We think good prices should be every day. Each morning we pick one Crazy Deal of the Day, list the top deals, and sort everything by category so you can find what you want fast.</p>
<h2 id="money">How we make money</h2><p>When you buy through a link on our site, the store may pay us a small fee. It costs you nothing extra. As an Amazon Associate we earn from qualifying purchases. Stores cannot pay to change a verdict. If a deal is Meh, we say so.</p>
<h2>We never take your payment</h2><p>You always buy on the store's own website. We never see your card.</p>
<h2>Contact</h2><p>Brands can send us a deal on the <a class="gold" href="submit.html">submit a deal</a> page. Everyone else can reach us at blackdailydeals.alerts@proton.me.</p>"""))

page('privacy.html', 'Privacy | Black Daily Deals', 'Our privacy policy.', 'data-page="privacy"', prose('Privacy policy', 'Last updated November 16, 2026.', """
<p>We keep this simple. We only collect what we need to run the site.</p>
<h2>What we collect</h2><p>If you sign in or sign up for the daily email, we keep your name and email address. If you sign in with Google, Google shares your name, email and profile picture with us. Your saved deals, votes and hidden stores are kept on your own device.</p>
<h2>How we use it</h2><p>To send the daily deals email and the alerts you ask for, and to show your name when you are signed in. We never sell your information.</p>
<h2>Links to stores</h2><p>When you click a deal you go to the store's website, which has its own privacy policy. Stores may use cookies to know you came from us.</p>
<h2>Unsubscribe or delete</h2><p>Every email has an unsubscribe link. To delete your information, email blackdailydeals.alerts@proton.me.</p>"""))

page('terms.html', 'Terms | Black Daily Deals', 'Terms of use.', 'data-page="terms"', prose('Terms of use', 'Last updated November 16, 2026.', """
<p>By using Black Daily Deals you agree to these terms.</p>
<h2>Prices change</h2><p>Deals and prices come from stores and can change or end at any time. Always check the final price on the store's website before you buy.</p>
<h2>We are not the seller</h2><p>Every purchase is between you and the store. Returns, shipping and warranties are handled by the store.</p>
<h2>Affiliate links</h2><p>Some links pay us a small fee when you buy. This never changes your price.</p>
<h2>Be kind</h2><p>Do not misuse the site, the vote buttons or the report form.</p>"""))

page('submit.html', 'Submit a Deal | Black Daily Deals', 'Brands and stores: send us your deal.', 'data-page="submit"', prose('Brands: submit a deal', 'Have a great deal for our readers? Send it here and we will take a look.', """
<form class="form" id="submit-form" style="max-width:560px">
<input class="field" name="brand" placeholder="Brand or store name" required>
<input class="field" name="contact" type="email" placeholder="Your email" required>
<input class="field" name="product" placeholder="Product name" required>
<input class="field" name="link" type="url" placeholder="Link to the product page" required>
<input class="field" name="price" placeholder="Deal price and regular price, e.g. $99 (was $149)">
<input class="field" name="dates" placeholder="When does the deal start and end?">
<textarea class="field" name="notes" placeholder="Anything else we should know?"></textarea>
<button class="btn btn-gold btn-lg" type="submit">Send deal</button>
<p class="fine">We only post deals we think are good for our readers. Paying us never changes a verdict.</p>
</form>"""))

page('credits.html', 'Photo Credits | Black Daily Deals', 'Credits for product photos.', 'data-page="credits"', prose('Photo credits', 'Product photos come from Wikimedia Commons, shared under free licenses. Thank you to every photographer.', '<div id="credits"></div>'))

page('404.html', 'Page not found | Black Daily Deals', 'Page not found.', 'data-page="404"', """<section class="section"><div class="wrap" style="text-align:center;padding-top:60px;padding-bottom:60px">
<img src="assets/img/brand/cart.png" alt="" style="width:140px;margin:0 auto 20px">
<h1 class="display" style="font-size:48px">This deal is gone</h1><p class="muted" style="margin:10px 0 24px">The page you are looking for does not exist.</p>
<a class="btn btn-gold btn-lg" href="index.html">See today's deals</a></div></section>""")
print('pages:', 4 + len(cats) + 8)
