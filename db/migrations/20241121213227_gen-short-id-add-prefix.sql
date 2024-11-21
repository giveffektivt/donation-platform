-- migrate:up
alter table _charge
    alter column short_id drop default;

drop function gen_short_id;

create function gen_short_id(in table_name text, in column_name text, in prefix text default '', in min_length integer default 4, in chars text default '23456789abcdefghjkmnpqrstuvwxyz')
    returns text
    language plpgsql
    volatile strict parallel unsafe
    as $$
declare
    random_id text;
    temp text;
    current_len int4 := min_length;
    sql text;
    advisory_1 int4 := hashtext(format('%I:%I', table_name, column_name));
    advisory_2 int4;
    advisory_ok bool;
begin
    sql := format('select %s from giveffektivt.%I where %s = $1', column_name, table_name, column_name);
    loop
        random_id := prefix || gen_random_string(current_len, chars);
        advisory_2 := hashtext(random_id);
        advisory_ok := pg_try_advisory_xact_lock(advisory_1, advisory_2);
        if advisory_ok then
            execute sql into temp
            using random_id;
            exit
            when temp is null;
        end if;
            current_len := current_len + 1;
        end loop;
        return random_id;
end
$$;

alter table _charge
    alter column short_id set default gen_short_id('_charge', 'short_id', 'c-');

update
    _donation
set
    gateway_metadata = jsonb_set(gateway_metadata, '{bank_msg}', to_jsonb('d-' ||(gateway_metadata ->> 'bank_msg')))
where
    gateway_metadata ? 'bank_msg';

-- migrate:down
