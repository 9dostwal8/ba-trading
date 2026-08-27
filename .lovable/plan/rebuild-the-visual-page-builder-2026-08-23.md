# Rebuild the visual page builder

## Goal
Replace the current mixed/duplicated builder with one reliable visual editor for the whole customer-facing app. The editor will change only presentation: templates, colors, icons, text, visibility, spacing, frames, and safe section order. It will never expose or modify code, scripts, database logic, checkout logic, or permissions.

## What will change

### 1. Use the real page as the editing canvas
- Preview the selected live route rather than drawing approximate placeholder blocks.
- Add a safe editor mode that identifies the real editable areas on the page.
- Clicking a visible area selects its matching settings; mobile and desktop previews use the same saved draft.
- Dynamic pages use a real available product, vendor, bundle, or order example when possible.

### 2. Make every editable area explicit
- Create one visual configuration schema shared by all supported pages.
- Bind each existing page area to a stable ID so the builder never guesses which block it represents.
- Keep functional areas protected: product lists, cart calculations, forms, payment, account data, and actions remain operational and cannot be replaced with arbitrary code.
- Allow protected areas to change safe presentation fields: title, supporting text, icon, color role, frame/template, spacing, visibility, and order where safe.

### 3. Remove the two competing builder systems
- Stop merging legacy `page_blocks` with page documents at render time.
- Migrate useful custom text/image/icon/CTA blocks once, de-duplicate them, and use `page_documents` as the single source of truth.
- Remove fallback behavior that displays the wrong block or duplicates sections while scrolling.

### 4. Add practical visual controls
- Page-level template, surface, content width, density, and section spacing.
- Section-level template, semantic color, icon, frame, padding, visibility, and safe ordering.
- Trilingual text editing for Arabic, Kurdish, and English, including title, description, and button label where supported.
- Custom visual blocks limited to text, icon features, image/banner, divider, notice, and CTA.
- Clear controls for duplicate, reset, undo, save draft, publish, and restore published design.

### 5. Connect global design settings everywhere
- Apply theme colors, typography, card design, spacing, and radius tokens consistently across storefront pages.
- Update remaining hardcoded storefront presentation so product cards, offer cards, category cards, cart panels, profile panels, and informational frames respond to Design Studio settings.
- Keep semantic colors meaningful: success remains green, information blue, warning amber, destructive red.

### 6. Verify route coverage and behavior
- Verify home, products, product detail, categories, offers, deals, near-expiry, outlet, bundles, vendors, cart, auth, profile, rewards, savings, notifications, orders, and signup pages.
- Test draft vs published behavior, page switching, refresh persistence, mobile/desktop visibility, drag ordering, text/icon/color edits, and absence of duplicate scrolling content.
- Confirm checkout, authentication, ordering, rewards, and vendor/admin business logic are unchanged.

## Technical details
- Keep `page_documents` as the versioned visual configuration store.
- Introduce reusable visual wrappers/data attributes around real route modules instead of rendering fake module previews.
- Normalize older documents against the current page schema so missing modules are restored once without duplicating existing modules.
- Use semantic design tokens and the existing icon registry; no arbitrary CSS, HTML, JavaScript, or script fields will be accepted.
- Roll out route integration in shared wrappers/components to minimize per-page code and prevent future drift.
