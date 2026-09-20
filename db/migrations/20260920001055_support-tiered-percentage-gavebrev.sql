-- migrate:up
alter table gavebrev
add column percentage_above_threshold numeric constraint gavebrev_percentage_above_threshold_check check (
    percentage_above_threshold is null
    or (
        type = 'percentage'
        and percentage_above_threshold > 0
        and percentage_above_threshold <= 100
    )
);

alter table gavebrev_checkin
rename column custom_maximum_income to percentage_tier_threshold;

alter table gavebrev_checkin
drop column custom_minimal_income cascade;

alter table gavebrev_checkin
add constraint gavebrev_checkin_percentage_tier_threshold_check check (
    percentage_tier_threshold is null
    or percentage_tier_threshold >= 0
);

-- migrate:down
