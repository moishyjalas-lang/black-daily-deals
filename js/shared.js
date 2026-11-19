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
  STRIPE_LINK: 'https://buy.stripe.com/PLACEHOLDER_STRIPE_LINK',
  FREE_ALERT_LIMIT: 1,
  PRO_ALERT_LIMIT: 999,
  AFFILIATE_TAG: 'blackdailydeals-20',

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
    ${d.image ? `<img src="${d.image}" alt="${d.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
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
      try {
        const pr = await fetch(url + '/rest/v1/profiles?select=is_pro,is_admin&id=eq.' + au.id, { headers: { apikey: key, Authorization: 'Bearer ' + sess.access_token } });
        if (pr.ok) { const rows = await pr.json(); if (rows && rows[0]) { pro = !!rows[0].is_pro; is_admin = !!rows[0].is_admin; } }
      } catch (e) { /* profile row optional */ }
      const user = { id: au.id, email: au.email, name: meta.full_name || meta.name || au.email, avatar: meta.avatar_url || meta.picture || '', pro, is_admin };
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

  openSignInModal() {
    const m = document.getElementById('signInModal');
    if (m) { m.style.display = 'flex'; return; }
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
        <p style="color:#555;font-size:12px;margin:16px 0 0;">No account needed — sign in with Google</p>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
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
