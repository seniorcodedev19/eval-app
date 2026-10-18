-- Custom metrics can use the overtime formula again. Only Time Tracking reads time_logs.
update metrics
set formula_type = 'overtime',
    overtime_rate = case when overtime_rate > 0 then overtime_rate else 1 end
where key <> 'time_tracking'
  and formula_type = 'count'
  and target > 0
  and key not in ('bugs_fixed', 'docs_shared');
