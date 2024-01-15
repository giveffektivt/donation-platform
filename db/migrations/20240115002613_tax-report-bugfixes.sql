-- migrate:up
--
-- Bug 1: make sure to select the earliest year for the initial record in recursion
-- Bug 2: make sure all annual_tax_report_gavebrev_all_payments contains every single year, even if donor didn't donate anything that year
create or replace view annual_tax_report_gavebrev_results as
with recursive data as (
    select
        *
    from ( select distinct on (get.tin)
            get.tin,
            get.year,
            a.can_be_reported_this_year,
            get.expected_total,
            gap.actual_total,
            c.non_gavebrev_total,
            b.gavebrev_total as result,
            gap.actual_total - get.expected_total - c.non_gavebrev_total as aconto_debt
        from
            annual_tax_report_gavebrev_expected_totals get
            inner join annual_tax_report_gavebrev_all_payments gap on gap.tin = get.tin
                and gap.year = get.year
        left join max_tax_deduction m on m.year = get.year
        cross join lateral (
            select
                get.expected_total as can_be_reported_this_year) a
            cross join lateral (
                select
                    round(least(get.income * 0.15, least(a.can_be_reported_this_year, gap.actual_total))) as gavebrev_total,
                least(a.can_be_reported_this_year, gap.actual_total) as uncapped_gavebrev_total) b
            cross join lateral (
                select
                    cast(get.maximize_tax_deduction as integer) * least(coalesce(m.value, 0), greatest(0, gap.actual_total - b.uncapped_gavebrev_total)) as non_gavebrev_total) c
            order by
                get.tin,
                get.year) _a
        union all
        select
            get.tin,
            get.year,
            a.can_be_reported_this_year,
            get.expected_total,
            gap.actual_total,
            c.non_gavebrev_total,
            b.gavebrev_total as result,
            gap.actual_total - get.expected_total - c.non_gavebrev_total + least(0, data.aconto_debt) as aconto_debt
    from
        annual_tax_report_gavebrev_expected_totals get
        inner join data on data.tin = get.tin
            and data.year = get.year - 1
        inner join annual_tax_report_gavebrev_all_payments gap on gap.tin = get.tin
            and gap.year = get.year
        left join max_tax_deduction m on m.year = get.year
        cross join lateral (
            select
                greatest(0, get.expected_total - data.aconto_debt) as can_be_reported_this_year) a
        cross join lateral (
            select
                round(least(get.income * 0.15, least(a.can_be_reported_this_year, gap.actual_total))) as gavebrev_total,
            least(a.can_be_reported_this_year, gap.actual_total) as uncapped_gavebrev_total) b
        cross join lateral (
            select
                cast(get.maximize_tax_deduction as integer) * least(coalesce(m.value, 0), greatest(0, gap.actual_total - b.uncapped_gavebrev_total)) as non_gavebrev_total) c
)
    select
        *
    from
        data;

create or replace view annual_tax_report_gavebrev_all_payments as
with gavebrev_per_tin as (
    select
        tin,
        min(started_at) as started_at,
        max(stopped_at) as stopped_at
    from
        gavebrev g
        inner join donor_with_sensitive_info p on g.donor_id = p.id
    group by
        tin
),
gavebrev_tin_years_until_now as (
    select
        tin,
        generate_series(extract(year from started_at), extract(year from year_from)) as year
    from
        annual_tax_report_const
        cross join gavebrev_per_tin g
    where
        started_at <= year_from
        and stopped_at > year_from
),
gavebrev_tin_all_donations_per_year as (
    select
        i.tin,
        i.year,
        d.amount
    from
        gavebrev_tin_years_until_now i
        inner join donor_with_sensitive_info p on i.tin = p.tin
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
            and i.year = extract(year from c.created_at)
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and d.tax_deductible
)
select
    i.tin,
    i.year,
    coalesce(round(sum(d.amount)), 0) as actual_total
from
    gavebrev_tin_years_until_now i
    left join gavebrev_tin_all_donations_per_year d on i.tin = d.tin
        and i.year = d.year
group by
    i.tin,
    i.year
order by
    i.tin,
    i.year;

-- migrate:down
