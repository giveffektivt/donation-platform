-- migrate:up
--
-- distribution of successful charges by time buckets
--
create view time_distribution as
select
    to_char(year, 'yyyy') as year,
    to_char(month, 'Mon') as month,
    sum
from (
    select
        date_trunc('year', c.created_at) as year,
        date_trunc('month', c.created_at) as month,
        sum(amount) as sum
    from
        charge c
        join donation d on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
    group by
        year,
        month
    order by
        year desc,
        month desc) a;

grant select on time_distribution to everyone;

-- migrate:down
