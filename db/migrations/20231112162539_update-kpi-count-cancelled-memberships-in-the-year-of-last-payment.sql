-- migrate:up
drop view kpi;

create view kpi as
with dkk_total as (
    select
        sum(d.amount)::numeric as dkk_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
),
dkk_pending_transfer as (
    select
        (max(dkk_total) - coalesce(sum(amount), 0))::numeric as dkk_pending_transfer
    from
        dkk_total
        left join transfer on true
),
dkk_last_30_days as (
    select
        sum(d.amount)::numeric as dkk_last_30_days
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at >= date_trunc('day', now()) - interval '30 days'
),
dkk_recurring_next_year as (
    select
        12 * sum(amount)::numeric as dkk_recurring_next_year
    from ( select distinct on (d.id)
            amount
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            c.status in ('charged', 'created')
            and recipient != 'Giv Effektivt'
            and frequency = 'monthly'
            and not d.cancelled) c1
),
members_confirmed as (
    select
        count(distinct p.tin)::numeric as members_confirmed
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient = 'Giv Effektivt'
        and c.created_at >= date_trunc('year', now())
),
members_pending_renewal as (
    select
        count(*)::numeric as members_pending_renewal
    from ( select distinct on (p.tin)
            p.tin,
            c.created_at
        from
            donor_with_sensitive_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient = 'Giv Effektivt'
            and not d.cancelled
        order by
            p.tin,
            c.created_at desc) a
    where
        created_at < date_trunc('year', now())
),
monthly_donors as (
    select
        count(distinct p.email)::numeric as monthly_donors
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status in ('charged', 'created')
        and d.recipient != 'Giv Effektivt'
        and d.frequency = 'monthly'
        and not d.cancelled
)
select
    *
from
    dkk_total,
    dkk_pending_transfer,
    dkk_last_30_days,
    dkk_recurring_next_year,
    members_confirmed,
    members_pending_renewal,
    monthly_donors;

-- Re-grant access to these views - NO CHANGE
grant select on kpi to everyone;

-- migrate:down
