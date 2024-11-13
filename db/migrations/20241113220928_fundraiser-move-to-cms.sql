-- migrate:up
drop view fundraiser;

alter table _fundraiser
    drop column description,
    drop column media,
    drop column target;

create view fundraiser as
select
    id,
    email,
    title,
    has_match,
    match_currency,
    key,
    created_at,
    updated_at
from
    _fundraiser
where
    deleted_at is null;

grant select on fundraiser to reader;

grant insert, update, delete on fundraiser to writer;

-- migrate:down
