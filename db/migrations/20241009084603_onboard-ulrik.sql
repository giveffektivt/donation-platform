-- migrate:up
create user ulrik login password CHANGEME in role reader_contact;

-- migrate:down
