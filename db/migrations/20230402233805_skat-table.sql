-- migrate:up
--
create table _skat (
    id uuid primary key default gen_random_uuid (),
    const numeric not null,
    ge_cvr numeric not null,
    donor_cpr text not null,
    year numeric not null,
    blank text not null,
    total numeric not null,
    ll8a_or_gavebrev text not null,
    ge_notes text not null,
    rettekode numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view skat as
select
    const,
    ge_cvr,
    donor_cpr,
    year,
    blank,
    total,
    ll8a_or_gavebrev,
    ge_notes,
    rettekode,
    id,
    created_at,
    updated_at
from
    _skat
where
    deleted_at is null;

-- Automatically maintain `updated_at`
create trigger skat_update_timestamp
    before update on _skat for each row
    execute procedure trigger_update_timestamp ();

-- Soft-delete data using `deleted_at`
create rule skat_soft_delete as on delete to skat
    do instead
    update
        _skat set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

-- Permissions
grant select on skat to reader_sensitive;

grant insert, update, delete on skat to writer;

-- migrate:down
