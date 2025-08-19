-- migrate:up
update donation d
set
    gateway_metadata = jsonb_set(gateway_metadata, '{quickpay_legacy}', 'true'::jsonb, true)
where
    gateway = 'Quickpay'
    and exists (
        select
            1
        from
            earmark
        where
            donation_id = d.id
            and recipient in ('Giv Effektivts medlemskab', 'Giv Effektivts arbejde og vækst')
    );

-- migrate:down
