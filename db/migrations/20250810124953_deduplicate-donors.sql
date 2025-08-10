-- migrate:up
alter table donor
drop column _old_id;

alter table donation
drop column _old_id;

alter table charge
drop column _old_id;

with
    donor_ids as (
        select distinct
            on (email, tin) id,
            email,
            tin
        from
            donor
    ),
    latest_name as (
        select distinct
            on (email, tin) email,
            tin,
            name
        from
            donor
        where
            name is not null
        order by
            email,
            tin,
            created_at desc
    ),
    latest_address as (
        select distinct
            on (email, tin) email,
            tin,
            address
        from
            donor
        where
            address is not null
        order by
            email,
            tin,
            created_at desc
    ),
    latest_postcode as (
        select distinct
            on (email, tin) email,
            tin,
            postcode
        from
            donor
        where
            postcode is not null
        order by
            email,
            tin,
            created_at desc
    ),
    latest_city as (
        select distinct
            on (email, tin) email,
            tin,
            city
        from
            donor
        where
            city is not null
        order by
            email,
            tin,
            created_at desc
    ),
    latest_country as (
        select distinct
            on (email, tin) email,
            tin,
            country
        from
            donor
        where
            country is not null
        order by
            email,
            tin,
            created_at desc
    ),
    latest_birthday as (
        select distinct
            on (email, tin) email,
            tin,
            birthday
        from
            donor
        where
            birthday is not null
        order by
            email,
            tin,
            created_at desc
    ),
    groups as (
        select
            s.email,
            s.tin,
            s.id,
            ln.name,
            la.address,
            lp.postcode,
            lc.city,
            lt.country,
            lb.birthday
        from
            donor_ids s
            left join latest_name ln on ln.email = s.email
            and ln.tin is not distinct from s.tin
            left join latest_address la on la.email = s.email
            and la.tin is not distinct from s.tin
            left join latest_postcode lp on lp.email = s.email
            and lp.tin is not distinct from s.tin
            left join latest_city lc on lc.email = s.email
            and lc.tin is not distinct from s.tin
            left join latest_country lt on lt.email = s.email
            and lt.tin is not distinct from s.tin
            left join latest_birthday lb on lb.email = s.email
            and lb.tin is not distinct from s.tin
    ),
    update_donors as (
        update donor p
        set
            name = g.name,
            address = g.address,
            postcode = g.postcode,
            city = g.city,
            country = g.country,
            birthday = g.birthday
        from
            groups g
        where
            p.id = g.id
    ),
    update_donations as (
        update donation d
        set
            donor_id = g.id
        from
            donor p
            join groups g on p.email = g.email
            and p.tin is not distinct from g.tin
        where
            d.donor_id = p.id
            and p.id <> g.id
    ),
    update_gavebrev as (
        update gavebrev d
        set
            donor_id = g.id
        from
            donor p
            join groups g on p.email = g.email
            and p.tin is not distinct from g.tin
        where
            d.donor_id = p.id
            and p.id <> g.id
    ),
    update_gavebrev_checkin as (
        update gavebrev_checkin d
        set
            donor_id = g.id
        from
            donor p
            join groups g on p.email = g.email
            and p.tin is not distinct from g.tin
        where
            d.donor_id = p.id
            and p.id <> g.id
    ),
    delete_duplicates as (
        delete from donor p using groups g
        where
            p.email = g.email
            and p.tin is not distinct from g.tin
            and p.id <> g.id
    )
select
    1;

create unique index donor_unique_email_tin on donor (email, coalesce(tin, ''));

create function register_donor (
    email text,
    tin text default null,
    name text default null,
    address text default null,
    postcode text default null,
    city text default null,
    country text default null,
    birthday date default null
) returns donor language sql as $$
insert into donor(email, tin, name, address, postcode, city, country, birthday)
values (email, tin, name, address, postcode, city, country, birthday)
on conflict (email, coalesce(tin,'')) do update
set
  name     = coalesce(excluded.name, donor.name),
  address  = coalesce(excluded.address, donor.address),
  postcode = coalesce(excluded.postcode, donor.postcode),
  city     = coalesce(excluded.city, donor.city),
  country  = coalesce(excluded.country, donor.country),
  birthday = coalesce(excluded.birthday, donor.birthday)
returning *;
$$;

-- migrate:down
