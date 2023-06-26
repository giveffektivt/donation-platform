-- migrate:up
create view monthly_added_value as
select
    to_char(year, 'yyyy') as year,
    to_char(month, 'Mon') as month,
    sum(
        case when frequency = 'monthly' then
            amount * 12
        else
            amount
        end)::numeric as value
from ( select distinct on (p.id)
        date_trunc('year', p.created_at) as year,
        date_trunc('month', p.created_at) as month,
        amount,
        frequency
    from
        donor p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and recipient != 'Giv Effektivt'
        and not d.cancelled) a
group by
    a.year,
    a.month
order by
    a.year desc,
    a.month desc;

grant select on monthly_added_value to everyone;

-- migrate:down
