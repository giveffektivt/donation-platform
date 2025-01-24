-- migrate:up
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
charge,
charges_to_charge,
charge_with_gateway_info,
donation,
donations_to_create_charges,
donations_to_email,
donation_with_contact_info,
donation_with_sensitive_info,
donor,
donor_with_contact_info,
donor_with_sensitive_info,
failed_recurring_donations,
fundraiser,
fundraiser_activity_checkin,
gavebrev,
gavebrev_checkin,
gavebrev_checkins_to_create,
ignored_renewals,
kpi,
old_ids_map,
pending_distribution,
skat,
skat_gaveskema,
time_distribution,
transfer,
transfer_overview,
transfer_pending,
transferred_distribution cascade;

-- =========== table views ===========
--
--------------------------------------
create view donor as
select
    id,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

create rule donor_soft_delete as on delete to donor do instead
update _donor
set
    deleted_at = now()
where
    id = old.id
    and deleted_at is null;

grant
select
    on donor to reader;

grant insert,
update,
delete on donor to writer;

--------------------------------------
create view donor_with_contact_info as
select
    id,
    name,
    email,
    created_at,
    updated_at
from
    _donor
where
    deleted_at is null;

create rule donor_with_contact_info_soft_delete as on delete to donor_with_contact_info do instead
update _donor
set
    deleted_at = now()
where
    id = old.id
    and deleted_at is null;

grant
select
    on donor_with_contact_info to reader_contact;

grant insert,
update,
delete on donor_with_contact_info to writer;

--------------------------------------
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

create rule donor_with_sensitive_info_soft_delete as on delete to donor_with_sensitive_info do instead
update _donor
set
    deleted_at = now()
where
    id = old.id
    and deleted_at is null;

grant
select
    on donor_with_sensitive_info to reader_sensitive;

grant insert,
update,
delete on donor_with_sensitive_info to writer;

--------------------------------------
create view donation as
select
    id,
    donor_id,
    emailed,
    amount,
    recipient,
    frequency,
    cancelled,
    gateway,
    method,
    tax_deductible,
    created_at,
    updated_at,
    fundraiser_id
from
    _donation
where
    deleted_at is null;

create rule donation_soft_delete as on delete to donation do instead
update _donation
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on donation to reader;

grant insert,
update,
delete on donation to writer;

--------------------------------------
create view donation_with_contact_info as
select
    id,
    donor_id,
    emailed,
    amount,
    recipient,
    frequency,
    cancelled,
    gateway,
    method,
    tax_deductible,
    fundraiser_id,
    message,
    created_at,
    updated_at
from
    _donation
where
    deleted_at is null;

create rule donation_with_contact_info_soft_delete as on delete to donation_with_contact_info do instead
update _donation
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on donation_with_contact_info to reader_contact;

grant insert,
update,
delete on donation_with_contact_info to writer;

--------------------------------------
create view donation_with_sensitive_info as
select
    id,
    donor_id,
    emailed,
    amount,
    recipient,
    frequency,
    cancelled,
    gateway,
    method,
    tax_deductible,
    fundraiser_id,
    message,
    gateway_metadata,
    created_at,
    updated_at
from
    _donation
where
    deleted_at is null;

create rule donation_with_sensitive_info_soft_delete as on delete to donation_with_sensitive_info do instead
update _donation
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on donation_with_sensitive_info to reader_sensitive;

grant insert,
update,
delete on donation_with_sensitive_info to writer;

--------------------------------------
create view charge as
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

create rule charge_soft_delete as on delete to charge do instead
update _charge
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on charge to reader;

grant insert,
update,
delete on charge to writer;

--------------------------------------
create view charge_with_gateway_info as
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

create rule charge_with_gateway_info_soft_delete as on delete to charge_with_gateway_info do instead
update _charge
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on charge_with_gateway_info to reader_sensitive;

grant insert,
update,
delete on charge_with_gateway_info to writer;

--------------------------------------
create view fundraiser as
select
    id,
    email,
    title,
    has_match,
    match_currency,
    key,
    created_at,
    updated_at
from
    _fundraiser
where
    deleted_at is null;

create rule fundraiser_soft_delete as on delete to fundraiser do instead
update _fundraiser
set
    deleted_at = now()
where
    id = old.id
    and deleted_at is null;

grant
select
    on fundraiser to reader;

grant insert,
update,
delete on fundraiser to writer;

--------------------------------------
create view fundraiser_activity_checkin as
select
    id,
    fundraiser_id,
    amount,
    created_at,
    updated_at
from
    _fundraiser_activity_checkin
where
    deleted_at is null;

grant
select
    on fundraiser_activity_checkin to reader;

grant insert,
update,
delete on fundraiser_activity_checkin to writer;

--------------------------------------
create view gavebrev as
select
    id,
    donor_id,
    status,
    type,
    amount,
    minimal_income,
    started_at,
    stopped_at,
    created_at,
    updated_at
from
    _gavebrev
where
    deleted_at is null;

create rule gavebrev_soft_delete as on delete to gavebrev do instead
update _gavebrev
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on gavebrev to reader_sensitive;

grant insert,
update,
delete on gavebrev to writer;

--------------------------------------
create view gavebrev_checkin as
select
    id,
    donor_id,
    year,
    income_inferred,
    income_preliminary,
    income_verified,
    maximize_tax_deduction,
    created_at,
    updated_at
from
    _gavebrev_checkin
where
    deleted_at is null;

create rule gavebrev_checkin_soft_delete as on delete to gavebrev_checkin do instead
update _gavebrev_checkin
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on gavebrev_checkin to reader_sensitive;

grant insert,
update,
delete on gavebrev_checkin to writer;

--------------------------------------
create view skat as
select
    const,
    ge_cvr,
    donor_cpr,
    year,
    blank,
    total,
    ll8a_or_gavebrev,
    ge_notes,
    rettekode,
    id,
    created_at,
    updated_at
from
    _skat
where
    deleted_at is null;

create rule skat_soft_delete as on delete to skat do instead
update _skat
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on skat to reader_sensitive;

grant insert,
update,
delete on skat to writer;

--------------------------------------
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

create rule skat_gaveskema_soft_delete as on delete to skat_gaveskema do instead
update _skat_gaveskema
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on skat_gaveskema to reader_sensitive;

grant insert,
update,
delete on skat_gaveskema to writer;

--------------------------------------
create view transfer as
select
    id,
    earmark,
    recipient,
    unit_cost_external,
    unit_cost_conversion,
    life_cost_external,
    exchange_rate,
    created_at,
    updated_at
from
    _transfer
where
    deleted_at is null
order by
    created_at;

create rule transfer_soft_delete as on delete to transfer do instead
update _transfer
set
    deleted_at = now()
where
    deleted_at is null
    and id = old.id;

grant
select
    on transfer to everyone;

grant insert,
update,
delete on transfer to writer;

-- =========== helper views ===========
--
create view old_ids_map as
select
    p.id as donor_id,
    p._old_id as old_donor_id,
    d.id as donation_id,
    d._old_id as old_donation_id,
    c.id as charge_id,
    c._old_id as old_charge_id
from
    _donor p
    left join _donation d on p.id = d.donor_id
    left join _charge c on d.id = c.donation_id
where
    p.deleted_at is null
    and d.deleted_at is null
    and c.deleted_at is null
    and (
        p._old_id is not null
        or d._old_id is not null
        or c._old_id is not null
    );

grant
select
    on old_ids_map to reader;

--------------------------------------
create view donations_to_create_charges as
select
    *
from
    (
        select distinct
            on (d.id) d.id as donation_id,
            d.frequency,
            c.created_at as last_charge,
            (
                case
                    when d.frequency = 'monthly' then c.created_at + interval '1' month
                    when d.frequency = 'yearly' then c.created_at + interval '1' year
                end
            ) as next_charge
        from
            donation d
            inner join charge c on c.donation_id = d.id
        where
            gateway in ('Quickpay', 'Scanpay')
            and not cancelled
            and frequency in ('monthly', 'yearly')
        order by
            d.id,
            c.created_at desc
    ) s
where
    next_charge <= now();

grant
select
    on donations_to_create_charges to reader_sensitive;

select
    cron.schedule (
        'create-charges',
        '0 * * * *',
        'insert into charge(donation_id, created_at, status) select donation_id, next_charge, ''created'' from donations_to_create_charges'
    );

--------------------------------------
create view gavebrev_checkins_to_create as
select
    *
from
    (
        select distinct
            on (g.donor_id) g.donor_id as donor_id,
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
            c.year desc
    ) s
where
    year <= date_part('year', now());

grant
select
    on gavebrev_checkins_to_create to reader_sensitive;

select
    cron.schedule (
        'create-gavebrev-checkins',
        '0 4 * * *',
        'insert into gavebrev_checkin(donor_id, year, income_inferred) select * from gavebrev_checkins_to_create'
    );

--------------------------------------
create view donations_to_email as
select
    d.id,
    email,
    amount,
    recipient,
    frequency,
    tax_deductible
from
    donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join lateral (
        select
            id,
            status
        from
            charge
        where
            donation_id = d.id
        order by
            created_at desc
        limit
            1
    ) c on 1 = 1
where
    emailed = 'no'
    and (
        c.status = 'charged'
        or (
            method = 'MobilePay'
            and frequency != 'once'
            and c.status != 'error'
        )
    );

grant
select
    on donations_to_email to reader_sensitive;

grant
update on donations_to_email to writer;

--------------------------------------
create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    recipient,
    gateway,
    method,
    c.gateway_metadata,
    d.gateway_metadata as donation_gateway_metadata
from
    donor_with_contact_info dc
    inner join donation_with_sensitive_info d on d.donor_id = dc.id
    inner join charge_with_gateway_info c on c.donation_id = d.id
where
    gateway in ('Quickpay', 'Scanpay')
    and not cancelled
    and status = 'created'
    and c.created_at <= now();

grant
select
    on charges_to_charge to reader_sensitive;

grant
update on charges_to_charge to writer;

--------------------------------------
create view failed_recurring_donations as
with
    paid_before as (
        select distinct
            on (d.id) d.id
        from
            donation_with_sensitive_info d
            inner join donor_with_contact_info p on d.donor_id = p.id
            inner join charge_with_gateway_info c on c.donation_id = d.id
        where
            gateway in ('Quickpay', 'Scanpay')
            and not cancelled
            and frequency in ('monthly', 'yearly')
            and status = 'charged'
        order by
            d.id
    )
select
    *
from
    (
        select distinct
            on (d.id) c.created_at as failed_at,
            c.id as charge_id,
            c.short_id,
            d.amount,
            d.method,
            d.gateway,
            p.id as donor_id,
            p.name as donor_name,
            p.email as donor_email,
            d.id as donation_id,
            d.gateway_metadata,
            d.recipient,
            d.frequency,
            d.tax_deductible,
            d.fundraiser_id,
            d.message,
            c.status
        from
            donation_with_sensitive_info d
            inner join donor_with_contact_info p on d.donor_id = p.id
            inner join charge_with_gateway_info c on c.donation_id = d.id
        where
            d.id in (
                select
                    id
                from
                    paid_before
            )
        order by
            d.id,
            c.created_at desc
    ) s
where
    status = 'error'
order by
    failed_at desc;

grant
select
    on failed_recurring_donations to reader_sensitive;

--------------------------------------
create view annual_tax_report_const as
select
    date_trunc('year', now() - interval '9 months') as year_from,
    date_trunc('year', now() + interval '3 months') as year_to;

create view annual_tax_report_current_payments as
select
    p.tin,
    round(sum(d.amount)) as total,
    min(
        extract(
            year
            from
                c.created_at
        )
    ) as year
from
    annual_tax_report_const
    cross join donor_with_sensitive_info p
    inner join donation d on d.donor_id = p.id
    inner join charge c on c.donation_id = d.id
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
    and c.created_at <@ tstzrange (year_from, year_to, '[)')
    and d.tax_deductible
group by
    p.tin;

create view annual_tax_report_gavebrev_since as
select
    donor_id,
    tin,
    gavebrev_start
from
    lateral (
        select
            donor_id,
            min(
                extract(
                    year
                    from
                        started_at
                )
            ) as gavebrev_start
        from
            annual_tax_report_const,
            gavebrev
        where
            coalesce(stopped_at, now()) > year_from
        group by
            donor_id
    ) a
    cross join lateral (
        select
            tin
        from
            donor_with_sensitive_info p
        where
            id = donor_id
        limit
            1
    ) b;

create view annual_tax_report_gavebrev_checkins as
select
    tin,
    y as year,
    coalesce(c.income_verified, c.income_preliminary, c.income_inferred, 0) as income,
    coalesce(c.maximize_tax_deduction, false) as maximize_tax_deduction
from
    annual_tax_report_const
    cross join annual_tax_report_gavebrev_since g
    cross join generate_series(
        g.gavebrev_start,
        extract(
            year
            from
                year_to
        ) - 1
    ) as y
    left join gavebrev_checkin c on c.year = y
    and c.donor_id = g.donor_id;

create view annual_tax_report_gavebrev_expected_totals as
select
    c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction,
    round(
        sum(
            case
                when g.type = 'percentage' then greatest(0, c.income - coalesce(g.minimal_income, 0)) * g.amount / 100
                when g.type = 'amount' then greatest(
                    0,
                    cast(
                        c.income > 0
                        and c.income >= coalesce(g.minimal_income, 0) as integer
                    ) * g.amount
                )
            end
        )
    ) as expected_total
from
    annual_tax_report_gavebrev_checkins c
    inner join donor_with_sensitive_info p on p.tin = c.tin
    inner join gavebrev g on g.donor_id = p.id
    and extract(
        year
        from
            g.started_at
    ) <= c.year
group by
    c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction;

create view annual_tax_report_gavebrev_all_payments as
with
    gavebrev_per_tin as (
        select
            tin,
            min(started_at) as started_at,
            max(stopped_at) as stopped_at
        from
            gavebrev g
            inner join donor_with_sensitive_info p on g.donor_id = p.id
        group by
            tin
    ),
    gavebrev_tin_years_until_now as (
        select
            tin,
            generate_series(
                extract(
                    year
                    from
                        started_at
                ),
                extract(
                    year
                    from
                        year_from
                )
            ) as year
        from
            annual_tax_report_const
            cross join gavebrev_per_tin g
        where
            started_at <= year_from
            and stopped_at > year_from
    ),
    gavebrev_tin_all_donations_per_year as (
        select
            i.tin,
            i.year,
            d.amount
        from
            gavebrev_tin_years_until_now i
            inner join donor_with_sensitive_info p on i.tin = p.tin
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
            and i.year = extract(
                year
                from
                    c.created_at
            )
        where
            c.status = 'charged'
            and d.recipient != 'Giv Effektivt'
            and d.tax_deductible
    )
select
    i.tin,
    i.year,
    coalesce(round(sum(d.amount)), 0) as actual_total
from
    gavebrev_tin_years_until_now i
    left join gavebrev_tin_all_donations_per_year d on i.tin = d.tin
    and i.year = d.year
group by
    i.tin,
    i.year
order by
    i.tin,
    i.year;

create view annual_tax_report_gavebrev_results as
with recursive
    data as (
        select
            *
        from
            (
                select distinct
                    on (get.tin) get.tin,
                    get.year,
                    a.can_be_reported_this_year,
                    get.expected_total,
                    gap.actual_total,
                    c.non_gavebrev_total,
                    b.gavebrev_total as result,
                    gap.actual_total - get.expected_total - c.non_gavebrev_total as aconto_debt
                from
                    annual_tax_report_gavebrev_expected_totals get
                    inner join annual_tax_report_gavebrev_all_payments gap on gap.tin = get.tin
                    and gap.year = get.year
                    left join max_tax_deduction m on m.year = get.year
                    cross join lateral (
                        select
                            get.expected_total as can_be_reported_this_year
                    ) a
                    cross join lateral (
                        select
                            round(least(get.income * 0.15, least(a.can_be_reported_this_year, gap.actual_total))) as gavebrev_total,
                            least(a.can_be_reported_this_year, gap.actual_total) as uncapped_gavebrev_total
                    ) b
                    cross join lateral (
                        select
                            cast(get.maximize_tax_deduction as integer) * least(coalesce(m.value, 0), greatest(0, gap.actual_total - b.uncapped_gavebrev_total)) as non_gavebrev_total
                    ) c
                order by
                    get.tin,
                    get.year
            ) _a
        union all
        select
            get.tin,
            get.year,
            a.can_be_reported_this_year,
            get.expected_total,
            gap.actual_total,
            c.non_gavebrev_total,
            b.gavebrev_total as result,
            gap.actual_total - get.expected_total - c.non_gavebrev_total + least(0, data.aconto_debt) as aconto_debt
        from
            annual_tax_report_gavebrev_expected_totals get
            inner join data on data.tin = get.tin
            and data.year = get.year - 1
            inner join annual_tax_report_gavebrev_all_payments gap on gap.tin = get.tin
            and gap.year = get.year
            left join max_tax_deduction m on m.year = get.year
            cross join lateral (
                select
                    greatest(0, get.expected_total - data.aconto_debt) as can_be_reported_this_year
            ) a
            cross join lateral (
                select
                    round(least(get.income * 0.15, least(a.can_be_reported_this_year, gap.actual_total))) as gavebrev_total,
                    least(a.can_be_reported_this_year, gap.actual_total) as uncapped_gavebrev_total
            ) b
            cross join lateral (
                select
                    cast(get.maximize_tax_deduction as integer) * least(coalesce(m.value, 0), greatest(0, gap.actual_total - b.uncapped_gavebrev_total)) as non_gavebrev_total
            ) c
    )
select
    *
from
    data;

create view annual_tax_report_data as
with
    with_gavebrev as (
        select distinct
            on (gr.tin) 'L' as ll8a_or_gavebrev,
            gr.tin,
            gr.result as total,
            gr.aconto_debt,
            gr.year
        from
            annual_tax_report_gavebrev_results gr
        order by
            gr.tin,
            gr.year desc
    ),
    gavebrev_current_non_gavebrev_total as (
        select distinct
            on (gr.tin) gr.tin,
            gr.year,
            gr.non_gavebrev_total
        from
            annual_tax_report_gavebrev_results gr
        order by
            gr.tin,
            gr.year desc
    ),
    without_gavebrev as (
        select
            'A' as ll8a_or_gavebrev,
            d.tin,
            coalesce(gr.non_gavebrev_total, d.total) as total,
            0 as aconto_debt,
            d.year
        from
            annual_tax_report_current_payments d
            left join gavebrev_current_non_gavebrev_total gr on gr.tin = d.tin
    ),
    data as (
        select
            *
        from
            with_gavebrev
        union
        select
            *
        from
            without_gavebrev
    )
select
    *
from
    data
where
    total > 0
    or aconto_debt > 0
order by
    tin,
    ll8a_or_gavebrev desc;

create view annual_tax_report as
select
    2262 as const,
    42490903 as ge_cvr,
    replace(tin, '-', '') as donor_cpr,
    year,
    '' as blank,
    total,
    ll8a_or_gavebrev,
    '' as ge_notes,
    0 as rettekode
from
    annual_tax_report_data
where
    total > 0;

grant
select
    on annual_tax_report to reader_sensitive;

grant
select
    on annual_tax_report_gavebrev_results to reader_sensitive;

--------------------------------------
create view annual_tax_report_gaveskema as
with
    const as (
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
            and c.created_at <@ tstzrange (year_from, year_to, '[)')
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
            and c.created_at <@ tstzrange (year_from, year_to, '[)')
    )
select
    extract(
        year
        from
            year_from
    ) as year,
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

grant
select
    on annual_tax_report_gaveskema to reader;

--------------------------------------
create view annual_email_report as
with
    const as (
        select
            date_trunc('year', now() - interval '9 months') as year_from,
            date_trunc('year', now() + interval '3 months') as year_to
    ),
    data as (
        select
            p.tin,
            p.email,
            d.tax_deductible,
            t.recipient,
            round(sum(amount) / max(t.exchange_rate) / (max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as unit,
            sum(d.amount) as total,
            min(c.created_at) as first_donated
        from
            const
            cross join donor_with_sensitive_info p
            join donation d on p.id = d.donor_id
            join charge c on d.id = c.donation_id
            left join transfer t on c.transfer_id = t.id
        where
            c.status = 'charged'
            and d.recipient != 'Giv Effektivt'
            and c.created_at <@ tstzrange (year_from, year_to, '[)')
        group by
            p.tin,
            p.email,
            d.tax_deductible,
            t.recipient
    ),
    members_confirmed as (
        select distinct
            on (p.tin) p.tin,
            p.email
        from
            const
            cross join donor_with_sensitive_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient = 'Giv Effektivt'
            and c.created_at <@ tstzrange (year_from, year_to, '[)')
    ),
    active_gavebrev as (
        select
            tin
        from
            const
            cross join gavebrev g
            inner join donor_with_sensitive_info p on g.donor_id = p.id
        where
            started_at <= year_from
            and stopped_at > year_from
        group by
            tin
    ),
    email_to_tin_guess as (
        select distinct
            on (email) p.email,
            p.tin
        from
            const
            cross join donor_with_sensitive_info p
            join donation d on p.id = d.donor_id
            join charge c on d.id = c.donation_id
        where
            c.status = 'charged'
            and p.tin is not null
        order by
            email,
            p.tin,
            c.created_at desc
    ),
    with_tax as (
        select
            *
        from
            data
        where
            tax_deductible
    ),
    with_tin_no_tax as (
        select
            *
        from
            data
        where
            not tax_deductible
            and tin is not null
    ),
    with_no_tin_no_tax as (
        select
            *
        from
            data
        where
            not tax_deductible
            and tin is null
    )
select
    coalesce(a.tin, b.tin, d.tin) as tin,
    coalesce(a.email, b.email, c.email) as email,
    coalesce(a.tin, b.tin) is null
    and d.tin is not null as is_tin_guessed,
    length(coalesce(a.tin, b.tin, d.tin, '')) = 8 as is_company,
    e.tin is not null as is_member,
    f.tin is not null as has_gavebrev,
    coalesce(a.recipient, b.recipient, c.recipient) as recipient,
    a.total as amount_tax_deductible,
    nullif(coalesce(b.total, 0) + coalesce(c.total, 0), 0) as amount_not_tax_deductible,
    coalesce(a.total, 0) + coalesce(b.total, 0) + coalesce(c.total, 0) as amount_total,
    coalesce(a.unit, 0) + coalesce(b.unit, 0) + coalesce(c.unit, 0) as unit_total,
    least(a.first_donated, b.first_donated, c.first_donated) as first_donated
from
    with_tax a
    full join with_tin_no_tax b on a.tin is not distinct from b.tin
    and a.email = b.email
    and a.recipient is not distinct from b.recipient
    full join with_no_tin_no_tax c on coalesce(a.email, b.email) = c.email
    and coalesce(a.recipient, b.recipient) is not distinct from c.recipient
    left join email_to_tin_guess d on coalesce(a.email, b.email, c.email) = d.email
    left join members_confirmed e on coalesce(a.tin, b.tin, d.tin) = e.tin
    left join active_gavebrev f on coalesce(a.tin, b.tin) = f.tin
order by
    email,
    tin,
    coalesce(a.recipient, b.recipient, c.recipient);

grant
select
    on annual_email_report to reader_sensitive;

--------------------------------------
create view ignored_renewals as
with
    last_charge as (
        select distinct
            on (p.id) p.id,
            p.name,
            p.email,
            d.amount,
            d.recipient,
            c.status,
            c.created_at
        from
            donor_with_contact_info p
            join donation d on p.id = d.donor_id
            join charge c on d.id = c.donation_id
        where
            d.frequency != 'once'
        order by
            p.id,
            c.created_at desc
    ),
    never_activated as (
        select distinct
            on (p.id) p.id,
            d.id as donation_id,
            d.created_at
        from
            donor_with_contact_info p
            left join donation d on p.id = d.donor_id
            left join charge c on d.id = c.donation_id
        where
            c.id is null
            and d.frequency != 'once'
    ),
    last_payment_by_email as (
        select distinct
            on (p.email, d.recipient) p.email,
            d.recipient,
            c.created_at
        from
            donor_with_contact_info p
            join donation d on p.id = d.donor_id
            join charge c on d.id = c.donation_id
        where
            c.status = 'charged'
        order by
            p.email,
            d.recipient,
            c.created_at desc
    ),
    email_to_name as (
        select distinct
            on (email) name,
            email
        from
            donor_with_contact_info p
        where
            name is not null
    )
select
    coalesce(lc.name, en.name) as name,
    lc.email,
    lc.amount,
    lc.recipient,
    na.donation_id,
    now()::date - na.created_at::date as days_ago
from
    last_charge lc
    join never_activated na on lc.id = na.id
    left join last_payment_by_email lp on lc.email = lp.email
    and lc.recipient = lp.recipient
    left join email_to_name en on lc.email = en.email
where
    lc.status = 'error'
    and (
        lp.created_at is null
        or lp.created_at < lc.created_at
    )
order by
    na.created_at;

grant
select
    on ignored_renewals to reader_contact;

--------------------------------------
create view transfer_overview as
select
    t.id,
    t.earmark,
    case
        when t.created_at > now() then 'Forventet: '
        else ''
    end || t.recipient as recipient,
    case
        when t.recipient = 'Against Malaria Foundation' then 'Antimalaria myggenet udleveret'
        when t.recipient = 'Malaria Consortium' then 'Malariamedicin udleveret'
        when t.recipient = 'Helen Keller International' then 'A-vitamintilskud udleveret'
        when t.recipient = 'New Incentives' then 'Vaccinationsprogrammer motiveret'
        when t.recipient = 'Give Directly' then 'Dollars modtaget'
        when t.recipient = 'SCI Foundation' then 'Ormekure udleveret'
    end as unit,
    round(sum(amount))::numeric as total_dkk,
    round(max(t.unit_cost_external), 2) as unit_cost_external,
    round(max(t.unit_cost_conversion), 2) as unit_cost_conversion,
    round(max(t.unit_cost_external) / max(t.unit_cost_conversion) * max(t.exchange_rate), 2) as unit_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) / (max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as unit_impact,
    round(max(t.life_cost_external), 2) as life_cost_external,
    round(max(t.life_cost_external) * max(t.exchange_rate), 2) as life_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) / max(t.life_cost_external), 1) as life_impact,
    max(c.created_at) as computed_at,
    case
        when t.created_at > now() then 'Næste overførsel'
        else to_char(t.created_at, 'yyyy-mm-dd')
    end as transferred_at
from
    donation d
    join charge c on c.donation_id = d.id
    join transfer t on c.transfer_id = t.id
    or (
        c.transfer_id is null
        and d.recipient = t.earmark
        and t.created_at > now()
    )
where
    c.status = 'charged'
    and d.recipient != 'Giv Effektivt'
group by
    t.id,
    t.earmark,
    t.recipient,
    t.created_at
order by
    t.created_at,
    sum(amount) desc;

grant
select
    on transfer_overview to everyone;

--------------------------------------
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

grant
select
    on transferred_distribution to everyone;

--------------------------------------
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

grant
select
    on pending_distribution to everyone;

--------------------------------------
create view time_distribution as
with
    successful_charges as (
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
        from
            (
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
                    d.id
            )
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
        from
            (
                select distinct
                    on (d.id) p.email,
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
                            d.id = m.id
                    )
                order by
                    d.id,
                    c.created_at desc
            ) a
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
        from
            (
                select distinct
                    on (d.id) email,
                    date_trunc('month', c.created_at) as start_month,
                    amount,
                    case
                        when exists (
                            select
                                1
                            from
                                monthly_donations_charged_exactly_once m
                            where
                                d.id = m.id
                        ) then 'once'
                        else frequency
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
                    c.created_at
            )
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
            sum(
                amount * (
                    case
                        when amount > 0 then 1
                        else 0
                    end
                ) * (
                    case
                        when frequency = 'monthly' then 18
                        else 1
                    end
                )
            )::numeric as value_added,
            sum(
                amount * (
                    case
                        when amount > 0 then 1
                        else 0
                    end
                ) * (
                    case
                        when frequency = 'monthly' then 18
                        else 0
                    end
                )
            )::numeric as value_added_monthly,
            sum(
                amount * (
                    case
                        when amount > 0 then 1
                        else 0
                    end
                ) * (
                    case
                        when frequency = 'monthly' then 0
                        else 1
                    end
                )
            )::numeric as value_added_once,
            sum(
                amount * (
                    case
                        when amount < 0 then 1
                        else 0
                    end
                ) * 18
            )::numeric as value_lost
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
            date_trunc('month', c.created_at)
    )
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

grant
select
    on time_distribution to everyone;

create view transfer_pending as
with
    data as (
        select
            c.created_at as donated_at,
            d.amount,
            d.recipient,
            sum(d.amount) over (
                order by
                    c.created_at
            ) as potential_cutoff
        from
            donation d
            join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient != 'Giv Effektivt'
            and c.transfer_id is null
    )
select
    *
from
    data
order by
    donated_at;

grant
select
    on transfer_pending to everyone;

--------------------------------------
create view kpi as
with
    dkk_total as (
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
        from
            (
                select distinct
                    on (d.id) amount
                from
                    charge c
                    join donation d on c.donation_id = d.id
                where
                    c.status in ('charged', 'created')
                    and d.frequency = 'monthly'
                    and d.recipient != 'Giv Effektivt'
                    and not d.cancelled
                    and c.created_at >= date_trunc('month', now()) - interval '1 month'
            ) c1
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
        from
            (
                select distinct
                    on (p.tin) p.tin,
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
                    c.created_at desc
            ) a
        where
            created_at < date_trunc('year', now())
    ),
    monthly_donors as (
        select
            count(distinct c.donation_id) as monthly_donors
        from
            charge c
            join donation d on c.donation_id = d.id
        where
            c.status in ('charged', 'created')
            and d.frequency = 'monthly'
            and d.recipient != 'Giv Effektivt'
            and not d.cancelled
            and c.created_at >= date_trunc('month', now()) - interval '1 month'
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

grant
select
    on kpi to everyone;

-- migrate:down
