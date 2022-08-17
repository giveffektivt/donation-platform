-- migrate:up
--
-- For international members we need to know their local TIN (aka CPR in DK), as well as birthday and country of residence.
alter table _donor rename column cpr to tin;

alter table _donor
    add country text,
    add birthday date;

-- Until now, all members were from Denmark
update
    _donor
set
    country = 'Denmark'
where
    country is null
    and tin is not null;

-- Update existing views to use new columns - NO OTHER CHANGES WERE MADE
drop view kpi;

drop view donor_with_sensitive_info;

drop view donations_to_email;

create view donor_with_sensitive_info as
select
    id,
    name,
    email,
    address,
    postcode,
    city,
    country,
    tin,
    birthday,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

create view kpi as
with x as (
    select
        count(distinct tin) as members
    from
        donor_with_sensitive_info ds
        inner join donation d on d.donor_id = ds.id
        inner join charge c on c.donation_id = d.id
    where
        d.recipient = 'Giv Effektivt membership'
        and c.status = 'charged'
        and date_trunc('year', c.created_at) = date_trunc('year', now())
),
y as (
    select
        sum(
            case when d.amount >= 200 then
                1
            end) as donations_200,
        sum(d.amount) as donations_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt membership'
),
z as (
    select
        sum(
            case when amount >= 200 then
                1
            end) as monthly_200,
        sum(amount) as monthly_total
    from ( select distinct on (d.id)
            amount,
            c.status
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            recipient != 'Giv Effektivt membership'
            and frequency = 'monthly'
            and not cancelled
        order by
            d.id,
            c.created_at desc) c1
    where
        status = 'charged'
)
select
    *
from
    x,
    y,
    z;

create view donations_to_email as select distinct on (d.id)
    d.id,
    email,
    amount,
    recipient,
    frequency,
    tax_deductible,
    country
from
    donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join charge c on c.donation_id = d.id
where
    emailed = 'no'
    and c.status = 'charged'
order by
    d.id,
    c.created_at desc;

-- Re-grant access to these views - NO CHANGE
grant select on kpi to everyone;

grant select on donations_to_email to reader_sensitive;

grant select on donor_with_sensitive_info to reader_sensitive;

grant insert, update on donor_with_sensitive_info to writer;

-- migrate:down
