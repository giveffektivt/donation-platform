-- migrate:up
create table ops_budget (
    id uuid primary key default gen_random_uuid(),
    amount numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger ops_budget_update_timestamp before
update on ops_budget for each row
execute procedure trigger_update_timestamp ();

grant
select
    on ops_budget to reader;

grant insert,
update,
delete on ops_budget to writer;

-- migrate:down
