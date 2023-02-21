-- migrate:up
--
-- Create 'gavebrev_checkin' table to correctly determine gavebrev tax deduction amount in a given year and capture donors' wishes for donation surplus.
--
create table _gavebrev_checkin(
    id uuid primary key default gen_random_uuid(),
    donor_id uuid references _donor(id) not null,
    year numeric not null,
    income_inferred numeric, -- donor's income is inferred by us in the absence of any other info
    income_preliminary numeric, -- donor informs us of their estimated income in the given year
    income_verified numeric, -- donor's income is verified by us in the given year
    maximize_tax_deduction bool not null default false, -- when donated more than agreed, the donor wants to maximize tax deduction (max out the 'A')
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view gavebrev_checkin as
select
    id,
    donor_id,
    year,
    income_inferred,
    income_preliminary,
    income_verified,
    maximize_tax_deduction,
    created_at,
    updated_at
from
    _gavebrev_checkin
where
    deleted_at is null;

-- Automatically maintain `updated_at`
create trigger gavebrev_checkin_update_timestamp
    before update on _gavebrev_checkin for each row
    execute procedure trigger_update_timestamp();

-- Soft-delete data using `deleted_at`
create rule gavebrev_checkin_soft_delete as on delete to gavebrev_checkin
    do instead
    update
        _gavebrev_checkin set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

create rule donor_soft_delete_cascade_gavebrev_checkin as on update
    to _donor where
    old.deleted_at is null
    and new.deleted_at is not null
        do also
        update
            _gavebrev_checkin set
            deleted_at = now()
        where
            deleted_at is null
            and donor_id = old.id;

-- View for automatic checkin creations
create view gavebrev_checkins_to_create as
select
    *
from ( select distinct on (c.donor_id)
        c.donor_id as donor_id,
        c.year + 1 as year,
        coalesce(c.income_verified, coalesce(c.income_preliminary, c.income_inferred)) as income_inferred
    from
        gavebrev_checkin c
        inner join gavebrev g on g.donor_id = c.donor_id
    where
        g.status = 'signed'
        and g.stopped_at >= now()
    order by
        c.donor_id,
        c.year desc) s
where
    year <= date_part('year', now());

-- Permissions
grant select on gavebrev_checkin to reader_sensitive;

grant select on gavebrev_checkins_to_create to reader_sensitive;

grant insert, update, delete on gavebrev_checkin to writer;

-- Create entries for gavebrev_checkin every year
select
    cron.schedule('create-gavebrev-checkins', '0 4 1 1 *', 'insert into gavebrev_checkin(donor_id, year, income_inferred) select * from gavebrev_checkins_to_create');

-- migrate:down
