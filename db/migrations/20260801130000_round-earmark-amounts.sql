-- migrate:up

update earmark e
set amount = greatest(1, round(e.amount));

with totals as (
  select donation_id, sum(amount) as amount
  from earmark
  group by donation_id
), largest as (
  select distinct on (donation_id) donation_id, recipient
  from earmark
  order by donation_id, amount desc, recipient
)
update earmark e
set amount = e.amount + d.amount - totals.amount
from donation d, totals, largest
where e.donation_id = d.id
  and totals.donation_id = d.id
  and largest.donation_id = d.id
  and e.recipient = largest.recipient;

-- migrate:down
