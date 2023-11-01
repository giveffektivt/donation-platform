-- migrate:up
-- 1. Do not exclude currently cancelled donations when looking back to compute value_added
-- 2. Use date of first actual charge when calculating value_added
-- 3. Add value_lost as the amount*12 on the first month when we lost the monthly payment
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
            date_trunc('year', c.created_at) as year,
        date_trunc('month', c.created_at) as month,
        amount,
        frequency
    from
        donor p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and recipient != 'Giv Effektivt'
    order by
        p.id,
        c.created_at) a
group by
    year,
    month
),
value_lost as (
    select
        year,
        month,
        sum(amount * 12)::numeric as value_lost
    from (
        select
            p.id,
            date_trunc('year', max(c.created_at) + interval '1 month') as year,
        date_trunc('month', max(c.created_at) + interval '1 month') as month,
        max(amount) as amount
    from
        donor p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status in ('charged', 'created')
        and recipient != 'Giv Effektivt'
        and frequency = 'monthly'
    group by
        p.id
    having
        sum(
            case when cancelled then
                0
            else
                1
            end) = 0) a
    where
        month <= now()
    group by
        year,
        month
)
select
    to_char(a.year, 'yyyy') || '-' || to_char(a.month, 'MM') as date,
    coalesce(sum(dkk_total), 0) as dkk_total,
    coalesce(sum(payments_total), 0) as payments_total,
    coalesce(sum(value_added), 0) as value_added,
    coalesce(sum(value_lost), 0) as value_lost
from
    successful_charges a
    full join value_added b on a.year = b.year
        and a.month = b.month
    full join value_lost c on a.year = c.year
        and a.month = c.month
group by
    a.year,
    a.month
order by
    a.year desc,
    a.month desc;

grant select on time_distribution to everyone;

-- migrate:down
