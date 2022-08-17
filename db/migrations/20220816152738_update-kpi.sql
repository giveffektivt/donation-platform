-- migrate:up
drop view kpi;

create view kpi as
with donations_total as (
    select
        sum(d.amount)::numeric as donations_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt membership'
),
donations_monthly as (
    select
        sum(amount)::numeric as donations_monthly
    from ( select distinct on (d.id)
            amount,
            c.status
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            recipient != 'Giv Effektivt membership'
            and frequency = 'monthly'
            and not cancelled
        order by
            d.id,
            c.created_at desc) c1
    where
        status = 'charged'
),
-- SKAT requirements, can be removed after we are approved
members as (
    select
        count(distinct tin)::numeric as members
    from
        donor_with_sensitive_info ds
        inner join donation d on d.donor_id = ds.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient = 'Giv Effektivt membership'
        and c.status = 'charged'
        and date_trunc('year', c.created_at) = date_trunc('year', now())
),
verified_count_200 as (
    select
        count(*)::numeric as verified_count_200
    from (
        select
            sum(d.amount)
        from
            donor_with_sensitive_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            d.recipient != 'Giv Effektivt membership'
            and c.status = 'charged'
            and p.country = 'Denmark'
            and p.tin is not null
            and p.name is not null
            and p.address is not null
        group by
            tin) c1
    where
        sum >= 200
),
verified_total as (
    select
        sum(d.amount)::numeric as verified_total
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient != 'Giv Effektivt membership'
        and c.status = 'charged'
        and p.country = 'Denmark'
        and p.tin is not null
        and p.name is not null
        and p.address is not null
)
select
    *
from
    members,
    verified_total,
    verified_count_200,
    donations_total,
    donations_monthly;

-- Re-grant access to these views - NO CHANGE
grant select on kpi to everyone;

-- migrate:down
