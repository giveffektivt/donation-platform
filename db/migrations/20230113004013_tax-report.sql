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
        lower(p.email) as email,
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
        and c.created_at between year_from and year_to
    group by
        tin,
        lower(p.email),
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
    nullif (coalesce(b.total, 0) + coalesce(c.total, 0), 0) as not_deductible,
    coalesce(a.total, 0) + coalesce(b.total, 0) + coalesce(c.total, 0) as total
from
    with_tax a
    full join with_tin_no_tax b on a.tin = b.tin
        and a.email = b.email
    full join with_no_tin_no_tax c on coalesce(a.email, b.email) = c.email
order by
    email;

create view annual_tax_report as
with const as (
    select
        date_trunc('year', now() - interval '9 months') as year_from,
        date_trunc('year', now() + interval '3 months') as year_to
)
select
    2262 as const,
    42490903 as ge_cvr,
    replace(p.tin, '-', '') as donor_cpr,
    extract(year from min(c.created_at)) as year,
    '' as blank,
    round(sum(d.amount)) as total,
    case when min(g.amount) is not null then
        'A'
    else
        'L'
    end as ll8a_or_gavebrev,
    '' as ge_notes,
    0 as rettekode
from
    const
    cross join donor_with_sensitive_info p
    left join donation d on p.id = d.donor_id
    left join charge c on d.id = c.donation_id
    left join gavebrev g on p.id = g.donor_id
where (g.started_at <= year_from
    and not g.cancelled)
    or (c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at between year_from and year_to
        and d.tax_deductible)
group by
    tin
order by
    ll8a_or_gavebrev,
    donor_cpr;

grant select on annual_email_report to reader_sensitive;

grant select on annual_tax_report to reader_sensitive;

-- migrate:down
