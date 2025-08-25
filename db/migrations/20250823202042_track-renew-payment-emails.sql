-- migrate:up
alter type emailed_status
add value 'renew-no';

alter type emailed_status
add value 'renew-attempted';

-- migrate:down
