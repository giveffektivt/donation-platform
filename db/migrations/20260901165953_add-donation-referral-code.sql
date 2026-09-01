-- migrate:up
alter table donation add column referral_code text;

-- migrate:down
