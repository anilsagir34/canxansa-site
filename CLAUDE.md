# Canxansa Site

**Repo:** anilsagir34/canxansa-site → canxansa.com (GitHub Pages)
**Stack:** Saf HTML/CSS/JS · Formspree `/f/mpqykzop` · GA4 `G-X19NTBBWNQ`
**Font:** Bebas Neue (başlık) · DM Sans (gövde)
**Renkler:** `--black #0a0a0a` `--white #f5f0eb` `--orange #e8521a` `--orange-dim #c44010` `--gray #1a1a1a` `--gray-mid #2e2e2e` `--gray-light #888`

## Ana Sayfa Panelleri (`showPanel('id')`)
`panel-home` → `panel-services` → `panel-corridors` → `panel-coverage` → `panel-how` → `panel-contact`
Coverage tabları: `data-tab="europe|asia|americas|mea"`

## Alt Sayfalar
- Güzergah klasörleri: `turkey-{ülke}-freight/index.html` (bilateral) + `china-freight/`, `india-freight/` (hub)
- 3 koridor sayfası: `china-to-europe-via-turkey-freight/`, `central-asia-to-europe-freight/`, `estonia-turkey-freight/`
- Alt sayfalarda nav: `showPanel()` yok, `../index.html` direkt link
- Contact ikonlar: SVG inline (18×18, turuncu stroke)

## Mobil
`<=1024px` hamburger `#nav-hamburger` · `<=640px` nav-cta gizlenir · `#mobile-menu` overlay

## Sayfa Yenileme Durumu (2026-04-29)

### Tamamlananlar
| Sayfa | Format | Durum |
|---|---|---|
| `china-freight/` | "Freight from China" hub — 12 dest. kartı, hubs, cargo types, FAQ×8 | Canlı |
| `india-freight/` | "Freight from India" hub — 12 dest. kartı, hubs, cargo types, FAQ×8 | Canlı |
| `netherlands-freight/` | "Freight from Netherlands" hub — 12 dest. kartı, hubs, cargo types, FAQ×8 | Canlı |
| `italy-freight/` | "Freight from Italy" hub — 12 dest. kartı, hubs, cargo types, FAQ×8 | Canlı |
| `turkey-germany-freight/` | Turkey ↔ Germany bilateral — road/air/sea, trade flows, ports, FAQ×8 | Canlı |

### Bekleyen (öncelik sırası)
France → Spain → UK → Poland → Belgium → UAE → Saudi Arabia → Qatar → Iraq

### Sayfa Şablonu Kuralları
- Emoji/bayrak yok
- Büyük ihracatçı ülkeler: "Freight from [Ülke]" hub formatı (`china-freight/`, `india-freight/` gibi)
- Avrupa sayfaları: "Turkey ↔ [Ülke]" bilateral format
- Orta Doğu sayfaları: "Turkey ↔ [Ülke]" bilateral format
- Her sayfada: Trade Flows + Ports & Airports + FAQ×8 + SVG ikonlar
- Form'da direction dropdown (Turkey→X / X→Turkey)
- Transit süreler gerçek veriye dayalı

## Kurallar
- Renk & `showPanel()` değiştirme
- Panel div'lerini (`<!-- ═══ ... PANEL ═══ -->`) koru
- Mobil menüye link eklenince `#mobile-menu`'ya da ekle
- Commit mesajı Türkçe
- Track Shipment kartı hazır bekliyor (Supabase planı: `research/tracking_system_plan.md`)
