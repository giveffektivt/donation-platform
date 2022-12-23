-- migrate:up
--
-- 1. Add support for gavebrev.
-- 2. Allow optional prefix for randomly generated short IDs, to distinguish regular and gavebrev bank transfers.
--
alter table _charge
    alter column short_id drop default;

drop function gen_short_id;

-- Generate short human-readable ID, unique within a given table and column, with an optional prefix.
create function gen_short_id (in table_name text, in column_name text, in prefix text default '')
    returns text
    language plpgsql
    volatile strict parallel unsafe
    as $$
declare
    random_id text;
    temp text;
    current_len int4 := 4;
    chars text := '23456789abcdefghjkmnpqrstuvwxyz';
    sql text;
    advisory_1 int4 := hashtext(format('%I:%I', table_name, column_name));
    advisory_2 int4;
    advisory_ok bool;
begin
    sql := format('select %s from giveffektivt.%I where %s = $1', column_name, table_name, column_name);
    loop
        random_id := prefix || gen_random_string (current_len, chars);
        advisory_2 := hashtext(random_id);
        advisory_ok := pg_try_advisory_xact_lock(advisory_1, advisory_2);
        if advisory_ok then
            execute sql into temp
            using random_id;
            exit
            when temp is null;
        end if;
            current_len := current_len + 1;
        end loop;
        return random_id;
end
$$;

alter table _charge
    alter column short_id set default gen_short_id ('_charge', 'short_id');

create type gavebrev_type as enum (
    'percentage',
    'amount'
);

create table _gavebrev (
    id uuid primary key default gen_random_uuid (),
    donor_id uuid references _donor (id) not null,
    short_id text unique not null default gen_short_id ('_gavebrev', 'short_id', 'f-'),
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
    short_id,
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
grant select on gavebrev to reader;

grant insert, update, delete on gavebrev to writer;

-- access to short_id field on _charge to be able to insert with default value
-- grant select (short_id) on _gavebrev to writer;
-- migrate:down
