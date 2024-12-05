-- migrate:up
--
-- Recreate transfer table
--
create type transfer_recipient as enum(
    'GiveWell Top Charities Fund',
    'GiveWell All Grants Fund',
    'Against Malaria Foundation',
    'Malaria Consortium',
    'Helen Keller International',
    'New Incentives',
    'Give Directly',
    'SCI Foundation'
);

drop view kpi;

drop view recipient_distribution;

drop rule transfers_soft_delete on transfer;

drop trigger transfers_update_timestamp on _transfer;

drop view transfer;

drop table _transfer;

create table _transfer(
    id uuid primary key default gen_random_uuid(),
    recipient transfer_recipient not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view transfer as
select
    id,
    recipient,
    created_at,
    updated_at
from
    _transfer
where
    deleted_at is null;

create trigger transfers_update_timestamp
    before update on _transfer for each row
    execute procedure trigger_update_timestamp();

create rule transfers_soft_delete as on delete to transfer
    do instead
    update
        _transfer set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

--
-- Link charges to transfers
--
alter table _charge
    add column transfer_id uuid references _transfer(id);

create or replace view charge as
select
    id,
    donation_id,
    short_id,
    status,
    created_at,
    updated_at,
    transfer_id
from
    _charge
where
    deleted_at is null;

create or replace view charge_with_gateway_info as
select
    id,
    donation_id,
    short_id,
    status,
    gateway_metadata,
    created_at,
    updated_at,
    transfer_id
from
    _charge
where
    deleted_at is null;

--
-- Recreate kpi view
--
create view kpi as
with dkk_total as (
    select
        round(sum(d.amount))::numeric as dkk_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
),
dkk_pending_transfer as (
    select
        coalesce(round(sum(d.amount))::numeric, 0) as dkk_pending_transfer
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and transfer_id is null
),
dkk_last_30_days as (
    select
        round(sum(d.amount))::numeric as dkk_last_30_days
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

--
-- New views
--
create view transferred_distribution as
select
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    donation d
    inner join charge c on c.donation_id = d.id
    inner join transfer t on c.transfer_id = t.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and transfer_id is not null
group by
    t.recipient
order by
    dkk_total desc;

create view pending_distribution as
select
    d.recipient,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    donation d
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and transfer_id is null
group by
    d.recipient
order by
    dkk_total desc;

create view transfer_overview as
select
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    t.created_at
from
    donation d
    join charge c on c. donation_id = d.id
    join transfer t on c.transfer_id = t.id
group by
    t.recipient,
    t.created_at
order by
    t.created_at,
    sum(amount) desc;

--
-- Restore permissions
--
grant select on transfer to everyone;

grant insert, update, delete on transfer to writer;

grant select on kpi to everyone;

grant select on pending_distribution to everyone;

grant select on transferred_distribution to everyone;

grant select on transfer_overview to everyone;

-- migrate:down
