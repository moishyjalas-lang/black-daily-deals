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

const EBF = {
  CLIENT_ID: '875134997725-ktboepqgg8mrbn084v6bc20u29tugbgf.apps.googleusercontent.com',
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
    return `<div class="deal-card" data-id="${d.id}">
  <a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer" class="card-img-wrap">
    <img src="${d.image}" alt="${d.title}" loading="lazy" onerror="this.style.background='#1a1a1a';this.src='';">
    <span class="badge-off">${d.discount}% OFF</span>
    <button class="wish-btn${inWish ? ' active' : ''}" onclick="EBF.toggleWishlist(this,'${d.id}')" aria-label="${inWish ? 'Remove from' : 'Add to'} wishlist">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${inWish ? '#ff3b3b' : 'none'}" stroke="${inWish ? '#ff3b3b' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    </button>
  </a>
  <div class="card-body">
    <h3 class="card-title"><a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer">${d.title}</a></h3>
    <div class="card-rating">${this.renderStars(d.rating)} <span class="rating-num">${d.rating}</span> <span class="rating-count">(${d.reviews.toLocaleString()})</span></div>
    <div class="card-store">${d.store}</div>
    <div class="card-price">
      <span class="price-now">${this.fmt(d.price)}</span>
      <span class="price-was">${this.fmt(d.original_price)}</span>
    </div>
    <a href="${d.affiliate_url}" target="_blank" rel="noopener noreferrer" class="btn-view">View Deal →</a>
  </div>
</div>`;
  },

  /* ---- Google Sign In ---- */
  signIn() {
    if (typeof google === 'undefined') { this.showToast('Google Sign-In unavailable', 'error'); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: 'openid email profile',
      callback: (resp) => {
        if (resp.error) { this.showToast('Sign-in failed', 'error'); return; }
        this.fetchUserInfo(resp.access_token);
      }
    });
    client.requestAccessToken();
  },

  async fetchUserInfo(token) {
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } });
      const u = await r.json();
      const existing = this.getUser() || {};
      const user = { name: u.name || u.email, email: u.email, avatar: u.picture || '', id: u.sub, pro: existing.pro || false };
      this.setUser(user);
      this.updateAuthUI(user);
      this.showToast('Welcome, ' + user.name.split(' ')[0] + '!', 'success');
      // close modal if open
      const m = document.getElementById('signInModal');
      if (m) m.style.display = 'none';
    } catch (e) { this.showToast('Sign-in error', 'error'); }
  },

  signOut() {
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
        <div style="font-size:36px;margin-bottom:16px;">🛍️</div>
        <h2 style="color:#fff;margin:0 0 8px;">Sign in to EBF</h2>
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
        '🔔 You\'ve used your 1 free alert.\n\nUpgrade to Pro for $8/month to get unlimited alerts.\n\nClick OK to upgrade now.'
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
      const r = await fetch('/black-daily-deals/data/announcements.json?t=' + Date.now());
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
    // restore auth state
    const user = this.getUser();
    this.updateAuthUI(user);
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
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => EBF.init());
} else {
  EBF.init();
}
