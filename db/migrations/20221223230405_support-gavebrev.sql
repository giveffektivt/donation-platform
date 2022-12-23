-- migrate:up
--
------------------------------------------------------------
-- Create gavebrev table and view
create type gavebrev_type as enum (
    'percentage',
    'amount'
);

create type gavebrev_status as enum (
    'created', -- the agreement is created and sent to the donor
    'rejected', -- donor rejected signing the agreement
    'active', -- donor signed the agreement and it's now active
    'cancelled', -- the agreement was cancelled before its completion date
    'completed', -- the agreement is completed (by current laws, after 10 years)
    'error' -- something went wrong
);

create table _gavebrev (
    id uuid primary key default gen_random_uuid (),
    donor_id uuid references _donor (id) not null,
    status gavebrev_status not null,
    type gavebrev_type not null,
    amount numeric not null, -- defined by 'type' as either an absolute amount in kr. or a percentage of the annual income
    minimal_income numeric, -- optional lower bound for the annual income, before which the agreement doesn't have effect in the given year
    cancelled boolean not null default (false), -- set manually: e.g. when donor asked to cancel the agreement
    started_at timestamptz not null, -- date (typically just year) when the agreement starts
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view gavebrev as
select
    id,
    donor_id,
    status,
    type,
    amount,
    minimal_income,
    cancelled,
    started_at,
    created_at,
    updated_at
from
    _gavebrev
where
    deleted_at is null;

------------------------------------------------------------
-- Automatically maintain `updated_at`
create trigger gavebrev_update_timestamp
    before update on _gavebrev for each row
    execute procedure trigger_update_timestamp ();

------------------------------------------------------------
-- Soft-delete data using `deleted_at`
create rule gavebrev_soft_delete as on delete to gavebrev
    do instead
    update
        _gavebrev set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

create rule donor_soft_delete_cascade_gavebrev as on update
    to _donor where
    old.deleted_at is null
    and new.deleted_at is not null
        do also
        update
            _gavebrev set
            deleted_at = now()
        where
            deleted_at is null
            and donor_id = old.id;

------------------------------------------------------------
-- Permissions
grant select on gavebrev to reader_sensitive;

grant insert, update, delete on gavebrev to writer;

-- migrate:down
