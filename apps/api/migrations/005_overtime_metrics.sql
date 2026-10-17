-- Overtime metrics: (min(done, target) / target * weight) + (extra * overtime_rate)
alter table metrics drop constraint if exists metrics_formula_type_check;
alter table metrics add constraint metrics_formula_type_check
  check (formula_type in ('ratio', 'count', 'overtime'));
alter table metrics add column if not exists overtime_rate numeric not null default 0 check (overtime_rate >= 0);
