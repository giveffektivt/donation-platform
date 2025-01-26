-- migrate:up
------------------------------------------------------------
-- Schema
create schema if not exists giveffektivt;

set search_path to giveffektivt;

------------------------------------------------------------
-- Enums
create type donation_recipient as enum (
    'Giv Effektivt membership',
    'GiveWell Maximum Impact Fund',
    'Against Malaria Foundation',
    'Give Directly',
    'Malaria Consortium',
    'Helen Keller International',
    'SCI Foundation',
    'New Incentives'
);

create type donation_frequency as enum (
    'once',
    'monthly',
    'yearly'
);

create type payment_gateway as enum (
    'ScanPay',
    'Bank transfer'
);

create type payment_method as enum (
    'Credit card',
    'MobilePay',
    'Bank transfer'
);

create type charge_status as enum (
    'created', -- exists only in our db, did not send to gateway (only for recurring)
    'waiting', -- waiting for the gateway to charge (could never happen if user aborted on gateway side)
    'charged', -- gateway confirmed a success
    'refunded', -- the charge was refunded to the donor
    'error' -- gateway reported a failure
);

create type emailed_status as enum (
    'no',
    'attempted',
    'yes'
);

------------------------------------------------------------
-- Functions
-- Generate random string of a given length
create function gen_random_string (in length integer, in chars text)
    returns text
    language plpgsql
    volatile strict parallel unsafe
    as $$
declare
    output text = '';
    i int4;
    pos int4;
begin
    for i in 1..length loop
        pos := 1 + cast(random() * (length(chars) - 1) as int4);
        output := output || substr(chars, pos, 1);
    end loop;
    return output;
end
$$;

-- Generate short human-readable ID of *at least* given length, unique within a given table and column
create function gen_short_id (in table_name text, in column_name text, in min_length integer default 4, in chars text default '23456789abcdefghjkmnpqrstuvwxyz')
    returns text
    language plpgsql
    volatile strict parallel unsafe
    as $$
declare
    random_id text;
    temp text;
    current_len int4 := min_length;
    sql text;
    advisory_1 int4 := hashtext(format('%I:%I', table_name, column_name));
    advisory_2 int4;
    advisory_ok bool;
begin
    sql := format('select %s from giveffektivt.%I where %s = $1', column_name, table_name, column_name);
    loop
        random_id := gen_random_string (current_len, chars);
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

------------------------------------------------------------
-- Tables
-- full info about donors
create table _donor (
    id uuid primary key default gen_random_uuid (),
    name text,
    email text not null,
    address text,
    postcode text,
    city text,
    cpr text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    _old_id integer -- ID in the old database in case we ever need this
);

-- full info about donations (both one-time and recurring ones)
create table _donation (
    id uuid primary key default gen_random_uuid (),
    donor_id uuid references _donor (id),
    emailed emailed_status not null default ('no'),
    amount numeric not null,
    recipient donation_recipient not null,
    frequency donation_frequency not null,
    cancelled boolean not null default (false), -- set manually: e.g. when donor asked to cancel, or we can't charge them anymore
    method payment_method not null,
    tax_deductible boolean not null,
    gateway payment_gateway not null,
    gateway_metadata jsonb not null default '{}', -- info relevant for all charges, e.g. bank msg or ScanPay subscription ID
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    _old_id integer -- ID in the old database in case we ever need this
);

-- full info about donation charges
create table _charge (
    id uuid primary key default gen_random_uuid (),
    donation_id uuid references _donation (id),
    short_id text unique not null default gen_short_id ('_charge', 'short_id'),
    status charge_status not null,
    gateway_metadata jsonb not null default '{}', -- info relevant for a specific charge, e.g. ScanPay idempotency_key
    gateway_response jsonb not null default '{}', -- whatever we received from gateway, e.g. charged / authorized / reverted info
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    _old_id integer -- ID in the old database in case we ever need this
);

-- helper table to sync with ScanPay
create table scanpay_seq (
    value integer primary key,
    created_at timestamptz not null default now()
);

------------------------------------------------------------
-- Primary views to use when possible (no sensitive info, respect soft-delete)
-- donor without any personal info
create view donor as
select
    id,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

-- donation without any sensitive info
create view donation as
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
    updated_at
from
    _donation
where
    deleted_at is null;

-- charge without any sensitive info
create view charge as
select
    id,
    donation_id,
    short_id,
    status,
    created_at,
    updated_at
from
    _charge
where
    deleted_at is null;

------------------------------------------------------------
-- Automatically maintain `updated_at`
-- trigger to be used in all tables
create function trigger_update_timestamp ()
    returns trigger
    as $body$
begin
    new.updated_at = now();
    return new;
end;
$body$
language plpgsql;

-- donor table
create trigger donor_update_timestamp
    before update on _donor for each row
    execute procedure trigger_update_timestamp ();

-- donation table
create trigger donation_update_timestamp
    before update on _donation for each row
    execute procedure trigger_update_timestamp ();

-- charge table
create trigger charge_update_timestamp
    before update on _charge for each row
    execute procedure trigger_update_timestamp ();

------------------------------------------------------------
-- Soft-delete data using `deleted_at`
create rule donor_soft_delete as on delete to donor
    do instead
    update
        _donor set
        deleted_at = now()
    where
        id = old.id
        and deleted_at is null;

create rule donation_soft_delete as on delete to donation
    do instead
    update
        _donation set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

create rule charge_soft_delete as on delete to charge
    do instead
    update
        _charge set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

create rule donor_soft_delete_cascade as on update
    to _donor where
    old.deleted_at is null
    and new.deleted_at is not null
        do also
        update
            _donation set
            deleted_at = now()
        where
            deleted_at is null
            and donor_id = old.id;

create rule donation_soft_delete_cascade as on update
    to _donation where
    old.deleted_at is null
    and new.deleted_at is not null
        do also
        update
            _charge set
            deleted_at = now()
        where
            deleted_at is null
            and donation_id = old.id;

------------------------------------------------------------
-- Additional views with restricted access to sensitive info
-- donor with contact information
create view donor_with_contact_info as
select
    id,
    name,
    email,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

-- donor with full personal information
create view donor_with_sensitive_info as
select
    id,
    name,
    email,
    address,
    postcode,
    city,
    cpr,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

-- donation with gateway info
create view donation_with_gateway_info as
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
    updated_at
from
    _donation
where
    deleted_at is null;

-- charge with gateway info
create view charge_with_gateway_info as
select
    id,
    donation_id,
    short_id,
    status,
    gateway_metadata,
    gateway_response,
    created_at,
    updated_at
from
    _charge
where
    deleted_at is null;

------------------------------------------------------------
-- Helper views for common operations
-- easily track progress on our most pressing KPIs
create view kpi as
with x as (
    select
        count(distinct cpr) as members
    from
        donor_with_sensitive_info ds
        inner join donation d on d.donor_id = ds.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient = 'Giv Effektivt membership'
        and c.status = 'charged'
        and date_trunc('year', c.created_at) = date_trunc('year', now())
),
y as (
    select
        sum(
            case when d.amount >= 200 then
                1
            end) as donations_200,
        sum(d.amount) as donations_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt membership'
),
z as (
    select
        sum(
            case when amount >= 200 then
                1
            end) as monthly_200,
        sum(amount) as monthly_total
    from ( select distinct on (d.id)
            amount,
            c.status
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            recipient != 'Giv Effektivt membership'
            and frequency = 'monthly'
            and not cancelled
        order by
            d.id,
            c.created_at desc) c1
    where
        status = 'charged'
)
select
    *
from
    x,
    y,
    z;

-- distribution of recipients within successful charges
create view recipient_distribution as
select
    d.recipient,
    count(*),
    sum(d.amount)
from
    donation d
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
group by
    d.recipient;

-- donations that need new charges to be created
create view donations_to_create_charges as
select
    *
from ( select distinct on (d.id)
        d.id as donation_id,
        d.frequency,
        c.created_at as last_charge,
        (
            case when d.frequency = 'monthly' then
                c.created_at + interval '1' month
            when d.frequency = 'yearly' then
                c.created_at + interval '1' year
            end) as next_charge
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        gateway = 'ScanPay'
        and not cancelled
        and frequency in ('monthly', 'yearly')
    order by
        d.id,
        c.created_at desc) s
where
    next_charge <= now();

-- charges to charge
create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    recipient,
    c.gateway_metadata,
    d.gateway_metadata as donation_gateway_metadata
from
    donor_with_contact_info dc
    inner join donation_with_gateway_info d on d.donor_id = dc.id
    inner join charge_with_gateway_info c on c.donation_id = d.id
where
    gateway = 'ScanPay'
    and not cancelled
    and status = 'created';

-- donations that need to be emailed
create view donations_to_email as select distinct on (d.id)
    d.id,
    email,
    amount,
    recipient,
    frequency,
    tax_deductible
from
    donor_with_contact_info dc
    inner join donation d on d.donor_id = dc.id
    inner join charge c on c.donation_id = d.id
where
    emailed = 'no'
    and c.status = 'charged'
order by
    d.id,
    c.created_at desc;

------------------------------------------------------------
-- Security setup
create role everyone;

create role reader in role everyone;

create role reader_contact in role reader;

create role reader_sensitive in role reader_contact;

create role writer in role reader_sensitive;

create role app in role writer;

create role dev in role writer;

create user donation_platform login password CHANGEME in role app;

create user max login password CHANGEME in role dev;

create user mikolaj login password CHANGEME in role dev;

alter user postgres set search_path to giveffektivt;

alter user donation_platform set search_path to giveffektivt;

alter user max set search_path to giveffektivt;

alter user mikolaj set search_path to giveffektivt;

-- basic access
grant usage on schema giveffektivt to everyone;

grant usage, select on all sequences in schema giveffektivt to everyone;

-- access to donor
grant select on donor to reader;

grant select on donor_with_contact_info to reader_contact;

grant select on donor_with_sensitive_info to reader_sensitive;

grant insert, update, delete on donor to writer;

grant insert, update on donor_with_contact_info to writer;

grant insert, update on donor_with_sensitive_info to writer;

-- access to donation
grant select on donation to reader;

grant select on donation_with_gateway_info to reader_sensitive;

grant insert, update, delete on donation to writer;

grant insert, update on donation_with_gateway_info to writer;

-- access to charge
grant select on charge to reader;

grant select on charge_with_gateway_info to reader_sensitive;

grant insert, update, delete on charge to writer;

grant insert, update on charge_with_gateway_info to writer;

-- access to short_id field on _charge to be able to insert with default value
grant select (short_id) on _charge to writer;

-- access to scanpay_seq
grant select on scanpay_seq to reader;

grant insert, update, delete on scanpay_seq to writer;

-- access to other views
grant select on kpi to everyone;

grant select on recipient_distribution to everyone;

grant select on donations_to_create_charges to reader_sensitive;

grant select on charges_to_charge to reader_sensitive;

grant select on donations_to_email to reader_sensitive;

-- migrate:down
