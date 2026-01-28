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
annual_tax_report_pending_update,
charged_donations,
charged_donations_internal,
charged_donations_by_transfer,
charged_donations_by_transfer_internal,
charged_memberships,
charged_memberships_internal,
charged_or_created_donations,
charges_to_charge,
crm_export,
donations_overview,
donations_overview_internal,
donations_to_create_charges,
donations_to_create_retry_charges,
donations_to_email,
donor_acquisition,
donor_impact_report,
failed_recurring_donations,
failed_recurring_donations_to_auto_cancel,
gavebrev_checkins_to_create,
gwwc_money_moved,
ignored_renewals,
kpi,
pending_distribution,
renew_donations_to_email,
time_distribution_daily,
time_distribution_monthly,
transfer_overview,
transfer_pending,
transferred_distribution,
value_lost_analysis cascade;

drop function if exists register_donation,
change_donation,
register_gavebrev,
recreate_failed_recurring_donation,
general_assembly_invitations cascade;

--------------------------------------
create view donations_overview_internal as
select
    p.id as donor_id,
    p.name,
    p.email,
    p.tin,
    d.id as donation_id,
    d.frequency,
    d.amount,
    coalesce(
        (
            select
                string_agg(
                    e.recipient || '=' || e.percentage || '%',
                    ', '
                    order by
                        e.percentage desc
                )
            from
                earmark e
            where
                e.donation_id = d.id
        ),
        ''
    ) as earmarks,
    d.cancelled,
    d.method,
    d.gateway,
    d.gateway_metadata as donation_gateway_metadata,
    d.tax_deductible,
    d.fundraiser_id,
    c.id as charge_id,
    c.short_id as charge_short_id,
    c.status,
    c.retry,
    c.gateway_metadata as charge_gateway_metadata,
    c.created_at as charged_at,
    d.created_at as donation_created_at
from
    donor p
    join donation d on d.donor_id = p.id
    left join charge c on c.donation_id = d.id
order by
    c.created_at desc nulls last;

create view donations_overview
with
    (security_barrier = true) as
select
    donor_id,
    case
        when pg_has_role(current_user, 'reader_contact', 'member') then name
        else '***'
    end as name,
    case
        when pg_has_role(current_user, 'reader_contact', 'member') then email
        else '***'
    end as email,
    case
        when pg_has_role(current_user, 'reader_sensitive', 'member') then tin
        else '***'
    end as tin,
    donation_id,
    frequency,
    amount,
    earmarks,
    cancelled,
    method,
    gateway,
    case
        when pg_has_role(current_user, 'reader_sensitive', 'member') then donation_gateway_metadata
        else null
    end as donation_gateway_metadata,
    tax_deductible,
    fundraiser_id,
    charge_id,
    charge_short_id,
    status,
    retry,
    case
        when pg_has_role(current_user, 'reader_sensitive', 'member') then charge_gateway_metadata
        else null
    end as charge_gateway_metadata,
    charged_at,
    donation_created_at
from
    donations_overview_internal;

grant
select
    on donations_overview to reader;

--------------------------------------
create view charged_donations_internal as
select
    *
from
    donations_overview_internal d
where
    d.status = 'charged'
    and not exists (
        select
            1
        from
            earmark e
        where
            e.donation_id = d.donation_id
            and e.recipient = 'Giv Effektivts medlemskab'
    );

create view charged_donations as
select
    *
from
    donations_overview d
where
    d.status = 'charged'
    and not exists (
        select
            1
        from
            earmark e
        where
            e.donation_id = d.donation_id
            and e.recipient = 'Giv Effektivts medlemskab'
    );

grant
select
    on charged_donations to reader;

--------------------------------------
create view charged_or_created_donations as
select
    *
from
    donations_overview_internal d
where
    d.status in ('charged', 'created')
    and not exists (
        select
            1
        from
            earmark e
        where
            e.donation_id = d.donation_id
            and e.recipient = 'Giv Effektivts medlemskab'
    );

--------------------------------------
create view charged_memberships_internal as
select
    *
from
    donations_overview_internal d
where
    d.status = 'charged'
    and exists (
        select
            1
        from
            earmark e
        where
            e.donation_id = d.donation_id
            and e.recipient = 'Giv Effektivts medlemskab'
    );

create view charged_memberships as
select
    *
from
    donations_overview d
where
    d.status = 'charged'
    and exists (
        select
            1
        from
            earmark e
        where
            e.donation_id = d.donation_id
            and e.recipient = 'Giv Effektivts medlemskab'
    );

grant
select
    on charged_memberships to reader;

--------------------------------------
create view charged_donations_by_transfer_internal as
select
    cd.donor_id,
    cd.name,
    cd.email,
    cd.tin,
    cd.donation_id,
    round(cd.amount * e.percentage / 100, 1) as amount,
    cd.frequency,
    cd.cancelled,
    cd.method,
    cd.gateway,
    cd.tax_deductible,
    cd.charge_id,
    cd.charged_at,
    e.recipient as earmark,
    t.id as transfer_id
from
    charged_donations_internal cd
    join earmark e on cd.donation_id = e.donation_id
    left join charge_transfer ct on ct.charge_id = cd.charge_id
    and ct.earmark = e.recipient
    left join transfer t on ct.transfer_id = t.id
order by
    cd.charged_at desc;

create view charged_donations_by_transfer as
select
    cd.donor_id,
    cd.name,
    cd.email,
    cd.tin,
    cd.donation_id,
    round(cd.amount * e.percentage / 100, 1) as amount,
    cd.frequency,
    cd.cancelled,
    cd.method,
    cd.gateway,
    cd.tax_deductible,
    cd.charge_id,
    cd.charged_at,
    e.recipient as earmark,
    t.id as transfer_id
from
    charged_donations cd
    join earmark e on cd.donation_id = e.donation_id
    left join charge_transfer ct on ct.charge_id = cd.charge_id
    and ct.earmark = e.recipient
    left join transfer t on ct.transfer_id = t.id
order by
    cd.charged_at desc;

grant
select
    on charged_donations_by_transfer to reader;

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
                    when d.frequency = 'monthly' then c.created_at + interval '1 month'
                    when d.frequency = 'yearly' then c.created_at + interval '1 year'
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
select
    cron.schedule (
        'abort-abandoned-charges',
        '10 * * * *',
        'update charge set status=''error'' where status in (''created'', ''waiting'') and greatest(created_at, updated_at) < now() - interval ''5 days'''
    );

--------------------------------------
create view donations_to_create_retry_charges as
with
    latest_charges as (
        select distinct
            on (donation_id) *
        from
            charge
        order by
            donation_id,
            created_at desc,
            updated_at desc,
            id desc
    )
select
    lc.donation_id,
    lc.retry + 1 as retry
from
    latest_charges lc
    inner join donation d on lc.donation_id = d.id
where
    not d.cancelled
    and d.frequency != 'once'
    and lc.status = 'error'
    and lc.retry < 2
    and lc.updated_at <= now() - interval '1 day';

grant
select
    on donations_to_create_retry_charges to reader_sensitive;

select
    cron.schedule (
        'create-retry-charges',
        '20 * * * *',
        'insert into charge(donation_id, created_at, status, retry) select donation_id, now(), ''created'', retry from donations_to_create_retry_charges'
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
with
    latest_charge as (
        select distinct
            on (donation_id) donation_id,
            id,
            status
        from
            charge
        order by
            donation_id,
            created_at desc
    ),
    single_recipient as (
        select
            donation_id,
            case
                when count(*) = 1 then max(recipient)
                else null
            end as recipient
        from
            earmark
        group by
            donation_id
    )
select
    d.id,
    p.email,
    d.amount,
    sr.recipient,
    d.frequency,
    d.tax_deductible
from
    donor p
    join donation d on d.donor_id = p.id
    join latest_charge c on c.donation_id = d.id
    left join single_recipient sr on sr.donation_id = d.id
where
    d.emailed = 'no'
    and (
        c.status = 'charged'
        or (
            d.method = 'MobilePay'
            and d.frequency <> 'once'
            and c.status <> 'error'
        )
    );

grant
select
    on donations_to_email to reader_sensitive;

grant
update on donations_to_email to writer;

--------------------------------------
create view renew_donations_to_email as
with
    single_recipient as (
        select
            donation_id,
            case
                when count(*) = 1 then max(recipient)
                else null
            end as recipient
        from
            earmark
        group by
            donation_id
    )
select
    d.id,
    p.email,
    p.name,
    sr.recipient
from
    donor p
    join donation d on d.donor_id = p.id
    left join single_recipient sr on sr.donation_id = d.id
where
    d.emailed = 'renew-no';

grant
select
    on renew_donations_to_email to reader_sensitive;

grant
select
    on renew_donations_to_email to cron;

--------------------------------------
create view charges_to_charge as
select
    c.id,
    c.short_id,
    email,
    amount,
    gateway,
    method,
    c.gateway_metadata,
    d.gateway_metadata as donation_gateway_metadata
from
    donor dc
    inner join donation d on d.donor_id = dc.id
    inner join charge c on c.donation_id = d.id
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
            donation d
            inner join donor p on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            gateway in ('Quickpay', 'Scanpay')
            and not cancelled
            and frequency in ('monthly', 'yearly')
            and status = 'charged'
        order by
            d.id
    ),
    single_recipient as (
        select
            donation_id,
            case
                when count(*) = 1 then max(recipient)
                else null
            end as recipient
        from
            earmark
        group by
            donation_id
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
            sr.recipient,
            d.frequency,
            d.tax_deductible,
            d.fundraiser_id,
            d.message,
            c.status
        from
            donation d
            inner join donor p on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
            left join single_recipient sr on sr.donation_id = d.id
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

---------
create view failed_recurring_donations_to_auto_cancel as
with
    latest_charges as (
        select
            donation_id,
            status,
            row_number() over (
                partition by
                    donation_id
                order by
                    c.created_at desc
            ) as rn
        from
            charge c
            join donation d on c.donation_id = d.id
        where
            d.frequency != 'once'
            and not d.cancelled
    )
select
    donation_id as id
from
    latest_charges
where
    rn <= 3
group by
    donation_id
having
    count(*) = 3
    and bool_and(status = 'error')
order by
    1
limit
    2;

grant
select
    on failed_recurring_donations_to_auto_cancel to reader_sensitive;

grant
update on failed_recurring_donations_to_auto_cancel to writer;

--------------------------------------
create view annual_tax_report_const as
select
    date_trunc('year', now() - interval '9 months') as year_from,
    date_trunc('year', now() + interval '3 months') as year_to;

create view annual_tax_report_current_payments as
select
    tin,
    round(sum(amount)) as total,
    min(
        extract(
            year
            from
                charged_at
        )
    ) as year
from
    annual_tax_report_const
    cross join charged_donations_internal
where
    charged_at <@ tstzrange (year_from, year_to, '[)')
    and tax_deductible
group by
    tin;

create view annual_tax_report_gavebrev_since as
select
    donor_id,
    tin,
    min(
        extract(
            year
            from
                started_at
        )
    ) as gavebrev_start
from
    annual_tax_report_const
    join gavebrev g on coalesce(stopped_at, now()) > year_from
    join donor p on p.id = donor_id
group by
    donor_id,
    tin;

create view annual_tax_report_gavebrev_checkins as
select
    tin,
    y as year,
    least(coalesce(c.income_verified, c.income_preliminary, c.income_inferred, 0), c.custom_maximum_income) as income,
    case
        when c.year is null then 0
        else c.limit_normal_donation
    end as limit_normal_donation,
    c.custom_minimal_income
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
    c.limit_normal_donation,
    round(
        sum(
            case
                when g.type = 'percentage' then greatest(0, c.income - coalesce(c.custom_minimal_income, g.minimal_income, 0)) * g.amount / 100
                when g.type = 'amount' then greatest(
                    0,
                    cast(
                        c.income > 0
                        and c.income >= coalesce(c.custom_minimal_income, g.minimal_income, 0) as integer
                    ) * g.amount
                )
            end
        )
    ) as expected_total
from
    annual_tax_report_gavebrev_checkins c
    inner join donor p on p.tin = c.tin
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
    c.limit_normal_donation;

create view annual_tax_report_gavebrev_all_payments as
with
    gavebrev_per_tin as (
        select
            tin,
            min(started_at) as started_at,
            max(stopped_at) as stopped_at
        from
            gavebrev g
            inner join donor p on g.donor_id = p.id
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
            amount
        from
            gavebrev_tin_years_until_now i
            inner join charged_donations_internal c on i.tin = c.tin
            and i.year = extract(
                year
                from
                    charged_at
            )
        where
            tax_deductible
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
                            least(coalesce(least(m.value, get.limit_normal_donation), 0), greatest(0, gap.actual_total - b.uncapped_gavebrev_total)) as non_gavebrev_total
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
            case
                when b.gavebrev_total = 0
                and data.aconto_debt > 0 then 0
                else gap.actual_total + greatest(0, data.aconto_debt) - get.expected_total - c.non_gavebrev_total + least(0, data.aconto_debt)
            end as aconto_debt
        from
            annual_tax_report_gavebrev_expected_totals get
            inner join data on data.tin = get.tin
            and data.year = get.year - 1
            inner join annual_tax_report_gavebrev_all_payments gap on gap.tin = get.tin
            and gap.year = get.year
            left join max_tax_deduction m on m.year = get.year
            cross join lateral (
                select
                    greatest(0, get.expected_total - least(0, data.aconto_debt)) as can_be_reported_this_year
            ) a
            cross join lateral (
                select
                    round(least(get.income * 0.15, least(a.can_be_reported_this_year, gap.actual_total + greatest(0, data.aconto_debt)))) as gavebrev_total,
                    least(a.can_be_reported_this_year, gap.actual_total + greatest(0, data.aconto_debt)) as uncapped_gavebrev_total
            ) b
            cross join lateral (
                select
                    least(
                        coalesce(least(m.value, get.limit_normal_donation), 0),
                        greatest(0, gap.actual_total + greatest(0, data.aconto_debt) - b.uncapped_gavebrev_total)
                    ) as non_gavebrev_total
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
            const
            cross join charged_memberships_internal c
        where
            charged_at <@ tstzrange (year_from, year_to, '[)')
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
            const
            cross join charged_donations_internal c
        where
            charged_at <@ tstzrange (year_from, year_to, '[)')
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
create view annual_tax_report_pending_update as
with
    last_reported as (
        select distinct
            on (donor_cpr, ll8a_or_gavebrev, year) *
        from
            skat
        order by
            donor_cpr,
            ll8a_or_gavebrev,
            year,
            created_at desc
    )
select
    coalesce(a.year, s.year) as year,
    coalesce(a.donor_cpr, s.donor_cpr) as donor_cpr,
    coalesce(a.ll8a_or_gavebrev, s.ll8a_or_gavebrev) as ll8a_or_gavebrev,
    a.total - s.total as difference
from
    annual_tax_report a
    join last_reported s on s.donor_cpr = a.donor_cpr
    and s.ll8a_or_gavebrev = a.ll8a_or_gavebrev
    and s.year = a.year
where
    s.total != a.total
order by
    donor_cpr;

grant
select
    on annual_tax_report_pending_update to reader_sensitive;

--------------------------------------
create view annual_email_report as
with
    const as (
        select
            date_trunc('year', now() - interval '9 months') as year_from,
            date_trunc('year', now() + interval '3 months') as year_to
    ),
    data_per_transfer as (
        select
            cdt.tin,
            cdt.email,
            cdt.tax_deductible,
            min(t.recipient) as recipient,
            round(sum(cdt.amount) / max(t.exchange_rate) / (max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as unit,
            sum(cdt.amount) as amount,
            min(cdt.charged_at) as first_donated
        from
            const
            cross join charged_donations_by_transfer_internal cdt
            left join transfer t on cdt.transfer_id = t.id
        where
            cdt.charged_at <@ tstzrange (year_from, year_to, '[)')
        group by
            cdt.tin,
            cdt.email,
            cdt.tax_deductible,
            t.id
    ),
    data as (
        select
            tin,
            email,
            tax_deductible,
            recipient,
            sum(unit) as unit,
            sum(amount) as total,
            min(first_donated) as first_donated
        from
            data_per_transfer
        group by
            tin,
            email,
            tax_deductible,
            recipient
    ),
    members_confirmed as (
        select distinct
            on (tin) tin,
            email
        from
            const
            cross join charged_memberships_internal
        where
            charged_at <@ tstzrange (year_from, year_to, '[)')
    ),
    active_gavebrev as (
        select
            tin
        from
            const
            cross join gavebrev g
            inner join donor p on g.donor_id = p.id
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
            cross join donor p
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
    membership_ids as (
        select distinct
            donation_id as id
        from
            earmark
        where
            recipient = 'Giv Effektivts medlemskab'
    ),
    last_charge as (
        select distinct
            on (p.id) p.id,
            p.name,
            p.email,
            d.amount,
            m.id is not null as is_membership,
            c.status,
            c.created_at
        from
            donor p
            join donation d on p.id = d.donor_id
            join charge c on d.id = c.donation_id
            left join membership_ids m on m.id = d.id
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
            donor p
            left join donation d on p.id = d.donor_id
            left join charge c on d.id = c.donation_id
        where
            c.id is null
            and d.frequency != 'once'
    ),
    last_payment_by_email as (
        select distinct
            on (email, is_membership) *
        from
            (
                select
                    p.email,
                    m.id is not null as is_membership,
                    c.created_at
                from
                    donor p
                    join donation d on p.id = d.donor_id
                    join charge c on d.id = c.donation_id
                    left join membership_ids m on m.id = d.id
                where
                    c.status = 'charged'
            )
        order by
            email,
            is_membership,
            created_at desc
    ),
    email_to_name as (
        select distinct
            on (email) name,
            email
        from
            donor p
        where
            name is not null
    )
select
    lc.id as donor_id,
    coalesce(lc.name, en.name) as name,
    lc.email,
    lc.amount,
    lc.is_membership,
    na.donation_id,
    na.created_at as expired_at,
    now()::date - na.created_at::date as days_ago
from
    last_charge lc
    join never_activated na on lc.id = na.id
    left join last_payment_by_email lp on lc.email = lp.email
    and lp.is_membership = lp.is_membership
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
        when t.recipient = 'Against Malaria Foundation' then 'Antimalaria myggenet'
        when t.recipient = 'Malaria Consortium' then 'Malariabehandlinger'
        when t.recipient = 'Helen Keller International' then 'A-vitamintilskud'
        when t.recipient = 'New Incentives' then 'Vaccinationsprogrammer'
        when t.recipient = 'Give Directly' then 'Dollars'
        when t.recipient = 'SCI Foundation' then 'Ormekure'
    end as unit,
    round(sum(amount))::numeric as total_dkk,
    round(sum(amount) / max(t.exchange_rate))::numeric as total_usd,
    round(max(t.unit_cost_external), 2) as unit_cost_external,
    round(max(t.unit_cost_conversion), 2) as unit_cost_conversion,
    round(max(t.unit_cost_external) / max(t.unit_cost_conversion) * max(t.exchange_rate), 2) as unit_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) / (max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as unit_impact,
    round(max(t.life_cost_external), 2) as life_cost_external,
    round(max(t.life_cost_external) * max(t.exchange_rate), 2) as life_cost_dkk,
    round(sum(amount) / max(t.exchange_rate) / max(t.life_cost_external), 1) as life_impact,
    max(charged_at) as computed_at,
    case
        when t.created_at > now() then 'Næste overførsel'
        else to_char(t.created_at, 'yyyy-mm-dd')
    end as transferred_at
from
    charged_donations_by_transfer_internal cdt
    join transfer t on cdt.transfer_id = t.id
    or (
        cdt.transfer_id is null
        and cdt.earmark = t.earmark
        and t.created_at > now()
    )
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
    charged_donations_by_transfer_internal cdt
    join transfer t on cdt.transfer_id = t.id
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
    earmark,
    round(sum(amount))::numeric as dkk_total,
    count(*)::numeric as payments_total
from
    charged_donations_by_transfer_internal cdt
where
    earmark != 'Giv Effektivts arbejde og vækst'
    and transfer_id is null
group by
    earmark
order by
    dkk_total desc;

grant
select
    on pending_distribution to everyone;

--------------------------------------
create view time_distribution_monthly as
with
    buckets as (
        select
            *
        from
            (
                values
                    ('once'::donation_frequency, 0, 1000, 'small'),
                    ('once'::donation_frequency, 1000, 6000, 'medium'),
                    ('once'::donation_frequency, 6000, 24000, 'large'),
                    ('once'::donation_frequency, 24000, 999999999999, 'major'),
                    ('monthly'::donation_frequency, 0, 200, 'small'),
                    ('monthly'::donation_frequency, 200, 500, 'medium'),
                    ('monthly'::donation_frequency, 500, 2000, 'large'),
                    ('monthly'::donation_frequency, 2000, 999999999999, 'major')
            ) as bucket_table (frequency, start, stop, bucket)
    ),
    monthly_donations_charged_exactly_once as (
        select
            donation_id
        from
            (
                select
                    donation_id,
                    bool_or(cancelled) as cancelled,
                    count(charge_id) as number_of_donations,
                    max(charged_at) as last_donated_at
                from
                    charged_donations_internal
                where
                    frequency = 'monthly'
                group by
                    donation_id
            )
        where
            number_of_donations = 1
            and (
                cancelled
                or last_donated_at < now() - interval '40 days'
            )
    ),
    successful_charges as (
        select
            a.*,
            bucket
        from
            (
                select
                    date_trunc('month', charged_at) as period,
                    date_trunc('month', charged_at) as month,
                    charged_at,
                    email,
                    donation_id,
                    cancelled,
                    amount,
                    case
                        when exists (
                            select
                                1
                            from
                                monthly_donations_charged_exactly_once m
                            where
                                cd.donation_id = m.donation_id
                        ) then 'once'
                        else frequency
                    end as frequency
                from
                    charged_donations_internal cd
            ) a
            join buckets b on a.frequency = b.frequency
            and a.amount > b.start
            and a.amount <= b.stop
    ),
    first_time_by_email as (
        select distinct
            on (email) email,
            amount,
            date_trunc('month', charged_at) as period,
            charged_at
        from
            charged_donations_internal
        order by
            email,
            charged_at
    ),
    first_time_donations as (
        select
            period,
            sum(amount) as amount,
            count(1) as payments
        from
            first_time_by_email
        group by
            period
    ),
    stopped_monthly_donations as (
        select
            email,
            date_trunc('month', last_donated_at + interval '1 month') as stop_period,
            - sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    charged_at as last_donated_at,
                    amount,
                    frequency,
                    cancelled
                from
                    successful_charges s
                where
                    frequency = 'monthly'
                order by
                    donation_id,
                    charged_at desc
            ) a
        where
            last_donated_at + interval '40 days' < now()
            or cancelled
        group by
            email,
            date_trunc('month', last_donated_at + interval '1 month'),
            frequency
    ),
    started_donations as (
        select
            email,
            period as start_period,
            sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    period,
                    amount,
                    frequency
                from
                    successful_charges
                order by
                    donation_id,
                    charged_at
            )
        group by
            email,
            period,
            frequency
    ),
    changed_donations as (
        select
            a.*,
            bucket
        from
            (
                select
                    coalesce(start_period, stop_period) as period,
                    coalesce(a.frequency, b.frequency) as frequency,
                    sum(coalesce(a.amount, 0)) + sum(coalesce(b.amount, 0)) as amount
                from
                    started_donations a
                    full outer join stopped_monthly_donations b on a.email = b.email
                    and a.frequency = b.frequency
                    and (
                        date_trunc('month', a.start_period) = date_trunc('month', b.stop_period)
                        or date_trunc('month', a.start_period) = date_trunc('month', b.stop_period - interval '1 month')
                    )
                group by
                    coalesce(a.email, b.email),
                    coalesce(a.frequency, b.frequency),
                    coalesce(start_period, stop_period)
            ) a
            join buckets b on a.frequency = b.frequency
            and abs(a.amount) > b.start
            and abs(a.amount) <= b.stop
    ),
    value_added_lost as (
        select
            period,
            frequency,
            bucket,
            /* sql-formatter-disable */
            sum(amount * (case when amount > 0 then 1 else 0 end) * (case when frequency = 'monthly' then 18 else 1 end)) as value_added,
            sum(amount * (case when amount < 0 then 1 else 0 end) * 18) as value_lost,
            sum((case when amount < 0 then 1 else 0 end)) as monthly_donors_lost
            /* sql-formatter-enable */
        from
            changed_donations
        group by
            period,
            frequency,
            bucket
    ),
    payments as (
        select
            period,
            sum(amount) as amount,
            count(distinct donation_id) as payments,
            frequency,
            bucket
        from
            successful_charges
        group by
            period,
            frequency,
            bucket
    ),
    payments_new_donors as (
        select
            s.period,
            sum(s.amount) as amount,
            count(distinct donation_id) as payments,
            frequency,
            bucket
        from
            successful_charges s
            join first_time_by_email f on s.email = f.email
            and s.period = f.period
            and s.amount = f.amount
        group by
            s.period,
            frequency,
            bucket
    )
select
    to_char(coalesce(a.period, b.period), 'yyyy') || '-' || to_char(coalesce(a.period, b.period), 'MM') || '-' || to_char(coalesce(a.period, b.period), 'dd') as date,
    /* sql-formatter-disable */
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'small'  then a.amount else 0 end), 0) as amount_once_small,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'medium' then a.amount else 0 end), 0) as amount_once_medium,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'large'  then a.amount else 0 end), 0) as amount_once_large,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'major'  then a.amount else 0 end), 0) as amount_once_major,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'small'  then a.amount else 0 end), 0) as amount_monthly_small,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'medium' then a.amount else 0 end), 0) as amount_monthly_medium,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'large'  then a.amount else 0 end), 0) as amount_monthly_large,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'major'  then a.amount else 0 end), 0) as amount_monthly_major,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'small'  then a.payments else 0 end), 0) as payments_once_small,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'medium' then a.payments else 0 end), 0) as payments_once_medium,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'large'  then a.payments else 0 end), 0) as payments_once_large,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'major'  then a.payments else 0 end), 0) as payments_once_major,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'small'  then a.payments else 0 end), 0) as payments_monthly_small,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'medium' then a.payments else 0 end), 0) as payments_monthly_medium,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'large'  then a.payments else 0 end), 0) as payments_monthly_large,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'major'  then a.payments else 0 end), 0) as payments_monthly_major,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'small'  then d.payments else 0 end), 0) as payments_new_once_small,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'medium' then d.payments else 0 end), 0) as payments_new_once_medium,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'large'  then d.payments else 0 end), 0) as payments_new_once_large,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'major'  then d.payments else 0 end), 0) as payments_new_once_major,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'small'  then d.payments else 0 end), 0) as payments_new_monthly_small,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'medium' then d.payments else 0 end), 0) as payments_new_monthly_medium,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'large'  then d.payments else 0 end), 0) as payments_new_monthly_large,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'major'  then d.payments else 0 end), 0) as payments_new_monthly_major,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'small'  then b.value_added else 0 end), 0) as value_added_once_small,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'medium' then b.value_added else 0 end), 0) as value_added_once_medium,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'large'  then b.value_added else 0 end), 0) as value_added_once_large,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'major'  then b.value_added else 0 end), 0) as value_added_once_major,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'small'  then b.value_added else 0 end), 0) as value_added_monthly_small,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'medium' then b.value_added else 0 end), 0) as value_added_monthly_medium,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'large'  then b.value_added else 0 end), 0) as value_added_monthly_large,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'major'  then b.value_added else 0 end), 0) as value_added_monthly_major,
    coalesce(sum(case when b.bucket = 'small'  then b.value_lost else 0 end), 0) as value_lost_small,
    coalesce(sum(case when b.bucket = 'medium' then b.value_lost else 0 end), 0) as value_lost_medium,
    coalesce(sum(case when b.bucket = 'large'  then b.value_lost else 0 end), 0) as value_lost_large,
    coalesce(sum(case when b.bucket = 'major'  then b.value_lost else 0 end), 0) as value_lost_major,
    coalesce(sum(b.value_added), 0) + coalesce(sum(b.value_lost), 0) as value_total,
    coalesce(sum(case when a.frequency = 'monthly' then a.payments else 0 end), 0) as monthly_donors,
    coalesce(sum(a.payments), 0) as payments_total,
    coalesce(sum(a.amount), 0) as dkk_total,
    coalesce(sum(b.value_added), 0) as value_added,
    coalesce(sum(case when b.frequency = 'once' then b.value_added else 0 end), 0) as value_added_once,
    coalesce(sum(case when b.frequency = 'monthly' then b.value_added else 0 end), 0) as value_added_monthly,
    coalesce(sum(b.value_lost), 0) as value_lost,
    coalesce(sum(b.monthly_donors_lost), 0) as monthly_donors_lost,
    coalesce(max(c.amount), 0)::numeric as amount_new,
    coalesce(max(c.payments), 0)::numeric as payments_new
    /* sql-formatter-enable */
from
    payments a
    full outer join value_added_lost b on a.period = b.period
    and a.frequency = b.frequency
    and a.bucket = b.bucket
    full outer join first_time_donations c on a.period = c.period
    full outer join payments_new_donors d on a.period = d.period
    and a.frequency = d.frequency
    and a.bucket = d.bucket
group by
    coalesce(a.period, b.period)
order by
    coalesce(a.period, b.period) desc;

grant
select
    on time_distribution_monthly to everyone;

--------------------------------------
create view time_distribution_daily as
with
    buckets as (
        select
            *
        from
            (
                values
                    ('once'::donation_frequency, 0, 1000, 'small'),
                    ('once'::donation_frequency, 1000, 6000, 'medium'),
                    ('once'::donation_frequency, 6000, 24000, 'large'),
                    ('once'::donation_frequency, 24000, 999999999999, 'major'),
                    ('monthly'::donation_frequency, 0, 200, 'small'),
                    ('monthly'::donation_frequency, 200, 500, 'medium'),
                    ('monthly'::donation_frequency, 500, 2000, 'large'),
                    ('monthly'::donation_frequency, 2000, 999999999999, 'major')
            ) as bucket_table (frequency, start, stop, bucket)
    ),
    monthly_donations_charged_exactly_once as (
        select
            donation_id
        from
            (
                select
                    donation_id,
                    bool_or(cancelled) as cancelled,
                    count(charge_id) as number_of_donations,
                    max(charged_at) as last_donated_at
                from
                    charged_donations_internal
                where
                    frequency = 'monthly'
                group by
                    donation_id
            )
        where
            number_of_donations = 1
            and (
                cancelled
                or last_donated_at < now() - interval '40 days'
            )
    ),
    successful_charges as (
        select
            a.*,
            bucket
        from
            (
                select
                    date_trunc('day', charged_at) as period,
                    date_trunc('day', charged_at) as month,
                    charged_at,
                    email,
                    donation_id,
                    cancelled,
                    amount,
                    case
                        when exists (
                            select
                                1
                            from
                                monthly_donations_charged_exactly_once m
                            where
                                cd.donation_id = m.donation_id
                        ) then 'once'
                        else frequency
                    end as frequency
                from
                    charged_donations_internal cd
            ) a
            join buckets b on a.frequency = b.frequency
            and a.amount > b.start
            and a.amount <= b.stop
    ),
    first_time_by_email as (
        select distinct
            on (email) email,
            amount,
            date_trunc('day', charged_at) as period,
            charged_at
        from
            charged_donations_internal
        order by
            email,
            charged_at
    ),
    first_time_donations as (
        select
            period,
            sum(amount) as amount,
            count(1) as payments
        from
            first_time_by_email
        group by
            period
    ),
    stopped_monthly_donations as (
        select
            email,
            date_trunc('day', last_donated_at + interval '1 month') as stop_period,
            - sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    charged_at as last_donated_at,
                    amount,
                    frequency,
                    cancelled
                from
                    successful_charges s
                where
                    frequency = 'monthly'
                order by
                    donation_id,
                    charged_at desc
            ) a
        where
            last_donated_at + interval '40 days' < now()
            or cancelled
        group by
            email,
            date_trunc('day', last_donated_at + interval '1 month'),
            frequency
    ),
    started_donations as (
        select
            email,
            period as start_period,
            sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    period,
                    amount,
                    frequency
                from
                    successful_charges
                order by
                    donation_id,
                    charged_at
            )
        group by
            email,
            period,
            frequency
    ),
    changed_donations as (
        select
            a.*,
            bucket
        from
            (
                select
                    coalesce(start_period, stop_period) as period,
                    coalesce(a.frequency, b.frequency) as frequency,
                    sum(coalesce(a.amount, 0)) + sum(coalesce(b.amount, 0)) as amount
                from
                    started_donations a
                    full outer join stopped_monthly_donations b on a.email = b.email
                    and a.frequency = b.frequency
                    and date_trunc('day', a.start_period) = date_trunc('day', b.stop_period)
                group by
                    coalesce(a.email, b.email),
                    coalesce(a.frequency, b.frequency),
                    coalesce(start_period, stop_period)
            ) a
            join buckets b on a.frequency = b.frequency
            and abs(a.amount) > b.start
            and abs(a.amount) <= b.stop
    ),
    value_added_lost as (
        select
            period,
            frequency,
            bucket,
            /* sql-formatter-disable */
            sum(amount * (case when amount > 0 then 1 else 0 end) * (case when frequency = 'monthly' then 18 else 1 end)) as value_added,
            sum(amount * (case when amount < 0 then 1 else 0 end) * 18) as value_lost
            /* sql-formatter-enable */
        from
            changed_donations
        group by
            period,
            frequency,
            bucket
    ),
    payments as (
        select
            period,
            sum(amount) as amount,
            count(distinct donation_id) as payments,
            frequency,
            bucket
        from
            successful_charges
        group by
            period,
            frequency,
            bucket
    ),
    payments_new_donors as (
        select
            s.period,
            sum(s.amount) as amount,
            count(distinct donation_id) as payments,
            frequency,
            bucket
        from
            successful_charges s
            join first_time_by_email f on s.email = f.email
            and s.period = f.period
            and s.amount = f.amount
        group by
            s.period,
            frequency,
            bucket
    )
select
    to_char(coalesce(a.period, b.period), 'yyyy') || '-' || to_char(coalesce(a.period, b.period), 'MM') || '-' || to_char(coalesce(a.period, b.period), 'dd') as date,
    /* sql-formatter-disable */
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'small'  then a.amount else 0 end), 0) as amount_once_small,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'medium' then a.amount else 0 end), 0) as amount_once_medium,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'large'  then a.amount else 0 end), 0) as amount_once_large,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'major'  then a.amount else 0 end), 0) as amount_once_major,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'small'  then a.amount else 0 end), 0) as amount_monthly_small,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'medium' then a.amount else 0 end), 0) as amount_monthly_medium,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'large'  then a.amount else 0 end), 0) as amount_monthly_large,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'major'  then a.amount else 0 end), 0) as amount_monthly_major,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'small'  then a.payments else 0 end), 0) as payments_once_small,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'medium' then a.payments else 0 end), 0) as payments_once_medium,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'large'  then a.payments else 0 end), 0) as payments_once_large,
    coalesce(sum(case when a.frequency = 'once'    and a.bucket = 'major'  then a.payments else 0 end), 0) as payments_once_major,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'small'  then a.payments else 0 end), 0) as payments_monthly_small,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'medium' then a.payments else 0 end), 0) as payments_monthly_medium,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'large'  then a.payments else 0 end), 0) as payments_monthly_large,
    coalesce(sum(case when a.frequency = 'monthly' and a.bucket = 'major'  then a.payments else 0 end), 0) as payments_monthly_major,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'small'  then d.payments else 0 end), 0) as payments_new_once_small,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'medium' then d.payments else 0 end), 0) as payments_new_once_medium,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'large'  then d.payments else 0 end), 0) as payments_new_once_large,
    coalesce(sum(case when d.frequency = 'once'    and d.bucket = 'major'  then d.payments else 0 end), 0) as payments_new_once_major,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'small'  then d.payments else 0 end), 0) as payments_new_monthly_small,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'medium' then d.payments else 0 end), 0) as payments_new_monthly_medium,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'large'  then d.payments else 0 end), 0) as payments_new_monthly_large,
    coalesce(sum(case when d.frequency = 'monthly' and d.bucket = 'major'  then d.payments else 0 end), 0) as payments_new_monthly_major,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'small'  then b.value_added else 0 end), 0) as value_added_once_small,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'medium' then b.value_added else 0 end), 0) as value_added_once_medium,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'large'  then b.value_added else 0 end), 0) as value_added_once_large,
    coalesce(sum(case when b.frequency = 'once'    and b.bucket = 'major'  then b.value_added else 0 end), 0) as value_added_once_major,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'small'  then b.value_added else 0 end), 0) as value_added_monthly_small,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'medium' then b.value_added else 0 end), 0) as value_added_monthly_medium,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'large'  then b.value_added else 0 end), 0) as value_added_monthly_large,
    coalesce(sum(case when b.frequency = 'monthly' and b.bucket = 'major'  then b.value_added else 0 end), 0) as value_added_monthly_major,
    coalesce(sum(case when b.bucket = 'small'  then b.value_lost else 0 end), 0) as value_lost_small,
    coalesce(sum(case when b.bucket = 'medium' then b.value_lost else 0 end), 0) as value_lost_medium,
    coalesce(sum(case when b.bucket = 'large'  then b.value_lost else 0 end), 0) as value_lost_large,
    coalesce(sum(case when b.bucket = 'major'  then b.value_lost else 0 end), 0) as value_lost_major,
    coalesce(sum(b.value_added), 0) + coalesce(sum(b.value_lost), 0) as value_total,
    coalesce(sum(case when a.frequency = 'monthly' then a.payments else 0 end), 0) as monthly_donors,
    coalesce(sum(a.payments), 0) as payments_total,
    coalesce(sum(a.amount), 0) as dkk_total,
    coalesce(sum(b.value_added), 0) as value_added,
    coalesce(sum(case when b.frequency = 'once' then b.value_added else 0 end), 0) as value_added_once,
    coalesce(sum(case when b.frequency = 'monthly' then b.value_added else 0 end), 0) as value_added_monthly,
    coalesce(sum(b.value_lost), 0) as value_lost,
    coalesce(max(c.amount), 0)::numeric as amount_new,
    coalesce(max(c.payments), 0)::numeric as payments_new
    /* sql-formatter-enable */
from
    payments a
    full outer join value_added_lost b on a.period = b.period
    and a.frequency = b.frequency
    and a.bucket = b.bucket
    full outer join first_time_donations c on a.period = c.period
    full outer join payments_new_donors d on a.period = d.period
    and a.frequency = d.frequency
    and a.bucket = d.bucket
group by
    coalesce(a.period, b.period)
order by
    coalesce(a.period, b.period) desc;

grant
select
    on time_distribution_daily to everyone;

--------------------------------------
create view transfer_pending as
select
    charged_at,
    amount,
    earmark
from
    charged_donations_by_transfer_internal cdt
where
    earmark != 'Giv Effektivts arbejde og vækst'
    and transfer_id is null
order by
    charged_at;

grant
select
    on transfer_pending to everyone;

--------------------------------------
create view kpi as
with
    dkk_total as (
        select
            round(sum(amount))::numeric as dkk_total
        from
            charged_donations_internal
    ),
    dkk_total_ops as (
        select
            round(amount)::numeric as dkk_total_ops
        from
            ops_budget
        order by
            created_at desc
        limit
            1
    ),
    dkk_pending_transfer as (
        select
            coalesce(round(sum(amount))::numeric, 0) as dkk_pending_transfer
        from
            transfer_pending
    ),
    dkk_last_30_days as (
        select
            round(sum(amount))::numeric as dkk_last_30_days
        from
            charged_donations_internal
        where
            charged_at >= date_trunc('day', now()) - interval '30 days'
    ),
    dkk_recurring_next_year as (
        select
            12 * sum(amount)::numeric as dkk_recurring_next_year
        from
            (
                select distinct
                    on (donation_id) amount
                from
                    charged_or_created_donations
                where
                    frequency = 'monthly'
                    and not cancelled
                    and charged_at >= date_trunc('month', now()) - interval '1 month'
            ) c1
    ),
    members_confirmed as (
        select
            count(distinct tin)::numeric as members_confirmed
        from
            charged_memberships_internal
        where
            charged_at >= date_trunc('year', now())
    ),
    members_pending_renewal as (
        select
            count(*)::numeric as members_pending_renewal
        from
            (
                select distinct
                    on (tin) tin,
                    charged_at
                from
                    charged_memberships_internal
                where
                    not cancelled
                order by
                    tin,
                    charged_at desc
            ) a
        where
            charged_at < date_trunc('year', now())
    ),
    monthly_donors as (
        select
            count(distinct donation_id)::numeric as monthly_donors
        from
            charged_or_created_donations
        where
            frequency = 'monthly'
            and not cancelled
            and charged_at >= date_trunc('month', now()) - interval '1 month'
    ),
    number_of_donors as (
        select
            sum(donors) as number_of_donors
        from
            (
                select
                    email,
                    case
                        when count(distinct tin) = 0 then 1
                        else count(distinct tin)
                    end as donors
                from
                    charged_donations_internal
                group by
                    email
            )
    ),
    number_of_gavebrev as (
        select
            count(1)::numeric as number_of_gavebrev
        from
            gavebrev
        where
            status = 'signed'
            and stopped_at >= now()
    ),
    is_max_tax_deduction_known as (
        select
            (
                max(year) = extract(
                    year
                    from
                        now()
                )
            )::int as is_max_tax_deduction_known
        from
            max_tax_deduction
    ),
    oldest_stopped_donation_age as (
        select
            floor(
                extract(
                    epoch
                    from
                        (now() - min(max_charged_at))
                )
            ) as oldest_stopped_donation_age
        from
            (
                select
                    max(charged_at) as max_charged_at
                from
                    donations_overview_internal
                where
                    status = 'charged'
                group by
                    email
            )
    ),
    missing_gavebrev_income_proof as (
        select
            count(1)::numeric as missing_gavebrev_income_proof
        from
            gavebrev_checkin
        where
            year = extract(
                year
                from
                    current_date
            )::int - 1
            and income_verified is null
            and current_date > make_date(
                extract(
                    year
                    from
                        current_date
                )::int,
                3,
                15
            )
    ),
    missing_gavebrev_preliminary_income as (
        select
            count(1)::numeric as missing_gavebrev_preliminary_income
        from
            gavebrev_checkin
        where
            income_preliminary is null
            and year = extract(
                year
                from
                    current_date
            )::int - case
                when current_date >= make_date(
                    extract(
                        year
                        from
                            current_date
                    )::int,
                    12,
                    1
                ) then 0
                else 1
            end
    ),
    pending_skat_update as (
        select
            count(1)::numeric as pending_skat_update
        from
            annual_tax_report_pending_update
    )
select
    *
from
    dkk_total,
    dkk_total_ops,
    dkk_pending_transfer,
    dkk_last_30_days,
    dkk_recurring_next_year,
    members_confirmed,
    members_pending_renewal,
    monthly_donors,
    number_of_donors,
    number_of_gavebrev,
    is_max_tax_deduction_known,
    oldest_stopped_donation_age,
    missing_gavebrev_income_proof,
    missing_gavebrev_preliminary_income,
    pending_skat_update;

grant
select
    on kpi to everyone;

--------------------------------------
create view donor_acquisition as
with
    donation_ep as (
        select distinct
            on (d.email) d.email,
            dn.created_at,
            'Indsamling (' || f.title || ')' as acquisition
        from
            donation dn
            join donor d on d.id = dn.donor_id
            join fundraiser f on f.id = dn.fundraiser_id
        where
            dn.fundraiser_id is not null
        order by
            d.email,
            dn.created_at
    ),
    survey_ep as (
        select distinct
            on (s.email) s.email,
            s.created_at,
            s.how_discovered || coalesce(
                ' (' || nullif(
                    array_to_string(array_remove(array[s.who_recommended, s.search_terms, s.how_discovered_through_ea, s.social_media], null), ', '),
                    ''
                ) || ')',
                ''
            ) as acquisition
        from
            survey s
        order by
            s.email,
            s.created_at
    ),
    all_ep as (
        select
            email,
            created_at,
            acquisition
        from
            donation_ep
        union all
        select
            email,
            created_at,
            acquisition
        from
            survey_ep
    ),
    ranked as (
        select
            email,
            acquisition,
            created_at,
            row_number() over (
                partition by
                    email
                order by
                    created_at
            ) as rn
        from
            all_ep
    )
select
    email,
    acquisition,
    created_at
from
    ranked
where
    rn = 1
order by
    email;

grant
select
    on donor_acquisition to reader_contact;

--------------------------------------
create view donor_impact_report as
with
    data as (
        select
            email,
            min(t.recipient) as transferred_to,
            min(t.created_at) as transferred_at,
            sum(amount) as amount,
            round(sum(amount) / max(t.exchange_rate) / (max(t.unit_cost_external) / max(t.unit_cost_conversion)), 1) as units,
            round(sum(amount) / max(t.exchange_rate) / max(t.life_cost_external), 2) as lives
        from
            charged_donations_by_transfer_internal cdt
            left join transfer t on cdt.transfer_id = t.id
        group by
            email,
            t.id
    )
select
    email,
    coalesce(transferred_to::text, '== Fremtiden ==') as transferred_to,
    coalesce(to_char(transferred_at, 'YYYY-MM-DD'), '== Fremtiden ==') as transferred_at,
    amount,
    units,
    lives
from
    data
order by
    email,
    data.transferred_at;

grant
select
    on donor_impact_report to reader_contact;

--------------------------------------
create view crm_export as
with
    emails as (
        select distinct
            on (p.email) p.email,
            p.created_at as registered_at
        from
            donor p
            join donation d on d.donor_id = p.id
            join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
        order by
            p.email,
            p.created_at
    ),
    names as (
        select distinct
            on (p.email) p.email,
            p.name
        from
            donor p
        where
            p.name is not null
        order by
            p.email,
            p.created_at
    ),
    cvrs as (
        select distinct
            on (p.email) p.email,
            p.tin as cvr
        from
            donor p
        where
            p.tin ~ '^\d{8}$'
            and (
                p.country is null
                or p.country = 'Denmark'
            )
        order by
            p.email,
            p.created_at
    ),
    ages as (
        select distinct
            on (p.email) p.email,
            case
                when p.tin ~ '^\d{6}-\d{4}$'
                and substring(p.tin, 3, 2)::int between 1 and 12
                and substring(p.tin, 1, 2)::int between 1 and 31  then date_part(
                    'year',
                    age (
                        to_date(
                            (
                                case
                                    when substring(p.tin, 8, 4)::int between 0 and 3999  then case
                                        when substring(p.tin, 5, 2)::int between 0 and 36  then '20'
                                        else '19'
                                    end
                                    when substring(p.tin, 8, 4)::int between 4000 and 4999  then case
                                        when substring(p.tin, 5, 2)::int between 0 and 36  then '20'
                                        else '19'
                                    end
                                    when substring(p.tin, 8, 4)::int between 5000 and 9999  then case
                                        when substring(p.tin, 5, 2)::int between 0 and 57  then '20'
                                        else '19'
                                    end
                                end || substring(p.tin, 5, 2) || '-' || substring(p.tin, 3, 2) || '-' || substring(p.tin, 1, 2)
                            ),
                            'yyyy-mm-dd'
                        )
                    )
                )
            end as age
        from
            donor p
        where
            p.tin is not null
        order by
            p.email,
            p.created_at
    ),
    members as (
        select distinct
            on (donor_id) donor_id,
            email,
            name
        from
            charged_memberships_internal
        where
            charged_at >= now() - interval '1 year'
    ),
    member_emails as (
        select distinct
            on (email) email,
            name
        from
            members
    ),
    member_emails_including_past as (
        select distinct
            on (email) email,
            name
        from
            charged_memberships_internal
    ),
    donations as (
        select
            email,
            sum(amount) as total_donated,
            count(1) as donations_count
        from
            charged_donations_internal
        group by
            email
    ),
    tax_deductible_donations as (
        select
            email,
            sum(amount) as total_donated_this_year,
            greatest(
                0,
                (
                    select
                        value
                    from
                        max_tax_deduction
                    where
                        year = (
                            extract(
                                year
                                from
                                    now()
                            )
                        )
                ) - sum(amount)
            ) as deductible_potential_this_year
        from
            charged_donations_internal
        where
            charged_at >= date_trunc('year', now())
        group by
            email
    ),
    latest_donations as (
        select distinct
            on (email) email,
            amount as last_donated_amount,
            method as last_donated_method,
            frequency as last_donated_frequency,
            tax_deductible as last_donation_tax_deductible,
            cancelled as last_donation_cancelled,
            charged_at as last_donated_at
        from
            charged_donations_internal
        order by
            email,
            charged_at desc
    ),
    first_donations as (
        select
            email,
            min(charged_at) filter (
                where
                    e.recipient = 'Giv Effektivts medlemskab'
            ) as first_membership_at,
            min(charged_at) filter (
                where
                    e.recipient != 'Giv Effektivts medlemskab'
            ) as first_donation_at,
            min(charged_at) filter (
                where
                    frequency = 'monthly'
            ) as first_monthly_donation_at
        from
            donations_overview_internal d
            join earmark e on d.donation_id = e.donation_id
        where
            status = 'charged'
        group by
            email
    ),
    has_gavebrev as (
        select
            p.email
        from
            gavebrev g
            join donor p on g.donor_id = p.id
        where
            g.started_at <= date_trunc('year', now())
            and stopped_at > date_trunc('year', now())
        group by
            p.email
    ),
    impact as (
        select
            email,
            /* sql-formatter-disable */
            sum(case when transferred_to = 'Helen Keller International' then amount else 0 end) as vitamin_a_amount,
            sum(case when transferred_to = 'Helen Keller International' then units else 0 end) as vitamin_a_units,
            sum(case when transferred_to = 'New Incentives' then amount else 0 end) as vaccinations_amount,
            sum(case when transferred_to = 'New Incentives' then units else 0 end) as vaccinations_units,
            sum(case when transferred_to = 'Against Malaria Foundation' then amount else 0 end) as bednets_amount,
            sum(case when transferred_to = 'Against Malaria Foundation' then units else 0 end) as bednets_units,
            sum(case when transferred_to = 'Malaria Consortium' then amount else 0 end) as malaria_medicine_amount,
            sum(case when transferred_to = 'Malaria Consortium' then units else 0 end) as malaria_medicine_units,
            sum(case when transferred_to = 'Give Directly' then amount else 0 end) as direct_transfer_amount,
            sum(case when transferred_to = 'Give Directly' then units else 0 end) as direct_transfer_units,
            sum(case when transferred_to = 'SCI Foundation' then amount else 0 end) as deworming_amount,
            sum(case when transferred_to = 'SCI Foundation' then units else 0 end) as deworming_units,
            sum(lives) as lives
            /* sql-formatter-enable */
        from
            donor_impact_report
        group by
            email
    ),
    expired_memberships as (
        select distinct
            on (ir.email) ir.email,
            ir.donation_id as expired_membership_id,
            ir.expired_at as expired_membership_at
        from
            ignored_renewals ir
        where
            ir.is_membership
            and not exists (
                select
                    1
                from
                    members m
                where
                    m.donor_id = ir.donor_id
            )
        order by
            ir.email,
            ir.expired_at desc,
            ir.donation_id desc
    ),
    expired_donations as (
        select distinct
            on (email) email,
            donation_id as expired_donation_id,
            expired_at as expired_donation_at
        from
            ignored_renewals
        where
            not is_membership
        order by
            email,
            expired_at desc
    ),
    renewals as (
        select
            coalesce(m.email, d.email) as email,
            m.expired_membership_id,
            m.expired_membership_at,
            d.expired_donation_id,
            d.expired_donation_at
        from
            expired_memberships m
            full outer join expired_donations d using (email)
    ),
    data as (
        select
            e.email,
            e.registered_at,
            n.name,
            c.cvr,
            a.age,
            d.total_donated,
            d.donations_count,
            l.last_donated_amount,
            l.last_donated_method,
            l.last_donated_frequency,
            l.last_donation_tax_deductible,
            l.last_donation_cancelled,
            l.last_donated_at,
            t.total_donated_this_year,
            t.deductible_potential_this_year,
            f.first_membership_at,
            f.first_donation_at,
            f.first_monthly_donation_at,
            m.email is not null as is_member,
            p.email is not null as is_past_member,
            g.email is not null as has_gavebrev,
            i.vitamin_a_amount,
            i.vitamin_a_units,
            i.vaccinations_amount,
            i.vaccinations_units,
            i.bednets_amount,
            i.bednets_units,
            i.malaria_medicine_amount,
            i.malaria_medicine_units,
            i.direct_transfer_amount,
            i.direct_transfer_units,
            i.deworming_amount,
            i.deworming_units,
            i.lives,
            r.expired_donation_id,
            r.expired_donation_at,
            r.expired_membership_id,
            r.expired_membership_at,
            q.acquisition
        from
            emails e
            left join names n on n.email = e.email
            left join ages a on a.email = e.email
            left join donations d on d.email = e.email
            left join tax_deductible_donations t on t.email = e.email
            left join member_emails m on m.email = e.email
            left join member_emails_including_past p on p.email = e.email
            left join latest_donations l on l.email = e.email
            left join first_donations f on f.email = e.email
            left join has_gavebrev g on g.email = e.email
            left join impact i on i.email = e.email
            left join renewals r on r.email = e.email
            left join cvrs c on c.email = e.email
            left join donor_acquisition q on q.email = e.email
    )
select
    *
from
    data
where
    email like '%@%'
    and (
        total_donated > 0
        or is_member
        or is_past_member
        or has_gavebrev
    );

grant
select
    on crm_export to reader_contact;

grant
select
    on crm_export to cron;

--------------------------------------
create function general_assembly_invitations (in meeting_time timestamptz) returns table (email text, first_names text, can_vote text, voting_codes text) language plpgsql as $$
begin return query
with
    members_within_last_2_years as (
        select
            min(p.email) as email,
            min(p.name) as name,
            min(c.created_at) as min_charged_at,
            max(c.created_at) as max_charged_at
        from
            donor p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient = 'Giv Effektivts medlemskab'
            and c.created_at >= meeting_time - interval '2 years'
        group by
            p.tin
    ),
    participants as (
        select
            a.email,
            a.name,
            a.min_charged_at,
            a.max_charged_at,
            case
                when a.max_charged_at between meeting_time - interval '1 year' and meeting_time - interval '3 months' then 'Yes'
                when meeting_time - interval '3 months' between a.min_charged_at and a.max_charged_at  then 'Yes'
                when a.max_charged_at between greatest(now() - interval '1 year', meeting_time - interval '1 year 3 months') and meeting_time - interval '1 year' then 'Maybe'
                else 'No'
            end as can_vote
        from
            members_within_last_2_years a
        where
            a.max_charged_at >= now() - interval '1 year'
    ),
    invitations as (
        select
            a.email,
            string_agg(split_part(a.name, ' ', 1), ', ') as first_names,
            string_agg(split_part(a.can_vote, ' ', 1), ', ') as can_vote,
            string_agg(to_char(a.min_charged_at, 'yyyy-mm-dd'), ', ') as min_charged_at,
            string_agg(to_char(a.max_charged_at, 'yyyy-mm-dd'), ', ') as max_charged_at,
            count(
                case
                    when a.can_vote != 'No' then 1
                end
            ) as votes
        from
            participants a
        group by
            a.email
    ),
    invitations_ordered as (
        select
            *,
            coalesce(
                sum(a.votes) over (
                    order by
                        a.votes desc,
                        a.email rows between unbounded preceding
                        and 1 preceding
                ),
                0
            ) as start_offset
        from
            invitations a
        order by
            a.votes desc,
            a.email
    ),
    voting_codes as (
        select
            a.code,
            row_number() over () as rn
        from
            general_assembly_voting_code a
    ),
    data as (
        select
            *,
            (
                select
                    string_agg(
                        coalesce(c.code, 'missing'),
                        ', '
                        order by
                            gs
                    )
                from
                    generate_series(1, p.votes) as gs
                    left join voting_codes c on c.rn = p.start_offset + gs
            ) as voting_codes
        from
            invitations_ordered p
    )
select
    a.email,
    a.first_names,
    a.can_vote,
    a.voting_codes
from
    data a;
end
$$;

grant
execute on function general_assembly_invitations (timestamptz) to reader_contact;

--------------------------------------
create view gwwc_money_moved as
select
    to_char(charged_at, 'YYYY-MM') as month,
    t.recipient || case
        when min(t.created_at) < '2024-11-29' then ' (via GiveWell)'
        else ''
    end as recipient,
    'GHD' as cause,
    sum(amount) as amount
from
    charged_donations_by_transfer_internal cdt
    left join transfer t on cdt.transfer_id = t.id
group by
    to_char(charged_at, 'YYYY-MM'),
    t.recipient
order by
    month;

grant
select
    on gwwc_money_moved to everyone;

create view value_lost_analysis as
with
    buckets as (
        select
            *
        from
            (
                values
                    ('once'::donation_frequency, 0, 1000, 'small'),
                    ('once'::donation_frequency, 1000, 6000, 'medium'),
                    ('once'::donation_frequency, 6000, 24000, 'large'),
                    ('once'::donation_frequency, 24000, 999999999999, 'major'),
                    ('monthly'::donation_frequency, 0, 200, 'small'),
                    ('monthly'::donation_frequency, 200, 500, 'medium'),
                    ('monthly'::donation_frequency, 500, 2000, 'large'),
                    ('monthly'::donation_frequency, 2000, 999999999999, 'major')
            ) as bucket_table (frequency, start, stop, bucket)
    ),
    monthly_donations_charged_exactly_once as (
        select
            donation_id
        from
            (
                select
                    donation_id,
                    bool_or(cancelled) as cancelled,
                    count(charge_id) as number_of_donations,
                    max(charged_at) as last_donated_at
                from
                    charged_donations_internal
                where
                    frequency = 'monthly'
                group by
                    donation_id
            )
        where
            number_of_donations = 1
            and (
                cancelled
                or last_donated_at < now() - interval '40 days'
            )
    ),
    successful_charges as (
        select
            a.*,
            bucket
        from
            (
                select
                    date_trunc('month', charged_at) as period,
                    date_trunc('month', charged_at) as month,
                    charged_at,
                    email,
                    donation_id,
                    cancelled,
                    amount,
                    case
                        when exists (
                            select
                                1
                            from
                                monthly_donations_charged_exactly_once m
                            where
                                cd.donation_id = m.donation_id
                        ) then 'once'
                        else frequency
                    end as frequency
                from
                    charged_donations_internal cd
            ) a
            join buckets b on a.frequency = b.frequency
            and a.amount > b.start
            and a.amount <= b.stop
    ),
    first_time_donations as (
        select
            period,
            sum(amount) as amount,
            count(1) as payments
        from
            (
                select distinct
                    on (email) email,
                    amount,
                    date_trunc('month', charged_at) as period,
                    charged_at
                from
                    charged_donations_internal
                order by
                    email,
                    charged_at
            )
        group by
            period
    ),
    stopped_monthly_donations as (
        select
            email,
            date_trunc('month', last_donated_at + interval '1 month') as stop_period,
            - sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    charged_at as last_donated_at,
                    amount,
                    frequency,
                    cancelled
                from
                    successful_charges s
                where
                    frequency = 'monthly'
                order by
                    donation_id,
                    charged_at desc
            ) a
        where
            last_donated_at + interval '40 days' < now()
            or cancelled
        group by
            email,
            date_trunc('month', last_donated_at + interval '1 month'),
            frequency
    ),
    started_donations as (
        select
            email,
            period as start_period,
            sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    period,
                    amount,
                    frequency
                from
                    successful_charges
                order by
                    donation_id,
                    charged_at
            )
        group by
            email,
            period,
            frequency
    ),
    changed_donations as (
        select
            a.*,
            bucket
        from
            (
                select
                    coalesce(start_period, stop_period) as period,
                    coalesce(a.frequency, b.frequency) as frequency,
                    sum(coalesce(a.amount, 0)) + sum(coalesce(b.amount, 0)) as amount,
                    coalesce(a.email, b.email) as email,
                    min(a.frequency) is not null as has_active_donation
                from
                    started_donations a
                    full outer join stopped_monthly_donations b on a.email = b.email
                    and a.frequency = b.frequency
                    and (
                        date_trunc('month', a.start_period) = date_trunc('month', b.stop_period)
                        or date_trunc('month', a.start_period) = date_trunc('month', b.stop_period - interval '1 month')
                    )
                group by
                    coalesce(a.email, b.email),
                    coalesce(a.frequency, b.frequency),
                    coalesce(start_period, stop_period)
            ) a
            join buckets b on a.frequency = b.frequency
            and abs(a.amount) > b.start
            and abs(a.amount) <= b.stop
    )
select
    *
from
    changed_donations
where
    amount < 0
    and period <= now()
order by
    period desc,
    amount;

grant
select
    on value_lost_analysis to reader_contact;

--------------------------------------
create function register_donation (
    p_amount numeric,
    p_frequency donation_frequency,
    p_gateway payment_gateway,
    p_method payment_method,
    p_tax_deductible boolean,
    p_earmarks jsonb,
    p_email text,
    p_tin text default null,
    p_name text default null,
    p_fundraiser_id uuid default null,
    p_public_message_author boolean default null,
    p_message_author text default null,
    p_message text default null,
    p_address text default null,
    p_postcode text default null,
    p_city text default null,
    p_country text default null,
    p_birthday date default null,
    p_emailed emailed_status default 'no'
) returns donation language plpgsql as $$
declare
    v_donor donor%rowtype;
    v_donation donation%rowtype;
    v_total numeric;
    v_dup text;
    v_has_nonpos boolean;
    v_membership_present boolean;
    v_gateway_metadata jsonb;
begin
    if p_tax_deductible and p_tin is null then
        raise exception 'tax-deductible donation requires tin';
    end if;

    if jsonb_typeof(p_earmarks) <> 'array' or jsonb_array_length(p_earmarks) = 0 then
        raise exception 'earmarks must be a non-empty JSON array of {recipient, percentage}';
    end if;

    select exists(
        select 1 from jsonb_array_elements(p_earmarks) e
        where e->>'recipient' = 'Giv Effektivts medlemskab'
    ) into v_membership_present;

    if jsonb_array_length(p_earmarks) > 1 and v_membership_present then
        raise exception 'including membership with another earmark is not supported yet';
    end if;

    select coalesce(sum((e->>'percentage')::numeric),0) into v_total
    from jsonb_array_elements(p_earmarks) e;

    if round(v_total, 6) <> 100 then
        raise exception 'sum of earmark percentages must be 100, got %', v_total;
    end if;

    select exists(
        select 1
        from jsonb_array_elements(p_earmarks) e
        where (e->>'percentage')::numeric <= 0
    ) into v_has_nonpos;

    if v_has_nonpos then
        raise exception 'all earmark percentages must be > 0';
    end if;

    select r into v_dup
    from (
        select (e->>'recipient') as r, count(*) as c
        from jsonb_array_elements(p_earmarks) e
        group by 1
        having count(*) > 1
    ) d
    limit 1;

    if v_dup is not null then
        raise exception 'duplicate earmark %', v_dup;
    end if;

    if p_gateway = 'Quickpay' then
        v_gateway_metadata := format('{"quickpay_order": "%s"}', gen_short_id('donation', 'gateway_metadata->>''quickpay_order''', 'd-'))::jsonb;
    elsif p_gateway = 'Bank transfer' then
        v_gateway_metadata := format('{"bank_msg": "%s"}', gen_short_id('donation', 'gateway_metadata->>''bank_msg''', 'd-'))::jsonb;
    else
        raise exception 'unsupported gateway: %', p_gateway;
    end if;

    insert into donor(email, tin, name, address, postcode, city, country, birthday)
    values (lower(trim(p_email)), p_tin, p_name, p_address, p_postcode, p_city, p_country, p_birthday)
    on conflict (email, coalesce(tin,'')) do update
    set
        name     = coalesce(excluded.name, donor.name),
        address  = coalesce(excluded.address, donor.address),
        postcode = coalesce(excluded.postcode, donor.postcode),
        city     = coalesce(excluded.city, donor.city),
        country  = coalesce(excluded.country, donor.country),
        birthday = coalesce(excluded.birthday, donor.birthday)
    returning * into v_donor;

    insert into donation (donor_id, amount, frequency, gateway, method, tax_deductible, fundraiser_id, public_message_author, message_author, message, gateway_metadata, emailed)
    values (
        v_donor.id,
        p_amount,
        p_frequency,
        p_gateway,
        p_method,
        p_tax_deductible,
        p_fundraiser_id,
        coalesce(p_public_message_author, false),
        p_message_author,
        p_message,
        v_gateway_metadata,
        p_emailed
    )
    returning * into v_donation;

    insert into earmark (donation_id, recipient, percentage)
    select v_donation.id, (e->>'recipient')::donation_recipient, (e->>'percentage')::numeric
    from jsonb_array_elements(p_earmarks) e;

    return v_donation;
end
$$;

grant
execute on function register_donation (
    p_amount numeric,
    p_frequency donation_frequency,
    p_gateway payment_gateway,
    p_method payment_method,
    p_tax_deductible boolean,
    p_earmarks jsonb,
    p_email text,
    p_tin text,
    p_name text,
    p_fundraiser_id uuid,
    p_public_message_author boolean,
    p_message_author text,
    p_message text,
    p_address text,
    p_postcode text,
    p_city text,
    p_country text,
    p_birthday date,
    p_emailed emailed_status
) to writer;

--------------------------------------
create function change_donation (p_donation_id uuid, p_amount numeric default null, p_earmarks jsonb default null) returns donation language plpgsql as $$
declare
    v_donor donor%rowtype;
    v_old_earmarks jsonb;
    v_old_donation donation%rowtype;
    v_new_donation donation%rowtype;
begin
    if p_amount is null and p_earmarks is null then
        raise exception 'nothing to change, all arguments are null';
    end if;

    select * from donation where id = p_donation_id into v_old_donation;

    if v_old_donation.id is null then
        raise exception 'donation with ID % not found', p_donation_id;
    end if;

    if v_old_donation.frequency <> 'monthly' then
        raise exception 'donation with ID % is not monthly', p_donation_id;
    end if;

    if v_old_donation.cancelled then
        raise exception 'donation with ID % is cancelled', p_donation_id;
    end if;

    select * from donor where id = v_old_donation.donor_id into v_donor;

    select json_agg(json_build_object('recipient', recipient, 'percentage', percentage))
    from earmark
    where donation_id = p_donation_id
    into v_old_earmarks;

    update donation set cancelled = true where id = p_donation_id;

    select * from register_donation(
        p_amount => coalesce(p_amount, v_old_donation.amount),
        p_frequency => v_old_donation.frequency,
        p_gateway => v_old_donation.gateway,
        p_method => v_old_donation.method,
        p_tax_deductible => v_old_donation.tax_deductible,
        p_fundraiser_id => v_old_donation.fundraiser_id,
        p_public_message_author => v_old_donation.public_message_author,
        p_message_author => v_old_donation.message_author,
        p_message => v_old_donation.message,
        p_earmarks => coalesce(p_earmarks, v_old_earmarks),
        p_email => v_donor.email,
        p_tin => v_donor.tin,
        p_name => v_donor.name,
        p_address => v_donor.address,
        p_postcode => v_donor.postcode,
        p_city => v_donor.city,
        p_country => v_donor.country,
        p_birthday => v_donor.birthday,
        p_emailed => v_old_donation.emailed
    ) into v_new_donation;

    update donation set gateway_metadata = v_old_donation.gateway_metadata where id = v_new_donation.id;

    if v_old_donation.method != 'Bank transfer' then
        insert into charge(donation_id, status, created_at)
        select v_new_donation.id, 'created', (select max(created_at) + interval '1 month' from charge where donation_id = v_old_donation.id);
    end if;

    return v_new_donation;
end
$$;

grant
execute on function change_donation (uuid, numeric, jsonb) to writer;

--------------------------------------
create function recreate_failed_recurring_donation (p_donation_id uuid) returns donation language plpgsql as $$
declare
    v_donor donor%rowtype;
    v_old_earmarks jsonb;
    v_old_donation donation%rowtype;
    v_new_donation donation%rowtype;
begin
    select * from donation where id = p_donation_id into v_old_donation;

    if v_old_donation.id is null then
        raise exception 'recurring donation with ID % not found', p_donation_id;
    end if;

    select * from donor where id = v_old_donation.donor_id into v_donor;

    select json_agg(json_build_object('recipient', recipient, 'percentage', percentage))
    from earmark
    where donation_id = p_donation_id
    into v_old_earmarks;

    update donation set cancelled = true where id = p_donation_id;

    select * from register_donation(
        p_amount => v_old_donation.amount,
        p_frequency => v_old_donation.frequency,
        p_gateway => 'Quickpay'::payment_gateway,
        p_method => 'Credit card'::payment_method,
        p_tax_deductible => v_old_donation.tax_deductible,
        p_fundraiser_id => v_old_donation.fundraiser_id,
        p_public_message_author => v_old_donation.public_message_author,
        p_message_author => v_old_donation.message_author,
        p_message => v_old_donation.message,
        p_earmarks => v_old_earmarks,
        p_email => v_donor.email,
        p_tin => v_donor.tin,
        p_name => v_donor.name,
        p_address => v_donor.address,
        p_postcode => v_donor.postcode,
        p_city => v_donor.city,
        p_country => v_donor.country,
        p_birthday => v_donor.birthday,
        p_emailed => 'renew-no'
    ) into v_new_donation;

    return v_new_donation;
end
$$;

grant
execute on function recreate_failed_recurring_donation (uuid) to writer;

--------------------------------------
create function register_gavebrev (
    p_name text,
    p_email text,
    p_tin text,
    p_type gavebrev_type,
    p_amount numeric,
    p_minimal_income numeric,
    p_started_at date,
    p_stopped_at date
) returns gavebrev language plpgsql as $$
declare
    v_donor donor%rowtype;
    v_gavebrev gavebrev%rowtype;
begin
    insert into donor(email, tin, name)
    values (lower(trim(p_email)), p_tin, p_name)
    on conflict (email, coalesce(tin,'')) do update
    set name = coalesce(excluded.name, donor.name)
    returning * into v_donor;

    insert into gavebrev(donor_id, status, type, amount, minimal_income, started_at, stopped_at)
    values (v_donor.id, 'created', p_type, p_amount, p_minimal_income, p_started_at, p_stopped_at)
    returning * into v_gavebrev;

    return v_gavebrev;
end
$$;

grant
execute on function register_gavebrev (text, text, text, gavebrev_type, numeric, numeric, date, date) to writer;

-- migrate:down
