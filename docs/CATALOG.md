# Category catalog

Updated 2026-11-18. The site now uses MJ's 60 category pictures as its category tree: 14 departments, 80 categories and 240 product types, each with its own picture cut from those 60 images.

## Files
- `js/catalog.js`: the one list of 14 departments. Each has `subs` (its categories), `subImg` (a picture per category) and `types` (product types per category, each with a picture). `categories.html` and `search.html` both read it, so they always agree.
- `assets/categories/dept/<slug>.jpg`, `sub/<dept>--<category>.jpg`, `type/<category>--<type>.jpg`: the 334 pictures cut from MJ's 60 images. Real pictures only, lazy-loaded.
- `data/products.json`: real products with direct store links. Each product has `category` (department slug), `subcategory` (category name) and, where it fits, `type` (product type name). `discount` and `original_price` are null when the store shows no was price.
- `data/deals.json`: the hand-picked deals, moved into the new tree. Amazon links keep `tag=blackdailydeals-20`.
- The same products are in the Google Sheet "Black Daily Deals — product catalog" in MJ's Drive, one tab per department.

## Old categories
The old 22 categories were folded into the 14 departments; every old product moved to the closest new category and none were dropped. Old links still work through aliases in `catalog.js`: computers and gaming open Electronics & Tech, kitchen and household open Home & Living, shoes opens Clothing & Accessories, baby, toys, pets and office open Family & Everyday, patio opens Garden & Outdoor Living, tools opens Auto & Tools, grocery opens Food & Beverage.

## Deal levels (MJ's names, Nov 18)
Worked out from the store's own shown prices: percent off = 1 - now / was.
- Doorbuster: 50% off or more. Big gold badge, old price struck through in red, "Save $x".
- Hot Deal: 20% to 49% off.
- Price Drop: under 20% off. Quiet badge.
- Everyday Price: regular price, no badge, no struck price.
- Deal of the Hour: only where the store itself shows an end time. None yet, so it is not shown.

On a category page the default sort ("Best discount") groups products under these four headings, and the tabs above the grid filter to one level.

## Links
- `search.html?cat=<slug>`: one department. `cat=a,b,c`: several (the home tiles use this).
- `&sub=<Category name>`: one category. `&type=<Product type name>`: one product type. `&level=bf|big|light|regular`: one deal level.
- On a department page, picture tiles show its categories; picking a category shows picture tiles for its product types (when at least two have products).

## Rules kept
- Only real products with direct store links (no redirect or tracking links). Real store photos only; a card with no photo shows no picture rather than a placeholder.
- Prices change. Each product has `price_checked`; refresh before relying on a price.
