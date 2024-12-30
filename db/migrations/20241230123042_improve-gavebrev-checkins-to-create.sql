-- migrate:up
drop view gavebrev_checkins_to_create;

create view gavebrev_checkins_to_create as
select
    *
from ( select distinct on (g.donor_id)
        g.donor_id as donor_id,
        coalesce(c.year + 1, date_part('year', g.created_at)::numeric) as year,
        coalesce(c.income_verified, coalesce(c.income_preliminary, coalesce(c.income_inferred, 0))) as income_inferred
    from
        gavebrev g
    left join gavebrev_checkin c on g.donor_id = c.donor_id
where
    g.status = 'signed'
    and g.stopped_at >= now()
order by
    g.donor_id,
    c.year desc) s
where
    year <= date_part('year', now());

grant select on gavebrev_checkins_to_create to reader_sensitive;

select
    cron.schedule('create-gavebrev-checkins', '0 4 * * *', 'insert into gavebrev_checkin(donor_id, year, income_inferred) select * from gavebrev_checkins_to_create');

-- migrate:down
