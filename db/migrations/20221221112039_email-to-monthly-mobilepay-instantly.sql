-- migrate:up
--
-- 1. Send donation emails instantly (without waiting for payment confirmation) to donors using MobilePay Subscriptions.
-- 2. Drop country column, it's no longer relevant.
--
drop view donations_to_email;

create view donations_to_email as select distinct on (d.id)
    d.id,
    email,
    amount,
    recipient,
    frequency,
    tax_deductible
from
    donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join charge c on c.donation_id = d.id
where
    emailed = 'no'
    and (c.status = 'charged'
        or (method = 'MobilePay'
            and frequency != 'once'
            and c.status != 'error'))
order by
    d.id,
    c.created_at desc;

grant select on donations_to_email to reader_sensitive;

-- migrate:down
