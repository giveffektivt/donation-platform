-- migrate:up
create view old_ids_map as
select
    p.id as donor_id,
    p._old_id as old_donor_id,
    d.id as donation_id,
    d._old_id as old_donation_id,
    c.id as charge_id,
    c._old_id as old_charge_id
from
    _donor p
    left join _donation d on p.id = d.donor_id
    left join _charge c on d.id = c.donation_id
where
    p.deleted_at is null
    and d.deleted_at is null
    and c.deleted_at is null
    and (p._old_id is not null
        or d._old_id is not null
        or c._old_id is not null);

grant select on old_ids_map to reader;

-- migrate:down
