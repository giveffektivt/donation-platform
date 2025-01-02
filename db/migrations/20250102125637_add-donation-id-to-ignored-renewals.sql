-- migrate:up
drop view ignored_renewals;

create view ignored_renewals as
with last_charge as (
    select distinct on (p.id)
        p.id,
        p.name,
        p.email,
        d.amount,
        d.recipient,
        c.status,
        c.created_at
    from
        donor_with_contact_info p
        join donation d on p.id = d.donor_id
        join charge c on d.id = c.donation_id
    where
        d.frequency != 'once'
    order by
        p.id,
        c.created_at desc
),
never_activated as (
    select distinct on (p.id)
        p.id,
        d.id as donation_id,
        d.created_at
    from
        donor_with_contact_info p
        left join donation d on p.id = d.donor_id
        left join charge c on d.id = c.donation_id
    where
        c.id is null
        and d.frequency != 'once'
),
last_payment_by_email as (
    select distinct on (p.email,
        d.recipient)
        p.email,
        d.recipient,
        c.created_at
    from
        donor_with_contact_info p
        join donation d on p.id = d.donor_id
        join charge c on d.id = c.donation_id
    where
        c.status = 'charged'
    order by
        p.email,
        d.recipient,
        c.created_at desc
),
email_to_name as (
    select distinct on (email)
        name,
        email
    from
        donor_with_contact_info p
    where
        name is not null
)
select
    coalesce(lc.name, en.name) as name,
    lc.email,
    lc.amount,
    lc.recipient,
    na.donation_id,
    now()::date - na.created_at::date as days_ago
from
    last_charge lc
    join never_activated na on lc.id = na.id
    left join last_payment_by_email lp on lc.email = lp.email
        and lc.recipient = lp.recipient
    left join email_to_name en on lc.email = en.email
where
    lc.status = 'error'
    and (lp.created_at is null
        or lp.created_at < lc.created_at)
order by
    na.created_at;

grant select on ignored_renewals to everyone;

-- migrate:down
