-- migrate:up
drop view transfer_overview;

create view transfer_overview as
select
    t.id,
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    max(c.created_at) as computed,
    t.created_at as transferred
from
    donation d
    join charge c on c. donation_id = d.id
    join transfer t on c.transfer_id = t.id
group by
    t.id,
    t.recipient,
    t.created_at
order by
    t.created_at,
    sum(amount) desc;

grant select on transfer_overview to everyone;

-- migrate:down
