-- migrate:up
drop view kpi;

drop view recipient_distribution;

drop view time_distribution;

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
            c.status = 'charged'
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
        and not d.cancelled
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
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and d.frequency = 'monthly'
        and not d.cancelled
),
monthly_added_value as (
    select
        sum(
            case when frequency = 'monthly' then
                amount * 12
            else
                amount
            end)::numeric as monthly_added_value
    from ( select distinct on (p.id)
            amount,
            frequency
        from
            donor p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and recipient != 'Giv Effektivt'
            and not d.cancelled
            and p.created_at >= date_trunc('month', now()) - interval '1 month') a
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
    monthly_donors,
    monthly_added_value;

create view recipient_distribution as
select
    coalesce(d.recipient, t.recipient) as recipient,
    coalesce(d.dkk_total, 0) as dkk_total,
    coalesce(d.dkk_total, 0) - coalesce(t.dkk_total, 0) as dkk_pending_transfer,
    coalesce(d.payments_total, 0) as payments_total
from (
    select
        recipient,
        count(*)::numeric as payments_total,
        sum(amount) as dkk_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
    group by
        recipient) d
    full outer join (
    select
        recipient,
        sum(amount) as dkk_total
    from
        transfer
    group by
        recipient) t on d.recipient = t.recipient
order by
    dkk_total desc;

create view time_distribution as
select
    to_char(year, 'yyyy') as year,
    to_char(month, 'Mon') as month,
    dkk_total,
    payments_total
from (
    select
        date_trunc('year', c.created_at) as year,
        date_trunc('month', c.created_at) as month,
        sum(amount) as dkk_total,
        count(*)::numeric as payments_total
    from
        charge c
        join donation d on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
    group by
        year,
        month
    order by
        year desc,
        month desc) a;

-- Re-grant access to these views - NO CHANGE
grant select on kpi to everyone;

grant select on recipient_distribution to everyone;

grant select on time_distribution to everyone;

-- migrate:down
