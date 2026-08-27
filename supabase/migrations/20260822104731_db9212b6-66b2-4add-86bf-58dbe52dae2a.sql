create or replace function public.admin_broadcast_notification(
  _audience text,
  _title_ar text,
  _title_ku text,
  _title_en text,
  _body_ar text,
  _body_ku text,
  _body_en text,
  _link text default '',
  _vendor_id uuid default null,
  _kind text default 'announcement'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _n integer := 0;
  _u uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  if coalesce(_title_ar,'') = '' and coalesce(_title_en,'') = '' and coalesce(_title_ku,'') = '' then
    raise exception 'title required';
  end if;

  for _u in
    select u.id from auth.users u
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
    end
  loop
    perform public.notify_user(
      _u, _kind,
      coalesce(nullif(_title_ar,''), _title_en, _title_ku),
      coalesce(nullif(_title_ku,''), _title_ar, _title_en),
      coalesce(nullif(_title_en,''), _title_ar, _title_ku),
      coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''),
      coalesce(_link,''), null, _vendor_id
    );
    _n := _n + 1;
  end loop;

  return _n;
end;
$$;

revoke all on function public.admin_broadcast_notification(text,text,text,text,text,text,text,text,uuid,text) from public;
grant execute on function public.admin_broadcast_notification(text,text,text,text,text,text,text,text,uuid,text) to authenticated;