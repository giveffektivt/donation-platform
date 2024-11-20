-- migrate:up
drop view transferred_distribution;

drop view transfer_overview;

drop view transfer;

create view transfer as
select
    id,
    recipient,
    created_at,
    updated_at
from
    _transfer
where
    deleted_at is null
order by
    created_at;

create rule transfers_soft_delete as on delete to transfer
    do instead
    update
        _transfer set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

grant select on transfer to everyone;

grant insert, update, delete on transfer to writer;

--------------------
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

--------------------
create view transferred_distribution as
select
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    donation d
    inner join charge c on c.donation_id = d.id
    inner join transfer t on c.transfer_id = t.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and transfer_id is not null
group by
    t.recipient
order by
    dkk_total desc;

grant select on transferred_distribution to everyone;

--------------------
create view transfer_pending as
with data as (
    select
        c.created_at,
        d.amount,
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
    created_at;

grant select on transfer_pending to everyone;

-- migrate:down
