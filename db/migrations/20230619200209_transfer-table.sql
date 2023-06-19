-- migrate:up
--
create table _transfer(
    id uuid primary key default gen_random_uuid(),
    amount numeric not null,
    recipient donation_recipient not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view transfer as
select
    id,
    amount,
    recipient,
    created_at,
    updated_at
from
    _transfer
where
    deleted_at is null;

-- Automatically maintain `updated_at`
create trigger transfers_update_timestamp
    before update on _transfer for each row
    execute procedure trigger_update_timestamp();

-- Soft-delete data using `deleted_at`
create rule transfers_soft_delete as on delete to transfer
    do instead
    update
        _transfer set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

-- Permissions
grant select on transfer to everyone;

grant insert, update, delete on transfer to writer;

-- migrate:down
