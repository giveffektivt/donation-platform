-- migrate:up
drop view time_distribution;

create view time_distribution as
with successful_charges as (
    select
        date_trunc('month', c.created_at) as month,
        sum(amount) as dkk_total,
        count(*)::numeric as payments_total
    from
        charge c
        join donation d on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.recipient != 'Giv Effektivt'
    group by
        month
),
monthly_donations_charged_exactly_once as (
    select
        *
    from (
        select
            d.id,
            count(c.id) as number_of_donations,
        max(c.created_at) as last_donated_at
    from
        donation d
        join charge c on d.id = c.donation_id
    where
        c.status = 'charged'
        and recipient != 'Giv Effektivt'
        and frequency = 'monthly'
    group by
        d.id)
    where
        number_of_donations = 1
        and last_donated_at < now() - interval '40 days'
),
stopped_monthly_donations as (
    select
        email,
        date_trunc('month', last_donated_at + interval '1 month') as stop_month,
        - sum(amount) as amount,
        frequency
    from ( select distinct on (d.id)
            p.email,
            c.created_at as last_donated_at,
            amount,
            frequency
        from
            donor_with_contact_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and recipient != 'Giv Effektivt'
            and frequency = 'monthly'
            and not exists (
                select
                    1
                from
                    monthly_donations_charged_exactly_once m
                where
                    d.id = m.id)
            order by
                d.id,
                c.created_at desc) a
        where
            last_donated_at + interval '40 days' < now()
        group by
            email,
            date_trunc('month', last_donated_at + interval '1 month'),
            frequency
        order by
            email,
            stop_month desc
),
started_donations as (
    select
        email,
        start_month,
        sum(amount) as amount,
        frequency
    from ( select distinct on (d.id)
            email,
            date_trunc('month', c.created_at) as start_month,
            amount,
            case when exists (
                select
                    1
                from
                    monthly_donations_charged_exactly_once m
                where
                    d.id = m.id) then
                'once'
            else
                frequency
            end as frequency
        from
            donor_with_contact_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and recipient != 'Giv Effektivt'
        order by
            d.id,
            c.created_at)
    group by
        email,
        start_month,
        frequency
    order by
        email,
        start_month desc
),
changed_donations as (
    select
        coalesce(start_month, stop_month) as month,
    coalesce(a.email, b.email) as email,
    coalesce(a.frequency, b.frequency) as frequency,
sum(coalesce(a.amount, 0)) + sum(coalesce(b.amount, 0)) as amount
from
    started_donations a
    full outer join stopped_monthly_donations b on a.email = b.email
    and a.frequency = b.frequency
    and a.start_month = b.stop_month
group by
    coalesce(a.email, b.email),
    coalesce(a.frequency, b.frequency),
    coalesce(start_month, stop_month)
),
value_added_lost as (
    select
        month,
        sum(amount *(
                case when amount > 0 then
                    1
                else
                    0
                end) *(
                case when frequency = 'monthly' then
                    18
                else
                    1
                end))::numeric as value_added,
        sum(amount *(
                case when amount > 0 then
                    1
                else
                    0
                end) *(
                case when frequency = 'monthly' then
                    18
                else
                    0
                end))::numeric as value_added_monthly,
        sum(amount *(
                case when amount > 0 then
                    1
                else
                    0
                end) *(
                case when frequency = 'monthly' then
                    0
                else
                    1
                end))::numeric as value_added_once,
        sum(amount *(
                case when amount < 0 then
                    1
                else
                    0
                end) * 18)::numeric as value_lost
    from
        changed_donations
    group by
        month
    order by
        month desc
),
monthly_donors as (
    select
        date_trunc('month', c.created_at) as month,
    count(distinct c.donation_id) as monthly_donors
from
    charge c
    join donation_with_contact_info d on c.donation_id = d.id
    where
        c.status = 'charged'
        and d.frequency = 'monthly'
        and d.recipient != 'Giv Effektivt'
    group by
        date_trunc('month', c.created_at))
select
    to_char(a.month, 'yyyy') || '-' || to_char(a.month, 'MM') as date,
    coalesce(sum(dkk_total), 0) as dkk_total,
    coalesce(sum(payments_total), 0) as payments_total,
    coalesce(sum(value_added), 0) as value_added,
    coalesce(sum(value_added_monthly), 0) as value_added_monthly,
    coalesce(sum(value_added_once), 0) as value_added_once,
    coalesce(sum(value_lost), 0) as value_lost,
    coalesce(sum(monthly_donors), 0) as monthly_donors
from
    successful_charges a
    full join value_added_lost b on a.month = b.month
    full join monthly_donors c on a.month = c.month
group by
    a.month
order by
    a.month desc;

grant select on time_distribution to everyone;

-- migrate:down
