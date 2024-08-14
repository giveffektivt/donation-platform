-- migrate:up
alter table _donation
    add column message text;

create view donation_with_contact_info as
select
    id,
    donor_id,
    emailed,
    amount,
    recipient,
    frequency,
    cancelled,
    gateway,
    method,
    tax_deductible,
    fundraiser_id,
    message,
    created_at,
    updated_at
from
    _donation
where
    deleted_at is null;

create view donation_with_sensitive_info as
select
    id,
    donor_id,
    emailed,
    amount,
    recipient,
    frequency,
    cancelled,
    gateway,
    method,
    tax_deductible,
    fundraiser_id,
    message,
    gateway_metadata,
    created_at,
    updated_at
from
    _donation
where
    deleted_at is null;

grant select on donation_with_contact_info to reader_contact;

grant select on donation_with_sensitive_info to reader_sensitive;

grant insert, update on donation_with_sensitive_info to writer;

grant insert, update on donation_with_contact_info to writer;

---- recreate views that used donation_with_gateway_info
---- also add fundraiser_id and message to failed_recurring_donations
drop view failed_recurring_donations;

drop view charges_to_charge;

create view failed_recurring_donations as
with paid_before as (
    select distinct on (d.id)
        d.id
    from
        donation_with_sensitive_info d
        inner join donor_with_contact_info p on d.donor_id = p.id
        inner join charge_with_gateway_info c on c.donation_id = d.id
    where
        gateway in ('Quickpay', 'Scanpay')
        and not cancelled
        and frequency in ('monthly', 'yearly')
        and status = 'charged'
    order by
        d.id
)
select
    *
from ( select distinct on (d.id)
        c.created_at as failed_at,
        c.id as charge_id,
        c.short_id,
        d.amount,
        d.method,
        d.gateway,
        p.id as donor_id,
        p.name as donor_name,
        p.email as donor_email,
        d.id as donation_id,
        d.gateway_metadata,
        d.recipient,
        d.frequency,
        d.tax_deductible,
        d.fundraiser_id,
        d.message,
        c.status
    from
        donation_with_sensitive_info d
        inner join donor_with_contact_info p on d.donor_id = p.id
        inner join charge_with_gateway_info c on c.donation_id = d.id
    where
        d.id in (
            select
                id
            from
                paid_before)
        order by
            d.id,
            c.created_at desc) s
where
    status = 'error'
order by
    failed_at desc;

create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    recipient,
    gateway,
    method,
    c.gateway_metadata,
    d.gateway_metadata as donation_gateway_metadata
from
    donor_with_contact_info dc
    inner join donation_with_sensitive_info d on d.donor_id = dc.id
    inner join charge_with_gateway_info c on c.donation_id = d.id
where
    gateway in ('Quickpay', 'Scanpay')
    and not cancelled
    and status = 'created'
    and c.created_at <= now();

grant select on failed_recurring_donations to reader_sensitive;

grant select on charges_to_charge to reader_sensitive;

grant update on charges_to_charge to writer;

----
drop view donation_with_gateway_info;

-- migrate:down
