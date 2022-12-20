-- migrate:up
--
-- 1. Add distribution of successful charges by time buckets
-- 2. Sort recipient_distribution by amount and exclude memberships
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

drop view recipient_distribution;

create view recipient_distribution as
select
    d.recipient,
    count(*),
    sum(d.amount) as sum
from
    donation d
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
group by
    d.recipient
order by
    sum desc;

grant select on recipient_distribution to everyone;

grant select on time_distribution to everyone;

-- migrate:down
