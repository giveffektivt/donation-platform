-- migrate:up
create or replace view annual_tax_report_gavebrev_expected_totals as
select
    c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction,
    round(sum(
            case when g.type = 'percentage' then
                greatest(0, c.income - coalesce(g.minimal_income, 0)) * g.amount / 100
            when g.type = 'amount' then
                greatest(0, cast(c.income > 0
                        and c.income >= coalesce(g.minimal_income, 0) as integer) * g.amount)
            end)) as expected_total
from
    annual_tax_report_gavebrev_checkins c
    inner join donor_with_sensitive_info p on p.tin = c.tin
    inner join gavebrev g on g.donor_id = p.id
        and extract(year from g.started_at) <= c.year
group by
    c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction;

-- migrate:down
