-- migrate:up
alter table _gavebrev_checkin
rename column maximize_tax_deduction to limit_normal_donation;

alter table _gavebrev_checkin
alter column limit_normal_donation
drop default;

alter table _gavebrev_checkin
alter column limit_normal_donation
drop not null;

drop view gavebrev_checkin cascade;

alter table _gavebrev_checkin
alter column limit_normal_donation type numeric using (
    case
        when limit_normal_donation then null
        else 0
    end
);

-- migrate:down
