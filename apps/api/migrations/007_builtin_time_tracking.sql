-- Time Tracking is a built-in global metric. Hours come only from time_logs.

update metrics m
set
  key = 'time_tracking',
  name = 'Time Tracking',
  formula_type = 'overtime',
  team_id = null,
  active = true,
  unit = case when coalesce(m.unit, '') = '' then 'hours' else m.unit end,
  target = case when m.target > 0 then m.target else 90 end
where m.id = (
  select id from metrics
  where key <> 'time_tracking'
    and lower(trim(name)) in ('time tracking', 'tracked time', 'working time')
    and not exists (select 1 from metrics where key = 'time_tracking')
  order by (team_id is null) desc, id
  limit 1
);

insert into metrics (key, name, formula_type, weight, cap, target, overtime_rate, unit, active, team_id)
select 'time_tracking', 'Time Tracking', 'overtime', 40, 1.2, 90, 1, 'hours', true, null
where not exists (select 1 from metrics where key = 'time_tracking');

update metrics
set active = false
where key <> 'time_tracking'
  and lower(trim(name)) in ('time tracking', 'tracked time', 'working time');

-- Job Apply / interviews / etc. were overtime by mistake; they are weekly counts.
update metrics
set formula_type = 'count', overtime_rate = 0
where formula_type = 'overtime' and key <> 'time_tracking';
