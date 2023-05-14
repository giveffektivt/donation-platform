-- migrate:up
--
-- View to generate the data for the gaveskema report to submit to SKAT
create view annual_tax_report_gaveskema as
with const as (
    select
        date_trunc('year', now() - interval '9 months') as year_from,
        date_trunc('year', now() + interval '3 months') as year_to
),
report as (
    select
        *
    from
        annual_tax_report
),
donors_200 as (
    select
        count(donor_cpr) as count_donors_donated_min_200_kr
from
    report
    where
        ll8a_or_gavebrev = 'A'
        and total >= 200
),
members as (
    select
        count(distinct tin) as count_members
from
    const,
    donor_with_sensitive_info ds
    inner join donation d on d.donor_id = ds.id
    inner join charge c on c.donation_id = d.id
    where
        d.recipient = 'Giv Effektivt'
        and c.status = 'charged'
        and c.created_at <@ tstzrange(year_from, year_to, '[)')
),
donated_A as (
    select
        coalesce(sum(total), 0) as amount_donated_A
    from
        report
    where
        ll8a_or_gavebrev = 'A'
),
donated_L as (
    select
        coalesce(sum(total), 0) as amount_donated_L
    from
        report
    where
        ll8a_or_gavebrev = 'L'
),
donated_total as (
    select
        coalesce(sum(amount), 0) as amount_donated_total
    from
        const,
        donor_with_sensitive_info ds
        inner join donation d on d.donor_id = ds.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient != 'Giv Effektivt'
        and c.status = 'charged'
        and c.created_at <@ tstzrange(year_from, year_to, '[)'))
select
    extract(year from year_from) as year,
    count_donors_donated_min_200_kr,
    count_members,
    amount_donated_A,
    amount_donated_L,
    amount_donated_total
from
    const,
    donors_200,
    members,
    donated_A,
    donated_L,
    donated_total;

-- Table to store snapshots of the gaveskema reports we submitted to SKAT
create table _skat_gaveskema(
    id uuid primary key default gen_random_uuid(),
    year numeric not null,
    count_donors_donated_min_200_kr numeric not null,
    count_members numeric not null,
    amount_donated_A numeric not null,
    amount_donated_L numeric not null,
    amount_donated_total numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view skat_gaveskema as
select
    year,
    count_donors_donated_min_200_kr,
    count_members,
    amount_donated_A,
    amount_donated_L,
    amount_donated_total,
    id,
    created_at,
    updated_at
from
    _skat_gaveskema
where
    deleted_at is null;

-- Automatically maintain `updated_at`
create trigger skat_gaveskema_update_timestamp
    before update on _skat_gaveskema for each row
    execute procedure trigger_update_timestamp();

-- Soft-delete data using `deleted_at`
create rule skat_gaveskema_soft_delete as on delete to skat_gaveskema
    do instead
    update
        _skat_gaveskema set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

-- Permissions
grant select on annual_tax_report_gaveskema to reader_sensitive;

grant select on skat_gaveskema to reader_sensitive;

grant insert, update, delete on skat_gaveskema to writer;

-- migrate:down
