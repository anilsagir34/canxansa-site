# Canxansa Site — Claude Talimatları

## Genel Bilgi
- **Repo:** anilsagir34/canxansa-site (GitHub Pages → canxansa.com)
- **Tek dosya:** `index.html` (~1600 satır, saf HTML/CSS/JS)
- **Font:** Bebas Neue (başlıklar) · DM Sans (gövde)
- **Form:** Formspree (`/f/mpqykzop`)
- **Analytics:** GA4 — G-X19NTBBWNQ

## Renk Paleti (değiştirme)
```
--black: #0a0a0a   → zemin
--white: #f5f0eb   → ana metin
--orange: #e8521a  → accent / CTA
--orange-dim: #c44010 → hover
--gray: #1a1a1a    → kartlar
--gray-mid: #2e2e2e → border
--gray-light: #888  → ikincil metin
```

## Sayfa Yapısı (Panel Sistemi)
index.html tek sayfa, JS ile panel switching çalışıyor:

| Panel ID        | İçerik                        | Nav linki  |
|-----------------|-------------------------------|------------|
| `panel-home`    | Hero + Ticker + Action Cards  | Logo       |
| `panel-services`| Air / Sea / Road kartları     | Services   |
| `panel-corridors`| 3 koridor kartı (link→subpage)| Corridors  |
| `panel-coverage`| Bölge tabları (4 tab)         | Routes     |
| `panel-how`     | 4 adım süreci                 | Process    |
| `panel-contact` | Quote formu + iletişim        | Contact    |

Footer tüm panellerin dışında, her zaman görünür.

## Kritik JS Fonksiyonu
```js
showPanel('services') // paneli değiştirmek için
```
Tüm `href="#contact"` vb. anchor linkler JS ile intercept ediliyor.

## Action Cards (panel-home altında)
1. **Get a Quote** — origin/dest input → contact formuna taşır
2. **Our Services** — SVG ikonlu 3 satır (Air/Sea/Road) → panel-services
3. **Track Shipment** — disabled (coming soon tag kaldırıldı, kart duruyor)

## Coverage Tabları
`data-tab="europe|asia|americas|mea"` → `data-panel="..."` eşleşmesi

## Güzergah Alt Sayfaları
28 klasör var (turkey-germany-freight/ vb.) — her biri kendi index.html

## Corridor Sayfaları (3 özel sayfa)
- `china-to-europe-via-turkey-freight/`, `central-asia-to-europe-freight/`, `estonia-turkey-freight/`
- Ana sayfada section başlığı: **SPECIALTY CORRIDORS** (DUAL-HUB değil)
- Koridor kartlarında `.corridor-route` class — emoji değil, text rota (`CHINA → TURKEY → EUROPE`)
- Alt sayfalarda hamburger: index.html'den farklı — `showPanel()` yok, direkt link (`../index.html`)
- Alt sayfalarda contact ikonları SVG (inline style div içinde, 18x18)
- Alt sayfalarda `.related-flag` div'leri yok (kaldırıldı)

## Kargo Takip Sistemi (Yapılacak)
- Plan: `/research/tracking_system_plan.md` dosyasında
- Supabase + admin şifre korumalı panel
- Track Shipment kartı hazır bekliyor

## Mobil Navigasyon
- `<=1024px`: hamburger butonu (`#nav-hamburger`) görünür, `.nav-center` gizlenir
- `<=640px`: `.nav-cta` da gizlenir, menüdeki CTA çalışır
- `#mobile-menu` — tam ekran overlay, `showPanel()` kullanır, açıkken `body.overflow: hidden`
- Hamburger açma/kapama: `.open` class toggle

## Contact Section İkonlar
- Email · Coverage · Response Time ikonları SVG (turuncu stroke, 20x20) — emoji değil

## Düzenleme Kuralları
- Renkleri değiştirme
- `showPanel()` fonksiyonunu bozma
- Panel açma/kapama div'lerini (`<!-- ═══ ... PANEL ═══ -->`) koru
- Mobil menüye yeni link eklerken `#mobile-menu` div'ine de ekle
- Commit her zaman Türkçe açıklama ile
