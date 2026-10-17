-- Existing reports used Monday as week_start. Shift those to Sunday.
update weekly_reports
set week_start = (week_start - interval '1 day')::date
where extract(dow from week_start) = 1;
