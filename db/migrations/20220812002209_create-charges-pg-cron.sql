-- migrate:up
--
-- Prerequisite:
-- 1. Enable pg_cron extension in server parameters
-- 2. Set pg_cron.database_name = 'giveffektivt'
create extension pg_cron;

-- Vacuum every night at 03:30 GMT
select
    cron.schedule ('nightly-vacuum', '30 3 * * *', 'vacuum (analyze)');

-- Create charges every hour
select
    cron.schedule ('create-charges', '0 * * * *', 'insert into charge(donation_id, created_at, status) select donation_id, next_charge, ''created'' from donations_to_create_charges');

-- migrate:down
