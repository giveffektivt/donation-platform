-- migrate:up
create table max_tax_deduction(
    year numeric primary key,
    value numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Automatically maintain `updated_at`
create trigger max_tax_deduction_update_timestamp
    before update on max_tax_deduction for each row
    execute procedure trigger_update_timestamp();

grant select on max_tax_deduction to reader;

grant insert, update, delete on max_tax_deduction to writer;

-- migrate:down
