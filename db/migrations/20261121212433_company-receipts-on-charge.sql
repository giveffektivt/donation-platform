-- migrate:up

alter table charge
    add column company_receipt_status text not null default 'skipped'
        check (company_receipt_status in ('skipped', 'pending', 'not_found', 'attempted', 'sent', 'failed'));

update charge c set company_receipt_status = 'pending'
from donation d join donor p on p.id = d.donor_id
where c.donation_id = d.id and c.status in ('created', 'waiting')
    and p.tin ~ '^[1-9][0-9]{7}$';

create function initialize_company_receipt_status() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
    if exists (
        select 1 from giveffektivt.donation d join giveffektivt.donor p on p.id = d.donor_id
        where d.id = new.donation_id and p.tin ~ '^[1-9][0-9]{7}$'
    ) then
        new.company_receipt_status := 'pending';
    end if;
    return new;
end;
$$;

create trigger initialize_company_receipt_status before insert on charge
    for each row execute function initialize_company_receipt_status();

create index charge_company_receipt_candidates_idx on charge (created_at, id)
    where status = 'charged' and company_receipt_status = 'pending';

-- migrate:down
