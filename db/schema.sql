SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: giveffektivt; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA giveffektivt;


--
-- Name: charge_status; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.charge_status AS ENUM (
    'created',
    'waiting',
    'charged',
    'refunded',
    'error'
);


--
-- Name: donation_frequency; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.donation_frequency AS ENUM (
    'once',
    'monthly',
    'yearly',
    'match'
);


--
-- Name: donation_recipient; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.donation_recipient AS ENUM (
    'Giv Effektivts medlemskab',
    'Stor og velkendt effekt',
    'Giv Effektivts anbefaling',
    'Giv Effektivts arbejde og vækst',
    'Myggenet mod malaria',
    'Kontantoverførsler til verdens fattigste',
    'Medicin mod malaria',
    'Vitamin mod mangelsygdomme',
    'Ormekur',
    'Vacciner til spædbørn'
);


--
-- Name: emailed_status; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.emailed_status AS ENUM (
    'no',
    'attempted',
    'yes'
);


--
-- Name: gavebrev_status; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.gavebrev_status AS ENUM (
    'created',
    'rejected',
    'signed',
    'error'
);


--
-- Name: gavebrev_type; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.gavebrev_type AS ENUM (
    'percentage',
    'amount'
);


--
-- Name: payment_gateway; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.payment_gateway AS ENUM (
    'Quickpay',
    'Scanpay',
    'Bank transfer'
);


--
-- Name: payment_method; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.payment_method AS ENUM (
    'Credit card',
    'MobilePay',
    'Bank transfer'
);


--
-- Name: transfer_recipient; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.transfer_recipient AS ENUM (
    'GiveWell Top Charities Fund',
    'GiveWell All Grants Fund',
    'Against Malaria Foundation',
    'Malaria Consortium',
    'Helen Keller International',
    'New Incentives',
    'Give Directly',
    'SCI Foundation'
);


--
-- Name: gen_random_string(integer, text); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.gen_random_string(length integer, chars text) RETURNS text
    LANGUAGE plpgsql STRICT
    AS $$
declare
    output text = '';
    i int4;
    pos int4;
begin
    for i in 1..length loop
        pos := 1 + cast(random() * (length(chars) - 1) as int4);
        output := output || substr(chars, pos, 1);
    end loop;
    return output;
end
$$;


--
-- Name: gen_short_id(text, text, text, integer, text); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.gen_short_id(table_name text, column_name text, prefix text DEFAULT ''::text, min_length integer DEFAULT 4, chars text DEFAULT '23456789abcdefghjkmnpqrstuvwxyz'::text) RETURNS text
    LANGUAGE plpgsql STRICT
    AS $_$
declare
    random_id text;
    temp text;
    current_len int4 := min_length;
    sql text;
    advisory_1 int4 := hashtext(format('%I:%I', table_name, column_name));
    advisory_2 int4;
    advisory_ok bool;
begin
    sql := format('select %s from giveffektivt.%I where %s = $1', column_name, table_name, column_name);
    loop
        random_id := prefix || gen_random_string(current_len, chars);
        advisory_2 := hashtext(random_id);
        advisory_ok := pg_try_advisory_xact_lock(advisory_1, advisory_2);
        if advisory_ok then
            execute sql into temp
            using random_id;
            exit
            when temp is null;
        end if;
            current_len := current_len + 1;
        end loop;
        return random_id;
end
$_$;


--
-- Name: general_assembly_invitations(timestamp with time zone); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.general_assembly_invitations(meeting_time timestamp with time zone) RETURNS TABLE(email text, first_names text, can_vote text, voting_codes text)
    LANGUAGE plpgsql
    AS $$
begin return query
with
    members_within_last_2_years as (
        select
            min(p.email) as email,
            min(p.name) as name,
            min(c.created_at) as min_charged_at,
            max(c.created_at) as max_charged_at
        from
            donor_with_sensitive_info p
            inner join donation d on d.donor_id = p.id
            inner join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and d.recipient = 'Giv Effektivts medlemskab'
            and c.created_at >= '2025-03-25'::timestamp - interval '2 years'
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
                when a.max_charged_at between '2025-03-25'::timestamp - interval '1 year' and '2025-03-25'::timestamp - interval '3 months' then 'Yes'
                when '2025-03-25'::timestamp - interval '3 months' between a.min_charged_at and a.max_charged_at  then 'Yes'
                when a.max_charged_at between greatest(now() - interval '1 year', '2025-03-25'::timestamp - interval '1 year 3 months') and '2025-03-25'::timestamp - interval '1 year' then 'Maybe'
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


--
-- Name: time_distribution(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.time_distribution(time_from timestamp with time zone, time_to timestamp with time zone) RETURNS TABLE(date text, amount_once_small numeric, amount_once_medium numeric, amount_once_large numeric, amount_once_major numeric, amount_monthly_small numeric, amount_monthly_medium numeric, amount_monthly_large numeric, amount_monthly_major numeric, payments_once_small numeric, payments_once_medium numeric, payments_once_large numeric, payments_once_major numeric, payments_monthly_small numeric, payments_monthly_medium numeric, payments_monthly_large numeric, payments_monthly_major numeric, value_added_once_small numeric, value_added_once_medium numeric, value_added_once_large numeric, value_added_once_major numeric, value_added_monthly_small numeric, value_added_monthly_medium numeric, value_added_monthly_large numeric, value_added_monthly_major numeric, value_lost_small numeric, value_lost_medium numeric, value_lost_large numeric, value_lost_major numeric, value_total numeric, monthly_donors numeric, payments_total numeric, dkk_total numeric, value_added numeric, value_added_once numeric, value_added_monthly numeric, value_lost numeric, amount_new numeric, payments_new numeric)
    LANGUAGE plpgsql
    AS $$
declare
  interval_type text;
begin
if time_to - time_from <= interval '3 month' then
    interval_type := 'day';
else
    interval_type := 'month';
end if;
return query
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
            id
        from
            (
                select
                    d.id,
                    bool_or(d.cancelled) as cancelled,
                    count(c.id) as number_of_donations,
                    max(c.created_at) as last_donated_at
                from
                    donation d
                    join charge c on d.id = c.donation_id
                where
                    c.status = 'charged'
                    and recipient != 'Giv Effektivts medlemskab'
                    and frequency = 'monthly'
                group by
                    d.id
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
                    date_trunc(interval_type, c.created_at) as period,
                    date_trunc('month', c.created_at) as month,
                    c.created_at,
                    p.email,
                    d.id as donation_id,
                    d.cancelled,
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
                    join donation d on p.id = d.donor_id
                    join charge c on c.donation_id = d.id
                where
                    c.status = 'charged'
                    and d.recipient != 'Giv Effektivts medlemskab'
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
                    date_trunc(interval_type, c.created_at) as period,
                    c.created_at
                from
                    donor_with_contact_info p
                    join donation d on p.id = d.donor_id
                    join charge c on d.id = c.donation_id
                where
                    c.status = 'charged'
                    and d.recipient != 'Giv Effektivts medlemskab'
                order by
                    email,
                    c.created_at
            )
        where
            (
                time_from is null
                or created_at >= time_from
            )
            and (
                time_to is null
                or created_at <= time_to
            )
        group by
            period
    ),
    stopped_monthly_donations as (
        select
            email,
            date_trunc(interval_type, last_donated_at + interval '1 month') as stop_period,
            - sum(amount) as amount,
            frequency
        from
            (
                select distinct
                    on (donation_id) email,
                    created_at as last_donated_at,
                    amount,
                    frequency,
                    cancelled
                from
                    successful_charges s
                where
                    frequency = 'monthly'
                order by
                    donation_id,
                    created_at desc
            ) a
        where
            last_donated_at + interval '40 days' < now()
            or cancelled
        group by
            email,
            date_trunc(interval_type, last_donated_at + interval '1 month'),
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
                    created_at
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
                    and date_trunc('month', a.start_period) = date_trunc('month', b.stop_period)
                group by
                    coalesce(a.email, b.email),
                    coalesce(a.frequency, b.frequency),
                    coalesce(start_period, stop_period)
            ) a
            join buckets b on a.frequency = b.frequency
            and abs(a.amount) > b.start
            and abs(a.amount) <= b.stop
        where
            (
                time_from is null
                or period >= time_from
            )
            and (
                time_to is null
                or period <= time_to
            )
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
        where
            (
                time_from is null
                or created_at >= time_from
            )
            and (
                time_to is null
                or created_at <= time_to
            )
        group by
            period,
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
group by
    coalesce(a.period, b.period)
order by
    coalesce(a.period, b.period) desc;
end
$$;


--
-- Name: trigger_update_timestamp(); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.trigger_update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _charge; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._charge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donation_id uuid NOT NULL,
    short_id text DEFAULT giveffektivt.gen_short_id('_charge'::text, 'short_id'::text, 'c-'::text) NOT NULL,
    status giveffektivt.charge_status NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    _old_id integer,
    transfer_id uuid
);


--
-- Name: _donation; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._donation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    emailed giveffektivt.emailed_status DEFAULT 'no'::giveffektivt.emailed_status NOT NULL,
    amount numeric NOT NULL,
    recipient giveffektivt.donation_recipient NOT NULL,
    frequency giveffektivt.donation_frequency NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    method giveffektivt.payment_method NOT NULL,
    tax_deductible boolean NOT NULL,
    gateway giveffektivt.payment_gateway NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    _old_id integer,
    fundraiser_id uuid,
    message text
);


--
-- Name: _donor; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._donor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    email text NOT NULL,
    address text,
    postcode text,
    city text,
    tin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    _old_id integer,
    country text,
    birthday date
);


--
-- Name: _fundraiser; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._fundraiser (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    title text NOT NULL,
    key uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    has_match boolean DEFAULT false NOT NULL,
    match_currency text
);


--
-- Name: _fundraiser_activity_checkin; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._fundraiser_activity_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fundraiser_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: _gavebrev; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._gavebrev (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    status giveffektivt.gavebrev_status NOT NULL,
    type giveffektivt.gavebrev_type NOT NULL,
    amount numeric NOT NULL,
    minimal_income numeric,
    started_at timestamp with time zone NOT NULL,
    stopped_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: _gavebrev_checkin; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._gavebrev_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    year numeric NOT NULL,
    income_inferred numeric,
    income_preliminary numeric,
    income_verified numeric,
    maximize_tax_deduction boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: _skat; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._skat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    const numeric NOT NULL,
    ge_cvr numeric NOT NULL,
    donor_cpr text NOT NULL,
    year numeric NOT NULL,
    blank text NOT NULL,
    total numeric NOT NULL,
    ll8a_or_gavebrev text NOT NULL,
    ge_notes text NOT NULL,
    rettekode numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: _skat_gaveskema; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._skat_gaveskema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year numeric NOT NULL,
    count_donors_donated_min_200_kr numeric NOT NULL,
    count_members numeric NOT NULL,
    amount_donated_a numeric NOT NULL,
    amount_donated_l numeric NOT NULL,
    amount_donated_total numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: _transfer; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt._transfer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient giveffektivt.transfer_recipient NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    unit_cost_external numeric,
    life_cost_external numeric,
    exchange_rate numeric,
    earmark giveffektivt.donation_recipient NOT NULL,
    unit_cost_conversion numeric
);


--
-- Name: charge; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charge AS
 SELECT id,
    donation_id,
    short_id,
    status,
    created_at,
    updated_at,
    transfer_id
   FROM giveffektivt._charge
  WHERE (deleted_at IS NULL);


--
-- Name: donation; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donation AS
 SELECT id,
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
   FROM giveffektivt._donation
  WHERE (deleted_at IS NULL);


--
-- Name: donor_with_sensitive_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_with_sensitive_info AS
 SELECT id,
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
   FROM giveffektivt._donor
  WHERE (deleted_at IS NULL);


--
-- Name: gavebrev; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.gavebrev AS
 SELECT id,
    donor_id,
    status,
    type,
    amount,
    minimal_income,
    started_at,
    stopped_at,
    created_at,
    updated_at
   FROM giveffektivt._gavebrev
  WHERE (deleted_at IS NULL);


--
-- Name: transfer; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transfer AS
 SELECT id,
    earmark,
    recipient,
    unit_cost_external,
    unit_cost_conversion,
    life_cost_external,
    exchange_rate,
    created_at,
    updated_at
   FROM giveffektivt._transfer
  WHERE (deleted_at IS NULL)
  ORDER BY created_at;


--
-- Name: annual_email_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_email_report AS
 WITH const AS (
         SELECT date_trunc('year'::text, (now() - '9 mons'::interval)) AS year_from,
            date_trunc('year'::text, (now() + '3 mons'::interval)) AS year_to
        ), data_per_transfer AS (
         SELECT p.tin,
            p.email,
            d_1.tax_deductible,
            min(t.recipient) AS recipient,
            round(((sum(d_1.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS unit,
            sum(d_1.amount) AS amount,
            min(c_1.created_at) AS first_donated
           FROM ((((const
             CROSS JOIN giveffektivt.donor_with_sensitive_info p)
             JOIN giveffektivt.donation d_1 ON ((p.id = d_1.donor_id)))
             JOIN giveffektivt.charge c_1 ON ((d_1.id = c_1.donation_id)))
             LEFT JOIN giveffektivt.transfer t ON ((c_1.transfer_id = t.id)))
          WHERE ((c_1.status = 'charged'::giveffektivt.charge_status) AND (d_1.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c_1.created_at <@ tstzrange(const.year_from, const.year_to, '[)'::text)))
          GROUP BY p.tin, p.email, d_1.tax_deductible, t.id
        ), data AS (
         SELECT data_per_transfer.tin,
            data_per_transfer.email,
            data_per_transfer.tax_deductible,
            data_per_transfer.recipient,
            sum(data_per_transfer.unit) AS unit,
            sum(data_per_transfer.amount) AS total,
            min(data_per_transfer.first_donated) AS first_donated
           FROM data_per_transfer
          GROUP BY data_per_transfer.tin, data_per_transfer.email, data_per_transfer.tax_deductible, data_per_transfer.recipient
        ), members_confirmed AS (
         SELECT DISTINCT ON (p.tin) p.tin,
            p.email
           FROM (((const
             CROSS JOIN giveffektivt.donor_with_sensitive_info p)
             JOIN giveffektivt.donation d_1 ON ((d_1.donor_id = p.id)))
             JOIN giveffektivt.charge c_1 ON ((c_1.donation_id = d_1.id)))
          WHERE ((c_1.status = 'charged'::giveffektivt.charge_status) AND (d_1.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c_1.created_at <@ tstzrange(const.year_from, const.year_to, '[)'::text)))
        ), active_gavebrev AS (
         SELECT p.tin
           FROM ((const
             CROSS JOIN giveffektivt.gavebrev g)
             JOIN giveffektivt.donor_with_sensitive_info p ON ((g.donor_id = p.id)))
          WHERE ((g.started_at <= const.year_from) AND (g.stopped_at > const.year_from))
          GROUP BY p.tin
        ), email_to_tin_guess AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.tin
           FROM (((const
             CROSS JOIN giveffektivt.donor_with_sensitive_info p)
             JOIN giveffektivt.donation d_1 ON ((p.id = d_1.donor_id)))
             JOIN giveffektivt.charge c_1 ON ((d_1.id = c_1.donation_id)))
          WHERE ((c_1.status = 'charged'::giveffektivt.charge_status) AND (p.tin IS NOT NULL))
          ORDER BY p.email, p.tin, c_1.created_at DESC
        ), with_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.recipient,
            data.unit,
            data.total,
            data.first_donated
           FROM data
          WHERE data.tax_deductible
        ), with_tin_no_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.recipient,
            data.unit,
            data.total,
            data.first_donated
           FROM data
          WHERE ((NOT data.tax_deductible) AND (data.tin IS NOT NULL))
        ), with_no_tin_no_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.recipient,
            data.unit,
            data.total,
            data.first_donated
           FROM data
          WHERE ((NOT data.tax_deductible) AND (data.tin IS NULL))
        )
 SELECT COALESCE(a.tin, b.tin, d.tin) AS tin,
    COALESCE(a.email, b.email, c.email) AS email,
    ((COALESCE(a.tin, b.tin) IS NULL) AND (d.tin IS NOT NULL)) AS is_tin_guessed,
    (length(COALESCE(a.tin, b.tin, d.tin, ''::text)) = 8) AS is_company,
    (e.tin IS NOT NULL) AS is_member,
    (f.tin IS NOT NULL) AS has_gavebrev,
    COALESCE(a.recipient, b.recipient, c.recipient) AS recipient,
    a.total AS amount_tax_deductible,
    NULLIF((COALESCE(b.total, (0)::numeric) + COALESCE(c.total, (0)::numeric)), (0)::numeric) AS amount_not_tax_deductible,
    ((COALESCE(a.total, (0)::numeric) + COALESCE(b.total, (0)::numeric)) + COALESCE(c.total, (0)::numeric)) AS amount_total,
    ((COALESCE(a.unit, (0)::numeric) + COALESCE(b.unit, (0)::numeric)) + COALESCE(c.unit, (0)::numeric)) AS unit_total,
    LEAST(a.first_donated, b.first_donated, c.first_donated) AS first_donated
   FROM (((((with_tax a
     FULL JOIN with_tin_no_tax b ON (((NOT (a.tin IS DISTINCT FROM b.tin)) AND (a.email = b.email) AND (NOT (a.recipient IS DISTINCT FROM b.recipient)))))
     FULL JOIN with_no_tin_no_tax c ON (((COALESCE(a.email, b.email) = c.email) AND (NOT (COALESCE(a.recipient, b.recipient) IS DISTINCT FROM c.recipient)))))
     LEFT JOIN email_to_tin_guess d ON ((COALESCE(a.email, b.email, c.email) = d.email)))
     LEFT JOIN members_confirmed e ON ((COALESCE(a.tin, b.tin, d.tin) = e.tin)))
     LEFT JOIN active_gavebrev f ON ((COALESCE(a.tin, b.tin) = f.tin)))
  ORDER BY COALESCE(a.email, b.email, c.email), COALESCE(a.tin, b.tin, d.tin), COALESCE(a.recipient, b.recipient, c.recipient);


--
-- Name: annual_tax_report_const; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_const AS
 SELECT date_trunc('year'::text, (now() - '9 mons'::interval)) AS year_from,
    date_trunc('year'::text, (now() + '3 mons'::interval)) AS year_to;


--
-- Name: annual_tax_report_current_payments; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_current_payments AS
 SELECT p.tin,
    round(sum(d.amount)) AS total,
    min(EXTRACT(year FROM c.created_at)) AS year
   FROM (((giveffektivt.annual_tax_report_const
     CROSS JOIN giveffektivt.donor_with_sensitive_info p)
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.created_at <@ tstzrange(annual_tax_report_const.year_from, annual_tax_report_const.year_to, '[)'::text)) AND d.tax_deductible)
  GROUP BY p.tin;


--
-- Name: annual_tax_report_gavebrev_all_payments; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_all_payments AS
 WITH gavebrev_per_tin AS (
         SELECT p.tin,
            min(g.started_at) AS started_at,
            max(g.stopped_at) AS stopped_at
           FROM (giveffektivt.gavebrev g
             JOIN giveffektivt.donor_with_sensitive_info p ON ((g.donor_id = p.id)))
          GROUP BY p.tin
        ), gavebrev_tin_years_until_now AS (
         SELECT g.tin,
            generate_series(EXTRACT(year FROM g.started_at), EXTRACT(year FROM annual_tax_report_const.year_from)) AS year
           FROM (giveffektivt.annual_tax_report_const
             CROSS JOIN gavebrev_per_tin g)
          WHERE ((g.started_at <= annual_tax_report_const.year_from) AND (g.stopped_at > annual_tax_report_const.year_from))
        ), gavebrev_tin_all_donations_per_year AS (
         SELECT i_1.tin,
            i_1.year,
            d_1.amount
           FROM (((gavebrev_tin_years_until_now i_1
             JOIN giveffektivt.donor_with_sensitive_info p ON ((i_1.tin = p.tin)))
             JOIN giveffektivt.donation d_1 ON ((d_1.donor_id = p.id)))
             JOIN giveffektivt.charge c ON (((c.donation_id = d_1.id) AND (i_1.year = EXTRACT(year FROM c.created_at)))))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d_1.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND d_1.tax_deductible)
        )
 SELECT i.tin,
    i.year,
    COALESCE(round(sum(d.amount)), (0)::numeric) AS actual_total
   FROM (gavebrev_tin_years_until_now i
     LEFT JOIN gavebrev_tin_all_donations_per_year d ON (((i.tin = d.tin) AND (i.year = d.year))))
  GROUP BY i.tin, i.year
  ORDER BY i.tin, i.year;


--
-- Name: annual_tax_report_gavebrev_since; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_since AS
 SELECT a.donor_id,
    b.tin,
    a.gavebrev_start
   FROM (LATERAL ( SELECT gavebrev.donor_id,
            min(EXTRACT(year FROM gavebrev.started_at)) AS gavebrev_start
           FROM giveffektivt.annual_tax_report_const,
            giveffektivt.gavebrev
          WHERE (COALESCE(gavebrev.stopped_at, now()) > annual_tax_report_const.year_from)
          GROUP BY gavebrev.donor_id) a
     CROSS JOIN LATERAL ( SELECT p.tin
           FROM giveffektivt.donor_with_sensitive_info p
          WHERE (p.id = a.donor_id)
         LIMIT 1) b);


--
-- Name: gavebrev_checkin; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.gavebrev_checkin AS
 SELECT id,
    donor_id,
    year,
    income_inferred,
    income_preliminary,
    income_verified,
    maximize_tax_deduction,
    created_at,
    updated_at
   FROM giveffektivt._gavebrev_checkin
  WHERE (deleted_at IS NULL);


--
-- Name: annual_tax_report_gavebrev_checkins; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_checkins AS
 SELECT g.tin,
    y.y AS year,
    COALESCE(c.income_verified, c.income_preliminary, c.income_inferred, (0)::numeric) AS income,
    COALESCE(c.maximize_tax_deduction, false) AS maximize_tax_deduction
   FROM (((giveffektivt.annual_tax_report_const
     CROSS JOIN giveffektivt.annual_tax_report_gavebrev_since g)
     CROSS JOIN LATERAL generate_series(g.gavebrev_start, (EXTRACT(year FROM annual_tax_report_const.year_to) - (1)::numeric)) y(y))
     LEFT JOIN giveffektivt.gavebrev_checkin c ON (((c.year = y.y) AND (c.donor_id = g.donor_id))));


--
-- Name: annual_tax_report_gavebrev_expected_totals; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_expected_totals AS
 SELECT c.tin,
    c.year,
    c.income,
    c.maximize_tax_deduction,
    round(sum(
        CASE
            WHEN (g.type = 'percentage'::giveffektivt.gavebrev_type) THEN ((GREATEST((0)::numeric, (c.income - COALESCE(g.minimal_income, (0)::numeric))) * g.amount) / (100)::numeric)
            WHEN (g.type = 'amount'::giveffektivt.gavebrev_type) THEN GREATEST((0)::numeric, (((((c.income > (0)::numeric) AND (c.income >= COALESCE(g.minimal_income, (0)::numeric))))::integer)::numeric * g.amount))
            ELSE NULL::numeric
        END)) AS expected_total
   FROM ((giveffektivt.annual_tax_report_gavebrev_checkins c
     JOIN giveffektivt.donor_with_sensitive_info p ON ((p.tin = c.tin)))
     JOIN giveffektivt.gavebrev g ON (((g.donor_id = p.id) AND (EXTRACT(year FROM g.started_at) <= c.year))))
  GROUP BY c.tin, c.year, c.income, c.maximize_tax_deduction;


--
-- Name: max_tax_deduction; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.max_tax_deduction (
    year numeric NOT NULL,
    value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: annual_tax_report_gavebrev_results; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_results AS
 WITH RECURSIVE data AS (
         SELECT _a.tin,
            _a.year,
            _a.can_be_reported_this_year,
            _a.expected_total,
            _a.actual_total,
            _a.non_gavebrev_total,
            _a.result,
            _a.aconto_debt
           FROM ( SELECT DISTINCT ON (get.tin) get.tin,
                    get.year,
                    a.can_be_reported_this_year,
                    get.expected_total,
                    gap.actual_total,
                    c.non_gavebrev_total,
                    b.gavebrev_total AS result,
                    ((gap.actual_total - get.expected_total) - c.non_gavebrev_total) AS aconto_debt
                   FROM (((((giveffektivt.annual_tax_report_gavebrev_expected_totals get
                     JOIN giveffektivt.annual_tax_report_gavebrev_all_payments gap ON (((gap.tin = get.tin) AND (gap.year = get.year))))
                     LEFT JOIN giveffektivt.max_tax_deduction m ON ((m.year = get.year)))
                     CROSS JOIN LATERAL ( SELECT get.expected_total AS can_be_reported_this_year) a)
                     CROSS JOIN LATERAL ( SELECT round(LEAST((get.income * 0.15), LEAST(a.can_be_reported_this_year, gap.actual_total))) AS gavebrev_total,
                            LEAST(a.can_be_reported_this_year, gap.actual_total) AS uncapped_gavebrev_total) b)
                     CROSS JOIN LATERAL ( SELECT (((get.maximize_tax_deduction)::integer)::numeric * LEAST(COALESCE(m.value, (0)::numeric), GREATEST((0)::numeric, (gap.actual_total - b.uncapped_gavebrev_total)))) AS non_gavebrev_total) c)
                  ORDER BY get.tin, get.year) _a
        UNION ALL
         SELECT get.tin,
            get.year,
            a.can_be_reported_this_year,
            get.expected_total,
            gap.actual_total,
            c.non_gavebrev_total,
            b.gavebrev_total AS result,
            (((gap.actual_total - get.expected_total) - c.non_gavebrev_total) + LEAST((0)::numeric, data_1.aconto_debt)) AS aconto_debt
           FROM ((((((giveffektivt.annual_tax_report_gavebrev_expected_totals get
             JOIN data data_1 ON (((data_1.tin = get.tin) AND (data_1.year = (get.year - (1)::numeric)))))
             JOIN giveffektivt.annual_tax_report_gavebrev_all_payments gap ON (((gap.tin = get.tin) AND (gap.year = get.year))))
             LEFT JOIN giveffektivt.max_tax_deduction m ON ((m.year = get.year)))
             CROSS JOIN LATERAL ( SELECT GREATEST((0)::numeric, (get.expected_total - data_1.aconto_debt)) AS can_be_reported_this_year) a)
             CROSS JOIN LATERAL ( SELECT round(LEAST((get.income * 0.15), LEAST(a.can_be_reported_this_year, gap.actual_total))) AS gavebrev_total,
                    LEAST(a.can_be_reported_this_year, gap.actual_total) AS uncapped_gavebrev_total) b)
             CROSS JOIN LATERAL ( SELECT (((get.maximize_tax_deduction)::integer)::numeric * LEAST(COALESCE(m.value, (0)::numeric), GREATEST((0)::numeric, (gap.actual_total - b.uncapped_gavebrev_total)))) AS non_gavebrev_total) c)
        )
 SELECT tin,
    year,
    can_be_reported_this_year,
    expected_total,
    actual_total,
    non_gavebrev_total,
    result,
    aconto_debt
   FROM data;


--
-- Name: annual_tax_report_data; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_data AS
 WITH with_gavebrev AS (
         SELECT DISTINCT ON (gr.tin) 'L'::text AS ll8a_or_gavebrev,
            gr.tin,
            gr.result AS total,
            gr.aconto_debt,
            gr.year
           FROM giveffektivt.annual_tax_report_gavebrev_results gr
          ORDER BY gr.tin, gr.year DESC
        ), gavebrev_current_non_gavebrev_total AS (
         SELECT DISTINCT ON (gr.tin) gr.tin,
            gr.year,
            gr.non_gavebrev_total
           FROM giveffektivt.annual_tax_report_gavebrev_results gr
          ORDER BY gr.tin, gr.year DESC
        ), without_gavebrev AS (
         SELECT 'A'::text AS ll8a_or_gavebrev,
            d.tin,
            COALESCE(gr.non_gavebrev_total, d.total) AS total,
            0 AS aconto_debt,
            d.year
           FROM (giveffektivt.annual_tax_report_current_payments d
             LEFT JOIN gavebrev_current_non_gavebrev_total gr ON ((gr.tin = d.tin)))
        ), data AS (
         SELECT with_gavebrev.ll8a_or_gavebrev,
            with_gavebrev.tin,
            with_gavebrev.total,
            with_gavebrev.aconto_debt,
            with_gavebrev.year
           FROM with_gavebrev
        UNION
         SELECT without_gavebrev.ll8a_or_gavebrev,
            without_gavebrev.tin,
            without_gavebrev.total,
            without_gavebrev.aconto_debt,
            without_gavebrev.year
           FROM without_gavebrev
        )
 SELECT ll8a_or_gavebrev,
    tin,
    total,
    aconto_debt,
    year
   FROM data
  WHERE ((total > (0)::numeric) OR (aconto_debt > (0)::numeric))
  ORDER BY tin, ll8a_or_gavebrev DESC;


--
-- Name: annual_tax_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report AS
 SELECT 2262 AS const,
    42490903 AS ge_cvr,
    replace(tin, '-'::text, ''::text) AS donor_cpr,
    year,
    ''::text AS blank,
    total,
    ll8a_or_gavebrev,
    ''::text AS ge_notes,
    0 AS rettekode
   FROM giveffektivt.annual_tax_report_data
  WHERE (total > (0)::numeric);


--
-- Name: annual_tax_report_gaveskema; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gaveskema AS
 WITH const AS (
         SELECT date_trunc('year'::text, (now() - '9 mons'::interval)) AS year_from,
            date_trunc('year'::text, (now() + '3 mons'::interval)) AS year_to
        ), report AS (
         SELECT annual_tax_report.const,
            annual_tax_report.ge_cvr,
            annual_tax_report.donor_cpr,
            annual_tax_report.year,
            annual_tax_report.blank,
            annual_tax_report.total,
            annual_tax_report.ll8a_or_gavebrev,
            annual_tax_report.ge_notes,
            annual_tax_report.rettekode
           FROM giveffektivt.annual_tax_report
        ), donors_200 AS (
         SELECT count(report.donor_cpr) AS count_donors_donated_min_200_kr
           FROM report
          WHERE ((report.ll8a_or_gavebrev = 'A'::text) AND (report.total >= (200)::numeric))
        ), members AS (
         SELECT count(DISTINCT ds.tin) AS count_members
           FROM const const_1,
            ((giveffektivt.donor_with_sensitive_info ds
             JOIN giveffektivt.donation d ON ((d.donor_id = ds.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.status = 'charged'::giveffektivt.charge_status) AND (c.created_at <@ tstzrange(const_1.year_from, const_1.year_to, '[)'::text)))
        ), donated_a AS (
         SELECT COALESCE(sum(report.total), (0)::numeric) AS amount_donated_a
           FROM report
          WHERE (report.ll8a_or_gavebrev = 'A'::text)
        ), donated_l AS (
         SELECT COALESCE(sum(report.total), (0)::numeric) AS amount_donated_l
           FROM report
          WHERE (report.ll8a_or_gavebrev = 'L'::text)
        ), donated_total AS (
         SELECT COALESCE(sum(d.amount), (0)::numeric) AS amount_donated_total
           FROM const const_1,
            ((giveffektivt.donor_with_sensitive_info ds
             JOIN giveffektivt.donation d ON ((d.donor_id = ds.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.status = 'charged'::giveffektivt.charge_status) AND (c.created_at <@ tstzrange(const_1.year_from, const_1.year_to, '[)'::text)))
        )
 SELECT EXTRACT(year FROM const.year_from) AS year,
    donors_200.count_donors_donated_min_200_kr,
    members.count_members,
    donated_a.amount_donated_a,
    donated_l.amount_donated_l,
    donated_total.amount_donated_total
   FROM const,
    donors_200,
    members,
    donated_a,
    donated_l,
    donated_total;


--
-- Name: charge_with_gateway_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charge_with_gateway_info AS
 SELECT id,
    donation_id,
    short_id,
    status,
    gateway_metadata,
    created_at,
    updated_at,
    transfer_id
   FROM giveffektivt._charge
  WHERE (deleted_at IS NULL);


--
-- Name: donation_with_sensitive_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donation_with_sensitive_info AS
 SELECT id,
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
   FROM giveffektivt._donation
  WHERE (deleted_at IS NULL);


--
-- Name: donor_with_contact_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_with_contact_info AS
 SELECT id,
    name,
    email,
    created_at,
    updated_at
   FROM giveffektivt._donor
  WHERE (deleted_at IS NULL);


--
-- Name: charges_to_charge; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charges_to_charge AS
 SELECT c.id,
    c.short_id,
    dc.email,
    d.amount,
    d.recipient,
    d.gateway,
    d.method,
    c.gateway_metadata,
    d.gateway_metadata AS donation_gateway_metadata
   FROM ((giveffektivt.donor_with_contact_info dc
     JOIN giveffektivt.donation_with_sensitive_info d ON ((d.donor_id = dc.id)))
     JOIN giveffektivt.charge_with_gateway_info c ON ((c.donation_id = d.id)))
  WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (c.status = 'created'::giveffektivt.charge_status) AND (c.created_at <= now()));


--
-- Name: crm_export; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.crm_export AS
 WITH emails AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.created_at AS registered_at
           FROM ((giveffektivt.donor_with_contact_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE (c.status = 'charged'::giveffektivt.charge_status)
          ORDER BY p.email, p.created_at
        ), names AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.name
           FROM giveffektivt.donor_with_contact_info p
          WHERE (p.name IS NOT NULL)
          ORDER BY p.email, p.created_at
        ), members AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.name
           FROM ((giveffektivt.donor_with_sensitive_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.created_at >= (now() - '1 year'::interval)))
        ), donations AS (
         SELECT p.email,
            sum(d.amount) AS total_donated,
            count(1) AS donations_count
           FROM ((giveffektivt.donor_with_contact_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))
          GROUP BY p.email
        ), latest_donations AS (
         SELECT DISTINCT ON (p.email) p.email,
            d.amount AS last_donated_amount,
            d.method AS last_donated_method,
            d.frequency AS last_donated_frequency,
            d.recipient AS last_donated_recipient,
            d.tax_deductible AS last_donation_tax_deductible,
            d.cancelled AS last_donation_cancelled,
            c.created_at AS last_donated_at
           FROM ((giveffektivt.donor_with_contact_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))
          ORDER BY p.email, c.created_at DESC
        ), data AS (
         SELECT e.email,
            e.registered_at,
            n.name,
            d.total_donated,
            d.donations_count,
            l.last_donated_amount,
            l.last_donated_method,
            l.last_donated_frequency,
            l.last_donated_recipient,
            l.last_donation_tax_deductible,
            l.last_donation_cancelled,
            l.last_donated_at,
            (m.email IS NOT NULL) AS is_member
           FROM ((((emails e
             LEFT JOIN names n ON ((n.email = e.email)))
             LEFT JOIN donations d ON ((d.email = e.email)))
             LEFT JOIN members m ON ((m.email = e.email)))
             LEFT JOIN latest_donations l ON ((l.email = e.email)))
        )
 SELECT email,
    registered_at,
    name,
    total_donated,
    donations_count,
    last_donated_amount,
    last_donated_method,
    last_donated_frequency,
    last_donated_recipient,
    last_donation_tax_deductible,
    last_donation_cancelled,
    last_donated_at,
    is_member
   FROM data
  WHERE ((email ~~ '%@%'::text) AND ((total_donated > (0)::numeric) OR is_member));


--
-- Name: donation_with_contact_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donation_with_contact_info AS
 SELECT id,
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
   FROM giveffektivt._donation
  WHERE (deleted_at IS NULL);


--
-- Name: donations_to_create_charges; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donations_to_create_charges AS
 SELECT donation_id,
    frequency,
    last_charge,
    next_charge
   FROM ( SELECT DISTINCT ON (d.id) d.id AS donation_id,
            d.frequency,
            c.created_at AS last_charge,
                CASE
                    WHEN (d.frequency = 'monthly'::giveffektivt.donation_frequency) THEN (c.created_at + '1 mon'::interval)
                    WHEN (d.frequency = 'yearly'::giveffektivt.donation_frequency) THEN (c.created_at + '1 year'::interval)
                    ELSE NULL::timestamp with time zone
                END AS next_charge
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (d.frequency = ANY (ARRAY['monthly'::giveffektivt.donation_frequency, 'yearly'::giveffektivt.donation_frequency])))
          ORDER BY d.id, c.created_at DESC) s
  WHERE (next_charge <= now());


--
-- Name: donations_to_email; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donations_to_email AS
 SELECT d.id,
    p.email,
    d.amount,
    d.recipient,
    d.frequency,
    d.tax_deductible
   FROM ((giveffektivt.donor_with_sensitive_info p
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN LATERAL ( SELECT charge.id,
            charge.status
           FROM giveffektivt.charge
          WHERE (charge.donation_id = d.id)
          ORDER BY charge.created_at DESC
         LIMIT 1) c ON ((1 = 1)))
  WHERE ((d.emailed = 'no'::giveffektivt.emailed_status) AND ((c.status = 'charged'::giveffektivt.charge_status) OR ((d.method = 'MobilePay'::giveffektivt.payment_method) AND (d.frequency <> 'once'::giveffektivt.donation_frequency) AND (c.status <> 'error'::giveffektivt.charge_status))));


--
-- Name: donor; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor AS
 SELECT id,
    created_at,
    updated_at
   FROM giveffektivt._donor
  WHERE (deleted_at IS NULL);


--
-- Name: donor_impact_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_impact_report AS
 WITH data AS (
         SELECT p.email,
            min(t.recipient) AS transferred_to,
            min(t.created_at) AS transferred_at,
            sum(d.amount) AS amount,
            round(((sum(d.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS units,
            round(((sum(d.amount) / max(t.exchange_rate)) / max(t.life_cost_external)), 2) AS lives
           FROM (((giveffektivt.donor_with_sensitive_info p
             JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
             LEFT JOIN giveffektivt.transfer t ON ((c.transfer_id = t.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))
          GROUP BY p.email, t.id
        )
 SELECT email,
    COALESCE((transferred_to)::text, '== Fremtiden =='::text) AS transferred_to,
    COALESCE(to_char(transferred_at, 'YYYY-MM-DD'::text), '== Fremtiden =='::text) AS transferred_at,
    amount,
    units,
    lives
   FROM data
  ORDER BY email, data.transferred_at;


--
-- Name: failed_recurring_donations; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.failed_recurring_donations AS
 WITH paid_before AS (
         SELECT DISTINCT ON (d.id) d.id
           FROM ((giveffektivt.donation_with_sensitive_info d
             JOIN giveffektivt.donor_with_contact_info p ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge_with_gateway_info c ON ((c.donation_id = d.id)))
          WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (d.frequency = ANY (ARRAY['monthly'::giveffektivt.donation_frequency, 'yearly'::giveffektivt.donation_frequency])) AND (c.status = 'charged'::giveffektivt.charge_status))
          ORDER BY d.id
        )
 SELECT failed_at,
    charge_id,
    short_id,
    amount,
    method,
    gateway,
    donor_id,
    donor_name,
    donor_email,
    donation_id,
    gateway_metadata,
    recipient,
    frequency,
    tax_deductible,
    fundraiser_id,
    message,
    status
   FROM ( SELECT DISTINCT ON (d.id) c.created_at AS failed_at,
            c.id AS charge_id,
            c.short_id,
            d.amount,
            d.method,
            d.gateway,
            p.id AS donor_id,
            p.name AS donor_name,
            p.email AS donor_email,
            d.id AS donation_id,
            d.gateway_metadata,
            d.recipient,
            d.frequency,
            d.tax_deductible,
            d.fundraiser_id,
            d.message,
            c.status
           FROM ((giveffektivt.donation_with_sensitive_info d
             JOIN giveffektivt.donor_with_contact_info p ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge_with_gateway_info c ON ((c.donation_id = d.id)))
          WHERE (d.id IN ( SELECT paid_before.id
                   FROM paid_before))
          ORDER BY d.id, c.created_at DESC) s
  WHERE (status = 'error'::giveffektivt.charge_status)
  ORDER BY failed_at DESC;


--
-- Name: fundraiser; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.fundraiser AS
 SELECT id,
    email,
    title,
    has_match,
    match_currency,
    key,
    created_at,
    updated_at
   FROM giveffektivt._fundraiser
  WHERE (deleted_at IS NULL);


--
-- Name: fundraiser_activity_checkin; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.fundraiser_activity_checkin AS
 SELECT id,
    fundraiser_id,
    amount,
    created_at,
    updated_at
   FROM giveffektivt._fundraiser_activity_checkin
  WHERE (deleted_at IS NULL);


--
-- Name: gateway_webhook; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.gateway_webhook (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway giveffektivt.payment_gateway NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gavebrev_checkins_to_create; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.gavebrev_checkins_to_create AS
 SELECT donor_id,
    year,
    income_inferred
   FROM ( SELECT DISTINCT ON (g.donor_id) g.donor_id,
            COALESCE((c.year + (1)::numeric), (date_part('year'::text, g.created_at))::numeric) AS year,
            COALESCE(c.income_verified, COALESCE(c.income_preliminary, COALESCE(c.income_inferred, (0)::numeric))) AS income_inferred
           FROM (giveffektivt.gavebrev g
             LEFT JOIN giveffektivt.gavebrev_checkin c ON ((g.donor_id = c.donor_id)))
          WHERE ((g.status = 'signed'::giveffektivt.gavebrev_status) AND (g.stopped_at >= now()))
          ORDER BY g.donor_id, c.year DESC) s
  WHERE ((year)::double precision <= date_part('year'::text, now()));


--
-- Name: general_assembly_voting_code; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.general_assembly_voting_code (
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ignored_renewals; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.ignored_renewals AS
 WITH last_charge AS (
         SELECT DISTINCT ON (p.id) p.id,
            p.name,
            p.email,
            d.amount,
            d.recipient,
            c.status,
            c.created_at
           FROM ((giveffektivt.donor_with_contact_info p
             JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
          WHERE (d.frequency <> 'once'::giveffektivt.donation_frequency)
          ORDER BY p.id, c.created_at DESC
        ), never_activated AS (
         SELECT DISTINCT ON (p.id) p.id,
            d.id AS donation_id,
            d.created_at
           FROM ((giveffektivt.donor_with_contact_info p
             LEFT JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             LEFT JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
          WHERE ((c.id IS NULL) AND (d.frequency <> 'once'::giveffektivt.donation_frequency))
        ), last_payment_by_email AS (
         SELECT DISTINCT ON (p.email, d.recipient) p.email,
            d.recipient,
            c.created_at
           FROM ((giveffektivt.donor_with_contact_info p
             JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
          WHERE (c.status = 'charged'::giveffektivt.charge_status)
          ORDER BY p.email, d.recipient, c.created_at DESC
        ), email_to_name AS (
         SELECT DISTINCT ON (p.email) p.name,
            p.email
           FROM giveffektivt.donor_with_contact_info p
          WHERE (p.name IS NOT NULL)
        )
 SELECT COALESCE(lc.name, en.name) AS name,
    lc.email,
    lc.amount,
    lc.recipient,
    na.donation_id,
    ((now())::date - (na.created_at)::date) AS days_ago
   FROM (((last_charge lc
     JOIN never_activated na ON ((lc.id = na.id)))
     LEFT JOIN last_payment_by_email lp ON (((lc.email = lp.email) AND (lc.recipient = lp.recipient))))
     LEFT JOIN email_to_name en ON ((lc.email = en.email)))
  WHERE ((lc.status = 'error'::giveffektivt.charge_status) AND ((lp.created_at IS NULL) OR (lp.created_at < lc.created_at)))
  ORDER BY na.created_at;


--
-- Name: kpi; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.kpi AS
 WITH dkk_total AS (
         SELECT round(sum(d.amount)) AS dkk_total
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))
        ), dkk_total_ops AS (
         SELECT round(sum(d.amount)) AS dkk_total_ops
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient = 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient))
        ), dkk_pending_transfer AS (
         SELECT COALESCE(round(sum(d.amount)), (0)::numeric) AS dkk_pending_transfer
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (c.transfer_id IS NULL))
        ), dkk_last_30_days AS (
         SELECT round(sum(d.amount)) AS dkk_last_30_days
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.created_at >= (date_trunc('day'::text, now()) - '30 days'::interval)))
        ), dkk_recurring_next_year AS (
         SELECT ((12)::numeric * sum(c1.amount)) AS dkk_recurring_next_year
           FROM ( SELECT DISTINCT ON (d.id) d.amount
                   FROM (giveffektivt.charge c
                     JOIN giveffektivt.donation d ON ((c.donation_id = d.id)))
                  WHERE ((c.status = ANY (ARRAY['charged'::giveffektivt.charge_status, 'created'::giveffektivt.charge_status])) AND (d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (NOT d.cancelled) AND (c.created_at >= (date_trunc('month'::text, now()) - '1 mon'::interval)))) c1
        ), members_confirmed AS (
         SELECT (count(DISTINCT p.tin))::numeric AS members_confirmed
           FROM ((giveffektivt.donor_with_sensitive_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (c.created_at >= date_trunc('year'::text, now())))
        ), members_pending_renewal AS (
         SELECT (count(*))::numeric AS members_pending_renewal
           FROM ( SELECT DISTINCT ON (p.tin) p.tin,
                    c.created_at
                   FROM ((giveffektivt.donor_with_sensitive_info p
                     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
                     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
                  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (NOT d.cancelled))
                  ORDER BY p.tin, c.created_at DESC) a
          WHERE (a.created_at < date_trunc('year'::text, now()))
        ), monthly_donors AS (
         SELECT count(DISTINCT c.donation_id) AS monthly_donors
           FROM (giveffektivt.charge c
             JOIN giveffektivt.donation d ON ((c.donation_id = d.id)))
          WHERE ((c.status = ANY (ARRAY['charged'::giveffektivt.charge_status, 'created'::giveffektivt.charge_status])) AND (d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient) AND (NOT d.cancelled) AND (c.created_at >= (date_trunc('month'::text, now()) - '1 mon'::interval)))
        ), is_max_tax_deduction_known AS (
         SELECT ((max(max_tax_deduction.year) = EXTRACT(year FROM now())))::integer AS is_max_tax_deduction_known
           FROM giveffektivt.max_tax_deduction
        ), oldest_stopped_donation_age AS (
         SELECT floor(EXTRACT(epoch FROM (now() - min(unnamed_subquery.max_charged_at)))) AS oldest_stopped_donation_age
           FROM ( SELECT max(c.created_at) AS max_charged_at
                   FROM ((giveffektivt.donor_with_sensitive_info p
                     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
                     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
                  WHERE (c.status = 'charged'::giveffektivt.charge_status)
                  GROUP BY p.email) unnamed_subquery
        )
 SELECT dkk_total.dkk_total,
    dkk_total_ops.dkk_total_ops,
    dkk_pending_transfer.dkk_pending_transfer,
    dkk_last_30_days.dkk_last_30_days,
    dkk_recurring_next_year.dkk_recurring_next_year,
    members_confirmed.members_confirmed,
    members_pending_renewal.members_pending_renewal,
    monthly_donors.monthly_donors,
    is_max_tax_deduction_known.is_max_tax_deduction_known,
    oldest_stopped_donation_age.oldest_stopped_donation_age
   FROM dkk_total,
    dkk_total_ops,
    dkk_pending_transfer,
    dkk_last_30_days,
    dkk_recurring_next_year,
    members_confirmed,
    members_pending_renewal,
    monthly_donors,
    is_max_tax_deduction_known,
    oldest_stopped_donation_age;


--
-- Name: old_ids_map; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.old_ids_map AS
 SELECT p.id AS donor_id,
    p._old_id AS old_donor_id,
    d.id AS donation_id,
    d._old_id AS old_donation_id,
    c.id AS charge_id,
    c._old_id AS old_charge_id
   FROM ((giveffektivt._donor p
     LEFT JOIN giveffektivt._donation d ON ((p.id = d.donor_id)))
     LEFT JOIN giveffektivt._charge c ON ((d.id = c.donation_id)))
  WHERE ((p.deleted_at IS NULL) AND (d.deleted_at IS NULL) AND (c.deleted_at IS NULL) AND ((p._old_id IS NOT NULL) OR (d._old_id IS NOT NULL) OR (c._old_id IS NOT NULL)));


--
-- Name: pending_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.pending_distribution AS
 SELECT d.recipient,
    round(sum(d.amount)) AS dkk_total,
    (count(*))::numeric AS payments_total
   FROM (giveffektivt.donation d
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (c.transfer_id IS NULL))
  GROUP BY d.recipient
  ORDER BY (round(sum(d.amount))) DESC;


--
-- Name: scanpay_seq; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.scanpay_seq (
    value integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.schema_migrations (
    version character varying(128) NOT NULL
);


--
-- Name: skat; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.skat AS
 SELECT const,
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
   FROM giveffektivt._skat
  WHERE (deleted_at IS NULL);


--
-- Name: skat_gaveskema; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.skat_gaveskema AS
 SELECT year,
    count_donors_donated_min_200_kr,
    count_members,
    amount_donated_a,
    amount_donated_l,
    amount_donated_total,
    id,
    created_at,
    updated_at
   FROM giveffektivt._skat_gaveskema
  WHERE (deleted_at IS NULL);


--
-- Name: transfer_overview; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transfer_overview AS
 SELECT t.id,
    t.earmark,
    (
        CASE
            WHEN (t.created_at > now()) THEN 'Forventet: '::text
            ELSE ''::text
        END || t.recipient) AS recipient,
        CASE
            WHEN (t.recipient = 'Against Malaria Foundation'::giveffektivt.transfer_recipient) THEN 'Antimalaria myggenet udleveret'::text
            WHEN (t.recipient = 'Malaria Consortium'::giveffektivt.transfer_recipient) THEN 'Malariamedicin udleveret'::text
            WHEN (t.recipient = 'Helen Keller International'::giveffektivt.transfer_recipient) THEN 'A-vitamintilskud udleveret'::text
            WHEN (t.recipient = 'New Incentives'::giveffektivt.transfer_recipient) THEN 'Vaccinationsprogrammer motiveret'::text
            WHEN (t.recipient = 'Give Directly'::giveffektivt.transfer_recipient) THEN 'Dollars modtaget'::text
            WHEN (t.recipient = 'SCI Foundation'::giveffektivt.transfer_recipient) THEN 'Ormekure udleveret'::text
            ELSE NULL::text
        END AS unit,
    round(sum(d.amount)) AS total_dkk,
    round(max(t.unit_cost_external), 2) AS unit_cost_external,
    round(max(t.unit_cost_conversion), 2) AS unit_cost_conversion,
    round(((max(t.unit_cost_external) / max(t.unit_cost_conversion)) * max(t.exchange_rate)), 2) AS unit_cost_dkk,
    round(((sum(d.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS unit_impact,
    round(max(t.life_cost_external), 2) AS life_cost_external,
    round((max(t.life_cost_external) * max(t.exchange_rate)), 2) AS life_cost_dkk,
    round(((sum(d.amount) / max(t.exchange_rate)) / max(t.life_cost_external)), 1) AS life_impact,
    max(c.created_at) AS computed_at,
        CASE
            WHEN (t.created_at > now()) THEN 'Næste overførsel'::text
            ELSE to_char(t.created_at, 'yyyy-mm-dd'::text)
        END AS transferred_at
   FROM ((giveffektivt.donation d
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
     JOIN giveffektivt.transfer t ON (((c.transfer_id = t.id) OR ((c.transfer_id IS NULL) AND (d.recipient = t.earmark) AND (t.created_at > now())))))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])))
  GROUP BY t.id, t.earmark, t.recipient, t.created_at
  ORDER BY t.created_at, (sum(d.amount)) DESC;


--
-- Name: transfer_pending; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transfer_pending AS
 WITH data AS (
         SELECT c.created_at AS donated_at,
            d.amount,
            d.recipient,
            sum(d.amount) OVER (ORDER BY c.created_at) AS potential_cutoff
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (c.transfer_id IS NULL))
        )
 SELECT donated_at,
    amount,
    recipient,
    potential_cutoff
   FROM data
  ORDER BY donated_at;


--
-- Name: transferred_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transferred_distribution AS
 SELECT t.recipient,
    round(sum(d.amount)) AS dkk_total,
    (count(*))::numeric AS payments_total
   FROM ((giveffektivt.donation d
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
     JOIN giveffektivt.transfer t ON ((c.transfer_id = t.id)))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (c.transfer_id IS NOT NULL))
  GROUP BY t.recipient
  ORDER BY (round(sum(d.amount))) DESC;


--
-- Name: _charge _charge_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._charge
    ADD CONSTRAINT _charge_pkey PRIMARY KEY (id);


--
-- Name: _charge _charge_short_id_key; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._charge
    ADD CONSTRAINT _charge_short_id_key UNIQUE (short_id);


--
-- Name: _donation _donation_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._donation
    ADD CONSTRAINT _donation_pkey PRIMARY KEY (id);


--
-- Name: _donor _donor_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._donor
    ADD CONSTRAINT _donor_pkey PRIMARY KEY (id);


--
-- Name: _fundraiser_activity_checkin _fundraiser_activity_checkin_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._fundraiser_activity_checkin
    ADD CONSTRAINT _fundraiser_activity_checkin_pkey PRIMARY KEY (id);


--
-- Name: _fundraiser _fundraiser_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._fundraiser
    ADD CONSTRAINT _fundraiser_pkey PRIMARY KEY (id);


--
-- Name: _gavebrev_checkin _gavebrev_checkin_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._gavebrev_checkin
    ADD CONSTRAINT _gavebrev_checkin_pkey PRIMARY KEY (id);


--
-- Name: _gavebrev _gavebrev_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._gavebrev
    ADD CONSTRAINT _gavebrev_pkey PRIMARY KEY (id);


--
-- Name: _skat_gaveskema _skat_gaveskema_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._skat_gaveskema
    ADD CONSTRAINT _skat_gaveskema_pkey PRIMARY KEY (id);


--
-- Name: _skat _skat_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._skat
    ADD CONSTRAINT _skat_pkey PRIMARY KEY (id);


--
-- Name: _transfer _transfer_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._transfer
    ADD CONSTRAINT _transfer_pkey PRIMARY KEY (id);


--
-- Name: gateway_webhook gateway_webhook_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gateway_webhook
    ADD CONSTRAINT gateway_webhook_pkey PRIMARY KEY (id);


--
-- Name: general_assembly_voting_code general_assembly_voting_code_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.general_assembly_voting_code
    ADD CONSTRAINT general_assembly_voting_code_pkey PRIMARY KEY (code);


--
-- Name: max_tax_deduction max_tax_deduction_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.max_tax_deduction
    ADD CONSTRAINT max_tax_deduction_pkey PRIMARY KEY (year);


--
-- Name: scanpay_seq scanpay_seq_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.scanpay_seq
    ADD CONSTRAINT scanpay_seq_pkey PRIMARY KEY (value);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: charge charge_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE charge_soft_delete AS
    ON DELETE TO giveffektivt.charge DO INSTEAD  UPDATE giveffektivt._charge SET deleted_at = now()
  WHERE ((_charge.deleted_at IS NULL) AND (_charge.id = old.id));


--
-- Name: charge_with_gateway_info charge_with_gateway_info_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE charge_with_gateway_info_soft_delete AS
    ON DELETE TO giveffektivt.charge_with_gateway_info DO INSTEAD  UPDATE giveffektivt._charge SET deleted_at = now()
  WHERE ((_charge.deleted_at IS NULL) AND (_charge.id = old.id));


--
-- Name: donation donation_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donation_soft_delete AS
    ON DELETE TO giveffektivt.donation DO INSTEAD  UPDATE giveffektivt._donation SET deleted_at = now()
  WHERE ((_donation.deleted_at IS NULL) AND (_donation.id = old.id));


--
-- Name: _donation donation_soft_delete_cascade; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donation_soft_delete_cascade AS
    ON UPDATE TO giveffektivt._donation
   WHERE ((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL)) DO  UPDATE giveffektivt._charge SET deleted_at = now()
  WHERE ((_charge.deleted_at IS NULL) AND (_charge.donation_id = old.id));


--
-- Name: donation_with_contact_info donation_with_contact_info_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donation_with_contact_info_soft_delete AS
    ON DELETE TO giveffektivt.donation_with_contact_info DO INSTEAD  UPDATE giveffektivt._donation SET deleted_at = now()
  WHERE ((_donation.deleted_at IS NULL) AND (_donation.id = old.id));


--
-- Name: donation_with_sensitive_info donation_with_sensitive_info_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donation_with_sensitive_info_soft_delete AS
    ON DELETE TO giveffektivt.donation_with_sensitive_info DO INSTEAD  UPDATE giveffektivt._donation SET deleted_at = now()
  WHERE ((_donation.deleted_at IS NULL) AND (_donation.id = old.id));


--
-- Name: donor donor_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_soft_delete AS
    ON DELETE TO giveffektivt.donor DO INSTEAD  UPDATE giveffektivt._donor SET deleted_at = now()
  WHERE ((_donor.id = old.id) AND (_donor.deleted_at IS NULL));


--
-- Name: _donor donor_soft_delete_cascade; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_soft_delete_cascade AS
    ON UPDATE TO giveffektivt._donor
   WHERE ((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL)) DO  UPDATE giveffektivt._donation SET deleted_at = now()
  WHERE ((_donation.deleted_at IS NULL) AND (_donation.donor_id = old.id));


--
-- Name: _donor donor_soft_delete_cascade_gavebrev; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_soft_delete_cascade_gavebrev AS
    ON UPDATE TO giveffektivt._donor
   WHERE ((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL)) DO  UPDATE giveffektivt._gavebrev SET deleted_at = now()
  WHERE ((_gavebrev.deleted_at IS NULL) AND (_gavebrev.donor_id = old.id));


--
-- Name: _donor donor_soft_delete_cascade_gavebrev_checkin; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_soft_delete_cascade_gavebrev_checkin AS
    ON UPDATE TO giveffektivt._donor
   WHERE ((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL)) DO  UPDATE giveffektivt._gavebrev_checkin SET deleted_at = now()
  WHERE ((_gavebrev_checkin.deleted_at IS NULL) AND (_gavebrev_checkin.donor_id = old.id));


--
-- Name: donor_with_contact_info donor_with_contact_info_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_with_contact_info_soft_delete AS
    ON DELETE TO giveffektivt.donor_with_contact_info DO INSTEAD  UPDATE giveffektivt._donor SET deleted_at = now()
  WHERE ((_donor.id = old.id) AND (_donor.deleted_at IS NULL));


--
-- Name: donor_with_sensitive_info donor_with_sensitive_info_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE donor_with_sensitive_info_soft_delete AS
    ON DELETE TO giveffektivt.donor_with_sensitive_info DO INSTEAD  UPDATE giveffektivt._donor SET deleted_at = now()
  WHERE ((_donor.id = old.id) AND (_donor.deleted_at IS NULL));


--
-- Name: fundraiser fundraiser_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE fundraiser_soft_delete AS
    ON DELETE TO giveffektivt.fundraiser DO INSTEAD  UPDATE giveffektivt._fundraiser SET deleted_at = now()
  WHERE ((_fundraiser.id = old.id) AND (_fundraiser.deleted_at IS NULL));


--
-- Name: gavebrev_checkin gavebrev_checkin_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE gavebrev_checkin_soft_delete AS
    ON DELETE TO giveffektivt.gavebrev_checkin DO INSTEAD  UPDATE giveffektivt._gavebrev_checkin SET deleted_at = now()
  WHERE ((_gavebrev_checkin.deleted_at IS NULL) AND (_gavebrev_checkin.id = old.id));


--
-- Name: gavebrev gavebrev_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE gavebrev_soft_delete AS
    ON DELETE TO giveffektivt.gavebrev DO INSTEAD  UPDATE giveffektivt._gavebrev SET deleted_at = now()
  WHERE ((_gavebrev.deleted_at IS NULL) AND (_gavebrev.id = old.id));


--
-- Name: skat_gaveskema skat_gaveskema_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE skat_gaveskema_soft_delete AS
    ON DELETE TO giveffektivt.skat_gaveskema DO INSTEAD  UPDATE giveffektivt._skat_gaveskema SET deleted_at = now()
  WHERE ((_skat_gaveskema.deleted_at IS NULL) AND (_skat_gaveskema.id = old.id));


--
-- Name: skat skat_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE skat_soft_delete AS
    ON DELETE TO giveffektivt.skat DO INSTEAD  UPDATE giveffektivt._skat SET deleted_at = now()
  WHERE ((_skat.deleted_at IS NULL) AND (_skat.id = old.id));


--
-- Name: transfer transfer_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE transfer_soft_delete AS
    ON DELETE TO giveffektivt.transfer DO INSTEAD  UPDATE giveffektivt._transfer SET deleted_at = now()
  WHERE ((_transfer.deleted_at IS NULL) AND (_transfer.id = old.id));


--
-- Name: _charge charge_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER charge_update_timestamp BEFORE UPDATE ON giveffektivt._charge FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _donation donation_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER donation_update_timestamp BEFORE UPDATE ON giveffektivt._donation FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _donor donor_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER donor_update_timestamp BEFORE UPDATE ON giveffektivt._donor FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _fundraiser fundraiser_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER fundraiser_update_timestamp BEFORE UPDATE ON giveffektivt._fundraiser FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _gavebrev_checkin gavebrev_checkin_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER gavebrev_checkin_update_timestamp BEFORE UPDATE ON giveffektivt._gavebrev_checkin FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _gavebrev gavebrev_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER gavebrev_update_timestamp BEFORE UPDATE ON giveffektivt._gavebrev FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: max_tax_deduction max_tax_deduction_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER max_tax_deduction_update_timestamp BEFORE UPDATE ON giveffektivt.max_tax_deduction FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _skat_gaveskema skat_gaveskema_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER skat_gaveskema_update_timestamp BEFORE UPDATE ON giveffektivt._skat_gaveskema FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _skat skat_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER skat_update_timestamp BEFORE UPDATE ON giveffektivt._skat FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _transfer transfers_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER transfers_update_timestamp BEFORE UPDATE ON giveffektivt._transfer FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _charge _charge_donation_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._charge
    ADD CONSTRAINT _charge_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES giveffektivt._donation(id);


--
-- Name: _charge _charge_transfer_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._charge
    ADD CONSTRAINT _charge_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES giveffektivt._transfer(id);


--
-- Name: _donation _donation_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._donation
    ADD CONSTRAINT _donation_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt._donor(id);


--
-- Name: _fundraiser_activity_checkin _fundraiser_activity_checkin_fundraiser_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._fundraiser_activity_checkin
    ADD CONSTRAINT _fundraiser_activity_checkin_fundraiser_id_fkey FOREIGN KEY (fundraiser_id) REFERENCES giveffektivt._fundraiser(id);


--
-- Name: _gavebrev_checkin _gavebrev_checkin_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._gavebrev_checkin
    ADD CONSTRAINT _gavebrev_checkin_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt._donor(id);


--
-- Name: _gavebrev _gavebrev_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._gavebrev
    ADD CONSTRAINT _gavebrev_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt._donor(id);


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO giveffektivt.schema_migrations (version) VALUES
    ('20220620123223'),
    ('20220811105252'),
    ('20220812002209'),
    ('20220812162001'),
    ('20220816152738'),
    ('20220823110152'),
    ('20220824195743'),
    ('20220902221653'),
    ('20221007155850'),
    ('20221007165120'),
    ('20221008192012'),
    ('20221008192244'),
    ('20221026214644'),
    ('20221203144140'),
    ('20221216134936'),
    ('20221219103355'),
    ('20221219110329'),
    ('20221220103725'),
    ('20221221112039'),
    ('20221222112923'),
    ('20221223214535'),
    ('20230402233801'),
    ('20230402233802'),
    ('20230402233803'),
    ('20230402233804'),
    ('20230402233805'),
    ('20230514103740'),
    ('20230529101957'),
    ('20230619200209'),
    ('20230619213220'),
    ('20230626100725'),
    ('20230703175813'),
    ('20230826132840'),
    ('20230830183452'),
    ('20231106141243'),
    ('20231112162539'),
    ('20231212102739'),
    ('20231218184326'),
    ('20240115002613'),
    ('20240303130208'),
    ('20240308103949'),
    ('20240321100834'),
    ('20240810181005'),
    ('20240814200924'),
    ('20240817162007'),
    ('20240923191628'),
    ('20241009084603'),
    ('20241108133243'),
    ('20241113220928'),
    ('20241120215013'),
    ('20241121213227'),
    ('20241123140526'),
    ('20241211133732'),
    ('20241212214448'),
    ('20241230123042'),
    ('20250102125637'),
    ('20250103112739'),
    ('20250103221157'),
    ('20250110151414'),
    ('20250110190651'),
    ('20250115215315'),
    ('20250120213832'),
    ('20250122172829'),
    ('20250127221911'),
    ('20250223142559'),
    ('20250306220252'),
    ('99999999999999');
