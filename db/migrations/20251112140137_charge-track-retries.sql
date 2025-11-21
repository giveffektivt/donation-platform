-- migrate:up
alter table charge
add column retry numeric not null default 0;

-- migrate:down
