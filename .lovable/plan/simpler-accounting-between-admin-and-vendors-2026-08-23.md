# Simpler accounting between admin and vendors

Today accounting is spread over four screens (admin accounting, admin charges, vendor accounting, vendor costs) with many numbers on one page. The fix is not more data — it is one shared monthly statement that both sides read the same way.

## The idea: one monthly statement per vendor

For every vendor and every month there is exactly one document with three lines:

```text
Month: August 2026 · Vendor: Dental House
------------------------------------------
Sales (accepted orders)          1,200,000
- Commission (store share)        -120,000
- Marketing & stickers             -35,000
- Reward points sponsored           -8,000
==========================================
Vendor payout                      1,037,000
Status: unpaid / partly paid / paid
```

Admin sees the list of these statements; the vendor sees only their own. Same numbers, same wording, same invoice — no reconciliation arguments.

## What changes on screen

**Vendor panel → Accounting** becomes one page:
- Big card: this month's payout + status.
- Three collapsible lines (sales, commission, marketing/rewards) that expand to the order/charge rows behind them.
- Month picker + "Download statement" button. Nothing else.

**Admin panel → Accounting** becomes one table:
- Row per vendor for the chosen month: sales, commission, marketing, payout, status.
- Row click opens the same statement the vendor sees, with "Mark paid / partly paid" and a payment note.
- Top strip: store totals for the month (sales, collected, receivable, store income).
- Customer statements move to their own sub-tab so they stop competing with vendor money.

**Merged/removed**
- Admin "Charges" and vendor "Costs" fold into the Marketing line of the statement (still itemised when expanded).
- One invoice generator for both sides instead of separate layouts.

## Rules that keep it unambiguous

- A month closes on the accepted/confirmed date of the order, not the created date.
- Cancelled/refused orders never appear anywhere.
- Commission and reward cost are the snapshotted values on the line item, never recalculated later — so closed months never move.
- Statement status: `unpaid → partly_paid → paid`, with amount paid and date; a closed month is read-only unless admin reopens it.
- "all periods" view is report-only: no marking paid there.

## Technical notes

- Reuse `vendor_settlements` as the statement record; add `rewards_total`, `paid_amount`, `closed_at`, and keep `(vendor_id, period)` unique.
- Add a `vendor_statement(_vendor_id, _period)` security-definer function returning the three totals + rows, so admin and vendor read identical figures from one place; RLS: admin all, vendor own.
- `src/lib/accounting.ts` keeps the math but exposes one `statement()` helper; `vendorLedgers` becomes a thin wrapper over it.
- Rewrite `AdminAccounting.tsx` (vendor table + statement drawer + customers sub-tab) and `VendorAccounting.tsx` (single statement view); delete `AdminCharges.tsx` / `VendorCosts.tsx` tabs after folding their rows in.
- One shared print layout in `src/lib/invoice.ts` via `printStatement`.
- New trilingual keys for the statement labels and payment statuses.
