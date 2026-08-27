create or replace function public.push_targets(_audience text, _vendor_id uuid default null)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join auth.users u on u.id = s.user_id
  where case _audience
    when 'all' then true
    when 'admins' then public.has_role(u.id, 'admin')
    when 'vendors' then exists (select 1 from public.vendor_members m where m.user_id = u.id)
    when 'dentists' then public.can_order(u.id)
    when 'vendor' then exists (
      select 1 from public.vendor_members m
      where m.user_id = u.id and m.vendor_id = _vendor_id
    )
    else false
  end;
end;
$$;

revoke all on function public.push_targets(text, uuid) from public;
revoke all on function public.push_targets(text, uuid) from anon;
grant execute on function public.push_targets(text, uuid) to authenticated;

create or replace function public.push_targets_self()
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.user_id = auth.uid();
$$;

revoke all on function public.push_targets_self() from public;
revoke all on function public.push_targets_self() from anon;
grant execute on function public.push_targets_self() to authenticated;

create or replace function public.push_subscription_prune(_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = _endpoint;
$$;

revoke all on function public.push_subscription_prune(text) from public;
revoke all on function public.push_subscription_prune(text) from anon;
grant execute on function public.push_subscription_prune(text) to authenticated;