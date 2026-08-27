create or replace function public.owns_order(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders o where o.id = _order_id and o.user_id = auth.uid())
$$;

create or replace function public.order_has_my_vendor_items(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.order_items i
    where i.order_id = _order_id and i.vendor_id in (select public.my_vendor_ids())
  )
$$;

drop policy if exists "vendors read orders with their items" on public.orders;
create policy "vendors read orders with their items" on public.orders
for select to authenticated using (public.order_has_my_vendor_items(id));

drop policy if exists "own order items read" on public.order_items;
create policy "own order items read" on public.order_items
for select to authenticated using (public.owns_order(order_id));

drop policy if exists "own order items insert" on public.order_items;
create policy "own order items insert" on public.order_items
for insert to authenticated with check (public.owns_order(order_id));