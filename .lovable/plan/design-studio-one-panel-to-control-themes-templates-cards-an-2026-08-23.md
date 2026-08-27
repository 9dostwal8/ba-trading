# Design Studio — one panel to control themes, templates, cards and sections

Today Admin → Theme controls only two hues plus radius. Everything else (card shape, section layouts, hero style, spacing) is hardcoded across components. The plan turns it into a single **Design Studio** with 5 tabs and one live preview.

## Admin → Design Studio

```text
┌──────────────────────── Design Studio ─────────────────────────┐
│ [Theme] [Templates] [Cards] [Sections] [Typography]   ⟳ Live   │
│──────────────────────────────┬─────────────────────────────────│
│ controls (left)              │ live phone + desktop preview     │
│ presets, sliders, swatches   │ real Home/Card/Cart rendering    │
└──────────────────────────────┴─────────────────────────────────┘
```

### 1. Theme (extend what exists)
- Keep hue/chroma/radius, add: brand colour picker (hex → OKLCH), surface tone (white / soft grey / warm), contrast level, dark-mode toggle.
- Fixed semantic locks stay: success green, info blue, warning amber, danger red (so cart reward panels never turn red).
- Presets: Digikala Red, Ocean, Emerald, Royal, Sunset, Noir, plus "Save as my preset".

### 2. Templates (whole-app skins)
One tap changes the entire storefront personality. Each template is a bundle of tokens (radius, shadow, border weight, density, card style, hero style):
- **Digikala Market** — tight radius, thin borders, dense grid, red accents.
- **Clean Clinic** — airy spacing, soft shadows, rounded 16px, pastel section tints.
- **Bold Deals** — heavy type, high-contrast blocks, big price badges.
- **Minimal Outlet** — no shadows, hairline dividers, monochrome + one accent.

### 3. Cards
Global product-card controls with a 3-up live sample row:
- Shape: square / rounded / pill corners; border on/off; shadow level 0–3.
- Image ratio: 1:1 / 4:5 / 16:9; fill vs contain.
- Content toggles: brand line, vendor "X sellers" chip, savings %, expiry chip, reward coins, badge row position (over image / under title).
- Price layout: stacked / inline; strike-through style.
- Grid density on mobile: 2-col / 1.5-col scroll; desktop 3/4/5-col.

### 4. Sections
Reorder and restyle each home block (flash, near-expiry, outlet, bundles, brands, categories, USP, reward bar):
- Drag to reorder, show/hide, per-section title (AR/KU/EN).
- Style per section: header style (plain / pill / underline / gradient band), background (none / tint / gradient / image), item layout (scroll rail / grid / banner), countdown on/off.
- Colour mode: **inherit global** (default) or override hue — inherit stays default so the store never looks patchwork.

### 5. Typography & spacing
- Font pair (Vazirmatn default, plus 2–3 Arabic-safe alternatives), base size, heading weight, letter spacing for Latin, section gap, page max-width.

## Safety and workflow
- **Draft → Preview → Publish**: edits apply to a draft theme visible only to admins; Publish writes it live. "Revert to last published" and "Reset to Digikala default".
- All values stored in one `design_settings` row (JSON) + existing `home_sections` for order/colour, so nothing is hardcoded in components.

## Technical notes
- Extend `src/lib/theme.ts` to emit the full token set: `--radius`, `--card-border`, `--card-shadow`, `--density`, `--section-gap`, `--img-ratio`, plus existing colour tokens; add `templatePresets` bundles.
- New `design_settings` table (single row, admin-only write, public read) with GRANTs and RLS; draft column + published column.
- `ProductCard.tsx`, `HomeSections.tsx`, `DesktopHome.tsx`, `StoreLayout.tsx` read tokens/flags instead of fixed classes.
- Rebuild `AdminTheme.tsx` as `AdminDesign.tsx` with the 5 tabs and an iframe-free live preview rendering the real components inside a scoped token wrapper.

## Suggested build order
1. Token engine + `design_settings` + draft/publish.
2. Cards tab (biggest visual win) and ProductCard token wiring.
3. Templates presets.
4. Sections tab (reorder + per-section style).
5. Typography/spacing polish.
