/* Everyday Black Friday — cookie consent.
 * A REAL consent gate (not a fake banner): it remembers the visitor's choice
 * and only releases non-essential tech when they allow it. Essential always
 * runs. Today the site loads nothing non-essential (analytics is cookie-free),
 * so apply() is a ready hook — when we add a pixel/tracker later, it loads
 * ONLY inside the allowed branch, so "Essential Only" genuinely means nothing
 * extra fires. Self-contained: injects its own styles + markup. Matches the
 * brand (gold, Playfair). Edit text/colors here anytime.
 */
(function () {
  var KEY = 'ebf_cookie_consent';
  var VERSION = '1'; // bump only when our cookie use materially changes -> re-ask

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function store(prefs) {
    prefs.version = VERSION;
    prefs.at = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    apply(prefs);
  }
  // Release non-essential tech ONLY when allowed. (Nothing today.)
  function apply(prefs) {
    if (prefs && prefs.analytics) {
      // e.g. load an analytics/pixel script here when we ever add one.
    }
    // Rejected categories are simply never loaded.
  }

  var CSS = [
    '#ebf-cc{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(12,10,8,.6);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);}',
    '#ebf-cc.ebf-cc-show{display:flex;}',
    '#ebf-cc *{box-sizing:border-box;}',
    '.ebf-cc-card{width:100%;max-width:560px;background:#2a2622;border:1px solid rgba(213,160,71,.22);border-radius:24px;padding:36px 34px 30px;text-align:center;box-shadow:0 36px 90px rgba(0,0,0,.6);font-family:"DM Sans",system-ui,-apple-system,sans-serif;}',
    '.ebf-cc-logo{display:flex;align-items:center;justify-content:center;margin-bottom:16px;}',
    '.ebf-cc-logo img{height:42px;width:auto;filter:drop-shadow(0 0 10px rgba(237,170,64,.3));}',
    '.ebf-cc-h{font-family:"Playfair Display",Georgia,serif;font-size:30px;font-weight:700;color:#f4d18b;margin:0 0 14px;}',
    '.ebf-cc-p{font-size:16px;line-height:1.55;color:#e3d9cb;margin:0 0 26px;}',
    '.ebf-cc-p a{color:#e9bf72;text-decoration:underline;font-weight:600;}',
    '.ebf-cc-btns{display:flex;gap:14px;justify-content:center;}',
    '.ebf-cc-btns button{flex:1;max-width:220px;padding:15px 22px;border-radius:40px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid transparent;transition:transform .12s ease,filter .12s ease;}',
    '.ebf-cc-btns button:hover{transform:translateY(-1px);}',
    '.ebf-cc-essential{background:transparent;border-color:rgba(230,220,205,.35);color:#efe6d7;}',
    '.ebf-cc-essential:hover{border-color:rgba(230,220,205,.6);}',
    '.ebf-cc-accept{background:linear-gradient(180deg,#f4d699,#e6b65a);color:#2a2012;}',
    '.ebf-cc-accept:hover{filter:brightness(1.05);}',
    '@media(max-width:480px){.ebf-cc-card{padding:28px 22px;}.ebf-cc-h{font-size:25px;}.ebf-cc-btns{flex-direction:column;}.ebf-cc-btns button{max-width:none;}}'
  ].join('');

  var HTML =
    '<div class="ebf-cc-card">' +
      '<div class="ebf-cc-logo"><img src="assets/logo-ebf.png" alt="Everyday Black Friday"></div>' +
      '<h2 class="ebf-cc-h">We value your privacy.</h2>' +
      '<p class="ebf-cc-p">We use cookies to improve your experience, analyze traffic, and for affiliate partnerships. You can manage choices or read our <a href="privacy.html">Privacy Policy</a>.</p>' +
      '<div class="ebf-cc-btns">' +
        '<button id="ebf-cc-essential" type="button">Essential Only</button>' +
        '<button id="ebf-cc-accept" type="button">Accept All</button>' +
      '</div>' +
    '</div>';

  function byId(id) { return document.getElementById(id); }
  function show() { var n = byId('ebf-cc'); if (n) n.classList.add('ebf-cc-show'); }
  function hide() { var n = byId('ebf-cc'); if (n) n.classList.remove('ebf-cc-show'); }

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'ebf-cc';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Privacy and cookies');
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap);

    byId('ebf-cc-accept').addEventListener('click', function () {
      store({ essential: true, analytics: true, marketing: true });
      hide();
    });
    byId('ebf-cc-essential').addEventListener('click', function () {
      store({ essential: true, analytics: false, marketing: false });
      hide();
    });

    var saved = load();
    if (!saved || saved.version !== VERSION) { show(); } else { apply(saved); }
  }

  // Let a footer "Cookie choices" link reopen it: onclick="EBFCookies.reopen()"
  window.EBFCookies = { reopen: show, get: load };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
