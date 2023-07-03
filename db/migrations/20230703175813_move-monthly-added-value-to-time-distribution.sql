-- migrate:up
drop view monthly_added_value;

drop view time_distribution;

create view time_distribution as
with successful_charges as (
    select
        date_trunc('year', c.created_at) as year,
        date_trunc('month', c.created_at) as month,
        sum(amount) as dkk_total,
        count(*)::numeric as payments_total
    from
        charge c
        join donation d on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
    group by
        year,
        month
),
value_added as (
    select
        year,
        month,
        sum(amount *(
                case when frequency = 'monthly' then
                    12
                else
                    1
                end))::numeric as value_added
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
    year,
    month
)
select
    to_char(a.year, 'yyyy') as year,
    to_char(a.month, 'Mon') as month,
    coalesce(sum(dkk_total), 0) as dkk_total,
    coalesce(sum(payments_total), 0) as payments_total,
    coalesce(sum(value_added), 0) as value_added
from
    successful_charges a
    full join value_added b on a.year = b.year
        and a.month = b.month
group by
    a.year,
    a.month
order by
    a.year desc,
    a.month desc;

grant select on time_distribution to everyone;

-- migrate:down
