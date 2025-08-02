-- migrate:up
grant
select
    on crm_export to cron;

-- migrate:down
