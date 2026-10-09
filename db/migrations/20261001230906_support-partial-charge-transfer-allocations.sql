-- migrate:up
alter table charge_transfer add column amount numeric;

lock table earmark in share row exclusive mode;

do $$
declare
    v_conflict record;
begin
    select charge_id, earmark, count(*) as transfers
    into v_conflict
    from charge_transfer
    group by charge_id, earmark
    having count(*) > 1
    limit 1;

    if found then
        raise exception 'Cannot infer historical allocation amounts for charge %, earmark %: % transfers. Resolve these links before migrating.',
            v_conflict.charge_id, v_conflict.earmark, v_conflict.transfers;
    end if;
end
$$;

update charge_transfer ct
set amount = e.amount
from earmark e
where e.donation_id = ct.donation_id
    and e.recipient = ct.earmark;

alter table charge_transfer
    alter column amount set not null,
    add constraint charge_transfer_amount_positive_finite check (amount > 0 and amount < 'Infinity'::numeric);

create index charge_transfer_donation_earmark_idx on charge_transfer (donation_id, earmark);

create function prepare_charge_transfer_allocation() returns trigger language plpgsql as $$
declare
    v_key record;
    v_amount numeric;
begin
    for v_key in
        select distinct donation_id, earmark
        from (
            values
                (case when tg_op <> 'INSERT' then old.donation_id end,
                 case when tg_op <> 'INSERT' then old.earmark end),
                (case when tg_op <> 'DELETE' then new.donation_id end,
                 case when tg_op <> 'DELETE' then new.earmark end)
        ) keys(donation_id, earmark)
        where donation_id is not null
        order by donation_id, earmark
    loop
        update earmark
        set amount = amount
        where donation_id = v_key.donation_id
            and recipient = v_key.earmark
        returning amount into v_amount;

        if tg_op = 'INSERT' and new.amount is null
            and new.donation_id = v_key.donation_id and new.earmark = v_key.earmark then
            new.amount := v_amount;
        end if;
    end loop;

    return case when tg_op = 'DELETE' then old else new end;
end
$$;

create function check_charge_transfer_allocation_total() returns trigger language plpgsql as $$
declare
    v_donation_id uuid := coalesce(new.donation_id, old.donation_id);
    v_earmark donation_recipient;
    v_conflict record;
begin
    if tg_table_name = 'earmark' then
        v_earmark := coalesce(new.recipient, old.recipient);
    else
        v_earmark := coalesce(new.earmark, old.earmark);
    end if;

    select ct.charge_id, sum(ct.amount) as allocated, e.amount as available
    into v_conflict
    from charge_transfer ct
    join earmark e on e.donation_id = ct.donation_id and e.recipient = ct.earmark
    where ct.donation_id = v_donation_id and ct.earmark = v_earmark
    group by ct.charge_id, e.amount
    having sum(ct.amount) > e.amount
    limit 1;

    if found then
        raise exception 'Transfer allocations for charge %, earmark % exceed earmark amount %: allocated %',
            v_conflict.charge_id, v_earmark, v_conflict.available, v_conflict.allocated
            using errcode = '23514', constraint = 'charge_transfer_allocation_total';
    end if;

    return null;
end
$$;

create trigger prepare_charge_transfer_allocation
    before insert or update or delete on charge_transfer
    for each row execute function prepare_charge_transfer_allocation();

create constraint trigger charge_transfer_allocation_total
    after insert or update or delete on charge_transfer
    deferrable initially deferred for each row
    execute function check_charge_transfer_allocation_total();

create constraint trigger earmark_transfer_allocation_total
    after insert or update on earmark
    deferrable initially deferred for each row
    execute function check_charge_transfer_allocation_total();


-- migrate:down

