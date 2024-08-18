-- migrate:up
alter table _fundraiser
    add column has_match boolean not null default (false),
    add column match_currency text;

drop view fundraiser;

create view fundraiser as
select
    id,
    email,
    title,
    description,
    media,
    target,
    has_match,
    match_currency,
    key,
    created_at,
    updated_at
from
    _fundraiser
where
    deleted_at is null;

grant select on fundraiser to reader;

grant insert, update, delete on fundraiser to writer;

create table _fundraiser_activity_checkin(
    id uuid primary key default gen_random_uuid(),
    fundraiser_id uuid not null references _fundraiser(id),
    amount numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view fundraiser_activity_checkin as
select
    id,
    fundraiser_id,
    amount,
    created_at,
    updated_at
from
    _fundraiser_activity_checkin
where
    deleted_at is null;

grant select on fundraiser_activity_checkin to reader;

grant insert, update, delete on fundraiser_activity_checkin to writer;

alter type donation_frequency
    add value 'match';

-- migrate:down
