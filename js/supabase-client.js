/* Everyday Black Friday — lightweight Supabase data loader.
 *
 * Reads deals from the Supabase database using the PUBLIC publishable key
 * (safe in the browser; the database's Row Level Security only allows reading
 * deals, never writing). Uses the plain REST endpoint so there is no external
 * library to load.
 *
 * SAFETY: if Supabase is ever unreachable or returns nothing, this falls back
 * to the static data/deals.json file, so the site can never go blank.
 */
(function () {
  window.EBF = window.EBF || {};
  var cfg = window.EBF_SUPABASE || {};


  /* A deal only reaches the page if it is genuinely showable.
   *
   * Three things disqualify a row, and all three were true of the sample
   * data that shipped before:
   *   - the link goes to an Amazon SEARCH rather than the product itself
   *   - the photo is hotlinked from Amazon's CDN, which the Associates
   *     terms only permit through the Product Advertising API
   *   - the prices are missing or not real numbers
   *
   * This runs on whatever the database returns, so a bad row can never
   * reach a shopper even if one gets added by mistake later.
   */
  function showable(d) {
    if (!d || !d.affiliate_url || !d.title) return false;
    if (/amazon\.[a-z.]+\/s\?/i.test(d.affiliate_url)) return false;
    if (/m\.media-amazon\.com/i.test(d.image || '')) return false;
    if (!isFinite(Number(d.price)) || Number(d.price) <= 0) return false;
    if (!isFinite(Number(d.original_price)) || Number(d.original_price) <= 0) return false;
    return true;
  }

  function normalize(rows) {
    // PostgREST returns numeric columns as strings and timestamps as full ISO.
    // Coerce to the shapes the page render code expects (numbers + short date).
    return rows.map(function (d) {
      return Object.assign({}, d, {
        price: Number(d.price),
        original_price: Number(d.original_price),
        discount: Number(d.discount),
        price_checked: (d.price_checked || '').slice(0, 10)
      });
    });
  }

  async function fallback() {
    var r = await fetch('data/deals.json');
    var j = await r.json();
    return Array.isArray(j) ? j.filter(showable) : [];
  }

  // Returns a Promise<Array<deal>> in the same shape as data/deals.json.
  window.EBF.loadDeals = async function () {
    try {
      if (!cfg.url || !cfg.publishableKey) throw new Error('no config');
      var url = cfg.url + '/rest/v1/deals?select=*&order=discount.desc';
      var r = await fetch(url, {
        headers: { apikey: cfg.publishableKey, Authorization: 'Bearer ' + cfg.publishableKey }
      });
      if (!r.ok) throw new Error('supabase ' + r.status);
      var rows = await r.json();
      if (!Array.isArray(rows)) throw new Error('bad shape');
      rows = rows.filter(showable);
      if (rows.length === 0) return [];
      return normalize(rows);
    } catch (e) {
      try { return await fallback(); } catch (e2) { return []; }
    }
  };
})();
