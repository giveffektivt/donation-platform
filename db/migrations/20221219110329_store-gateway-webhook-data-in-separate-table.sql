-- migrate:up
--
-- Remove gateway_response column from _charge table and charge_with_gateway_info view.
-- Recreate charges_to_charge with no change.
-- Add a new table to store gateway webhook data.
--
drop view charges_to_charge;

drop view charge_with_gateway_info;

alter table _charge
    drop column gateway_response;

create table gateway_webhook (
    id uuid primary key default gen_random_uuid (),
    gateway payment_gateway not null,
    payload jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create view charge_with_gateway_info as
select
    id,
    donation_id,
    short_id,
    status,
    gateway_metadata,
    created_at,
    updated_at
from
    _charge
where
    deleted_at is null;

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
    inner join donation_with_gateway_info d on d.donor_id = dc.id
    inner join charge_with_gateway_info c on c.donation_id = d.id
where
    gateway in ('Quickpay', 'Scanpay')
    and not cancelled
    and status = 'created'
    and c.created_at <= now();

grant insert on gateway_webhook to writer;

grant select on charge_with_gateway_info to reader_sensitive;

grant insert, update on charge_with_gateway_info to writer;

grant select on charges_to_charge to reader_sensitive;

--migrate:down
