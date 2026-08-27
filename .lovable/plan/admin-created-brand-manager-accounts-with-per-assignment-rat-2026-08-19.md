# Admin-created brand manager accounts with per-assignment rates

Replace phone-lookup assignment with: admin creates the account, then assigns one or more brands to that user, each assignment carrying its own rate.

## What changes for you

**Admin Panel → Brand managers** gets two areas:

1. **Managers**
   - "Add manager" form: name, phone, password → creates a ready-to-use login and grants the brand-manager role.
   - Each manager row lists the brands they manage, with rate shown, plus edit/remove.

2. **Brands**
   - Same as today (name, brand key, logo), but the commission fields move off the brand.
   - Assign a brand to a manager and set for that pair:
     - Percent of sale (e.g. 10%)
     - Fixed per item
     - Fixed per shipment/order
   - A brand can have several managers, each with a different rate.

**Accounting** stays in the same tab but breaks down by brand and by manager: gross sales, commission, net payout.

The brand portal (`/brand`) keeps working — a manager sees every brand assigned to them.

## Technical notes

- Migration:
  - `vendor_members` gains `commission_type` (`percent` | `fixed_per_item` | `fixed_per_order`) and `commission_value`; keep `vendors.commission_*` as a fallback default.
  - `order_items` gains `commission_scope` so a per-order fee is charged once per order+vendor.
  - Rewrite `snapshot_order_item_vendor` to resolve the rate from the vendor's assignment (assignment rate first, brand default otherwise) and to apply `fixed_per_order` only on the first line of that vendor in the order.
  - Grants + RLS: managers read their own `vendor_members` rows; only admins write them.
- New `src/lib/admin-users.functions.ts`: `createBrandManager` server fn — `requireSupabaseAuth`, verify caller `has_role(admin)`, then `supabaseAdmin.auth.admin.createUser` with the synthetic-email + phone convention used in `auth.tsx`, insert `profiles` and `user_roles('brand_manager')`.
- `AdminVendors.tsx` split into `AdminManagers` (create user, assignments) and the existing brand editor; remove the phone-lookup `addManager` mutation.
- `src/lib/vendors.ts`: totals computed per vendor and per member using snapshotted values.
- i18n keys for the new labels in Arabic and Kurdish.
