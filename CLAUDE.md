# Canxansa Site

**Repo:** anilsagir34/canxansa-site → canxansa.com (GitHub Pages)
**Stack:** Saf HTML/CSS/JS · Formspree `/f/mpqykzop` · GA4 `G-X19NTBBWNQ`
**Font:** Bebas Neue (başlık) · DM Sans (gövde)
**Renkler:** `--black #0a0a0a` `--white #f5f0eb` `--orange #e8521a` `--orange-dim #c44010` `--gray #1a1a1a` `--gray-mid #2e2e2e` `--gray-light #888`

## Ana Sayfa Panelleri (`showPanel('id')`)
`panel-home` → `panel-services` → `panel-corridors` → `panel-coverage` → `panel-how` → `panel-contact`
Coverage tabları: `data-tab="europe|asia|americas|mea"`

## Alt Sayfalar
- 28 güzergah klasörü: `turkey-{ülke}-freight/index.html`
- 3 koridor sayfası: `china-to-europe-via-turkey-freight/`, `central-asia-to-europe-freight/`, `estonia-turkey-freight/`
- Alt sayfalarda nav: `showPanel()` yok, `../index.html` direkt link
- Contact ikonlar: SVG inline (18×18, turuncu stroke)

## Mobil
`<=1024px` hamburger `#nav-hamburger` · `<=640px` nav-cta gizlenir · `#mobile-menu` overlay

## Kurallar
- Renk & `showPanel()` değiştirme
- Panel div'lerini (`<!-- ═══ ... PANEL ═══ -->`) koru
- Mobil menüye link eklenince `#mobile-menu`'ya da ekle
- Commit mesajı Türkçe
- Track Shipment kartı hazır bekliyor (Supabase planı: `research/tracking_system_plan.md`)
