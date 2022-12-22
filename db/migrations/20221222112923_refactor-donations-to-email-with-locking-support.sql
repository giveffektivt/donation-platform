-- migrate:up
--
-- No functional changes, refactor to allow locking with "select ... for update" for donations_to_email and charges_to_charge
--
drop view donations_to_email;

create view donations_to_email as
select
    d.id,
    email,
    amount,
    recipient,
    frequency,
    tax_deductible
from
    donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join lateral (
        select
            id,
            status
        from
            charge
        where
            donation_id = d.id
        order by
            created_at desc
        limit 1) c on 1 = 1
where
    emailed = 'no'
    and (c.status = 'charged'
        or (method = 'MobilePay'
            and frequency != 'once'
            and c.status != 'error'));

grant select, update on donations_to_email to reader_sensitive;

grant select, update on charges_to_charge to reader_sensitive;

-- migrate:down
