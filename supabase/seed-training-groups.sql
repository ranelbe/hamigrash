-- ============================================================
-- HaMigrash — assign training groups to existing players
-- Idempotent: run after `reset-players-only.sql` to label the 70
-- players with 5 training groups of ~14 players each.
-- ============================================================

with ranked as (
  select id, row_number() over (order by squad_number) as rn
  from public.players
)
update public.players p
set training_group = case ((r.rn - 1) % 5)
  when 0 then 'ראשון בערב'
  when 1 then 'שלישי בבוקר'
  when 2 then 'רביעי בערב'
  when 3 then 'חמישי בבוקר'
  when 4 then 'שישי בצהריים'
end
from ranked r
where p.id = r.id;
