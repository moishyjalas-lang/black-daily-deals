#!/usr/bin/env python3
"""
Pull real products from the CJ stores EBF is approved for and write them
into data/products.json.

Why it runs HERE and not in the browser: the CJ token is a secret. CJ's own
page says never put it in client-side code or a public repo. So we fetch at
build time and ship only the finished products - picture, price, tracked link.

Run:  python3 scripts/import-cj.py
Token: scripts/.cj-token  (gitignored, never committed)
"""
import json, subprocess, sys, os, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CID  = "8132289"        # CJ company id
PID  = "101933046"      # CJ website property id - this is what makes a link ours
ENDPOINT = "https://ads.api.cj.com/query"

# Stores we are approved for that have a feed worth using.
# cap   = most products to take from that store
# dept  = force every product into this department (None = decide per product)
# only  = if set, keep a product ONLY if it lands in one of these departments
# scan  = how many rows to look through (CJ stops serving past ~10,000)
STORES = [
    # name,                  advertiserId, cap,  dept,          only, scan
    # Tech For Less sends no Google category at all, so the department is forced.
    ("Tech For Less",        "3297514",    140,  "electronics"),
    ("FragranceShop.com",    "7287203",    140,  "beauty"),
    ("GameFly",              "1132500",    120,  "videogames"),
    ("Canada Pet Care",      "4247933",     90,  "pets"),
    ("Best Vet Care",        "4247934",     90,  "pets"),
    ("Rexing",               "5357356",     94,  "auto"),
    ("Click & Grow",         "4297609",     80,  "garden"),
    # DHGate has 6.2 million products and would otherwise become most of the
    # site. MJ's call: a few departments only. Home and Crafts are where
    # cheap-and-cheerful belongs and where counterfeits are least likely.
    # Apparel and jewellery are deliberately excluded - see BLOCK below.
    # Crafts only yielded four tin signs, which reads as an abandoned
    # department. Home only until there is enough to fill a page properly.
    ("DHGate",               "3992613",    200,  None, {"home"}, 6000),
]

# DHGate carries a lot of "Designer"/"Luxury" branded goods at pocket-money
# prices. We are not putting likely counterfeits on the site: it is a legal
# risk for MJ and the kind of thing that gets an affiliate account closed.
BLOCK = ("designer", "luxury", "replica", "aaa quality", "mirror quality",
         "1:1", "gucci", "chanel", "rolex", "nike", "adidas", "prada",
         "dior", "hermes", "balenciaga", "versace", "louis vuitton",
         # Any well-known brand name on a cut-price marketplace listing is
         # far more likely to be a knock-off than the real thing.
         "starbucks", "yeti", "stanley", "disney", "apple ", "airpod",
         "samsung", "lego", "north face", "patagonia", "ray-ban", "rayban")

# Nothing in here belongs on a family deals site, whatever it earns.
UNFIT = ("banger", "dab rig", "dabber", "bong", "vape", "e-cig", "hookah",
         "shisha", "rolling paper", "smoking pipe", "ashtray", "nectar collector",
         "sexy", "erotic", "adult toy", "lingerie")

# A price this low on a marketplace is nearly always junk or a sample
# listing, and it makes the whole page look cheap.
MIN_MARKETPLACE_PRICE = 12.0

def readable(title):
    """Marketplace feeds are full of keyword soup and half-translated titles.
    A card the shopper cannot read is worse than no card."""
    if len(title) < 15 or len(title) > 110:
        return False
    if len(title.split()) < 3:
        return False
    letters = [c for c in title if c.isalpha()]
    if not letters:
        return False
    # mostly plain English letters, or it is not a title our shopper can read
    if sum(c.isascii() for c in letters) / len(letters) < 0.95:
        return False
    return True

# Google product category -> our department. Most specific first.
CATMAP = [
    ("animals & pet supplies",                 "pets"),
    ("baby & toddler",                         "baby"),
    ("apparel & accessories > shoes",          "fashion"),
    ("apparel & accessories > jewelry",        "fashion"),
    ("apparel & accessories",                  "fashion"),
    ("luggage & bags",                         "travel"),
    ("health & beauty > personal care",        "beauty"),
    ("health & beauty > health care",          "health"),
    ("health & beauty",                        "beauty"),
    ("electronics > computers",                "computers"),
    ("electronics > video game consoles",      "videogames"),
    ("electronics",                            "electronics"),
    ("cameras & optics",                       "electronics"),
    ("software > video game software",         "videogames"),
    ("software",                               "services"),
    ("media > books",                          "books"),
    ("media",                                  "books"),
    ("toys & games > games",                   "family"),
    ("toys & games",                           "family"),
    # Fragrance is Beauty, not Home. Google files it under Home > Decor,
    # which was dropping marketplace perfume into the Home department next
    # to the dutch ovens - and we already have a real fragrance store.
    ("home & garden > decor > home fragrances", "beauty"),
    ("home & garden > lawn & garden",          "garden"),
    ("home & garden > kitchen & dining",       "home"),
    ("home & garden",                          "home"),
    ("furniture",                              "home"),
    ("hardware",                               "tools"),
    ("vehicles & parts",                       "auto"),
    ("sporting goods",                         "sports"),
    ("food, beverages & tobacco",              "food"),
    ("office supplies",                        "computers"),
    ("arts & entertainment > hobbies",         "crafts"),
    ("arts & entertainment",                   "books"),
    ("musical instruments",                    "music"),
]

# Second level of the Google category -> a subcategory name our catalog knows.
SUBMAP = {
    "pets":       {"pet food": "Pet Food", "pet supplies": "Pet Toys"},
    "beauty":     {"cosmetics": "Fragrance", "personal care": "Bath & Body",
                   "hair care": "Hair Care"},
    "electronics": {"audio": "Audio & Headphones", "video": "TVs & Home Theater",
                    "communications": "Phones & Tablets"},
    "computers":  {"computers": "Computers & Accessories"},
}

def gql(query):
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "120", ENDPOINT,
         "-H", "Authorization: Bearer " + TOKEN,
         "-H", "Content-Type: application/json",
         "--data-binary", json.dumps({"query": query})],
        capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {"_raw": r.stdout[:400]}

QUERY = """{ products(companyId:"%s", partnerStatus:JOINED, partnerIds:["%s"],
  limit:%d, offset:%d){
  totalCount count
  resultList{ ... on Shopping {
    advertiserName advertiserId title imageLink brand availability
    googleProductCategory{name}
    price{amount currency} salePrice{amount currency} discountPercentage
    linkCode(pid:"%s"){clickUrl}
  } } } }"""

def dept_for(gcat, forced):
    if forced:
        return forced
    g = (gcat or "").lower()
    for prefix, slug in CATMAP:
        if g.startswith(prefix):
            return slug
    return None

def sub_for(slug, gcat):
    parts = [p.strip().lower() for p in (gcat or "").split(">")]
    table = SUBMAP.get(slug) or {}
    for p in parts[1:]:
        for key, val in table.items():
            if key in p:
                return val
    return ""

def money(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None

def secure(url):
    """A browser silently BLOCKS a plain http:// image on an https:// page,
    which left white cards with no picture on them. Every store we use
    serves the same file over https, so upgrade it."""
    if url and url.startswith("http://"):
        return "https://" + url[len("http://"):]
    return url


def clean(t):
    t = html.unescape(t or "").strip()
    return re.sub(r"\s+", " ", t)

def main():
    out, seen, report = [], set(), []
    for row in STORES:
        name, adv_id, cap, forced = row[0], row[1], row[2], row[3]
        only = row[4] if len(row) > 4 else None
        scan_budget = row[5] if len(row) > 5 else 1000
        kept, offset, scanned = 0, 0, 0
        while kept < cap and offset < scan_budget:
            d = gql(QUERY % (CID, adv_id, 100, offset, PID))
            if "errors" in d and not d.get("data"):
                report.append((name, 0, 0, json.dumps(d["errors"])[:120]))
                break
            rows = ((d.get("data") or {}).get("products") or {}).get("resultList") or []
            if not rows:
                break
            for x in rows:
                if not x:
                    continue
                scanned += 1
                title = clean(x.get("title"))
                img   = x.get("imageLink")
                url   = (x.get("linkCode") or {}).get("clickUrl")
                # stores spell it differently: "in stock", "in_stock", "InStock"
                avail = (x.get("availability") or "").lower().replace("_", " ")
                price = money((x.get("price") or {}).get("amount"))
                sale  = money((x.get("salePrice") or {}).get("amount"))
                # every one of these is a reason the card would look broken
                if not (title and img and url):          continue
                if avail and not ("in stock" in avail or "instock" in avail \
                                  or "available" in avail):  continue
                now = sale if (sale and price and 0 < sale < price) else price
                was = price if (sale and price and 0 < sale < price) else None
                if not now or now <= 0:                  continue
                key = (name, title, now)
                if key in seen:                          continue
                seen.add(key)
                gcat = (x.get("googleProductCategory") or {}).get("name")
                slug = dept_for(gcat, forced)
                if not slug:                             continue
                if only and slug not in only:            continue
                low = title.lower()
                if any(w in low for w in BLOCK):         continue
                if any(w in low for w in UNFIT):         continue
                # marketplace stores get a quality gate; real retailers do not
                if only is not None:
                    if now < MIN_MARKETPLACE_PRICE:      continue
                    if not readable(title):              continue
                disc = x.get("discountPercentage")
                out.append({
                    "id": "cj-%s-%d" % (adv_id, len(out)),
                    "title": title,
                    "image": secure(img),
                    "affiliate_url": url,
                    "store": name,
                    "brand": clean(x.get("brand")) or None,
                    "price": now,
                    "original_price": was,
                    "discount": int(round(float(disc))) if disc else None,
                    "category": slug,
                    "subcategory": sub_for(slug, gcat),
                    "source": "cj",
                })
                kept += 1
                if kept >= cap:
                    break
            offset += len(rows)
        report.append((name, kept, scanned, ""))

    # discounted products first, so the best deals lead each department
    out.sort(key=lambda p: (-(p["discount"] or 0), p["title"]))
    for i, p in enumerate(out):
        p["id"] = "cj-%d" % i

    (ROOT / "data" / "products.json").write_text(
        json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    # A tiny index of which departments have products, so the homepage and
    # the category page can route links without downloading every product.
    counts = {}
    for p in out:
        counts[p["category"]] = counts.get(p["category"], 0) + 1
    # A department with partner offers in it is not empty either, so it
    # counts here too - otherwise the homepage would still send Services
    # straight out to Amazon while we have three VPN offers sitting on it.
    try:
        for o in json.loads((ROOT / "data" / "offers.json").read_text(encoding="utf-8")):
            counts[o["category"]] = counts.get(o["category"], 0) + 1
    except Exception:
        pass
    (ROOT / "data" / "departments.json").write_text(
        json.dumps(counts, indent=1, sort_keys=True) + "\n", encoding="utf-8")

    print("%-22s %6s %8s" % ("STORE", "KEPT", "SCANNED"))
    for name, kept, scanned, err in report:
        print("%-22s %6d %8d %s" % (name, kept, scanned, err))
    by = {}
    for p in out:
        by[p["category"]] = by.get(p["category"], 0) + 1
    print("\nTOTAL PRODUCTS: %d  across %d departments" % (len(out), len(by)))
    for k, v in sorted(by.items(), key=lambda kv: -kv[1]):
        print("  %-14s %d" % (k, v))

if __name__ == "__main__":
    # The token comes from the environment first, so GitHub Actions can
    # supply it from the repository's encrypted secrets and nothing has to
    # live on any one machine. The local file is only a fallback.
    TOKEN = (os.environ.get("CJ_PAT") or "").strip()
    if not TOKEN:
        tf = ROOT / "scripts" / ".cj-token"
        if not tf.exists():
            sys.exit("No CJ token: set CJ_PAT, or create scripts/.cj-token")
        TOKEN = tf.read_text().strip()
    main()
