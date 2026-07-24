-- migrate:up

drop trigger earmark_sum_check on earmark;
drop function earmark_sum_check();

alter table earmark rename column percentage to amount;
alter table earmark drop constraint earmark_percentage_check;
alter table earmark add constraint earmark_amount_check check (amount > 0);

update earmark e
set amount = d.amount * e.amount / 100
from donation d
where d.id = e.donation_id;

create function earmark_sum_check() returns trigger language plpgsql as $$
declare
  v_donation_id uuid := coalesce(new.donation_id, old.donation_id);
  v_sum numeric;
  v_amount numeric;
begin
  select coalesce(sum(amount), 0) into v_sum
  from earmark
  where donation_id = v_donation_id;

  select amount into v_amount
  from donation
  where id = v_donation_id;

  if v_sum <> v_amount then
    raise exception 'donation % earmarks must sum to donation amount %, got %', v_donation_id, v_amount, v_sum;
  end if;

  return null;
end;
$$;

create constraint trigger earmark_sum_check
after insert or update or delete on earmark
deferrable initially deferred for each row
execute function earmark_sum_check();

-- migrate:down
