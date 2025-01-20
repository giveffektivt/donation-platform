-- migrate:up
drop view transfer_pending;

create view transfer_pending as
with data as (
    select
        c.created_at as donated_at,
        d.amount,
        d.recipient,
        sum(d.amount) over (order by c.created_at) as potential_cutoff
    from
        donation d
        join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.transfer_id is null
)
select
    *
from
    data
order by
    donated_at;

grant select on transfer_pending to everyone;

-- migrate:down
