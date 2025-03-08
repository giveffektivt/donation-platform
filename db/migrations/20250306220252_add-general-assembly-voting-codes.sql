-- migrate:up
create table general_assembly_voting_code (code text primary key, created_at timestamptz not null default now());

grant insert,
update,
delete on general_assembly_voting_code to writer;

grant
select
    on general_assembly_voting_code to reader_contact;

-- migrate:down
