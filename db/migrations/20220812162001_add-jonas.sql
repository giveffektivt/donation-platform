-- migrate:up
create user jonas login password CHANGEME in role reader_contact;

alter user jonas set search_path to giveffektivt;

-- migrate:down
