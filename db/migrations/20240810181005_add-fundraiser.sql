-- migrate:up
create table _fundraiser(
    id uuid primary key default gen_random_uuid(),
    email text not null,
    title text not null,
    description text,
    media text,
    target numeric not null,
    key uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view fundraiser as
select
    id,
    email,
    title,
    description,
    media,
    target,
    key,
    created_at,
    updated_at
from
    _fundraiser
where
    deleted_at is null;

create trigger fundraiser_update_timestamp
    before update on _fundraiser for each row
    execute procedure trigger_update_timestamp();

create rule fundraiser_soft_delete as on delete to fundraiser
    do instead
    update
        _fundraiser set
        deleted_at = now()
    where
        id = old.id
        and deleted_at is null;

----------------------------------------------------
alter table _donation
    add column fundraiser_id uuid references _fundraiser(id);

create or replace view donation as
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
    created_at,
    updated_at,
    fundraiser_id
from
    _donation
where
    deleted_at is null;

create or replace view donation_with_gateway_info as
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
    gateway_metadata,
    created_at,
    updated_at,
    fundraiser_id
from
    _donation
where
    deleted_at is null;

-- migrate:down
