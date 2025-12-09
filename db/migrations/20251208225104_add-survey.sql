-- migrate:up
create table if not exists survey (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    donor_id uuid references donor (id),
    how_discovered text,
    who_recommended text,
    search_terms text,
    how_discovered_through_ea text,
    social_media text,
    media_article_podcast_radio text,
    why_donate text,
    alternative_use_of_money text,
    improvement_suggestions text,
    may_contact boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (email, created_at)
);

create trigger survey_update_timestamp before
update on survey for each row
execute procedure trigger_update_timestamp ();

grant
select
    on survey to reader;

grant insert,
update,
delete on survey to writer;

-- migrate:down
