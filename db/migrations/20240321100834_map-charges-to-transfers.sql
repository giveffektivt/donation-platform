-- migrate:up
--
-- Recreate transfer table
--
create type transfer_recipient as enum(
    'GiveWell Top Charities Fund',
    'GiveWell All Grants Fund',
    'Against Malaria Foundation',
    'Malaria Consortium',
    'Helen Keller International',
    'New Incentives',
    'Give Directly',
    'SCI Foundation'
);

drop view kpi;

drop view recipient_distribution;

drop rule transfers_soft_delete on transfer;

drop trigger transfers_update_timestamp on _transfer;

drop view transfer;

drop table _transfer;

create table _transfer(
    id uuid primary key default gen_random_uuid(),
    recipient transfer_recipient not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create view transfer as
select
    id,
    recipient,
    created_at,
    updated_at
from
    _transfer
where
    deleted_at is null;

create trigger transfers_update_timestamp
    before update on _transfer for each row
    execute procedure trigger_update_timestamp();

create rule transfers_soft_delete as on delete to transfer
    do instead
    update
        _transfer set
        deleted_at = now()
    where
        deleted_at is null
        and id = old.id;

--
-- Link charges to transfers
--
alter table _charge
    add column transfer_id uuid references _transfer(id);

create or replace view charge as
select
    id,
    donation_id,
    short_id,
    status,
    created_at,
    updated_at,
    transfer_id
from
    _charge
where
    deleted_at is null;

create or replace view charge_with_gateway_info as
select
    id,
    donation_id,
    short_id,
    status,
    gateway_metadata,
    created_at,
    updated_at,
    transfer_id
from
    _charge
where
    deleted_at is null;

--
-- Recreate kpi view
--

create view kpi as
with dkk_total as (
    select
        round(sum(d.amount))::numeric as dkk_total
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
),
dkk_pending_transfer as (
    select
        coalesce(round(sum(d.amount))::numeric, 0) as dkk_pending_transfer
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and transfer_id is null
),
dkk_last_30_days as (
    select
        round(sum(d.amount))::numeric as dkk_last_30_days
    from
        donation d
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
        and c.created_at >= date_trunc('day', now()) - interval '30 days'
),
dkk_recurring_next_year as (
    select
        12 * sum(amount)::numeric as dkk_recurring_next_year
    from ( select distinct on (d.id)
            amount
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            c.status in ('charged', 'created')
            and recipient != 'Giv Effektivt'
            and frequency = 'monthly'
            and not d.cancelled) c1
),
members_confirmed as (
    select
        count(distinct p.tin)::numeric as members_confirmed
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient = 'Giv Effektivt'
        and c.created_at >= date_trunc('year', now())
),
members_pending_renewal as (
    select
        count(*)::numeric as members_pending_renewal
    from ( select distinct on (p.tin)
            p.tin,
            c.created_at
        from
            donor_with_sensitive_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient = 'Giv Effektivt'
            and not d.cancelled
        order by
            p.tin,
            c.created_at desc) a
    where
        created_at < date_trunc('year', now())
),
monthly_donors as (
    select
        count(distinct p.email)::numeric as monthly_donors
    from
        donor_with_sensitive_info p
        inner join donation d on d.donor_id = p.id
        inner join charge c on c.donation_id = d.id
    where
        c.status in ('charged', 'created')
        and d.recipient != 'Giv Effektivt'
        and d.frequency = 'monthly'
        and not d.cancelled
)
select
    *
from
    dkk_total,
    dkk_pending_transfer,
    dkk_last_30_days,
    dkk_recurring_next_year,
    members_confirmed,
    members_pending_renewal,
    monthly_donors;

--
-- New views
--
create view transferred_distribution as
select
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    donation d
    inner join charge c on c.donation_id = d.id
    inner join transfer t on c.transfer_id = t.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and transfer_id is not null
group by
    t.recipient
order by
    dkk_total desc;

create view pending_distribution as
select
    d.recipient,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    donation d
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and transfer_id is null
group by
    d.recipient
order by
    dkk_total desc;

create view transfer_overview as
select
    t.recipient,
    round(sum(amount))::numeric as dkk_total,
    t.created_at
from
    donation d
    join charge c on c. donation_id = d.id
    join transfer t on c.transfer_id = t.id
group by
    t.recipient,
    t.created_at
order by
    t.created_at,
    sum(amount) desc;

--
-- Migrate data
--

insert into transfer(id, recipient, created_at, updated_at) values
('369a4163-80c3-48eb-8baf-0703055d45bb', 'GiveWell Top Charities Fund', '2022-06-27 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('330aa885-4700-45aa-9ad5-f93b89f374dc', 'Against Malaria Foundation', '2022-06-27 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('915d8108-c70c-4d1d-9016-80b531b90a09', 'Give Directly', '2022-06-27 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('d28094d4-eb60-43e1-8adc-94f1286e9751', 'SCI Foundation', '2022-06-27 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('de830b92-4cb8-41f3-9820-458d9c9632c3', 'GiveWell Top Charities Fund', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('9217618a-fdaa-48dc-af8f-6b6b71e0766c', 'GiveWell All Grants Fund', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('b87eab9e-4a48-490d-8221-0d22f35c24f0', 'Against Malaria Foundation', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('fa1cfc23-59ca-4436-b867-fdaf5d6fbf45', 'Malaria Consortium', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('2ceef1e3-350c-4753-b8d5-9817c350a25d', 'Give Directly', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('bf50d4f5-4420-4471-a77b-939f3aa50755', 'SCI Foundation', '2022-09-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('6e26dcdf-d08a-4364-8494-dc036c153a72', 'GiveWell Top Charities Fund', '2022-12-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('4536f667-f750-406e-b5ab-4f1ce94a545c', 'GiveWell All Grants Fund', '2022-12-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('338551c9-40b5-4e87-ba9c-21358509b55a', 'Against Malaria Foundation', '2022-12-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('82eef6c4-c1e0-40fc-9aca-2f386b5eddd2', 'Helen Keller International', '2022-12-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('1d86cc9a-edd3-424c-9f48-8f1d37b0805b', 'New Incentives', '2022-12-20 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('5fc2ce45-e75e-4ac7-b622-8060f1d0ec80', 'GiveWell Top Charities Fund', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('3f065ad7-fc70-4a75-aa52-16ba9795e421', 'GiveWell All Grants Fund', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('e92acb56-40f8-4ba5-938d-0dcd50280192', 'Against Malaria Foundation', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('03a2284c-84e9-43b1-a4d0-abae3b95cc0d', 'Malaria Consortium', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('612128cc-68c4-46e3-95e1-0d4579371618', 'Helen Keller International', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('56286e8e-d0b9-4fb9-aa93-41776499b919', 'New Incentives', '2023-03-21 00:00:00+00', '2023-06-20 09:45:13.578873+00'),
('7e3d6276-d773-46ac-9d59-49ebc0385c3e', 'GiveWell Top Charities Fund', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('e830b1bb-299e-47a6-a70b-d8d2d90d55aa', 'GiveWell All Grants Fund', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('465a0965-99c9-487b-921b-bf407da0c3c4', 'Against Malaria Foundation', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('d3c6153e-5f2f-4a75-ba79-be9926dfe1cf', 'Malaria Consortium', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('94b94b6b-023d-467a-b9cd-211d7d9e0994', 'Helen Keller International', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('e547bfb6-f2c5-49c8-b014-45c504bb20e6', 'New Incentives', '2023-06-22 21:00:14.694698+00', '2023-06-22 21:00:14.694698+00'),
('3a50900c-814d-42c5-a4da-86e07a6bc488', 'GiveWell Top Charities Fund', '2023-09-28 19:28:34.337362+00', '2023-09-28 19:28:34.337362+00'),
('1a371112-e9f0-449b-a5bb-b913d218244a', 'Against Malaria Foundation', '2023-09-28 19:28:34.337362+00', '2023-09-28 19:28:34.337362+00'),
('1c4c9d70-69d9-4c1c-84f0-c0293b57e83e', 'Malaria Consortium', '2023-09-28 19:28:34.337362+00', '2023-09-28 19:28:34.337362+00'),
('02b92d9d-bf48-4293-9f78-68b31a093a39', 'Helen Keller International', '2023-09-28 19:28:34.337362+00', '2023-09-28 19:28:34.337362+00'),
('03a6fce0-625a-4748-ad90-8071b4229197', 'New Incentives', '2023-09-28 19:28:34.337362+00', '2023-09-28 19:28:34.337362+00'),
('99b3d6dc-568a-48af-8432-af74964cae9c', 'GiveWell Top Charities Fund', '2024-01-30 00:00:00+00', '2024-01-30 10:00:50.908996+00'),
('87bdf2d7-474e-4bc3-9aa5-e1f5c95f7191', 'GiveWell Top Charities Fund', '2024-03-19 00:00:00+00', '2024-03-20 11:58:13.725821+00');

update charge set transfer_id = '369a4163-80c3-48eb-8baf-0703055d45bb' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Stor og velkendt effekt' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-06-27');
update charge set transfer_id = '330aa885-4700-45aa-9ad5-f93b89f374dc' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-06-27');
update charge set transfer_id = '915d8108-c70c-4d1d-9016-80b531b90a09' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Kontanter overførsler til verdens fattigste' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-06-27');
update charge set transfer_id = 'd28094d4-eb60-43e1-8adc-94f1286e9751' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Ormekur' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-06-27');

update charge set transfer_id = 'de830b92-4cb8-41f3-9820-458d9c9632c3' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Stor og velkendt effekt' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20 06:00');
update charge set transfer_id = '9217618a-fdaa-48dc-af8f-6b6b71e0766c' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20 06:00');
update charge set transfer_id = 'b87eab9e-4a48-490d-8221-0d22f35c24f0' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20');
update charge set transfer_id = 'fa1cfc23-59ca-4436-b867-fdaf5d6fbf45' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Medicin mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20');
update charge set transfer_id = '2ceef1e3-350c-4753-b8d5-9817c350a25d' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Kontanter overførsler til verdens fattigste' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20');
update charge set transfer_id = 'bf50d4f5-4420-4471-a77b-939f3aa50755' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Ormekur' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-09-20');

update charge set transfer_id = '6e26dcdf-d08a-4364-8494-dc036c153a72' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Stor og velkendt effekt' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-12-21');
update charge set transfer_id = '4536f667-f750-406e-b5ab-4f1ce94a545c' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-12-21');
update charge set transfer_id = '338551c9-40b5-4e87-ba9c-21358509b55a' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-12-20');
update charge set transfer_id = '82eef6c4-c1e0-40fc-9aca-2f386b5eddd2' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vitamin mod mangelsygdomme' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-12-20');
update charge set transfer_id = '1d86cc9a-edd3-424c-9f48-8f1d37b0805b' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vacciner til spædbørn' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2022-12-20');

update charge set transfer_id = '5fc2ce45-e75e-4ac7-b622-8060f1d0ec80' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Stor og velkendt effekt' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-22');
update charge set transfer_id = '3f065ad7-fc70-4a75-aa52-16ba9795e421' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-22');
update charge set transfer_id = 'e92acb56-40f8-4ba5-938d-0dcd50280192' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-21');
update charge set transfer_id = '03a2284c-84e9-43b1-a4d0-abae3b95cc0d' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Medicin mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-21');
update charge set transfer_id = '612128cc-68c4-46e3-95e1-0d4579371618' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vitamin mod mangelsygdomme' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-21');
update charge set transfer_id = '56286e8e-d0b9-4fb9-aa93-41776499b919' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vacciner til spædbørn' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-03-21');

update charge set transfer_id = '7e3d6276-d773-46ac-9d59-49ebc0385c3e' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Stor og velkendt effekt' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-22 12:00' and c.id not in ('b5d692fd-3aa3-4b0c-8548-2271862b2017'));
update charge set transfer_id = 'e830b1bb-299e-47a6-a70b-d8d2d90d55aa' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-20 14:00' and c.id not in ('f2b6c881-9e23-4d31-9d58-a524757c18cd'));
update charge set transfer_id = '465a0965-99c9-487b-921b-bf407da0c3c4' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-22');
update charge set transfer_id = 'd3c6153e-5f2f-4a75-ba79-be9926dfe1cf' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Medicin mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-22');
update charge set transfer_id = '94b94b6b-023d-467a-b9cd-211d7d9e0994' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vitamin mod mangelsygdomme' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-22');
update charge set transfer_id = 'e547bfb6-f2c5-49c8-b014-45c504bb20e6' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vacciner til spædbørn' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-06-22');

update charge set transfer_id = '3a50900c-814d-42c5-a4da-86e07a6bc488' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient in ('Giv Effektivts anbefaling', 'Stor og velkendt effekt') and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-09-26 12:00' and c.id not in ('6d8e25ea-1f65-493b-bea8-36fedf8af753', '89748ee1-80b1-475b-a385-b9ceaddfadf1', '1eb4de72-80b8-44e8-9173-37575803bd8e'));
update charge set transfer_id = '1a371112-e9f0-449b-a5bb-b913d218244a' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Myggenet mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-09-28');
update charge set transfer_id = '1c4c9d70-69d9-4c1c-84f0-c0293b57e83e' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Medicin mod malaria' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-09-28');
update charge set transfer_id = '02b92d9d-bf48-4293-9f78-68b31a093a39' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vitamin mod mangelsygdomme' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-09-28');
update charge set transfer_id = '03a6fce0-625a-4748-ad90-8071b4229197' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Vacciner til spædbørn' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2023-09-28');

update charge set transfer_id = '99b3d6dc-568a-48af-8432-af74964cae9c' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2024-01-01');

update charge set transfer_id = '87bdf2d7-474e-4bc3-9aa5-e1f5c95f7191' where id in (select c.id from donation_with_gateway_info d join charge_with_gateway_info c on d.id = c.donation_id where d.recipient = 'Giv Effektivts anbefaling' and c.status = 'charged' and c.transfer_id is null and c.created_at < '2024-03-18' and c.id not in ('c609ef25-b3b1-481e-9717-bfe17a5ef492'));


--
-- Restore permissions
--
grant select on transfer to everyone;

grant insert, update, delete on transfer to writer;

grant select on kpi to everyone;

grant select on pending_distribution to everyone;

grant select on transferred_distribution to everyone;

grant select on transfer_overview to everyone;

-- migrate:down
