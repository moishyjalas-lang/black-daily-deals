/* ============================================================
   Everyday Black Friday — Shared App Logic
   All pages load this file. It handles:
   - Google OAuth sign-in / sign-out
   - User state & UI updates
   - Pro membership check
   - Alert creation with free/pro gating
   - Wishlist toggle
   - Toast notifications
   - Site-wide announcement banner (from data/announcements.json)
   ============================================================ */

window.EBF = window.EBF || {};
Object.assign(window.EBF, {
  STRIPE_LINK: 'https://buy.stripe.com/7sY6oJ9dY4tBdqRckZfbq01',
  FREE_ALERT_LIMIT: 1,
  PRO_ALERT_LIMIT: 999,
  AFFILIATE_TAG: 'everydaybl079-20',

  /* ---- Storage helpers ---- */
  getUser() { try { return JSON.parse(localStorage.getItem('bdd_user') || 'null'); } catch { return null; } },
  setUser(u) { localStorage.setItem('bdd_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('bdd_user'); localStorage.removeItem('skipped_signin'); },
  isPro() {
    const u = this.getUser();
    return u && u.pro === true;
  },
  getAlerts() { try { return JSON.parse(localStorage.getItem('bdd_alerts') || '[]'); } catch { return []; } },
  setAlerts(a) { localStorage.setItem('bdd_alerts', JSON.stringify(a)); },
  getWishlist() { try { return JSON.parse(localStorage.getItem('bdd_wishlist') || '[]'); } catch { return []; } },
  setWishlist(w) { localStorage.setItem('bdd_wishlist', JSON.stringify(w)); },

  /* ---- Alert limit check ---- */
  canCreateAlert() {
    if (this.isPro()) return true;
    return this.getAlerts().length < this.FREE_ALERT_LIMIT;
  },

  /* ---- Toast ---- */
  showToast(msg, type = 'info') {
    let tc = document.getElementById('ebf-toast-container');
    if (!tc) {
      tc = document.createElement('div');
      tc.id = 'ebf-toast-container';
      tc.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(tc);
    }
    const t = document.createElement('div');
    const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ff3b3b' : '#FFD700';
    const color = type === 'info' ? '#000' : '#fff';
    t.style.cssText = `background:${bg};color:${color};padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:320px;animation:ebfSlideIn .25s ease;`;
    t.textContent = msg;
    tc.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3500);
  },

  /* ---- Wishlist toggle ---- */
  toggleWishlist(btn, dealId) {
    const list = this.getWishlist();
    const idx = list.indexOf(dealId);
    if (idx === -1) {
      list.push(dealId);
      btn.classList.add('active');
      btn.setAttribute('aria-label', 'Remove from wishlist');
      this.showToast('Added to wishlist!', 'success');
    } else {
      list.splice(idx, 1);
      btn.classList.remove('active');
      btn.setAttribute('aria-label', 'Add to wishlist');
      this.showToast('Removed from wishlist');
    }
    this.setWishlist(list);
  },

  /* ---- Stars renderer ---- */
  renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let s = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) s += '<span class="star full">★</span>';
      else if (i === full && half) s += '<span class="star half">★</span>';
      else s += '<span class="star empty">☆</span>';
    }
    return s;
  },

  /* ---- Format price ---- */
  fmt(n) { return '$' + n.toFixed(2); },

  /* ---- Deal card HTML ---- */
  /* Product photos deliberately do NOT carry referrerpolicy="no-referrer".
     Several of these stores block image requests that arrive with no
     referrer - standard anti-hotlinking - so every pet product on the site
     showed a card with no picture. Proved it in a real browser: the same
     file fails with no-referrer and loads instantly with a normal one.
     Sending the referrer is right here anyway: these are affiliate
     partners and they want to see the traffic coming from us.

     A product photo that will not load used to be deleted on the spot,
     which left a white card with a price and no picture - worse than no
     card at all. Hide the whole card instead. */
  imageFailed(img) {
    const card = img.closest('.deal-card');
    if (card) card.style.display = 'none'; else img.remove();
  },

  dealCard(d) {
    const inWish = this.getWishlist().includes(d.id);
    /* deal level from the store's shown was/now prices (js/catalog.js) */
    const lv = (window.EBF_CATALOG && window.EBF_CATALOG.level(d)) || { key: d.discount ? 'big' : 'regular' };
    const hasWas = d.original_price && d.original_price > d.price;
    const badge = lv.key === 'regular' || !d.discount ? ''
      : lv.key === 'bf' ? `<span class="badge-off badge-door"><b>Doorbuster</b>${d.discount}% OFF</span>`
      : `<span class="badge-off">${d.discount}% OFF</span>`;
    const tag = lv.key === 'big' ? '<span class="lvl-tag">Hot Deal</span>' : lv.key === 'light' ? '<span class="lvl-tag soft">Price Drop</span>' : '';
    return `<div class="deal-card lvl-${lv.key}" data-id="${d.id}">
  <a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer sponsored" class="card-img-wrap">
    ${d.image ? `<img src="${d.image}" alt="${d.title}" loading="lazy" onerror="EBF.imageFailed(this)">` : ''}
    ${badge}
    <button class="wish-btn${inWish ? ' active' : ''}" onclick="EBF.toggleWishlist(this,'${d.id}')" aria-label="${inWish ? 'Remove from' : 'Add to'} wishlist">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${inWish ? '#ff3b3b' : 'none'}" stroke="${inWish ? '#ff3b3b' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    </button>
  </a>
  <div class="card-body">
    <h3 class="card-title"><a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer sponsored">${d.title}</a></h3>
    ${d.rating ? `<div class="card-rating">${this.renderStars(d.rating)} <span class="rating-num">${d.rating}</span>${d.reviews ? ` <span class="rating-count">(${d.reviews.toLocaleString()})</span>` : ''}</div>` : ''}
    <div class="card-store">${d.store}${tag}</div>
    <div class="card-price">
      <span class="price-now">${d.price_from ? '<small>From </small>' : ''}${this.fmt(d.price)}</span>
      ${hasWas ? `<span class="price-was">${this.fmt(d.original_price)}</span>` : ''}
      ${lv.key === 'bf' && hasWas ? `<span class="price-save">Save ${this.fmt(d.original_price - d.price)}</span>` : ''}
    </div>
    <a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer sponsored" class="btn-view">${lv.key === 'regular' ? 'View Product' : 'View Deal'} →</a>
  </div>
</div>`;
  },

  /* ---- Supabase auth helpers ---- */
  _sbUrl() { return (window.EBF_SUPABASE || {}).url || ''; },
  _sbKey() { return (window.EBF_SUPABASE || {}).publishableKey || ''; },
  getSession() { try { return JSON.parse(localStorage.getItem('ebf_sb_session') || 'null'); } catch { return null; } },
  setSession(s) { if (s) localStorage.setItem('ebf_sb_session', JSON.stringify(s)); else localStorage.removeItem('ebf_sb_session'); },

  /* ---- Sign in with Google (via Supabase Auth) ---- */
  signIn() {
    const url = this._sbUrl();
    if (!url) { this.showToast('Sign-in isn\'t configured yet', 'error'); return; }
    const redirectTo = window.location.origin + window.location.pathname;
    window.location.href = url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(redirectTo);
  },

  /* After Supabase redirects back, capture the tokens from the URL hash */
  async handleAuthRedirect() {
    const hash = window.location.hash || '';
    if (hash.indexOf('access_token') === -1) return false;
    const p = new URLSearchParams(hash.replace(/^#/, ''));
    const access_token = p.get('access_token');
    if (!access_token) return false;
    this.setSession({ access_token, refresh_token: p.get('refresh_token') || '', at: Date.now() });
    history.replaceState(null, '', window.location.pathname + window.location.search);
    const user = await this.loadSbUser();
    if (user) this.showToast('Welcome, ' + (user.name || 'there').split(' ')[0] + '!', 'success');
    const m = document.getElementById('signInModal'); if (m) m.style.display = 'none';
    return true;
  },

  /* Load the signed-in user (+ their profile row) and cache it */
  async loadSbUser() {
    const url = this._sbUrl(), key = this._sbKey(), sess = this.getSession();
    if (!url || !key || !sess || !sess.access_token) return null;
    try {
      let r = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + sess.access_token } });
      if (r.status === 401 && sess.refresh_token) {
        if (await this.refreshSb()) return this.loadSbUser();
        this.setSession(null); this.clearUser(); this.updateAuthUI(null); return null;
      }
      if (!r.ok) return null;
      const au = await r.json();
      const meta = au.user_metadata || {};
      let pro = false, is_admin = false;
      // profileState tells the caller WHY is_admin is false: 'ok' means we read
      // the row and it really says false; anything else means we never managed
      // to check, which is a different problem and deserves a different message.
      let profileState = 'unchecked';
      try {
        const pr = await fetch(url + '/rest/v1/profiles?select=is_pro,is_admin&id=eq.' + au.id, { headers: { apikey: key, Authorization: 'Bearer ' + sess.access_token } });
        if (pr.ok) {
          const rows = await pr.json();
          if (rows && rows[0]) { pro = !!rows[0].is_pro; is_admin = !!rows[0].is_admin; profileState = 'ok'; }
          else { profileState = 'no-row'; }
        } else { profileState = 'http-' + pr.status; }
      } catch (e) { profileState = 'error'; }
      const user = { id: au.id, email: au.email, name: meta.full_name || meta.name || au.email, avatar: meta.avatar_url || meta.picture || '', pro, is_admin, profileState };
      this.setUser(user);
      this.updateAuthUI(user);
      return user;
    } catch (e) { return null; }
  },

  async refreshSb() {
    const url = this._sbUrl(), key = this._sbKey(), sess = this.getSession();
    if (!url || !key || !sess || !sess.refresh_token) return false;
    try {
      const r = await fetch(url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sess.refresh_token }) });
      if (!r.ok) { this.setSession(null); return false; }
      const d = await r.json();
      this.setSession({ access_token: d.access_token, refresh_token: d.refresh_token || sess.refresh_token, at: Date.now() });
      return true;
    } catch (e) { this.setSession(null); return false; }
  },

  async signOut() {
    const url = this._sbUrl(), key = this._sbKey(), sess = this.getSession();
    try { if (url && key && sess && sess.access_token) await fetch(url + '/auth/v1/logout', { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + sess.access_token } }); } catch (e) { /* ignore */ }
    this.setSession(null);
    this.clearUser();
    this.updateAuthUI(null);
    this.showToast('Signed out');
    if (window.location.pathname.includes('profile')) window.location.href = 'index.html';
  },

  updateAuthUI(user) {
    // update all sign-in buttons / nav areas
    document.querySelectorAll('[data-auth-btn]').forEach(btn => {
      if (user) {
        btn.innerHTML = user.avatar
          ? `<img src="${user.avatar}" class="nav-avatar" alt="${user.name}"><span class="nav-uname">${user.name.split(' ')[0]}</span>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="nav-uname">${user.name.split(' ')[0]}</span>`;
        btn.onclick = () => window.location.href = 'profile.html';
        btn.classList.add('signed-in');
      } else {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Sign In';
        btn.onclick = () => EBF.openSignInModal();
        btn.classList.remove('signed-in');
      }
    });
    // update pro badges
    document.querySelectorAll('[data-pro-badge]').forEach(el => {
      el.style.display = (user && user.pro) ? 'inline-flex' : 'none';
    });
  },

  /* ---- Email + password auth (Supabase) ---- */
  _authMode: 'signin',
  async signInEmail(email, password) {
    const url = this._sbUrl(), key = this._sbKey();
    const r = await fetch(url + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) {
      return { ok: false, error: d.error_description || d.msg || d.message || 'Could not sign in' };
    }
    this.setSession({ access_token: d.access_token, refresh_token: d.refresh_token || '', at: Date.now() });
    const user = await this.loadSbUser();
    return { ok: true, user: user };
  },
  async signUpEmail(email, password) {
    const url = this._sbUrl(), key = this._sbKey();
    const r = await fetch(url + '/auth/v1/signup', {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, options: { email_redirect_to: window.location.origin + '/' } })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, error: d.error_description || d.msg || d.message || 'Could not create account' };
    }
    if (d.access_token) {
      this.setSession({ access_token: d.access_token, refresh_token: d.refresh_token || '', at: Date.now() });
      const user = await this.loadSbUser();
      return { ok: true, confirmed: true, user: user };
    }
    return { ok: true, confirmed: false };
  },
  setAuthMode(mode) {
    this._authMode = mode;
    const b = document.getElementById('ebfEmailBtn');
    const tog = document.getElementById('ebfToggle');
    const err = document.getElementById('ebfAuthErr');
    if (err) { err.style.color = '#ff6b6b'; err.textContent = ''; }
    if (mode === 'signup') {
      if (b) b.textContent = 'Create account';
      if (tog) tog.innerHTML = 'Already have an account? <b style="color:#FFD700;">Sign in</b>';
    } else {
      if (b) b.textContent = 'Sign in';
      if (tog) tog.innerHTML = 'New here? <b style="color:#FFD700;">Create an account</b>';
    }
  },
  async submitEmailAuth() {
    const email = ((document.getElementById('ebfEmail') || {}).value || '').trim();
    const pass = (document.getElementById('ebfPass') || {}).value || '';
    const err = document.getElementById('ebfAuthErr');
    const btn = document.getElementById('ebfEmailBtn');
    if (err) { err.style.color = '#ff6b6b'; err.textContent = ''; }
    if (!email || email.indexOf('@') === -1) { if (err) err.textContent = 'Enter a valid email'; return; }
    if (!pass || pass.length < 6) { if (err) err.textContent = 'Password must be at least 6 characters'; return; }
    if (btn) { btn.disabled = true; btn.dataset.txt = btn.textContent; btn.textContent = 'Please wait…'; btn.style.opacity = '.6'; }
    try {
      const res = this._authMode === 'signup' ? await this.signUpEmail(email, pass) : await this.signInEmail(email, pass);
      if (!res.ok) { if (err) err.textContent = res.error; return; }
      if (this._authMode === 'signup' && res.confirmed === false) {
        if (err) { err.style.color = '#7CFC9A'; err.textContent = 'Check your email to confirm your account, then sign in.'; }
        this.setAuthMode('signin');
        return;
      }
      const m = document.getElementById('signInModal'); if (m) m.style.display = 'none';
      this.showToast('Welcome' + (res.user && res.user.name ? ', ' + res.user.name.split(' ')[0] : '') + '!', 'success');
    } catch (e) {
      if (err) err.textContent = 'Something went wrong. Please try again.';
    } finally {
      if (btn) { btn.disabled = false; if (btn.dataset.txt) btn.textContent = btn.dataset.txt; btn.style.opacity = '1'; }
    }
  },

  /* Inject the email form into a page's own inline sign-in modal (so every page gets it) */
  _injectEmailForm(modal) {
    if (!modal || modal.querySelector('#ebfEmail')) return;
    const box = modal.querySelector('.modal-box') || modal.firstElementChild;
    if (!box) return;
    const skip = box.querySelector('.modal-skip');
    const inStyle = 'width:100%;box-sizing:border-box;background:#111;border:1px solid #333;border-radius:10px;padding:12px 14px;color:#fff;font-size:15px;margin-bottom:10px;outline:none;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:4px;';
    wrap.innerHTML =
      '<input id="ebfEmail" type="email" placeholder="Email" autocomplete="email" style="' + inStyle + '">' +
      '<input id="ebfPass" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')EBF.submitEmailAuth()" style="' + inStyle + '">' +
      '<div id="ebfAuthErr" style="color:#ff6b6b;font-size:13px;min-height:16px;margin-bottom:8px;text-align:left;"></div>' +
      '<button id="ebfEmailBtn" onclick="EBF.submitEmailAuth()" style="background:#FFD700;color:#000;border:none;padding:13px 20px;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;width:100%;">Sign in</button>' +
      '<p id="ebfToggle" onclick="EBF.setAuthMode(EBF._authMode===\'signup\'?\'signin\':\'signup\')" style="color:#aaa;font-size:13px;margin:16px 0 4px;cursor:pointer;">New here? <b style="color:#FFD700;">Create an account</b></p>';
    if (skip) box.insertBefore(wrap, skip); else box.appendChild(wrap);
  },

  openSignInModal() {
    const m = document.getElementById('signInModal');
    if (m) { this._injectEmailForm(m); m.style.display = 'flex'; this.setAuthMode('signin'); return; }
    // create modal on the fly if page doesn't have one
    const html = `<div id="signInModal" style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#181818;border:1px solid #333;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;position:relative;">
        <button onclick="document.getElementById('signInModal').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">✕</button>
        <h2 style="color:#fff;margin:0 0 8px;">Sign in to Everyday Black Friday</h2>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Save deals, set alerts, and more</p>
        <button onclick="EBF.signIn()" style="background:#FFD700;color:#000;border:none;padding:14px 32px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <div style="display:flex;align-items:center;gap:12px;margin:18px 0;color:#555;font-size:12px;"><span style="flex:1;height:1px;background:#333;"></span>or<span style="flex:1;height:1px;background:#333;"></span></div>
        <input id="ebfEmail" type="email" placeholder="Email" autocomplete="email" style="width:100%;box-sizing:border-box;background:#111;border:1px solid #333;border-radius:10px;padding:12px 14px;color:#fff;font-size:15px;margin-bottom:10px;outline:none;">
        <input id="ebfPass" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter')EBF.submitEmailAuth()" style="width:100%;box-sizing:border-box;background:#111;border:1px solid #333;border-radius:10px;padding:12px 14px;color:#fff;font-size:15px;margin-bottom:10px;outline:none;">
        <div id="ebfAuthErr" style="color:#ff6b6b;font-size:13px;min-height:16px;margin-bottom:8px;text-align:left;"></div>
        <button id="ebfEmailBtn" onclick="EBF.submitEmailAuth()" style="background:#FFD700;color:#000;border:none;padding:13px 20px;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;width:100%;">Sign in</button>
        <p id="ebfToggle" onclick="EBF.setAuthMode(EBF._authMode==='signup'?'signin':'signup')" style="color:#aaa;font-size:13px;margin:16px 0 0;cursor:pointer;">New here? <b style="color:#FFD700;">Create an account</b></p>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    this.setAuthMode('signin');
  },

  /* ---- Alert creation with gating ---- */
  createAlert(opts) {
    const user = this.getUser();
    if (!user) {
      this.openSignInModal();
      this.showToast('Sign in to create alerts', 'info');
      return false;
    }
    if (!this.canCreateAlert()) {
      // show upgrade prompt
      const confirmed = confirm(
        'You\'ve used your 1 free alert.\n\nUpgrade to Pro for $8/month to get unlimited alerts.\n\nClick OK to upgrade now.'
      );
      if (confirmed) window.location.href = 'membership.html';
      return false;
    }
    const alerts = this.getAlerts();
    const newAlert = {
      id: 'a' + Date.now(),
      category: opts.category || '',
      keyword: opts.keyword || '',
      max_price: opts.max_price || null,
      min_discount: opts.min_discount || 0,
      email: user.email,
      created: new Date().toISOString()
    };
    alerts.push(newAlert);
    this.setAlerts(alerts);
    this.showToast('Alert created! We\'ll email you when deals match.', 'success');
    return newAlert;
  },

  /* ---- Announcement banner ---- */
  async loadAnnouncement() {
    try {
      const r = await fetch('data/announcements.json?t=' + Date.now());
      const ann = await r.json();
      if (!ann.active) return;
      // check dismissed
      const dismissed = JSON.parse(localStorage.getItem('ebf_dismissed_ann') || '[]');
      if (dismissed.includes(ann.id)) return;
      // check expiry
      if (ann.expires && new Date(ann.expires) < new Date()) return;
      this.showAnnouncementBanner(ann);
    } catch (e) { /* silent fail */ }
  },

  showAnnouncementBanner(ann) {
    const colors = { info: '#1a3a5c', success: '#14532d', warning: '#78350f', promo: '#3b1f00' };
    const bg = colors[ann.type] || colors.info;
    const border = ann.type === 'promo' ? '#FFD700' : '#444';
    const html = `<div id="ebf-ann-banner" style="background:${bg};border-bottom:1px solid ${border};padding:12px 20px;text-align:center;position:relative;z-index:9000;">
      <span style="color:#fff;font-size:14px;font-weight:600;">${ann.title ? `<strong>${ann.title}:</strong> ` : ''}${ann.message}</span>
      ${ann.cta_text && ann.cta_url ? `<a href="${ann.cta_url}" style="color:#FFD700;font-weight:700;margin-left:12px;text-decoration:none;">${ann.cta_text} →</a>` : ''}
      ${ann.dismissible ? `<button onclick="EBF.dismissAnnouncement('${ann.id}')" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:#888;font-size:18px;cursor:pointer;line-height:1;">✕</button>` : ''}
    </div>`;
    const nav = document.querySelector('nav, header');
    if (nav) nav.insertAdjacentHTML('beforebegin', html);
    else document.body.insertAdjacentHTML('afterbegin', html);
  },

  dismissAnnouncement(id) {
    const dismissed = JSON.parse(localStorage.getItem('ebf_dismissed_ann') || '[]');
    if (!dismissed.includes(id)) dismissed.push(id);
    localStorage.setItem('ebf_dismissed_ann', JSON.stringify(dismissed));
    const b = document.getElementById('ebf-ann-banner');
    if (b) b.remove();
  },

  /* ---- Init (called on every page) ---- */
  init() {
    // show any cached user immediately for snappy UI
    this.updateAuthUI(this.getUser());
    // handle a fresh Google redirect, otherwise refresh the stored session
    this.handleAuthRedirect().then(handled => { if (!handled && this.getSession()) this.loadSbUser(); });
    // load announcement
    this.loadAnnouncement();
    // inject toast animation CSS
    if (!document.getElementById('ebf-anim-css')) {
      const s = document.createElement('style');
      s.id = 'ebf-anim-css';
      s.textContent = '@keyframes ebfSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}} .nav-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #FFD700;}';
      document.head.appendChild(s);
    }
  }
});
const EBF = window.EBF;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => EBF.init());
} else {
  EBF.init();
}

/* auto-update footer copyright year */
document.addEventListener('DOMContentLoaded',function(){try{document.querySelectorAll('.js-year').forEach(function(e){e.textContent=new Date().getFullYear();});}catch(_){}} );

/* ══════════════════════════════════════════════════════════════
   MOBILE NAVIGATION — builds the phone menu on every page.
   Runs from the shared script so no page markup changes: it reads
   each page's own nav links (keeping that page's "active" state)
   and puts them in a drawer behind a menu button. Styles live in
   css/stage.css under MOBILE NAVIGATION; above 900px nothing here
   is visible and the desktop bar is untouched.
   ══════════════════════════════════════════════════════════════ */
(function () {
  function buildMobileNav() {
    var nav = document.querySelector('nav');
    if (!nav || nav.querySelector('.nav-burger')) return;

    var sources = nav.querySelectorAll('.nav-links a, .btn-alerts');
    if (!sources.length) return;

    var drawer = document.createElement('div');
    drawer.className = 'nav-drawer';
    drawer.id = 'navDrawer';
    Array.prototype.forEach.call(sources, function (a) {
      var copy = a.cloneNode(true);
      copy.removeAttribute('id');
      copy.className = a.classList.contains('active') ? 'active' : '';
      drawer.appendChild(copy);
    });

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'navDrawer');
    burger.innerHTML = '<span><span class="bar"></span><span class="bar"></span><span class="bar"></span></span>';

    function setOpen(open) {
      drawer.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!drawer.contains(e.target) && !burger.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setOpen(false);
    });

    nav.appendChild(burger);
    document.body.appendChild(drawer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildMobileNav);
  } else {
    buildMobileNav();
  }
})();

/* ══════════════════════════════════════════════════════════════
   INSTALL TO DESKTOP — "Keep EBF one click away"
   Adds the manifest link, registers the service worker, and shows
   the install card when the browser offers it. Nothing is shown to
   people who already installed, who dismissed it, or whose browser
   does not support installing. Runs from the shared script so no
   page markup changes.
   ══════════════════════════════════════════════════════════════ */
(function () {
  var DISMISSED = 'ebf_install_dismissed';
  var deferred = null;

  function head(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    document.head.appendChild(el);
    return el;
  }

  if (!document.querySelector('link[rel="manifest"]')) {
    head('link', { rel: 'manifest', href: '/manifest.webmanifest' });
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    head('meta', { name: 'theme-color', content: '#0f0c08' });
  }
  head('link', { rel: 'apple-touch-icon', href: '/assets/icon-192.png' });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* install prompt simply won't appear */ });
    });
  }

  function alreadyInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function card() {
    var el = document.createElement('div');
    el.className = 'ebf-install';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Add EBF Daily Deals to your desktop');
    el.innerHTML =
      '<h4>Keep EBF one click away</h4>' +
      '<p>The best prices go in hours. Don’t go looking for them — we’ll be right there on your desktop.</p>' +
      '<div class="ebf-install-row">' +
        '<button type="button" class="ebf-install-go">Add to desktop</button>' +
        '<button type="button" class="ebf-install-no">Not now</button>' +
      '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });

    el.querySelector('.ebf-install-no').addEventListener('click', function () {
      try { localStorage.setItem(DISMISSED, '1'); } catch (e) {}
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    });
    el.querySelector('.ebf-install-go').addEventListener('click', function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        try { localStorage.setItem(DISMISSED, '1'); } catch (e) {}
        deferred = null;
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    var dismissed = false;
    try { dismissed = localStorage.getItem(DISMISSED) === '1'; } catch (err) {}
    if (dismissed || alreadyInstalled()) return;
    /* let the page settle first — an offer in the first second reads as a pop-up */
    setTimeout(function () { if (deferred) card(); }, 2500);
  });

  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem(DISMISSED, '1'); } catch (e) {}
    deferred = null;
  });

  /* Permanent way back in, for anyone who said "not now". */
  window.EBF = window.EBF || {};
  window.EBF.promptInstall = function () {
    if (deferred) { deferred.prompt(); return true; }
    return false;
  };
})();

/* ------------------------------------------------------------------
   AMAZON BAND
   Appends one wide Amazon band under the results on search.html.
   Done from here, with no HTML edit, so it can't collide with Codex.
   Watches #deals-grid instead of being called by renderDeals(), because
   renderDeals lives in search.html and we don't want to touch that file.
   ------------------------------------------------------------------ */
(function amazonBand(){
  // Cloudflare Pages serves this page as /search, not /search.html,
  // so both spellings have to match.
  if(!/(^|\/)search(\.html)?$/.test(location.pathname)) return;

  var urls = {};          // slug -> tagged Amazon search url
  var names = {};         // slug -> department name
  var tag = '';
  var band = null;

  function esc(v){
    return String(v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function currentCat(){
    // syncURL() keeps ?cat= current on every filter change
    var p = new URLSearchParams(location.search);
    var c = p.get('cat');
    return (c && urls[c]) ? c : '';
  }

  function build(){
    var pag = document.getElementById('pagination');
    if(!pag || !pag.parentNode) return null;
    var el = document.createElement('section');
    el.className = 'ebf-amz-band';
    el.hidden = true;
    pag.parentNode.insertBefore(el, pag.nextSibling);
    return el;
  }

  function paint(){
    if(!band) band = build();
    if(!band) return;

    var slug = currentCat();
    var href = slug ? urls[slug]
             : (tag ? 'https://www.amazon.com/deals?tag=' + encodeURIComponent(tag) : '');
    if(!href){ band.hidden = true; return; }

    var label = slug ? (names[slug] || slug) : '';
    var head  = label ? 'Looking for something else in ' + esc(label) + '?'
                      : 'Looking for something else?';
    var sub   = label
      ? 'Amazon has thousands more ' + esc(label).toLowerCase() + ' deals running today.'
      : 'Amazon has thousands more deals running today.';
    var cta   = label ? 'Browse Amazon ' + esc(label) : 'Browse Amazon deals';

    band.innerHTML =
      '<div class="ebf-amz-copy"><h3>' + head + '</h3><p>' + sub + '</p></div>' +
      '<a class="ebf-amz-go" href="' + esc(href) + '" target="_blank" ' +
        'rel="sponsored nofollow noopener">' + cta + ' →</a>' +
      '<p class="ebf-amz-note">As an Amazon Associate we may earn from qualifying purchases.</p>';
    band.hidden = false;
  }

  function start(){
    var grid = document.getElementById('deals-grid');
    if(grid && window.MutationObserver){
      new MutationObserver(paint).observe(grid, { childList:true });
    }
    window.addEventListener('popstate', paint);
    paint();
  }

  Promise.all([
    fetch('data/amazon-categories.json').then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; }),
    fetch('data/config.json').then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
  ]).then(function(res){
    (res[0] || []).forEach(function(x){ if(x && x.category && x.url) urls[x.category] = x.url; });
    tag = (res[1] && res[1].site && res[1].site.affiliate_tag) || '';
    var cats = (window.EBF_CATALOG && window.EBF_CATALOG.cats) || [];
    cats.forEach(function(c){ names[c.slug] = c.name; });
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', start);
    } else { start(); }
  });
})();

/* ------------------------------------------------------------------
   PARTNER OFFER CARDS
   Renders the offers in data/offers.json above the product grid on a
   department page. Done from here so search.html is never edited.
   If a department has offers but no products, the grid's own "no
   matching deals" block is hidden - the page is not empty, it just
   has offers rather than products in it.
   ------------------------------------------------------------------ */
(function offerCards(){
  if(!/(^|\/)search(\.html)?$/.test(location.pathname)) return;

  var offers = [], host = null;

  function esc(v){
    return String(v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function currentCat(){
    return new URLSearchParams(location.search).get('cat') || '';
  }

  function card(o){
    return '<div class="ebf-offer">' +
      '<div class="ebf-offer-store">' + esc(o.store) + '</div>' +
      '<h3>' + esc(o.headline) + '</h3>' +
      '<p>' + esc(o.blurb) + '</p>' +
      '<a class="ebf-offer-go" href="' + esc(o.url) + '" target="_blank" ' +
        'rel="sponsored nofollow noopener">' + esc(o.cta) + ' →</a>' +
    '</div>';
  }

  function paint(){
    var grid = document.getElementById('deals-grid');
    if(!grid) return;
    var cat = currentCat();
    // No category chosen means the shopper is browsing or searching
    // everything, and a wall of partner offers there would be noise.
    var mine = cat ? offers.filter(function(o){ return o.category === cat; }) : [];

    if(!host){
      host = document.createElement('section');
      host.className = 'ebf-offers';
      grid.parentNode.insertBefore(host, grid);
    }
    if(!mine.length){ host.hidden = true; return; }

    host.innerHTML =
      '<div class="ebf-offers-head"><h2>Offers from our partners</h2>' +
      '<span>' + mine.length + (mine.length === 1 ? ' offer' : ' offers') + '</span></div>' +
      '<div class="ebf-offer-grid">' + mine.map(card).join('') + '</div>' +
      '<p class="ebf-offer-note">These stores sell plans and subscriptions rather than ' +
      'single products, so prices are shown on their own site.</p>';
    host.hidden = false;

    // the department has something in it, so don't tell the shopper it's empty
    var empty = grid.querySelector('.empty');
    if(empty) empty.style.display = 'none';

    // the breadcrumb counts products only, so a department made entirely of
    // offers announced itself as "0 products" right above three offers
    var crumb = document.getElementById('results-crumb');
    if(crumb && /\b0 products?\b/.test(crumb.innerHTML)){
      crumb.innerHTML = crumb.innerHTML.replace(
        /\b0 products?\b/,
        mine.length + (mine.length === 1 ? ' offer' : ' offers'));
    }
  }

  fetch('data/offers.json')
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(list){
      offers = list || [];
      if(!offers.length) return;
      function start(){
        var grid = document.getElementById('deals-grid');
        if(grid && window.MutationObserver){
          new MutationObserver(paint).observe(grid, { childList:true });
        }
        window.addEventListener('popstate', paint);
        paint();
      }
      if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', start);
      } else { start(); }
    });
})();

/* ------------------------------------------------------------------
   TODAY'S DEALS (homepage)
   Two strips built from data/products.json: the biggest real discounts,
   and the useful things under $25 - MJ's point that a visitor who buys
   three small useful items is worth more than one who buys nothing.

   Everything here has a photograph and a price we are licensed to show.
   No Amazon product appears: Amazon prices and photos may only come
   from the Product Advertising API, and we do not have it yet.
   ------------------------------------------------------------------ */
(function todaysDeals(){
  var host = document.getElementById('todays-deals');
  if(!host) return;

  function esc(v){
    return String(v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function money(n){ return '$' + Number(n).toFixed(2).replace(/\.00$/, ''); }

  function card(p){
    var off = p.discount ? '<span class="ebf-tc-off">' + p.discount + '% OFF</span>' : '';
    var was = (p.original_price && p.original_price > p.price)
      ? '<span class="ebf-tc-was">' + money(p.original_price) + '</span>' : '';
    return '<a class="ebf-tc" href="' + esc(p.affiliate_url) + '" target="_blank" ' +
             'rel="sponsored nofollow noopener">' +
      '<div class="ebf-tc-img">' + off +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" ' +
        'onerror="this.closest(\'.ebf-tc\').style.display=\'none\'">' +
      '</div>' +
      '<div class="ebf-tc-body">' +
        '<div class="ebf-tc-name">' + esc(p.title) + '</div>' +
        '<div class="ebf-tc-store">' + esc(p.store) + '</div>' +
        '<div class="ebf-tc-price"><span class="ebf-tc-now">' + money(p.price) + '</span>' + was + '</div>' +
      '</div></a>';
  }

  function strip(title, note, link, items){
    if(!items.length) return '';
    return '<section class="ebf-today">' +
      '<div class="ebf-today-head"><h2>' + esc(title) + '</h2><p>' + esc(note) + '</p>' +
      '<a href="' + link + '">See all →</a></div>' +
      '<div class="ebf-today-grid">' + items.map(card).join('') + '</div>' +
    '</section>';
  }

  /* one product per store before repeating a store, so one supplier
     cannot take over the row */
  function spread(list, n){
    var seen = {}, out = [], leftovers = [];
    list.forEach(function(p){
      if(out.length < n && !seen[p.store]){ seen[p.store] = 1; out.push(p); }
      else leftovers.push(p);
    });
    return out.concat(leftovers).slice(0, n);
  }

  fetch('data/products.json')
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(all){
      if(!all || !all.length) return;

      var discounted = all.filter(function(p){ return p.discount && p.discount >= 15; })
                          .sort(function(a,b){ return b.discount - a.discount; });

      var cheap = all.filter(function(p){ return p.price > 0 && p.price <= 25; })
                     .sort(function(a,b){
                       return (b.discount || 0) - (a.discount || 0) || a.price - b.price;
                     });

      host.innerHTML =
        strip('Today’s biggest savings',
              'Real prices from our partner stores, updated through the day.',
              'search.html?sort=discount', spread(discounted, 10)) +
        strip('Useful things under $25',
              'The small stuff worth adding to any order.',
              'search.html', spread(cheap, 10));
      host.hidden = false;
    });
})();
