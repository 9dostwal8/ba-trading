with cleaned as (
  select pd.id,
         jsonb_agg(e order by ord) as mods
  from page_documents pd,
       lateral jsonb_array_elements(pd.draft->'modules') with ordinality as t(e, ord)
  where pd.page = 'home'
    and not (e->>'id' like 'legacy-%' and e->'block'->>'kind' = 'section')
  group by pd.id
)
update page_documents pd
set draft = jsonb_set(pd.draft, '{modules}', c.mods),
    published = case when pd.published ? 'modules' then jsonb_set(pd.published, '{modules}', c.mods) else pd.published end
from cleaned c
where pd.id = c.id;