-- migrate:up
drop view failed_recurring_donations;

create view failed_recurring_donations as
with paid_before as (
    select distinct on (d.id)
        d.id
    from
        donation_with_gateway_info d
        inner join donor_with_contact_info p on d.donor_id = p.id
        inner join charge_with_gateway_info c on c.donation_id = d.id
    where
        gateway in ('Quickpay', 'Scanpay')
        and not cancelled
        and frequency in ('monthly', 'yearly')
        and status = 'charged'
    order by
        d.id
)
select
    *
from ( select distinct on (d.id)
        c.created_at as failed_at,
        c.id as charge_id,
        c.short_id,
        d.amount,
        d.method,
        d.gateway,
        p.id as donor_id,
        p.name as donor_name,
        p.email as donor_email,
        d.id as donation_id,
        d.gateway_metadata,
        d.recipient,
        d.frequency,
        d.tax_deductible,
        c.status
    from
        donation_with_gateway_info d
        inner join donor_with_contact_info p on d.donor_id = p.id
        inner join charge_with_gateway_info c on c.donation_id = d.id
    where
        d.id in (
            select
                id
            from
                paid_before)
        order by
            d.id,
            c.created_at desc) s
where
    status = 'error'
order by
    failed_at desc;

grant select on failed_recurring_donations to reader_sensitive;

-- migrate:down
