-- migrate:up

-- Add custom_minimal_income and custom_maximum_income columns to gavebrev_checkin table
ALTER TABLE giveffektivt.gavebrev_checkin
ADD COLUMN custom_minimal_income numeric,
ADD COLUMN custom_maximum_income numeric;


-- migrate:down

