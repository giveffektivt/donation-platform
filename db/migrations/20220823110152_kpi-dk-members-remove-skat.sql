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
donations_recurring_per_year as (
    select
        12 * sum(amount)::numeric as donations_recurring_per_year
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
members_dk as (
    select
        count(distinct tin)::numeric as members_dk
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient = 'Giv Effektivt membership'
        and c.status = 'charged'
        and p.country = 'Denmark'
)
select
    *
from
    members_dk,
    donations_total,
    donations_recurring_per_year;

-- Re-grant access to these views - NO CHANGE
grant select on kpi to everyone;

-- migrate:down
