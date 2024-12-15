-- migrate:up
drop view transfer_overview;

drop view transferred_distribution;

drop view transfer;

alter table _transfer
    add column earmark donation_recipient not null,
    add column unit_cost_conversion numeric,
    add column unit_cost_external numeric,
    add column life_cost_external numeric,
    add column exchange_rate numeric;

create view transfer as
select
    id,
    earmark,
    recipient,
    unit_cost_external,
    unit_cost_conversion,
    life_cost_external,
    exchange_rate,
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
    t.earmark,
    case when t.created_at > now() then
        'Forventet: '
    else
        ''
    end || t.recipient as recipient,
    case when t.recipient = 'Against Malaria Foundation' then
        'Antimalaria myggenet udleveret'
    when t.recipient = 'Malaria Consortium' then
        'Malariamedicin udleveret'
    when t.recipient = 'Helen Keller International' then
        'A-vitamintilskud udleveret'
    when t.recipient = 'New Incentives' then
        'Vaccinationsprogrammer motiveret'
    when t.recipient = 'Give Directly' then
        'Dollars modtaget'
    when t.recipient = 'SCI Foundation' then
        'Ormekure udleveret'
    end as unit,
    round(sum(amount))::numeric as total_dkk,
    round(max(t.unit_cost_external), 2) as unit_cost_external,
    round(max(t.unit_cost_conversion), 2) as unit_cost_conversion,
    round(max(t.unit_cost_external) / max(t.unit_cost_conversion) * max(t.exchange_rate), 2) as unit_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) /(max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as unit_impact,
    round(max(t.life_cost_external), 2) as life_cost_external,
    round(max(t.life_cost_external) * max(t.exchange_rate), 2) as life_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) / max(t.life_cost_external), 1) as life_impact,
    max(c.created_at) as computed_at,
    case when t.created_at > now() then
        'Næste overførsel'
    else
        to_char(t.created_at, 'yyyy-mm-dd')
    end as transferred_at
from
    donation d
    join charge c on c. donation_id = d.id
    join transfer t on c.transfer_id = t.id
        or (c.transfer_id is null
            and d.recipient = t.earmark
            and t.created_at > now())
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
group by
    t.id,
    t.earmark,
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

-- migrate:down
