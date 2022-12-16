-- migrate:up
-- * add "method" column to charges_to_charge
drop view charges_to_charge;

create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    recipient,
    gateway,
    method,
    c.gateway_metadata,
    d.gateway_metadata as donation_gateway_metadata
from
    donor_with_contact_info dc
    inner join donation_with_gateway_info d on d.donor_id = dc.id
    inner join charge_with_gateway_info c on c.donation_id = d.id
where
    gateway in ('Quickpay', 'Scanpay')
    and not cancelled
    and status = 'created';

grant select on charges_to_charge to reader_sensitive;

-- migrate:down
