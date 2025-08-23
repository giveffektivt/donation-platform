-- migrate:up
alter table audit_log
drop column record_id;

create or replace function record_audit_log () returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and
    (to_jsonb(new) - 'updated_at') is not distinct from (to_jsonb(old) - 'updated_at')
  then
    return new;
  end if;

  insert into audit_log(table_name, operation, data)
  values (
    tg_table_name,
    tg_op,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trigger_audit_log_charge_transfer
after insert
or
update
or delete on charge_transfer for each row
execute function record_audit_log ();

create trigger trigger_audit_log_earmark
after insert
or
update
or delete on earmark for each row
execute function record_audit_log ();

create trigger trigger_audit_log_max_tax_deduction
after insert
or
update
or delete on max_tax_deduction for each row
execute function record_audit_log ();

-- migrate:down
