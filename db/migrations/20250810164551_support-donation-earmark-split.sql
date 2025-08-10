-- migrate:up
create table earmark (
    donation_id uuid references donation (id),
    recipient donation_recipient not null,
    percentage numeric not null check (
        percentage >= 0
        and percentage <= 100
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (donation_id, recipient)
);

grant
select
    on earmark to reader;

grant insert,
update,
delete on earmark to writer;

create function earmark_sum_check () returns trigger language plpgsql as $$
declare
  v_donation_id uuid := coalesce(new.donation_id, old.donation_id);
  v_sum numeric;
begin
  select coalesce(sum(percentage), 0) into v_sum
  from earmark
  where donation_id = v_donation_id;

  if v_sum <> 100 then
    raise exception 'donation % earmarks must sum to 100, got %', v_donation_id, v_sum;
  end if;

  return null;
end;
$$;

create constraint trigger earmark_sum_check
after insert
or
update
or delete on earmark deferrable initially deferred for each row
execute function earmark_sum_check ();

insert into
    earmark (donation_id, recipient, percentage, created_at)
select
    id,
    recipient,
    100,
    created_at
from
    donation;

drop view if exists annual_email_report,
annual_tax_report,
annual_tax_report_const,
annual_tax_report_current_payments,
annual_tax_report_data,
annual_tax_report_gavebrev_all_payments,
annual_tax_report_gavebrev_checkins,
annual_tax_report_gavebrev_expected_totals,
annual_tax_report_gavebrev_results,
annual_tax_report_gavebrev_since,
annual_tax_report_gaveskema,
annual_tax_report_pending_update,
charge_anon,
charges_to_charge,
crm_export,
donation_anon,
donation_contact,
donations_to_create_charges,
donations_to_email,
donor_anon,
donor_contact,
donor_impact_report,
failed_recurring_donations,
gavebrev_checkins_to_create,
ignored_renewals,
kpi,
pending_distribution,
transfer_overview,
transfer_pending,
transferred_distribution,
gwwc_money_moved,
value_lost_analysis cascade;

drop function if exists time_distribution,
general_assembly_invitations cascade;

alter table donation
drop column recipient;

alter table charge
add constraint charge_id_donation_id_uniq unique (id, donation_id);

alter table transfer
add constraint transfer_id_earmark_uniq unique (id, earmark);

create table charge_transfer (
    charge_id uuid not null,
    transfer_id uuid not null,
    donation_id uuid not null,
    earmark donation_recipient not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (charge_id, transfer_id, earmark),
    foreign key (charge_id, donation_id) references charge (id, donation_id),
    foreign key (transfer_id, earmark) references transfer (id, earmark),
    foreign key (donation_id, earmark) references earmark (donation_id, recipient)
);

grant
select
    on charge_transfer to reader;

grant insert,
update,
delete on charge_transfer to writer;

insert into
    charge_transfer (charge_id, transfer_id, donation_id, earmark)
select
    c.id,
    c.transfer_id,
    c.donation_id,
    (
        select
            recipient
        from
            earmark e
        where
            e.donation_id = c.donation_id
    )
from
    charge c
where
    c.transfer_id is not null;

alter table charge
drop column transfer_id;

-- migrate:down
