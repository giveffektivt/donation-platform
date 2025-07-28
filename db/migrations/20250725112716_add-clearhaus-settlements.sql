-- migrate:up
create user cron login password CHANGEME in role everyone;

create table clearhaus_settlement (
    merchant_id numeric not null,
    amount numeric not null,
    created_at timestamptz not null default now(),
    primary key (merchant_id, created_at)
);

create index idx_clearhaus_settlement_merchant_latest_amount on clearhaus_settlement (merchant_id, created_at desc) include (amount);

grant
select
    on clearhaus_settlement to reader;

grant insert,
update,
delete on clearhaus_settlement to writer;

grant insert on clearhaus_settlement to cron;

-- migrate:down
