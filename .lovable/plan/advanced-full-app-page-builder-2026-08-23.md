# Advanced Full-App Page Builder

## Goal
Replace the current placeholder-based builder with a true visual editor where every page shows its real existing sections in the correct order. Admins can edit multilingual text, icons, frames, spacing, visibility, responsive behavior, and templates while critical commerce/account actions remain protected and functional.

## What will change

### 1. One accurate page and section registry
- Create one typed registry for every editable page and every section it actually renders.
- Include Home, Offers, Near-expiry, Outlet, Deals, Brands, Bundles, Categories, Products, Product detail, Cart, Suppliers, Supplier detail, Rewards, Profile, Savings, Notifications, Discounts guide, Vendor signup, Sign in, QR scan, Bundle detail, Payment, Orders, and Order detail.
- Dynamic previews will use a real available product, supplier, bundle, or order instead of incorrectly opening a listing page.
- Remove synthetic hidden preset rows and incorrect section guesses.

### 2. Make existing page content the builder source of truth
- Represent every current page part as a stable module: hero/header, filters, product grid/list, banners, offer cards, checkout steps, delivery panel, reward panel, profile menu, signup steps, FAQs, CTAs, and other visible areas.
- Routes will render their ordered module definitions rather than hardcoded page order plus unrelated top/bottom blocks.
- Required functional modules are locked against deletion, but can be reordered within safe zones and have their presentation/content edited.
- Optional modules can be hidden, duplicated, moved, or added from the block library.

### 3. Advanced content and appearance controls
- Add per-module controls for Arabic, Kurdish, and English titles, subtitles, labels, helper text, and button text.
- Add searchable icon selection, image upload, link editing, item limits, product/category/vendor data source, layout style, card style, frame, border, background tone, alignment, spacing, columns, and mobile/desktop visibility.
- Add section templates for hero, product rail, product grid, icon features, split promo, banner, FAQ, CTA, notice, stats, and form-shell presentations.
- Keep business data such as product prices, inventory, orders, rewards, and shipping rules connected to their existing backend sources.

### 4. Safe full control for functional pages
- Cart, checkout, login, signup, profile, payment, and order modules retain required inputs, validation, authorization, and actions.
- The builder can edit their copy, icons, frame/template, spacing, visibility of optional helper areas, and safe ordering.
- Required modules cannot be removed or configured into an unusable state; the editor will clearly mark them as protected.

### 5. Real draft and publish workflow
- Extend page-builder storage to keep separate draft and published page documents, with version metadata.
- Existing storefront content will be seeded as real editable page documents, not hidden client-only placeholders.
- Editing updates the draft preview immediately; customers continue seeing the published version until Publish is pressed.
- Add reset-to-published, reset-page-to-default, unsaved-change state, validation, and clear save/publish feedback.

### 6. Rebuild the editor workspace
- Use a three-part responsive workspace: page/module tree, true page canvas, and contextual properties panel.
- Support drag-and-drop ordering with mobile move controls, section selection from the canvas/tree, duplicate, visibility, lock indicators, and undo for local changes.
- Use the same renderer for preview and storefront so the draft cannot differ from the real page.
- Add mobile/desktop preview switching and language switching inside the canvas.

### 7. Consolidate the existing design controls
- Keep global theme tokens and product-card controls, but connect page templates and section styles to the same system.
- Remove conflicting home-section ordering/editing controls or make them open the same page document.
- Existing admin content managers remain responsible for catalog data; the builder controls page composition and presentation.

### 8. Migration and validation
- Migrate current `page_blocks` and built-in page layouts into the new draft/published page documents without deleting existing catalog or transactional data.
- Preserve admin-only write access and public read access only to published layouts.
- Validate every registered public/customer page on mobile and desktop, including dynamic detail routes and authenticated pages where available.
- Verify that draft edits do not leak publicly, publish updates all viewers, required workflows still complete, and no page becomes blank from a missing module.

## Technical approach
- Add a versioned page document schema with `draft`, `published`, and timestamps; every module has a stable ID, type, data binding, content overrides, style settings, responsive settings, and lock metadata.
- Introduce a shared `PageRenderer` and typed module registry. Each module declares its renderer, defaults, supported controls, and safety constraints.
- Refactor routes incrementally to pass their existing data/actions into `PageRenderer`; no business logic moves into editable JSON.
- Replace `PAGE_PRESETS`, duplicated static-key lists, and find-by-kind fallback behavior with registry validation and explicit fallback defaults.
- Keep TypeScript schemas normalized at read boundaries so older stored documents remain renderable during migration.
