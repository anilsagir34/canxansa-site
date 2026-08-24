#!/usr/bin/env python3
"""
CANXANSA site saglik denetimi.

Hicbir dosyayi degistirmez, sadece okur ve rapor basar.

Kullanim:
    python3 tools/site-check.py                 # ekrana rapor
    python3 tools/site-check.py rapor.txt       # dosyaya da yazar

Degisiklik oncesi ve sonrasi iki rapor alip diff'lersen,
neyin bozuldugu tek bakista gorunur:
    python3 tools/site-check.py once.txt
    ... degisiklikler ...
    python3 tools/site-check.py sonra.txt
    diff once.txt sonra.txt
"""

import os
import re
import sys
from collections import defaultdict

SITE = "https://canxansa.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = {".git", ".github", "node_modules"}
EXTERNAL = re.compile(r"^(https?:|mailto:|tel:|javascript:|data:|//)", re.I)

ATTR = re.compile(r'(?:href|src)\s*=\s*"([^"]*)"', re.I)
TITLE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
CANON = re.compile(r'<link[^>]+rel="canonical"[^>]+href="([^"]*)"', re.I)
DESC = re.compile(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', re.I)
ROBOTS = re.compile(r'<meta[^>]+name="robots"[^>]+content="([^"]*)"', re.I)
REFRESH = re.compile(r'<meta[^>]+http-equiv="refresh"', re.I)


def html_files():
    out = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f.endswith(".html"):
                out.append(os.path.relpath(os.path.join(base, f), ROOT))
    return sorted(out)


def resolve(page, link):
    """Sayfadaki bir linki repo icindeki dosya yoluna cevirir."""
    link = link.split("#")[0].split("?")[0]
    if not link:
        return None
    if link.startswith("/"):
        target = os.path.join(ROOT, link.lstrip("/"))
    else:
        target = os.path.join(ROOT, os.path.dirname(page), link)
    target = os.path.normpath(target)
    if os.path.isdir(target):
        target = os.path.join(target, "index.html")
    return target


def url_for(page):
    """Dosya yolundan beklenen canonical URL."""
    if page == "index.html":
        return SITE + "/"
    if page.endswith("/index.html"):
        return SITE + "/" + page[: -len("index.html")]
    return SITE + "/" + page


def main():
    pages = html_files()
    broken = []
    indexhtml_links = []
    inbound = defaultdict(set)
    no_title, no_canon, no_desc = [], [], []
    canon_mismatch = []
    redirects, noindex = set(), set()
    total_links = 0

    for page in pages:
        with open(os.path.join(ROOT, page), encoding="utf-8", errors="replace") as fh:
            html = fh.read()

        is_redirect = bool(REFRESH.search(html))
        if is_redirect:
            redirects.add(page)
        r = ROBOTS.search(html)
        if r and "noindex" in r.group(1).lower():
            noindex.add(page)

        for raw in ATTR.findall(html):
            if EXTERNAL.match(raw) or raw.startswith("#") or not raw.strip():
                continue
            total_links += 1
            target = resolve(page, raw)
            if target is None:
                continue
            rel = os.path.relpath(target, ROOT)
            if not os.path.exists(target):
                broken.append((page, raw))
            elif rel.endswith(".html") and rel != page:
                inbound[rel].add(page)
            if re.search(r"(^|/)index\.html($|[#?])", raw) and not is_redirect:
                indexhtml_links.append((page, raw))

        if not is_redirect:
            t = TITLE.search(html)
            if not t or not t.group(1).strip():
                no_title.append(page)
            c = CANON.search(html)
            if not c:
                no_canon.append(page)
            elif c.group(1).rstrip() != url_for(page):
                canon_mismatch.append((page, c.group(1), url_for(page)))
            if not DESC.search(html):
                no_desc.append(page)

    # sitemap
    sm_path = os.path.join(ROOT, "sitemap.xml")
    sm_urls = set()
    if os.path.exists(sm_path):
        with open(sm_path, encoding="utf-8") as fh:
            sm_urls = set(re.findall(r"<loc>([^<]+)</loc>", fh.read()))

    live = [p for p in pages if p not in redirects and p not in noindex]
    missing_in_sitemap = sorted(p for p in live if url_for(p) not in sm_urls)
    sitemap_dead = sorted(
        u for u in sm_urls if url_for_exists(u) is False
    )

    orphans = sorted(p for p in live if not inbound.get(p) and p != "index.html")

    L = []
    add = L.append
    add("CANXANSA site denetimi")
    add("=" * 60)
    add("")
    add("OZET")
    add(f"  HTML sayfa            : {len(pages)}")
    add(f"  yayinda (indekslenir) : {len(live)}")
    add(f"  yonlendirme sayfasi   : {len(redirects)}")
    add(f"  noindex               : {len(noindex)}")
    add(f"  ic link (href+src)    : {total_links}")
    add(f"  sitemap URL           : {len(sm_urls)}")
    add("")
    add(f"KIRIK IC LINK: {len(broken)}")
    for page, raw in sorted(broken):
        add(f"  {page} -> {raw}")
    add("")
    add(f"CANONICAL EKSIK: {len(no_canon)}")
    for p in no_canon:
        add(f"  {p}")
    add("")
    add(f"CANONICAL YANLIS: {len(canon_mismatch)}")
    for page, got, want in sorted(canon_mismatch):
        add(f"  {page}: {got}  (beklenen {want})")
    add("")
    add(f"TITLE EKSIK: {len(no_title)}")
    for p in no_title:
        add(f"  {p}")
    add("")
    add(f"META DESCRIPTION EKSIK: {len(no_desc)}")
    for p in no_desc:
        add(f"  {p}")
    add("")
    add(f"index.html'e giden ic link (canonical / olmali): {len(indexhtml_links)}")
    by_page = defaultdict(int)
    for page, raw in indexhtml_links:
        by_page[page] += 1
    for page in sorted(by_page):
        add(f"  {page}: {by_page[page]}")
    add("")
    add(f"SITEMAPTE OLMAYAN YAYIN SAYFASI: {len(missing_in_sitemap)}")
    for p in missing_in_sitemap:
        add(f"  {p}")
    add("")
    add(f"SITEMAPTE OLUP DOSYASI OLMAYAN: {len(sitemap_dead)}")
    for u in sitemap_dead:
        add(f"  {u}")
    add("")
    add(f"HIC IC LINK ALMAYAN SAYFA (orphan): {len(orphans)}")
    for p in orphans:
        add(f"  {p}")
    add("")
    add("IC LINK SAYISI (cok alandan aza, ilk 25)")
    ranked = sorted(inbound.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    for p, srcs in ranked[:25]:
        add(f"  {len(srcs):4d}  {p}")
    add("")

    report = "\n".join(L)
    print(report)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as fh:
            fh.write(report + "\n")
        print(f"[rapor yazildi: {sys.argv[1]}]")

    return 1 if broken else 0


def url_for_exists(url):
    if not url.startswith(SITE):
        return None
    path = url[len(SITE):].lstrip("/")
    if path == "":
        path = "index.html"
    elif path.endswith("/"):
        path += "index.html"
    return os.path.exists(os.path.join(ROOT, path))


if __name__ == "__main__":
    sys.exit(main())
