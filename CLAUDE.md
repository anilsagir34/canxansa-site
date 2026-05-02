# Canxansa Site

**Repo:** anilsagir34/canxansa-site → canxansa.com (GitHub Pages)
**Stack:** Saf HTML/CSS/JS · Formspree `/f/mpqykzop` · GA4 `G-X19NTBBWNQ`
**Font:** Bebas Neue (başlık) · DM Sans (gövde)
**Renkler:** `--black #0a0a0a` `--white #f5f0eb` `--orange #e8521a` `--orange-dim #c44010` `--gray #1a1a1a` `--gray-mid #2e2e2e` `--gray-light #888`

## Ana Sayfa Panelleri (`showPanel('id')`)
`panel-home` → `panel-services` → `panel-corridors` → `panel-coverage` → `panel-how` → `panel-contact`
Coverage tabları: `data-tab="europe|asia|americas|mea"`

## Alt Sayfalar
- Güzergah klasörleri: `turkey-{ülke}-freight/index.html` (bilateral) + hub sayfaları
- Hub sayfaları: `{ülke}-freight/` formatı — "Freight from [Ülke]", 12 dest. kartı, hubs, cargo types, FAQ×8
- 3 koridor sayfası: `china-to-europe-via-turkey-freight/`, `central-asia-to-europe-freight/`, `estonia-turkey-freight/`
- Alt sayfalarda nav: `showPanel()` yok, `../index.html` direkt link
- Contact ikonlar: SVG inline (18×18, turuncu stroke)

## Mobil
`<=1024px` hamburger `#nav-hamburger` · `<=640px` nav-cta gizlenir · `#mobile-menu` overlay

## Sayfa Yenileme Durumu (2026-05-02)

### Hub Sayfaları (China formatı) — Tamamlananlar
| Sayfa | İçerik | Durum |
|---|---|---|
| `china-freight/` | 12 dest. kartı, hubs, cargo types, FAQ×8, FAQPage schema | Canlı |
| `india-freight/` | 12 dest. kartı, hubs, cargo types, FAQ×8, FAQPage schema | Canlı |
| `netherlands-freight/` | 12 dest. kartı, hubs, cargo types, FAQ×8, FAQPage schema | Canlı |
| `italy-freight/` | 12 dest. kartı, hubs, cargo types, FAQ×8, FAQPage schema | Canlı |
| `france-freight/` | 12 dest. kartı, EU-Turkey Customs Union callout, FAQ×8, FAQPage schema | Canlı |
| `spain-freight/` | 12 dest. kartı, Algeciras callout, FAQ×8, FAQPage schema | Canlı |
| `uk-freight/` | 12 dest. kartı, Post-Brexit callout, FAQ×8, FAQPage schema | Canlı |
| `poland-freight/` | 12 dest. kartı, Orta Avrupa hub callout, FAQ×8, FAQPage schema | Canlı |
| `belgium-freight/` | 12 dest. kartı, Antwerp+Liege callout, FAQ×8, FAQPage schema | Canlı |

### Bilateral Sayfalar — Tamamlananlar
| Sayfa | Format | Durum |
|---|---|---|
| `turkey-germany-freight/` | Turkey ↔ Germany — trade flows, ports, FAQ×8, FAQPage schema | Canlı |

### SEO — Tamamlananlar (2026-05-02)
- Tüm 21 güzergah sayfasına FAQPage JSON-LD schema eklendi
- Sitemap.xml güncel (28 URL)

### Hub Sayfaları — Bekleyen (öncelik sırası)
Orta Doğu: UAE → Saudi Arabia → Qatar → Iraq
Uzak: USA → Japan → Egypt → Syria

### Sayfa Şablonu Kuralları
- Emoji/bayrak yok
- TÜM ülkeler için: "Freight from [Ülke]" hub formatı (china-freight şablonu)
- Bilateral sayfalar (`turkey-{ülke}-freight/`) eski formatta bırakılıyor, yanlarına hub sayfaları açılıyor
- Her hub sayfasında: 12 dest. kartı + ülkeye özel callout + 4 servis kartı + 5 hub + 5 cargo type + FAQ×8 + FAQPage schema
- China'da Rail var, Avrupa sayfalarında Rail yerine Road (TIR)
- Orta Doğu sayfalarında Road (GCC trucking) + Air + Sea
- Transit süreler gerçek veriye dayalı

## Kurallar
- Renk & `showPanel()` değiştirme
- Panel div'lerini (`<!-- ═══ ... PANEL ═══ -->`) koru
- Mobil menüye link eklenince `#mobile-menu`'ya da ekle
- Commit mesajı Türkçe
- Track Shipment kartı hazır bekliyor (Supabase planı: `research/tracking_system_plan.md`)
