-- migrate:up
alter table donation
add column public_message_author boolean not null default false,
add column message_author text;

-- migrate:down
