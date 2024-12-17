-- migrate:up
drop view annual_email_report;

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
        c.transfer_id,
        sum(d.amount) as total
    from
        const
        cross join donor_with_sensitive_info p
        join donation d on p.id = d.donor_id
        join charge c on d.id = c.donation_id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at <@ tstzrange(year_from, year_to, '[)')
    group by
        p.tin,
        p.email,
        d.tax_deductible,
        c.transfer_id
),
members_confirmed as (
    select distinct on (p.tin)
        p.tin,
        p.email
    from
        const
        cross join donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient = 'Giv Effektivt'
        and c.created_at <@ tstzrange(year_from, year_to, '[)')
),
active_gavebrev as (
    select
        tin
    from
        const
        cross join gavebrev g
        inner join donor_with_sensitive_info p on g.donor_id = p.id
    where
        started_at <= year_from
        and stopped_at > year_from
    group by
        tin
),
email_to_tin_guess as (
    select distinct on (email)
        p.email,
        p.tin
    from
        const
        cross join donor_with_sensitive_info p
        join donation d on p.id = d.donor_id
        join charge c on d.id = c.donation_id
    where
        c.status = 'charged'
        and p.tin is not null
    order by
        email,
        p.tin,
        c.created_at desc
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
    coalesce(a.tin, b.tin, d.tin) as tin,
    coalesce(a.email, b.email, c.email) as email,
    coalesce(a.tin, b.tin) is null
    and d.tin is not null as is_tin_guessed,
    length(coalesce(a.tin, b.tin, d.tin, '')) = 8 as is_company,
    e.tin is not null as is_member,
    f.tin is not null as has_gavebrev,
    coalesce(a.transfer_id, b.transfer_id, c.transfer_id) as transfer_id,
    a.total as amount_tax_deductible,
    nullif(coalesce(b.total, 0) + coalesce(c.total, 0), 0) as amount_not_tax_deductible,
    coalesce(a.total, 0) + coalesce(b.total, 0) + coalesce(c.total, 0) as amount_total
from
    with_tax a
    full join with_tin_no_tax b on a.tin is not distinct from b.tin
        and a.email = b.email
        and a.transfer_id is not distinct from b.transfer_id
    full join with_no_tin_no_tax c on coalesce(a.email, b.email) = c.email
        and coalesce(a.transfer_id, b.transfer_id) is not distinct from c.transfer_id
    left join email_to_tin_guess d on coalesce(a.email, b.email, c.email) = d.email
    left join members_confirmed e on coalesce(a.tin, b.tin, d.tin) = e.tin
    left join active_gavebrev f on coalesce(a.tin, b.tin) = f.tin
order by
    email,
    tin,
    coalesce(a.transfer_id, b.transfer_id, c.transfer_id);

grant select on annual_email_report to reader_sensitive;

-- migrate:down
