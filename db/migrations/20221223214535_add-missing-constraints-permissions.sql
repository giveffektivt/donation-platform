-- migrate:up
--
-- 1. Add missing not-null constraints.
-- 2. Add missing permission on webhook table.
--
alter table _donation
    alter column donor_id set not null;

alter table _charge
    alter column donation_id set not null;

grant select on gateway_webhook to reader_sensitive;

-- migrate:down
