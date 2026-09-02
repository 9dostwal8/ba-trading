# OfferDent — Database Export

Two things here: the **structure** (schema.sql) and the **data** (data.sql / csv/).

## Contents

| Path | What |
| --- | --- |
| `sql/schema.sql` | All tables, RLS policies, GRANTs, triggers, functions/RPCs (all migrations, in order) |
| `sql/data.sql` | All rows of the `public` schema, ready to run with psql |
| `csv/*.csv` | Same data, one CSV per table (for inspection or selective import) |
| `row-counts.csv` | Row count per table, so you can verify the import |

## Import into your own Supabase

1. Create a new Supabase project (or self-hosted stack).
2. Create the two **private** storage buckets first: `products` and `banners`.
3. Apply the structure:

```bash
psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" -f sql/schema.sql
```

4. Load the data:

```bash
psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" -f sql/data.sql
```

`data.sql` wraps the load in a transaction and sets `session_replication_role = replica`,
so triggers and foreign-key checks don't fight the load order.

5. Verify:

```bash
psql "..." -c "select 'products', count(*) from products union all select 'orders', count(*) from orders;"
```

Compare against `row-counts.csv`.

## Single table only

```bash
psql "..." -c "\copy public.products from 'csv/products.csv' with (format csv, header true)"
```

## Important: user accounts are not in this export

Rows in `profiles`, `user_roles`, `orders` etc. reference user IDs from the
`auth` schema, which the managed backend does not expose for export. Two options:

- **Recreate users** on the new project with the *same UUIDs* using the Admin API
  (`supabase.auth.admin.createUser({ id, email, password })`), then all rows here line up.
- **Start auth clean** — have people sign up again, then relink by phone number
  (`profiles.phone`) and re-grant admin:

```sql
insert into public.user_roles (user_id, role) values ('<new-auth-uuid>', 'admin');
```

Storage files (product photos, banners) also live outside the database — copy them
bucket-to-bucket with the Supabase CLI or the S3-compatible endpoint.

## Order of operations

`schema.sql` → buckets → auth users → `data.sql` → storage files.
