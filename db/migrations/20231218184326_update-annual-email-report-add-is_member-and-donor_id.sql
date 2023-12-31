-- migrate:up
drop view annual_email_report;

create view annual_email_report as
with const as (
    select
        date_trunc('year', now() - interval '9 months') as year_from,
        date_trunc('year', now() + interval '3 months') as year_to
),
members_confirmed as (
    select distinct on (p.tin)
        p.tin,
        p.email,
        p.id as donor_id
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient = 'Giv Effektivt'
        and c.created_at >= date_trunc('year', now())
),
data as (
    select
        (array_agg(p.id))[1] as donor_id,
        p.tin,
        p.email,
        d.tax_deductible,
        sum(d.amount) as total,
        case when m.tin is not null then
            true
        else
            false
        end as is_member
    from
        const
        cross join donor_with_sensitive_info p
        left join donation d on p.id = d.donor_id
        left join charge c on d.id = c.donation_id
        left join members_confirmed m on m.tin = p.tin
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at <@ tstzrange(year_from, year_to, '[)')
    group by
        p.tin,
        m.tin,
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
    coalesce(a.donor_id, b.donor_id, c.donor_id) as donor_id,
    coalesce(a.tin, b.tin) as tin,
    coalesce(a.email, b.email, c.email) as email,
    coalesce(a.is_member, b.is_member, c.is_member) as is_member,
    a.total as tax_deductible,
    nullif(coalesce(b.total, 0) + coalesce(c.total, 0), 0) as not_deductible,
    coalesce(a.total, 0) + coalesce(b.total, 0) + coalesce(c.total, 0) as total
from
    with_tax a
    full join with_tin_no_tax b on a.tin = b.tin
        and a.email = b.email
    full join with_no_tin_no_tax c on coalesce(a.email, b.email) = c.email
union all
select
    m.donor_id,
    m.tin,
    m.email,
    true as is_member,
    null as tax_deductible,
    null as not_deductible,
    null as total
from
    members_confirmed m
    left join data d on d.tin = m.tin
where
    d.tin is null
order by
    email;

grant select on annual_email_report to reader_sensitive;

-- migrate:down
