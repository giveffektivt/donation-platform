-- migrate:up
-- Recreate views:
-- * add Quickpay to all
-- * add "gateway" column to charges_to_charge
drop view donations_to_create_charges;

drop view charges_to_charge;

create view donations_to_create_charges as
select
    *
from ( select distinct on (d.id)
        d.id as donation_id,
        d.frequency,
        c.created_at as last_charge,
        (
            case when d.frequency = 'monthly' then
                c.created_at + interval '1' month
            when d.frequency = 'yearly' then
                c.created_at + interval '1' year
            end) as next_charge
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        gateway in ('Quickpay', 'Scanpay')
        and not cancelled
        and frequency in ('monthly', 'yearly')
    order by
        d.id,
        c.created_at desc) s
where
    next_charge <= now();

create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    recipient,
    gateway,
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

grant select on donations_to_create_charges to reader_sensitive;

grant select on charges_to_charge to reader_sensitive;

-- migrate:down
