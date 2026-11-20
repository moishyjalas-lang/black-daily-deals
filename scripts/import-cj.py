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
STORES = [
    # name,                  advertiserId, cap,  dept
    # Tech For Less sends no Google category at all, so the department is forced.
    ("Tech For Less",        "3297514",    140,  "electronics"),
    ("FragranceShop.com",    "7287203",    140,  "beauty"),
    ("GameFly",              "1132500",    120,  "videogames"),
    ("Canada Pet Care",      "4247933",     90,  "pets"),
    ("Best Vet Care",        "4247934",     90,  "pets"),
    ("Rexing",               "5357356",     94,  "auto"),
    ("Click & Grow",         "4297609",     80,  "garden"),
    # DHGate is huge and spans everything - held back until MJ decides.
    # ("DHGate",             "3992613",    400,  None),
]

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

def clean(t):
    t = html.unescape(t or "").strip()
    return re.sub(r"\s+", " ", t)

def main():
    out, seen, report = [], set(), []
    for name, adv_id, cap, forced in STORES:
        kept, offset, scanned = 0, 0, 0
        while kept < cap and offset < 1000:
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
                disc = x.get("discountPercentage")
                out.append({
                    "id": "cj-%s-%d" % (adv_id, len(out)),
                    "title": title,
                    "image": img,
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
