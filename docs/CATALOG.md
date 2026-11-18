# Category catalog (Stage 2: real products)

Added 2026-11-18. How the 22 categories, their subcategories and the product catalog fit together.

## Files
- `js/catalog.js`: the one list of 22 categories (MJ's own taxonomy), their subcategories, which ones have MJ's real category photo, and the deal levels. `categories.html` and `search.html` both read it, so they always agree.
- `data/products.json`: real products found on store pages (Walmart, Best Buy, Zappos, Ulta, Home Depot and others), same shape as `data/deals.json`, plus `subcategory` and `price_from` (true when the store shows "From $x"). `discount` and `original_price` are null when the store shows no was price (regular-price products).
- `data/deals.json`: the hand-picked deals stay as they were (Amazon links keep `tag=blackdailydeals-20`). The deals page loads both files.
- The same products are in the Google Sheet "Black Daily Deals — product catalog" in MJ's Drive (one tab per category).

## Deal levels (MJ's names, Nov 18)
Worked out from the store's own shown prices: percent off = 1 - now / was.
- Doorbuster: 50% off or more. Big gold badge, old price struck through in red, "Save $x".
- Hot Deal: 20% to 49% off.
- Price Drop: under 20% off. Quiet badge.
- Everyday Price: regular price, no badge, no struck price.
- Deal of the Hour: only where the store itself shows an end time. None yet, so it is not shown.

On a category page the default sort ("Best discount") groups products under these four headings, and the tabs above the grid filter to one level.

## Links
- `search.html?cat=<slug>`: one category. `cat=a,b,c`: several (the home tiles use this).
- `&sub=<Subcategory name>`: one subcategory. `&level=bf|big|light|regular`: one deal level.
- Old slug `family` still works (it opens Baby & Kids).

## Rules kept
- Only real products with direct store links (no redirect or tracking links). Real store photos only; a card with no photo shows no picture rather than a placeholder.
- Categories without one of MJ's real category photos show as text cards under "All categories". Send a real photo for any of them to give it a photo card.
- Prices change. Each product has `price_checked`; refresh before relying on a price.
