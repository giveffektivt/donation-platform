-- migrate:up
alter table gavebrev
add column shared_skat_access_at timestamptz;

-- migrate:down
