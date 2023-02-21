-- migrate:up
--
create view annual_email_report as
with const as (
    select
        date_trunc('year', now() - interval '9 months') as year_from,
        date_trunc('year', now() + interval '3 months') as year_to
),
data as (
    select
        p.tin,
        p.email,
        d.tax_deductible,
        sum(d.amount) as total
    from
        const
        cross join donor_with_sensitive_info p
        left join donation d on p.id = d.donor_id
        left join charge c on d.id = c.donation_id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at <@ tstzrange(year_from, year_to, '[)')
    group by
        tin,
        p.email,
        tax_deductible
),
with_tax as (
    select
        *
    from
        data
    where
        tax_deductible
),
with_tin_no_tax as (
    select
        *
    from
        data
    where
        not tax_deductible
        and tin is not null
),
with_no_tin_no_tax as (
    select
        *
    from
        data
    where
        not tax_deductible
        and tin is null
)
select
    coalesce(a.tin, b.tin) as tin,
    coalesce(a.email, b.email, c.email) as email,
    a.total as tax_deductible,
    nullif(coalesce(b.total, 0) + coalesce(c.total, 0), 0) as not_deductible,
    coalesce(a.total, 0) + coalesce(b.total, 0) + coalesce(c.total, 0) as total
from
    with_tax a
    full join with_tin_no_tax b on a.tin = b.tin
        and a.email = b.email
    full join with_no_tin_no_tax c on coalesce(a.email, b.email) = c.email
order by
    email;

--
-- Annual tax report
--
create view annual_tax_report_const as
select
    date_trunc('year', now() - interval '9 months') as year_from,
    date_trunc('year', now() + interval '3 months') as year_to;

create view annual_tax_report_current_payments as
select
    p.tin,
    round(sum(d.amount)) as total,
    min(extract(year from c.created_at)) as year
from
    annual_tax_report_const
    cross join donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and c.created_at <@ tstzrange(year_from, year_to, '[)')
    and d.tax_deductible
group by
    p.tin;

create view annual_tax_report_gavebrev_since as
select
    donor_id,
    tin,
    gavebrev_start
from
    lateral (
        select
            donor_id,
            min(extract(year from started_at)) as gavebrev_start
        from
            annual_tax_report_const,
            gavebrev
        where
            coalesce(stopped_at, now()) > year_from
        group by
            donor_id) a
    cross join lateral (
        select
            tin
        from
            donor_with_sensitive_info p
        where
            id = donor_id
        limit 1) b;

create view annual_tax_report_gavebrev_checkins as
select
    tin,
    y as year,
    coalesce(c.income_verified, c.income_preliminary, c.income_inferred, 0) as income,
    coalesce(c.maximize_tax_deduction, false) as maximize_tax_deduction
from
    annual_tax_report_const
    cross join annual_tax_report_gavebrev_since g
    cross join generate_series(g.gavebrev_start, extract(year from year_to) - 1) as y
    left join gavebrev_checkin c on c.year = y
        and c.donor_id = g.donor_id;

create view annual_tax_report_gavebrev_expected_totals as
select
    c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction,
    round(sum(
            case when g.type = 'percentage' then
                greatest(0, c.income - coalesce(g.minimal_income, 0)) * g.amount / 100
            when g.type = 'amount' then
                greatest(0, cast(c.income > coalesce(g.minimal_income, 0) as integer) * g.amount)
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

create view annual_tax_report_gavebrev_all_payments as
select
    p.tin,
    extract(year from c.created_at) as year,
    round(sum(d.amount)) as actual_total
from
    annual_tax_report_const
    cross join donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and c.created_at < year_to
    and d.tax_deductible
group by
    p.tin,
    extract(year from c.created_at);

create view annual_tax_report_gavebrev_results as
with recursive data as (
    select distinct on (get.tin)
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

create view annual_tax_report_data as
with with_gavebrev as (
    select distinct on (gr.tin)
        'L' as ll8a_or_gavebrev,
        gr.tin,
        gr.result as total,
        gr.aconto_debt,
        gr.year
    from
        annual_tax_report_gavebrev_results gr
    order by
        gr.tin,
        gr.year desc
),
gavebrev_current_non_gavebrev_total as (
    select distinct on (gr.tin)
        gr.tin,
        gr.year,
        gr.non_gavebrev_total
    from
        annual_tax_report_gavebrev_results gr
    order by
        gr.tin,
        gr.year desc
),
without_gavebrev as (
    select
        'A' as ll8a_or_gavebrev,
        d.tin,
        coalesce(gr.non_gavebrev_total, d.total) as total,
        0 as aconto_debt,
        d.year
    from
        annual_tax_report_current_payments d
        left join gavebrev_current_non_gavebrev_total gr on gr.tin = d.tin
),
data as (
    select
        *
    from
        with_gavebrev
union
select
    *
from
    without_gavebrev
)
select
    *
from
    data
where
    total > 0
    or aconto_debt > 0
order by
    tin,
    ll8a_or_gavebrev desc;

create view annual_tax_report as
select
    2262 as const,
    42490903 as ge_cvr,
    replace(tin, '-', '') as donor_cpr,
    year,
    '' as blank,
    total,
    ll8a_or_gavebrev,
    '' as ge_notes,
    0 as rettekode
from
    annual_tax_report_data
where
    total > 0;

grant select on annual_email_report to reader_sensitive;

grant select on annual_tax_report to reader_sensitive;

-- migrate:down
