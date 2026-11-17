# Builder Handoff — Black Daily Deals (EBF)

## Layout & Spacing Rules
- Desktop content width: ~1,280px, centered, 32–48px side margins
- Section spacing: 56–72px between major homepage sections
- Cards: 20–24px gap between cards; titles, prices, buttons must be aligned
- Category browsing: tidy preview on Home; full category tree on separate All Categories screen
- Group subcategories under parent — don't omit or cram into hero
- Responsive: multi-column grid on desktop; stack or 2-col grid on mobile; preserve readable text + tap targets

## Image Placement Rules
- **Logo (EBF gold circular mark)**: header, profile/sign-in screens, pop-ups, newsletter — NOT in the hero
- **Home hero**: wide staged multi-category display image, hero only — don't repeat throughout site
- **Category images**: separate small images/icons for tiles, consistently cropped
- **Deal cards**: each deal's own product image; keep retailer names on deal cards, never as hero branding
- **Mobile**: crop or rearrange images for smaller layout — don't just shrink desktop composition

## Assets Saved
- `assets/logo-ebf.png` — Gold EBF / Everyday Black Friday circular logo mark
- (more images coming — user will drop them in with screen labels)

## Screens to Build
- Home (hero, deal of the day, categories preview, featured deals grid)
- All Categories page (full category tree)
- Sign-in / profile screen
- Newsletter/subscribe section
- Deal Alerts pop-up
- (more TBD)

## Notes
- Build separate screens — do not squeeze everything into one screen
- Use the design system already in index.html (CSS vars: --bg, --gold, --surface, etc.)
- Each image the user sends = save it, label it, use it in the right screen

---

## Full Build Checklist (from Moishy, Nov 17 2026)

### IMPORTANT NOTE ON MOCKUP IMAGES
The images are visual mockups, not working screens. Product names, stores, ratings, prices, counts, and social icons in them are PLACEHOLDERS — do not treat them as real deals or integrations. Use neutral placeholders in future mockups instead of invented products.

### Screens to Build
1. **Home** — brand + search, featured category groups, Deal of the Day, deal cards, newsletter signup
2. **All Categories** — every parent category + subcategory, neatly grouped
3. **Category / Search Results** — search, subcategory nav, filters, sorting, deal results
4. **Sign-in & Profile** — Google/email sign-in, account details, saved deals, alert settings
5. **Deal Alerts** — keyword/category watchers; 1 watcher free, more for paid members
6. **Membership** — plan details + Stripe checkout
7. **Admin** — add/edit/expire/organize deals; manage categories + featured/seasonal sections

### Features & Content to Connect
- Real deal data: product images, retailer names, prices, discounts, affiliate links
- Search + category filters across full category tree
- Save, share, and star-rating controls
- "View Deal" links → retailer via correct affiliate link
- Free daily newsletter via Sender; personalized alerts when saved preferences match a deal
- Seasonal categories/promotions (show when relevant, hide when not)
- Real social links ONLY if accounts are created and maintained — otherwise REMOVE those icons

### Assets Still Needed
- Hero image (wide staged multi-category display)
- Category tile images/icons
- Section order confirmation for homepage
- Brand name decision: "Black Daily Deals" vs "Everyday Black Friday / EBF"
