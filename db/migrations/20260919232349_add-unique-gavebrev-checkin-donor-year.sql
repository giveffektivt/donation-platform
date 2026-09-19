-- migrate:up
alter table gavebrev_checkin
add constraint gavebrev_checkin_donor_id_year_key unique (donor_id, year);

-- migrate:down

