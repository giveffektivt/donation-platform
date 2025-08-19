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
-- Name: earmark_sum_check(); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.earmark_sum_check() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: record_audit_log(); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.record_audit_log() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if tg_op = 'UPDATE' and
     (to_jsonb(new) - 'updated_at') is not distinct from (to_jsonb(old) - 'updated_at')
  then
    return new;
  end if;

  insert into audit_log(table_name, record_id, operation, data)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: donation; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.donation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    emailed giveffektivt.emailed_status DEFAULT 'no'::giveffektivt.emailed_status NOT NULL,
    amount numeric NOT NULL,
    frequency giveffektivt.donation_frequency NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    method giveffektivt.payment_method NOT NULL,
    tax_deductible boolean NOT NULL,
    gateway giveffektivt.payment_gateway NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fundraiser_id uuid,
    message text
);


--
-- Name: recreate_failed_recurring_donation(uuid); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.recreate_failed_recurring_donation(p_donation_id uuid) RETURNS giveffektivt.donation
    LANGUAGE plpgsql
    AS $$
declare
    v_donor donor%rowtype;
    v_old_earmarks jsonb;
    v_old_donation donation%rowtype;
    v_new_donation donation%rowtype;
begin
    update donation set cancelled = true where id = p_donation_id;

    select * from donation where id = p_donation_id into v_old_donation;

    if v_old_donation.id is null then
        raise exception 'recurring donation with ID % not found', p_donation_id;
    end if;

    select * from donor where id = v_old_donation.donor_id into v_donor;

    select json_agg(json_build_object('recipient', recipient, 'percentage', percentage))
    from earmark
    where donation_id = p_donation_id
    into v_old_earmarks;

    select * from register_donation(
        p_amount => v_old_donation.amount,
        p_frequency => v_old_donation.frequency,
        p_gateway => 'Quickpay'::payment_gateway,
        p_method => 'Credit card'::payment_method,
        p_tax_deductible => v_old_donation.tax_deductible,
        p_fundraiser_id => v_old_donation.fundraiser_id,
        p_message => v_old_donation.message,
        p_earmarks => v_old_earmarks,
        p_email => v_donor.email,
        p_tin => v_donor.tin,
        p_name => v_donor.name,
        p_address => v_donor.address,
        p_postcode => v_donor.postcode,
        p_city => v_donor.city,
        p_country => v_donor.country,
        p_birthday => v_donor.birthday
    ) into v_new_donation;

    update donation set emailed = 'yes' where id = v_new_donation.id;

    return v_new_donation;
end
$$;


--
-- Name: register_donation(numeric, giveffektivt.donation_frequency, giveffektivt.payment_gateway, giveffektivt.payment_method, boolean, uuid, text, jsonb, text, text, text, text, text, text, text, date); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.register_donation(p_amount numeric, p_frequency giveffektivt.donation_frequency, p_gateway giveffektivt.payment_gateway, p_method giveffektivt.payment_method, p_tax_deductible boolean, p_fundraiser_id uuid, p_message text, p_earmarks jsonb, p_email text, p_tin text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_postcode text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_birthday date DEFAULT NULL::date) RETURNS giveffektivt.donation
    LANGUAGE plpgsql
    AS $$
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
    values (p_email, p_tin, p_name, p_address, p_postcode, p_city, p_country, p_birthday)
    on conflict (email, coalesce(tin,'')) do update
    set
        name     = coalesce(excluded.name, donor.name),
        address  = coalesce(excluded.address, donor.address),
        postcode = coalesce(excluded.postcode, donor.postcode),
        city     = coalesce(excluded.city, donor.city),
        country  = coalesce(excluded.country, donor.country),
        birthday = coalesce(excluded.birthday, donor.birthday)
    returning * into v_donor;

    insert into donation (donor_id, amount, frequency, gateway, method, tax_deductible, fundraiser_id, message, gateway_metadata)
    values (
        v_donor.id,
        p_amount,
        p_frequency,
        p_gateway,
        p_method,
        p_tax_deductible,
        p_fundraiser_id,
        p_message,
        v_gateway_metadata
    )
    returning * into v_donation;

    insert into earmark (donation_id, recipient, percentage)
    select v_donation.id, (e->>'recipient')::donation_recipient, (e->>'percentage')::numeric
    from jsonb_array_elements(p_earmarks) e;

    return v_donation;
end
$$;


--
-- Name: gavebrev; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.gavebrev (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    status giveffektivt.gavebrev_status NOT NULL,
    type giveffektivt.gavebrev_type NOT NULL,
    amount numeric NOT NULL,
    minimal_income numeric,
    started_at timestamp with time zone NOT NULL,
    stopped_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: register_gavebrev(text, text, text, giveffektivt.gavebrev_type, numeric, numeric, date, date); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.register_gavebrev(p_name text, p_email text, p_tin text, p_type giveffektivt.gavebrev_type, p_amount numeric, p_minimal_income numeric, p_started_at date, p_stopped_at date) RETURNS giveffektivt.gavebrev
    LANGUAGE plpgsql
    AS $$
declare
    v_donor donor%rowtype;
    v_gavebrev gavebrev%rowtype;
begin
    insert into donor(email, tin, name)
    values (p_email, p_tin, p_name)
    on conflict (email, coalesce(tin,'')) do update
    set name = coalesce(excluded.name, donor.name)
    returning * into v_donor;

    insert into gavebrev(donor_id, status, type, amount, minimal_income, started_at, stopped_at)
    values (v_donor.id, 'created', p_type, p_amount, p_minimal_income, p_started_at, p_stopped_at)
    returning * into v_gavebrev;

    return v_gavebrev;
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


--
-- Name: charge; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.charge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donation_id uuid NOT NULL,
    short_id text DEFAULT giveffektivt.gen_short_id('charge'::text, 'short_id'::text, 'c-'::text) NOT NULL,
    status giveffektivt.charge_status NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: charge_transfer; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.charge_transfer (
    charge_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    donation_id uuid NOT NULL,
    earmark giveffektivt.donation_recipient NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donor; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.donor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    email text NOT NULL,
    address text,
    postcode text,
    city text,
    tin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country text,
    birthday date
);


--
-- Name: earmark; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.earmark (
    donation_id uuid NOT NULL,
    recipient giveffektivt.donation_recipient NOT NULL,
    percentage numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT earmark_percentage_check CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric)))
);


--
-- Name: donations_overview; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donations_overview AS
 SELECT p.id AS donor_id,
        CASE
            WHEN pg_has_role(CURRENT_USER, 'reader_contact'::name, 'member'::text) THEN p.name
            ELSE '***'::text
        END AS name,
        CASE
            WHEN pg_has_role(CURRENT_USER, 'reader_contact'::name, 'member'::text) THEN p.email
            ELSE '***'::text
        END AS email,
        CASE
            WHEN pg_has_role(CURRENT_USER, 'reader_sensitive'::name, 'member'::text) THEN p.tin
            ELSE '***'::text
        END AS tin,
    d.id AS donation_id,
    d.frequency,
    d.amount,
    COALESCE(( SELECT string_agg((((e.recipient || '='::text) || e.percentage) || '%'::text), ', '::text ORDER BY e.percentage DESC) AS string_agg
           FROM giveffektivt.earmark e
          WHERE (e.donation_id = d.id)), ''::text) AS earmarks,
    d.cancelled,
    d.method,
    d.gateway,
        CASE
            WHEN pg_has_role(CURRENT_USER, 'reader_sensitive'::name, 'member'::text) THEN d.gateway_metadata
            ELSE NULL::jsonb
        END AS donation_gateway_metadata,
    d.tax_deductible,
    c.id AS charge_id,
    c.short_id AS charge_short_id,
    c.status,
        CASE
            WHEN pg_has_role(CURRENT_USER, 'reader_sensitive'::name, 'member'::text) THEN c.gateway_metadata
            ELSE NULL::jsonb
        END AS charge_gateway_metadata,
    c.created_at AS charged_at
   FROM ((giveffektivt.donor p
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  ORDER BY c.created_at DESC NULLS LAST;


--
-- Name: charged_donations; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charged_donations AS
 SELECT donor_id,
    name,
    email,
    tin,
    donation_id,
    frequency,
    amount,
    earmarks,
    cancelled,
    method,
    gateway,
    donation_gateway_metadata,
    tax_deductible,
    charge_id,
    charge_short_id,
    status,
    charge_gateway_metadata,
    charged_at
   FROM giveffektivt.donations_overview d
  WHERE ((status = 'charged'::giveffektivt.charge_status) AND (NOT (EXISTS ( SELECT 1
           FROM giveffektivt.earmark e
          WHERE ((e.donation_id = d.donation_id) AND (e.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))))));


--
-- Name: transfer; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.transfer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient giveffektivt.transfer_recipient NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    unit_cost_external numeric,
    life_cost_external numeric,
    exchange_rate numeric,
    earmark giveffektivt.donation_recipient NOT NULL,
    unit_cost_conversion numeric
);


--
-- Name: charged_donations_by_transfer; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charged_donations_by_transfer AS
 SELECT cd.donor_id,
    cd.name,
    cd.email,
    cd.tin,
    cd.donation_id,
    round(((cd.amount * e.percentage) / (100)::numeric), 1) AS amount,
    cd.frequency,
    cd.cancelled,
    cd.method,
    cd.gateway,
    cd.tax_deductible,
    cd.charge_id,
    cd.charged_at,
    e.recipient AS earmark,
    t.id AS transfer_id
   FROM (((giveffektivt.charged_donations cd
     JOIN giveffektivt.earmark e ON ((cd.donation_id = e.donation_id)))
     LEFT JOIN giveffektivt.charge_transfer ct ON ((ct.charge_id = cd.charge_id)))
     LEFT JOIN giveffektivt.transfer t ON ((ct.transfer_id = t.id)))
  ORDER BY cd.charged_at DESC;


--
-- Name: charged_memberships; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charged_memberships AS
 SELECT donor_id,
    name,
    email,
    tin,
    donation_id,
    frequency,
    amount,
    earmarks,
    cancelled,
    method,
    gateway,
    donation_gateway_metadata,
    tax_deductible,
    charge_id,
    charge_short_id,
    status,
    charge_gateway_metadata,
    charged_at
   FROM giveffektivt.donations_overview d
  WHERE ((status = 'charged'::giveffektivt.charge_status) AND (EXISTS ( SELECT 1
           FROM giveffektivt.earmark e
          WHERE ((e.donation_id = d.donation_id) AND (e.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient)))));


--
-- Name: annual_email_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_email_report AS
 WITH const AS (
         SELECT date_trunc('year'::text, (now() - '9 mons'::interval)) AS year_from,
            date_trunc('year'::text, (now() + '3 mons'::interval)) AS year_to
        ), data_per_transfer AS (
         SELECT cdt.tin,
            cdt.email,
            cdt.tax_deductible,
            min(t.recipient) AS recipient,
            round(((sum(cdt.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS unit,
            sum(cdt.amount) AS amount,
            min(cdt.charged_at) AS first_donated
           FROM ((const
             CROSS JOIN giveffektivt.charged_donations_by_transfer cdt)
             LEFT JOIN giveffektivt.transfer t ON ((cdt.transfer_id = t.id)))
          WHERE (cdt.charged_at <@ tstzrange(const.year_from, const.year_to, '[)'::text))
          GROUP BY cdt.tin, cdt.email, cdt.tax_deductible, t.id
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
         SELECT DISTINCT ON (charged_memberships.tin) charged_memberships.tin,
            charged_memberships.email
           FROM (const
             CROSS JOIN giveffektivt.charged_memberships)
          WHERE (charged_memberships.charged_at <@ tstzrange(const.year_from, const.year_to, '[)'::text))
        ), active_gavebrev AS (
         SELECT p.tin
           FROM ((const
             CROSS JOIN giveffektivt.gavebrev g)
             JOIN giveffektivt.donor p ON ((g.donor_id = p.id)))
          WHERE ((g.started_at <= const.year_from) AND (g.stopped_at > const.year_from))
          GROUP BY p.tin
        ), email_to_tin_guess AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.tin
           FROM (((const
             CROSS JOIN giveffektivt.donor p)
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
 SELECT charged_donations.tin,
    round(sum(charged_donations.amount)) AS total,
    min(EXTRACT(year FROM charged_donations.charged_at)) AS year
   FROM (giveffektivt.annual_tax_report_const
     CROSS JOIN giveffektivt.charged_donations)
  WHERE ((charged_donations.charged_at <@ tstzrange(annual_tax_report_const.year_from, annual_tax_report_const.year_to, '[)'::text)) AND charged_donations.tax_deductible)
  GROUP BY charged_donations.tin;


--
-- Name: annual_tax_report_gavebrev_all_payments; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_all_payments AS
 WITH gavebrev_per_tin AS (
         SELECT p.tin,
            min(g.started_at) AS started_at,
            max(g.stopped_at) AS stopped_at
           FROM (giveffektivt.gavebrev g
             JOIN giveffektivt.donor p ON ((g.donor_id = p.id)))
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
            c.amount
           FROM (gavebrev_tin_years_until_now i_1
             JOIN giveffektivt.charged_donations c ON (((i_1.tin = c.tin) AND (i_1.year = EXTRACT(year FROM c.charged_at)))))
          WHERE c.tax_deductible
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
           FROM giveffektivt.donor p
          WHERE (p.id = a.donor_id)
         LIMIT 1) b);


--
-- Name: gavebrev_checkin; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.gavebrev_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    year numeric NOT NULL,
    income_inferred numeric,
    income_preliminary numeric,
    income_verified numeric,
    limit_normal_donation numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: annual_tax_report_gavebrev_checkins; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_checkins AS
 SELECT g.tin,
    y.y AS year,
    COALESCE(c.income_verified, c.income_preliminary, c.income_inferred, (0)::numeric) AS income,
        CASE
            WHEN (c.year IS NULL) THEN (0)::numeric
            ELSE c.limit_normal_donation
        END AS limit_normal_donation
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
    c.limit_normal_donation,
    round(sum(
        CASE
            WHEN (g.type = 'percentage'::giveffektivt.gavebrev_type) THEN ((GREATEST((0)::numeric, (c.income - COALESCE(g.minimal_income, (0)::numeric))) * g.amount) / (100)::numeric)
            WHEN (g.type = 'amount'::giveffektivt.gavebrev_type) THEN GREATEST((0)::numeric, (((((c.income > (0)::numeric) AND (c.income >= COALESCE(g.minimal_income, (0)::numeric))))::integer)::numeric * g.amount))
            ELSE NULL::numeric
        END)) AS expected_total
   FROM ((giveffektivt.annual_tax_report_gavebrev_checkins c
     JOIN giveffektivt.donor p ON ((p.tin = c.tin)))
     JOIN giveffektivt.gavebrev g ON (((g.donor_id = p.id) AND (EXTRACT(year FROM g.started_at) <= c.year))))
  GROUP BY c.tin, c.year, c.income, c.limit_normal_donation;


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
                     CROSS JOIN LATERAL ( SELECT LEAST(COALESCE(LEAST(m.value, get.limit_normal_donation), (0)::numeric), GREATEST((0)::numeric, (gap.actual_total - b.uncapped_gavebrev_total))) AS non_gavebrev_total) c)
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
             CROSS JOIN LATERAL ( SELECT LEAST(COALESCE(LEAST(m.value, get.limit_normal_donation), (0)::numeric), GREATEST((0)::numeric, (gap.actual_total - b.uncapped_gavebrev_total))) AS non_gavebrev_total) c)
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
         SELECT count(DISTINCT c.tin) AS count_members
           FROM (const const_1
             CROSS JOIN giveffektivt.charged_memberships c)
          WHERE (c.charged_at <@ tstzrange(const_1.year_from, const_1.year_to, '[)'::text))
        ), donated_a AS (
         SELECT COALESCE(sum(report.total), (0)::numeric) AS amount_donated_a
           FROM report
          WHERE (report.ll8a_or_gavebrev = 'A'::text)
        ), donated_l AS (
         SELECT COALESCE(sum(report.total), (0)::numeric) AS amount_donated_l
           FROM report
          WHERE (report.ll8a_or_gavebrev = 'L'::text)
        ), donated_total AS (
         SELECT COALESCE(sum(c.amount), (0)::numeric) AS amount_donated_total
           FROM (const const_1
             CROSS JOIN giveffektivt.charged_donations c)
          WHERE (c.charged_at <@ tstzrange(const_1.year_from, const_1.year_to, '[)'::text))
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
-- Name: skat; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.skat (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: annual_tax_report_pending_update; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_pending_update AS
 WITH last_reported AS (
         SELECT DISTINCT ON (skat.donor_cpr, skat.ll8a_or_gavebrev, skat.year) skat.id,
            skat.const,
            skat.ge_cvr,
            skat.donor_cpr,
            skat.year,
            skat.blank,
            skat.total,
            skat.ll8a_or_gavebrev,
            skat.ge_notes,
            skat.rettekode,
            skat.created_at,
            skat.updated_at
           FROM giveffektivt.skat
          ORDER BY skat.donor_cpr, skat.ll8a_or_gavebrev, skat.year, skat.created_at DESC
        )
 SELECT COALESCE(a.year, s.year) AS year,
    COALESCE(a.donor_cpr, s.donor_cpr) AS donor_cpr,
    COALESCE(a.ll8a_or_gavebrev, s.ll8a_or_gavebrev) AS ll8a_or_gavebrev,
    (a.total - s.total) AS difference
   FROM (giveffektivt.annual_tax_report a
     JOIN last_reported s ON (((s.donor_cpr = a.donor_cpr) AND (s.ll8a_or_gavebrev = a.ll8a_or_gavebrev) AND (s.year = a.year))))
  WHERE (s.total <> a.total)
  ORDER BY COALESCE(a.donor_cpr, s.donor_cpr);


--
-- Name: audit_log; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.audit_log (
    id bigint NOT NULL,
    table_name text NOT NULL,
    record_id text,
    operation text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text DEFAULT CURRENT_USER NOT NULL,
    txid bigint DEFAULT txid_current() NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: giveffektivt; Owner: -
--

ALTER TABLE giveffektivt.audit_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME giveffektivt.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: charged_or_created_donations; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charged_or_created_donations AS
 SELECT donor_id,
    name,
    email,
    tin,
    donation_id,
    frequency,
    amount,
    earmarks,
    cancelled,
    method,
    gateway,
    donation_gateway_metadata,
    tax_deductible,
    charge_id,
    charge_short_id,
    status,
    charge_gateway_metadata,
    charged_at
   FROM giveffektivt.donations_overview d
  WHERE ((status = ANY (ARRAY['charged'::giveffektivt.charge_status, 'created'::giveffektivt.charge_status])) AND (NOT (EXISTS ( SELECT 1
           FROM giveffektivt.earmark e
          WHERE ((e.donation_id = d.donation_id) AND (e.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient))))));


--
-- Name: charges_to_charge; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charges_to_charge AS
 SELECT c.id,
    c.short_id,
    dc.email,
    d.amount,
    d.gateway,
    d.method,
    c.gateway_metadata,
    d.gateway_metadata AS donation_gateway_metadata
   FROM ((giveffektivt.donor dc
     JOIN giveffektivt.donation d ON ((d.donor_id = dc.id)))
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (c.status = 'created'::giveffektivt.charge_status) AND (c.created_at <= now()));


--
-- Name: clearhaus_settlement; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.clearhaus_settlement (
    merchant_id numeric NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donor_impact_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_impact_report AS
 WITH data AS (
         SELECT cdt.email,
            min(t.recipient) AS transferred_to,
            min(t.created_at) AS transferred_at,
            sum(cdt.amount) AS amount,
            round(((sum(cdt.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS units,
            round(((sum(cdt.amount) / max(t.exchange_rate)) / max(t.life_cost_external)), 2) AS lives
           FROM (giveffektivt.charged_donations_by_transfer cdt
             LEFT JOIN giveffektivt.transfer t ON ((cdt.transfer_id = t.id)))
          GROUP BY cdt.email, t.id
        )
 SELECT email,
    COALESCE((transferred_to)::text, '== Fremtiden =='::text) AS transferred_to,
    COALESCE(to_char(transferred_at, 'YYYY-MM-DD'::text), '== Fremtiden =='::text) AS transferred_at,
    amount,
    units,
    lives
   FROM data
  ORDER BY email, transferred_at;


--
-- Name: ignored_renewals; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.ignored_renewals AS
 WITH membership_ids AS (
         SELECT DISTINCT earmark.donation_id AS id
           FROM giveffektivt.earmark
          WHERE (earmark.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient)
        ), last_charge AS (
         SELECT DISTINCT ON (p.id) p.id,
            p.name,
            p.email,
            d.amount,
            (m.id IS NOT NULL) AS is_membership,
            c.status,
            c.created_at
           FROM (((giveffektivt.donor p
             JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
             LEFT JOIN membership_ids m ON ((m.id = d.id)))
          WHERE (d.frequency <> 'once'::giveffektivt.donation_frequency)
          ORDER BY p.id, c.created_at DESC
        ), never_activated AS (
         SELECT DISTINCT ON (p.id) p.id,
            d.id AS donation_id,
            d.created_at
           FROM ((giveffektivt.donor p
             LEFT JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             LEFT JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
          WHERE ((c.id IS NULL) AND (d.frequency <> 'once'::giveffektivt.donation_frequency))
        ), last_payment_by_email AS (
         SELECT DISTINCT ON (unnamed_subquery.email, unnamed_subquery.is_membership) unnamed_subquery.email,
            unnamed_subquery.is_membership,
            unnamed_subquery.created_at
           FROM ( SELECT p.email,
                    (m.id IS NOT NULL) AS is_membership,
                    c.created_at
                   FROM (((giveffektivt.donor p
                     JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
                     JOIN giveffektivt.charge c ON ((d.id = c.donation_id)))
                     LEFT JOIN membership_ids m ON ((m.id = d.id)))
                  WHERE (c.status = 'charged'::giveffektivt.charge_status)) unnamed_subquery
          ORDER BY unnamed_subquery.email, unnamed_subquery.is_membership, unnamed_subquery.created_at DESC
        ), email_to_name AS (
         SELECT DISTINCT ON (p.email) p.name,
            p.email
           FROM giveffektivt.donor p
          WHERE (p.name IS NOT NULL)
        )
 SELECT COALESCE(lc.name, en.name) AS name,
    lc.email,
    lc.amount,
    lc.is_membership,
    na.donation_id,
    na.created_at AS expired_at,
    ((now())::date - (na.created_at)::date) AS days_ago
   FROM (((last_charge lc
     JOIN never_activated na ON ((lc.id = na.id)))
     LEFT JOIN last_payment_by_email lp ON (((lc.email = lp.email) AND (lp.is_membership = lp.is_membership))))
     LEFT JOIN email_to_name en ON ((lc.email = en.email)))
  WHERE ((lc.status = 'error'::giveffektivt.charge_status) AND ((lp.created_at IS NULL) OR (lp.created_at < lc.created_at)))
  ORDER BY na.created_at;


--
-- Name: crm_export; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.crm_export AS
 WITH emails AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.created_at AS registered_at
           FROM ((giveffektivt.donor p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE (c.status = 'charged'::giveffektivt.charge_status)
          ORDER BY p.email, p.created_at
        ), names AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.name
           FROM giveffektivt.donor p
          WHERE (p.name IS NOT NULL)
          ORDER BY p.email, p.created_at
        ), cvrs AS (
         SELECT DISTINCT ON (p.email) p.email,
            p.tin AS cvr
           FROM giveffektivt.donor p
          WHERE ((p.tin ~ '^\d{8}$'::text) AND ((p.country IS NULL) OR (p.country = 'Denmark'::text)))
          ORDER BY p.email, p.created_at
        ), ages AS (
         SELECT DISTINCT ON (p.email) p.email,
                CASE
                    WHEN ((p.tin ~ '^\d{6}-\d{4}$'::text) AND ((("substring"(p.tin, 3, 2))::integer >= 1) AND (("substring"(p.tin, 3, 2))::integer <= 12)) AND ((("substring"(p.tin, 1, 2))::integer >= 1) AND (("substring"(p.tin, 1, 2))::integer <= 31))) THEN date_part('year'::text, age((to_date((((((
                    CASE
                        WHEN ((("substring"(p.tin, 8, 4))::integer >= 0) AND (("substring"(p.tin, 8, 4))::integer <= 3999)) THEN
                        CASE
                            WHEN ((("substring"(p.tin, 5, 2))::integer >= 0) AND (("substring"(p.tin, 5, 2))::integer <= 36)) THEN '20'::text
                            ELSE '19'::text
                        END
                        WHEN ((("substring"(p.tin, 8, 4))::integer >= 4000) AND (("substring"(p.tin, 8, 4))::integer <= 4999)) THEN
                        CASE
                            WHEN ((("substring"(p.tin, 5, 2))::integer >= 0) AND (("substring"(p.tin, 5, 2))::integer <= 36)) THEN '20'::text
                            ELSE '19'::text
                        END
                        WHEN ((("substring"(p.tin, 8, 4))::integer >= 5000) AND (("substring"(p.tin, 8, 4))::integer <= 9999)) THEN
                        CASE
                            WHEN ((("substring"(p.tin, 5, 2))::integer >= 0) AND (("substring"(p.tin, 5, 2))::integer <= 57)) THEN '20'::text
                            ELSE '19'::text
                        END
                        ELSE NULL::text
                    END || "substring"(p.tin, 5, 2)) || '-'::text) || "substring"(p.tin, 3, 2)) || '-'::text) || "substring"(p.tin, 1, 2)), 'yyyy-mm-dd'::text))::timestamp with time zone))
                    ELSE NULL::double precision
                END AS age
           FROM giveffektivt.donor p
          WHERE (p.tin IS NOT NULL)
          ORDER BY p.email, p.created_at
        ), members AS (
         SELECT DISTINCT ON (charged_memberships.email) charged_memberships.email,
            charged_memberships.name
           FROM giveffektivt.charged_memberships
          WHERE (charged_memberships.charged_at >= (now() - '1 year'::interval))
        ), donations AS (
         SELECT charged_donations.email,
            sum(charged_donations.amount) AS total_donated,
            count(1) AS donations_count
           FROM giveffektivt.charged_donations
          GROUP BY charged_donations.email
        ), latest_donations AS (
         SELECT DISTINCT ON (charged_donations.email) charged_donations.email,
            charged_donations.amount AS last_donated_amount,
            charged_donations.method AS last_donated_method,
            charged_donations.frequency AS last_donated_frequency,
            charged_donations.tax_deductible AS last_donation_tax_deductible,
            charged_donations.cancelled AS last_donation_cancelled,
            charged_donations.charged_at AS last_donated_at
           FROM giveffektivt.charged_donations
          ORDER BY charged_donations.email, charged_donations.charged_at DESC
        ), first_donations AS (
         SELECT d.email,
            min(d.charged_at) FILTER (WHERE (e.recipient = 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient)) AS first_membership_at,
            min(d.charged_at) FILTER (WHERE (e.recipient <> 'Giv Effektivts medlemskab'::giveffektivt.donation_recipient)) AS first_donation_at,
            min(d.charged_at) FILTER (WHERE (d.frequency = 'monthly'::giveffektivt.donation_frequency)) AS first_monthly_donation_at
           FROM (giveffektivt.donations_overview d
             JOIN giveffektivt.earmark e ON ((d.donation_id = e.donation_id)))
          WHERE (d.status = 'charged'::giveffektivt.charge_status)
          GROUP BY d.email
        ), has_gavebrev AS (
         SELECT p.email
           FROM (giveffektivt.gavebrev g
             JOIN giveffektivt.donor p ON ((g.donor_id = p.id)))
          WHERE ((g.started_at <= date_trunc('year'::text, now())) AND (g.stopped_at > date_trunc('year'::text, now())))
          GROUP BY p.email
        ), impact AS (
         SELECT donor_impact_report.email,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Helen Keller International'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS vitamin_a_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Helen Keller International'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS vitamin_a_units,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'New Incentives'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS vaccinations_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'New Incentives'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS vaccinations_units,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Against Malaria Foundation'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS bednets_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Against Malaria Foundation'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS bednets_units,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Malaria Consortium'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS malaria_medicine_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Malaria Consortium'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS malaria_medicine_units,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Give Directly'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS direct_transfer_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'Give Directly'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS direct_transfer_units,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'SCI Foundation'::text) THEN donor_impact_report.amount
                    ELSE (0)::numeric
                END) AS deworming_amount,
            sum(
                CASE
                    WHEN (donor_impact_report.transferred_to = 'SCI Foundation'::text) THEN donor_impact_report.units
                    ELSE (0)::numeric
                END) AS deworming_units,
            sum(donor_impact_report.lives) AS lives
           FROM giveffektivt.donor_impact_report
          GROUP BY donor_impact_report.email
        ), expired_memberships AS (
         SELECT DISTINCT ON (ignored_renewals.email) ignored_renewals.email,
            ignored_renewals.donation_id AS expired_membership_id,
            ignored_renewals.expired_at AS expired_membership_at
           FROM giveffektivt.ignored_renewals
          WHERE ignored_renewals.is_membership
          ORDER BY ignored_renewals.email, ignored_renewals.expired_at DESC
        ), expired_donations AS (
         SELECT DISTINCT ON (ignored_renewals.email) ignored_renewals.email,
            ignored_renewals.donation_id AS expired_donation_id,
            ignored_renewals.expired_at AS expired_donation_at
           FROM giveffektivt.ignored_renewals
          WHERE (NOT ignored_renewals.is_membership)
          ORDER BY ignored_renewals.email, ignored_renewals.expired_at DESC
        ), renewals AS (
         SELECT COALESCE(m.email, d.email) AS email,
            m.expired_membership_id,
            m.expired_membership_at,
            d.expired_donation_id,
            d.expired_donation_at
           FROM (expired_memberships m
             FULL JOIN expired_donations d USING (email))
        ), data AS (
         SELECT e.email,
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
            f.first_membership_at,
            f.first_donation_at,
            f.first_monthly_donation_at,
            (m.email IS NOT NULL) AS is_member,
            (g.email IS NOT NULL) AS has_gavebrev,
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
            r.expired_membership_at
           FROM ((((((((((emails e
             LEFT JOIN names n ON ((n.email = e.email)))
             LEFT JOIN ages a ON ((a.email = e.email)))
             LEFT JOIN donations d ON ((d.email = e.email)))
             LEFT JOIN members m ON ((m.email = e.email)))
             LEFT JOIN latest_donations l ON ((l.email = e.email)))
             LEFT JOIN first_donations f ON ((f.email = e.email)))
             LEFT JOIN has_gavebrev g ON ((g.email = e.email)))
             LEFT JOIN impact i ON ((i.email = e.email)))
             LEFT JOIN renewals r ON ((r.email = e.email)))
             LEFT JOIN cvrs c ON ((c.email = e.email)))
        )
 SELECT email,
    registered_at,
    name,
    cvr,
    age,
    total_donated,
    donations_count,
    last_donated_amount,
    last_donated_method,
    last_donated_frequency,
    last_donation_tax_deductible,
    last_donation_cancelled,
    last_donated_at,
    first_membership_at,
    first_donation_at,
    first_monthly_donation_at,
    is_member,
    has_gavebrev,
    vitamin_a_amount,
    vitamin_a_units,
    vaccinations_amount,
    vaccinations_units,
    bednets_amount,
    bednets_units,
    malaria_medicine_amount,
    malaria_medicine_units,
    direct_transfer_amount,
    direct_transfer_units,
    deworming_amount,
    deworming_units,
    lives,
    expired_donation_id,
    expired_donation_at,
    expired_membership_id,
    expired_membership_at
   FROM data
  WHERE ((email ~~ '%@%'::text) AND ((total_donated > (0)::numeric) OR is_member OR has_gavebrev));


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
 WITH latest_charge AS (
         SELECT DISTINCT ON (charge.donation_id) charge.donation_id,
            charge.id,
            charge.status
           FROM giveffektivt.charge
          ORDER BY charge.donation_id, charge.created_at DESC
        ), single_recipient AS (
         SELECT earmark.donation_id,
                CASE
                    WHEN (count(*) = 1) THEN max(earmark.recipient)
                    ELSE NULL::giveffektivt.donation_recipient
                END AS recipient
           FROM giveffektivt.earmark
          GROUP BY earmark.donation_id
        )
 SELECT d.id,
    p.email,
    d.amount,
    sr.recipient,
    d.frequency,
    d.tax_deductible
   FROM (((giveffektivt.donor p
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN latest_charge c ON ((c.donation_id = d.id)))
     LEFT JOIN single_recipient sr ON ((sr.donation_id = d.id)))
  WHERE ((d.emailed = 'no'::giveffektivt.emailed_status) AND ((c.status = 'charged'::giveffektivt.charge_status) OR ((d.method = 'MobilePay'::giveffektivt.payment_method) AND (d.frequency <> 'once'::giveffektivt.donation_frequency) AND (c.status <> 'error'::giveffektivt.charge_status))));


--
-- Name: failed_recurring_donations; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.failed_recurring_donations AS
 WITH paid_before AS (
         SELECT DISTINCT ON (d.id) d.id
           FROM ((giveffektivt.donation d
             JOIN giveffektivt.donor p ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (d.frequency = ANY (ARRAY['monthly'::giveffektivt.donation_frequency, 'yearly'::giveffektivt.donation_frequency])) AND (c.status = 'charged'::giveffektivt.charge_status))
          ORDER BY d.id
        ), single_recipient AS (
         SELECT earmark.donation_id,
                CASE
                    WHEN (count(*) = 1) THEN max(earmark.recipient)
                    ELSE NULL::giveffektivt.donation_recipient
                END AS recipient
           FROM giveffektivt.earmark
          GROUP BY earmark.donation_id
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
            sr.recipient,
            d.frequency,
            d.tax_deductible,
            d.fundraiser_id,
            d.message,
            c.status
           FROM (((giveffektivt.donation d
             JOIN giveffektivt.donor p ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
             LEFT JOIN single_recipient sr ON ((sr.donation_id = d.id)))
          WHERE (d.id IN ( SELECT paid_before.id
                   FROM paid_before))
          ORDER BY d.id, c.created_at DESC) s
  WHERE (status = 'error'::giveffektivt.charge_status)
  ORDER BY failed_at DESC;


--
-- Name: fundraiser; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.fundraiser (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    title text NOT NULL,
    key uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    has_match boolean DEFAULT false NOT NULL,
    match_currency text
);


--
-- Name: fundraiser_activity_checkin; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.fundraiser_activity_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fundraiser_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


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
-- Name: gwwc_money_moved; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.gwwc_money_moved AS
 SELECT to_char(cdt.charged_at, 'YYYY-MM'::text) AS month,
    (t.recipient ||
        CASE
            WHEN (min(t.created_at) < '2024-11-29 00:00:00+00'::timestamp with time zone) THEN ' (via GiveWell)'::text
            ELSE ''::text
        END) AS recipient,
    'GHD'::text AS cause,
    sum(cdt.amount) AS amount
   FROM (giveffektivt.charged_donations_by_transfer cdt
     LEFT JOIN giveffektivt.transfer t ON ((cdt.transfer_id = t.id)))
  GROUP BY (to_char(cdt.charged_at, 'YYYY-MM'::text)), t.recipient
  ORDER BY (to_char(cdt.charged_at, 'YYYY-MM'::text));


--
-- Name: transfer_pending; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transfer_pending AS
 SELECT charged_at,
    amount,
    earmark
   FROM giveffektivt.charged_donations_by_transfer cdt
  WHERE ((earmark <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (transfer_id IS NULL))
  ORDER BY charged_at;


--
-- Name: kpi; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.kpi AS
 WITH dkk_total AS (
         SELECT round(sum(charged_donations.amount)) AS dkk_total
           FROM giveffektivt.charged_donations
        ), dkk_total_ops AS (
         SELECT round(sum(cd.amount)) AS dkk_total_ops
           FROM (giveffektivt.charged_donations cd
             JOIN giveffektivt.earmark e ON ((e.donation_id = cd.donation_id)))
          WHERE (e.recipient = 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient)
        ), dkk_pending_transfer AS (
         SELECT COALESCE(round(sum(transfer_pending.amount)), (0)::numeric) AS dkk_pending_transfer
           FROM giveffektivt.transfer_pending
        ), dkk_last_30_days AS (
         SELECT round(sum(charged_donations.amount)) AS dkk_last_30_days
           FROM giveffektivt.charged_donations
          WHERE (charged_donations.charged_at >= (date_trunc('day'::text, now()) - '30 days'::interval))
        ), dkk_recurring_next_year AS (
         SELECT ((12)::numeric * sum(c1.amount)) AS dkk_recurring_next_year
           FROM ( SELECT DISTINCT ON (charged_or_created_donations.donation_id) charged_or_created_donations.amount
                   FROM giveffektivt.charged_or_created_donations
                  WHERE ((charged_or_created_donations.frequency = 'monthly'::giveffektivt.donation_frequency) AND (NOT charged_or_created_donations.cancelled) AND (charged_or_created_donations.charged_at >= (date_trunc('month'::text, now()) - '1 mon'::interval)))) c1
        ), members_confirmed AS (
         SELECT (count(DISTINCT charged_memberships.tin))::numeric AS members_confirmed
           FROM giveffektivt.charged_memberships
          WHERE (charged_memberships.charged_at >= date_trunc('year'::text, now()))
        ), members_pending_renewal AS (
         SELECT (count(*))::numeric AS members_pending_renewal
           FROM ( SELECT DISTINCT ON (charged_memberships.tin) charged_memberships.tin,
                    charged_memberships.charged_at
                   FROM giveffektivt.charged_memberships
                  WHERE (NOT charged_memberships.cancelled)
                  ORDER BY charged_memberships.tin, charged_memberships.charged_at DESC) a
          WHERE (a.charged_at < date_trunc('year'::text, now()))
        ), monthly_donors AS (
         SELECT (count(DISTINCT charged_or_created_donations.donation_id))::numeric AS monthly_donors
           FROM giveffektivt.charged_or_created_donations
          WHERE ((charged_or_created_donations.frequency = 'monthly'::giveffektivt.donation_frequency) AND (NOT charged_or_created_donations.cancelled) AND (charged_or_created_donations.charged_at >= (date_trunc('month'::text, now()) - '1 mon'::interval)))
        ), number_of_donors AS (
         SELECT sum(unnamed_subquery.donors) AS number_of_donors
           FROM ( SELECT charged_donations.email,
                        CASE
                            WHEN (count(DISTINCT charged_donations.tin) = 0) THEN (1)::bigint
                            ELSE count(DISTINCT charged_donations.tin)
                        END AS donors
                   FROM giveffektivt.charged_donations
                  GROUP BY charged_donations.email) unnamed_subquery
        ), number_of_gavebrev AS (
         SELECT (count(1))::numeric AS number_of_gavebrev
           FROM giveffektivt.gavebrev
          WHERE ((gavebrev.status = 'signed'::giveffektivt.gavebrev_status) AND (gavebrev.stopped_at >= now()))
        ), is_max_tax_deduction_known AS (
         SELECT ((max(max_tax_deduction.year) = EXTRACT(year FROM now())))::integer AS is_max_tax_deduction_known
           FROM giveffektivt.max_tax_deduction
        ), oldest_stopped_donation_age AS (
         SELECT floor(EXTRACT(epoch FROM (now() - min(unnamed_subquery.max_charged_at)))) AS oldest_stopped_donation_age
           FROM ( SELECT max(donations_overview.charged_at) AS max_charged_at
                   FROM giveffektivt.donations_overview
                  WHERE (donations_overview.status = 'charged'::giveffektivt.charge_status)
                  GROUP BY donations_overview.email) unnamed_subquery
        ), missing_gavebrev_income_proof AS (
         SELECT (count(1))::numeric AS missing_gavebrev_income_proof
           FROM giveffektivt.gavebrev_checkin
          WHERE ((gavebrev_checkin.year = (((EXTRACT(year FROM CURRENT_DATE))::integer - 1))::numeric) AND (gavebrev_checkin.income_verified IS NULL) AND (CURRENT_DATE > make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 3, 15)))
        ), pending_skat_update AS (
         SELECT (count(1))::numeric AS pending_skat_update
           FROM giveffektivt.annual_tax_report_pending_update
        )
 SELECT dkk_total.dkk_total,
    dkk_total_ops.dkk_total_ops,
    dkk_pending_transfer.dkk_pending_transfer,
    dkk_last_30_days.dkk_last_30_days,
    dkk_recurring_next_year.dkk_recurring_next_year,
    members_confirmed.members_confirmed,
    members_pending_renewal.members_pending_renewal,
    monthly_donors.monthly_donors,
    number_of_donors.number_of_donors,
    number_of_gavebrev.number_of_gavebrev,
    is_max_tax_deduction_known.is_max_tax_deduction_known,
    oldest_stopped_donation_age.oldest_stopped_donation_age,
    missing_gavebrev_income_proof.missing_gavebrev_income_proof,
    pending_skat_update.pending_skat_update
   FROM dkk_total,
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
    pending_skat_update;


--
-- Name: pending_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.pending_distribution AS
 SELECT earmark,
    round(sum(amount)) AS dkk_total,
    (count(*))::numeric AS payments_total
   FROM giveffektivt.charged_donations_by_transfer cdt
  WHERE ((earmark <> ALL (ARRAY['Giv Effektivts medlemskab'::giveffektivt.donation_recipient, 'Giv Effektivts arbejde og vækst'::giveffektivt.donation_recipient])) AND (transfer_id IS NULL))
  GROUP BY earmark
  ORDER BY (round(sum(amount))) DESC;


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
-- Name: skat_gaveskema; Type: TABLE; Schema: giveffektivt; Owner: -
--

CREATE TABLE giveffektivt.skat_gaveskema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year numeric NOT NULL,
    count_donors_donated_min_200_kr numeric NOT NULL,
    count_members numeric NOT NULL,
    amount_donated_a numeric NOT NULL,
    amount_donated_l numeric NOT NULL,
    amount_donated_total numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: time_distribution_daily; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.time_distribution_daily AS
 WITH buckets AS (
         SELECT bucket_table.frequency,
            bucket_table.start,
            bucket_table.stop,
            bucket_table.bucket
           FROM ( VALUES ('once'::giveffektivt.donation_frequency,0,1000,'small'::text), ('once'::giveffektivt.donation_frequency,1000,6000,'medium'::text), ('once'::giveffektivt.donation_frequency,6000,24000,'large'::text), ('once'::giveffektivt.donation_frequency,24000,'999999999999'::bigint,'major'::text), ('monthly'::giveffektivt.donation_frequency,0,200,'small'::text), ('monthly'::giveffektivt.donation_frequency,200,500,'medium'::text), ('monthly'::giveffektivt.donation_frequency,500,2000,'large'::text), ('monthly'::giveffektivt.donation_frequency,2000,'999999999999'::bigint,'major'::text)) bucket_table(frequency, start, stop, bucket)
        ), monthly_donations_charged_exactly_once AS (
         SELECT unnamed_subquery.donation_id
           FROM ( SELECT charged_donations.donation_id,
                    bool_or(charged_donations.cancelled) AS cancelled,
                    count(charged_donations.charge_id) AS number_of_donations,
                    max(charged_donations.charged_at) AS last_donated_at
                   FROM giveffektivt.charged_donations
                  WHERE (charged_donations.frequency = 'monthly'::giveffektivt.donation_frequency)
                  GROUP BY charged_donations.donation_id) unnamed_subquery
          WHERE ((unnamed_subquery.number_of_donations = 1) AND (unnamed_subquery.cancelled OR (unnamed_subquery.last_donated_at < (now() - '40 days'::interval))))
        ), successful_charges AS (
         SELECT a_1.period,
            a_1.month,
            a_1.charged_at,
            a_1.email,
            a_1.donation_id,
            a_1.cancelled,
            a_1.amount,
            a_1.frequency,
            b_1.bucket
           FROM (( SELECT date_trunc('day'::text, cd.charged_at) AS period,
                    date_trunc('day'::text, cd.charged_at) AS month,
                    cd.charged_at,
                    cd.email,
                    cd.donation_id,
                    cd.cancelled,
                    cd.amount,
                        CASE
                            WHEN (EXISTS ( SELECT 1
                               FROM monthly_donations_charged_exactly_once m
                              WHERE (cd.donation_id = m.donation_id))) THEN 'once'::giveffektivt.donation_frequency
                            ELSE cd.frequency
                        END AS frequency
                   FROM giveffektivt.charged_donations cd) a_1
             JOIN buckets b_1 ON (((a_1.frequency = b_1.frequency) AND (a_1.amount > (b_1.start)::numeric) AND (a_1.amount <= (b_1.stop)::numeric))))
        ), first_time_by_email AS (
         SELECT DISTINCT ON (charged_donations.email) charged_donations.email,
            charged_donations.amount,
            date_trunc('day'::text, charged_donations.charged_at) AS period,
            charged_donations.charged_at
           FROM giveffektivt.charged_donations
          ORDER BY charged_donations.email, charged_donations.charged_at
        ), first_time_donations AS (
         SELECT first_time_by_email.period,
            sum(first_time_by_email.amount) AS amount,
            count(1) AS payments
           FROM first_time_by_email
          GROUP BY first_time_by_email.period
        ), stopped_monthly_donations AS (
         SELECT a_1.email,
            date_trunc('day'::text, (a_1.last_donated_at + '1 mon'::interval)) AS stop_period,
            (- sum(a_1.amount)) AS amount,
            a_1.frequency
           FROM ( SELECT DISTINCT ON (s.donation_id) s.email,
                    s.charged_at AS last_donated_at,
                    s.amount,
                    s.frequency,
                    s.cancelled
                   FROM successful_charges s
                  WHERE (s.frequency = 'monthly'::giveffektivt.donation_frequency)
                  ORDER BY s.donation_id, s.charged_at DESC) a_1
          WHERE (((a_1.last_donated_at + '40 days'::interval) < now()) OR a_1.cancelled)
          GROUP BY a_1.email, (date_trunc('day'::text, (a_1.last_donated_at + '1 mon'::interval))), a_1.frequency
        ), started_donations AS (
         SELECT unnamed_subquery.email,
            unnamed_subquery.period AS start_period,
            sum(unnamed_subquery.amount) AS amount,
            unnamed_subquery.frequency
           FROM ( SELECT DISTINCT ON (successful_charges.donation_id) successful_charges.email,
                    successful_charges.period,
                    successful_charges.amount,
                    successful_charges.frequency
                   FROM successful_charges
                  ORDER BY successful_charges.donation_id, successful_charges.charged_at) unnamed_subquery
          GROUP BY unnamed_subquery.email, unnamed_subquery.period, unnamed_subquery.frequency
        ), changed_donations AS (
         SELECT a_1.period,
            a_1.frequency,
            a_1.amount,
            b_1.bucket
           FROM (( SELECT COALESCE(a_2.start_period, b_2.stop_period) AS period,
                    COALESCE(a_2.frequency, b_2.frequency) AS frequency,
                    (sum(COALESCE(a_2.amount, (0)::numeric)) + sum(COALESCE(b_2.amount, (0)::numeric))) AS amount
                   FROM (started_donations a_2
                     FULL JOIN stopped_monthly_donations b_2 ON (((a_2.email = b_2.email) AND (a_2.frequency = b_2.frequency) AND (date_trunc('day'::text, a_2.start_period) = date_trunc('day'::text, b_2.stop_period)))))
                  GROUP BY COALESCE(a_2.email, b_2.email), COALESCE(a_2.frequency, b_2.frequency), COALESCE(a_2.start_period, b_2.stop_period)) a_1
             JOIN buckets b_1 ON (((a_1.frequency = b_1.frequency) AND (abs(a_1.amount) > (b_1.start)::numeric) AND (abs(a_1.amount) <= (b_1.stop)::numeric))))
        ), value_added_lost AS (
         SELECT changed_donations.period,
            changed_donations.frequency,
            changed_donations.bucket,
            sum(((changed_donations.amount * (
                CASE
                    WHEN (changed_donations.amount > (0)::numeric) THEN 1
                    ELSE 0
                END)::numeric) * (
                CASE
                    WHEN (changed_donations.frequency = 'monthly'::giveffektivt.donation_frequency) THEN 18
                    ELSE 1
                END)::numeric)) AS value_added,
            sum(((changed_donations.amount * (
                CASE
                    WHEN (changed_donations.amount < (0)::numeric) THEN 1
                    ELSE 0
                END)::numeric) * (18)::numeric)) AS value_lost
           FROM changed_donations
          GROUP BY changed_donations.period, changed_donations.frequency, changed_donations.bucket
        ), payments AS (
         SELECT successful_charges.period,
            sum(successful_charges.amount) AS amount,
            count(DISTINCT successful_charges.donation_id) AS payments,
            successful_charges.frequency,
            successful_charges.bucket
           FROM successful_charges
          GROUP BY successful_charges.period, successful_charges.frequency, successful_charges.bucket
        ), payments_new_donors AS (
         SELECT s.period,
            sum(s.amount) AS amount,
            count(DISTINCT s.donation_id) AS payments,
            s.frequency,
            s.bucket
           FROM (successful_charges s
             JOIN first_time_by_email f ON (((s.email = f.email) AND (s.period = f.period) AND (s.amount = f.amount))))
          GROUP BY s.period, s.frequency, s.bucket
        )
 SELECT ((((to_char(COALESCE(a.period, b.period), 'yyyy'::text) || '-'::text) || to_char(COALESCE(a.period, b.period), 'MM'::text)) || '-'::text) || to_char(COALESCE(a.period, b.period), 'dd'::text)) AS date,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'small'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_small,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'medium'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'large'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_large,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'major'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_major,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'small'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'medium'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'large'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'major'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'small'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_small,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'medium'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'large'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_large,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'major'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_major,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'small'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'medium'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'large'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'major'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_major,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'small'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_small,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'medium'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_medium,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'large'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_large,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'major'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_major,
    (COALESCE(sum(b.value_added), (0)::numeric) + COALESCE(sum(b.value_lost), (0)::numeric)) AS value_total,
    COALESCE(sum(
        CASE
            WHEN (a.frequency = 'monthly'::giveffektivt.donation_frequency) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS monthly_donors,
    COALESCE(sum(a.payments), (0)::numeric) AS payments_total,
    COALESCE(sum(a.amount), (0)::numeric) AS dkk_total,
    COALESCE(sum(b.value_added), (0)::numeric) AS value_added,
    COALESCE(sum(
        CASE
            WHEN (b.frequency = 'once'::giveffektivt.donation_frequency) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once,
    COALESCE(sum(
        CASE
            WHEN (b.frequency = 'monthly'::giveffektivt.donation_frequency) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly,
    COALESCE(sum(b.value_lost), (0)::numeric) AS value_lost,
    COALESCE(max(c.amount), (0)::numeric) AS amount_new,
    (COALESCE(max(c.payments), (0)::bigint))::numeric AS payments_new
   FROM (((payments a
     FULL JOIN value_added_lost b ON (((a.period = b.period) AND (a.frequency = b.frequency) AND (a.bucket = b.bucket))))
     FULL JOIN first_time_donations c ON ((a.period = c.period)))
     FULL JOIN payments_new_donors d ON (((a.period = d.period) AND (a.frequency = d.frequency) AND (a.bucket = d.bucket))))
  GROUP BY COALESCE(a.period, b.period)
  ORDER BY COALESCE(a.period, b.period) DESC;


--
-- Name: time_distribution_monthly; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.time_distribution_monthly AS
 WITH buckets AS (
         SELECT bucket_table.frequency,
            bucket_table.start,
            bucket_table.stop,
            bucket_table.bucket
           FROM ( VALUES ('once'::giveffektivt.donation_frequency,0,1000,'small'::text), ('once'::giveffektivt.donation_frequency,1000,6000,'medium'::text), ('once'::giveffektivt.donation_frequency,6000,24000,'large'::text), ('once'::giveffektivt.donation_frequency,24000,'999999999999'::bigint,'major'::text), ('monthly'::giveffektivt.donation_frequency,0,200,'small'::text), ('monthly'::giveffektivt.donation_frequency,200,500,'medium'::text), ('monthly'::giveffektivt.donation_frequency,500,2000,'large'::text), ('monthly'::giveffektivt.donation_frequency,2000,'999999999999'::bigint,'major'::text)) bucket_table(frequency, start, stop, bucket)
        ), monthly_donations_charged_exactly_once AS (
         SELECT unnamed_subquery.donation_id
           FROM ( SELECT charged_donations.donation_id,
                    bool_or(charged_donations.cancelled) AS cancelled,
                    count(charged_donations.charge_id) AS number_of_donations,
                    max(charged_donations.charged_at) AS last_donated_at
                   FROM giveffektivt.charged_donations
                  WHERE (charged_donations.frequency = 'monthly'::giveffektivt.donation_frequency)
                  GROUP BY charged_donations.donation_id) unnamed_subquery
          WHERE ((unnamed_subquery.number_of_donations = 1) AND (unnamed_subquery.cancelled OR (unnamed_subquery.last_donated_at < (now() - '40 days'::interval))))
        ), successful_charges AS (
         SELECT a_1.period,
            a_1.month,
            a_1.charged_at,
            a_1.email,
            a_1.donation_id,
            a_1.cancelled,
            a_1.amount,
            a_1.frequency,
            b_1.bucket
           FROM (( SELECT date_trunc('month'::text, cd.charged_at) AS period,
                    date_trunc('month'::text, cd.charged_at) AS month,
                    cd.charged_at,
                    cd.email,
                    cd.donation_id,
                    cd.cancelled,
                    cd.amount,
                        CASE
                            WHEN (EXISTS ( SELECT 1
                               FROM monthly_donations_charged_exactly_once m
                              WHERE (cd.donation_id = m.donation_id))) THEN 'once'::giveffektivt.donation_frequency
                            ELSE cd.frequency
                        END AS frequency
                   FROM giveffektivt.charged_donations cd) a_1
             JOIN buckets b_1 ON (((a_1.frequency = b_1.frequency) AND (a_1.amount > (b_1.start)::numeric) AND (a_1.amount <= (b_1.stop)::numeric))))
        ), first_time_by_email AS (
         SELECT DISTINCT ON (charged_donations.email) charged_donations.email,
            charged_donations.amount,
            date_trunc('month'::text, charged_donations.charged_at) AS period,
            charged_donations.charged_at
           FROM giveffektivt.charged_donations
          ORDER BY charged_donations.email, charged_donations.charged_at
        ), first_time_donations AS (
         SELECT first_time_by_email.period,
            sum(first_time_by_email.amount) AS amount,
            count(1) AS payments
           FROM first_time_by_email
          GROUP BY first_time_by_email.period
        ), stopped_monthly_donations AS (
         SELECT a_1.email,
            date_trunc('month'::text, (a_1.last_donated_at + '1 mon'::interval)) AS stop_period,
            (- sum(a_1.amount)) AS amount,
            a_1.frequency
           FROM ( SELECT DISTINCT ON (s.donation_id) s.email,
                    s.charged_at AS last_donated_at,
                    s.amount,
                    s.frequency,
                    s.cancelled
                   FROM successful_charges s
                  WHERE (s.frequency = 'monthly'::giveffektivt.donation_frequency)
                  ORDER BY s.donation_id, s.charged_at DESC) a_1
          WHERE (((a_1.last_donated_at + '40 days'::interval) < now()) OR a_1.cancelled)
          GROUP BY a_1.email, (date_trunc('month'::text, (a_1.last_donated_at + '1 mon'::interval))), a_1.frequency
        ), started_donations AS (
         SELECT unnamed_subquery.email,
            unnamed_subquery.period AS start_period,
            sum(unnamed_subquery.amount) AS amount,
            unnamed_subquery.frequency
           FROM ( SELECT DISTINCT ON (successful_charges.donation_id) successful_charges.email,
                    successful_charges.period,
                    successful_charges.amount,
                    successful_charges.frequency
                   FROM successful_charges
                  ORDER BY successful_charges.donation_id, successful_charges.charged_at) unnamed_subquery
          GROUP BY unnamed_subquery.email, unnamed_subquery.period, unnamed_subquery.frequency
        ), changed_donations AS (
         SELECT a_1.period,
            a_1.frequency,
            a_1.amount,
            b_1.bucket
           FROM (( SELECT COALESCE(a_2.start_period, b_2.stop_period) AS period,
                    COALESCE(a_2.frequency, b_2.frequency) AS frequency,
                    (sum(COALESCE(a_2.amount, (0)::numeric)) + sum(COALESCE(b_2.amount, (0)::numeric))) AS amount
                   FROM (started_donations a_2
                     FULL JOIN stopped_monthly_donations b_2 ON (((a_2.email = b_2.email) AND (a_2.frequency = b_2.frequency) AND (date_trunc('month'::text, a_2.start_period) = date_trunc('month'::text, b_2.stop_period)))))
                  GROUP BY COALESCE(a_2.email, b_2.email), COALESCE(a_2.frequency, b_2.frequency), COALESCE(a_2.start_period, b_2.stop_period)) a_1
             JOIN buckets b_1 ON (((a_1.frequency = b_1.frequency) AND (abs(a_1.amount) > (b_1.start)::numeric) AND (abs(a_1.amount) <= (b_1.stop)::numeric))))
        ), value_added_lost AS (
         SELECT changed_donations.period,
            changed_donations.frequency,
            changed_donations.bucket,
            sum(((changed_donations.amount * (
                CASE
                    WHEN (changed_donations.amount > (0)::numeric) THEN 1
                    ELSE 0
                END)::numeric) * (
                CASE
                    WHEN (changed_donations.frequency = 'monthly'::giveffektivt.donation_frequency) THEN 18
                    ELSE 1
                END)::numeric)) AS value_added,
            sum(((changed_donations.amount * (
                CASE
                    WHEN (changed_donations.amount < (0)::numeric) THEN 1
                    ELSE 0
                END)::numeric) * (18)::numeric)) AS value_lost
           FROM changed_donations
          GROUP BY changed_donations.period, changed_donations.frequency, changed_donations.bucket
        ), payments AS (
         SELECT successful_charges.period,
            sum(successful_charges.amount) AS amount,
            count(DISTINCT successful_charges.donation_id) AS payments,
            successful_charges.frequency,
            successful_charges.bucket
           FROM successful_charges
          GROUP BY successful_charges.period, successful_charges.frequency, successful_charges.bucket
        ), payments_new_donors AS (
         SELECT s.period,
            sum(s.amount) AS amount,
            count(DISTINCT s.donation_id) AS payments,
            s.frequency,
            s.bucket
           FROM (successful_charges s
             JOIN first_time_by_email f ON (((s.email = f.email) AND (s.period = f.period) AND (s.amount = f.amount))))
          GROUP BY s.period, s.frequency, s.bucket
        )
 SELECT ((((to_char(COALESCE(a.period, b.period), 'yyyy'::text) || '-'::text) || to_char(COALESCE(a.period, b.period), 'MM'::text)) || '-'::text) || to_char(COALESCE(a.period, b.period), 'dd'::text)) AS date,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_once_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS amount_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'once'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_once_major,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'small'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'medium'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'large'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((a.frequency = 'monthly'::giveffektivt.donation_frequency) AND (a.bucket = 'major'::text)) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'small'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_small,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'medium'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'large'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_large,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'once'::giveffektivt.donation_frequency) AND (d.bucket = 'major'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_once_major,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'small'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'medium'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'large'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (d.bucket = 'major'::text)) THEN d.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS payments_new_monthly_major,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'small'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_small,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'medium'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_medium,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'large'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_large,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'once'::giveffektivt.donation_frequency) AND (b.bucket = 'major'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once_major,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'small'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_small,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'medium'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_medium,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'large'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_large,
    COALESCE(sum(
        CASE
            WHEN ((b.frequency = 'monthly'::giveffektivt.donation_frequency) AND (b.bucket = 'major'::text)) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly_major,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'small'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_small,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'medium'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_medium,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'large'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_large,
    COALESCE(sum(
        CASE
            WHEN (b.bucket = 'major'::text) THEN b.value_lost
            ELSE (0)::numeric
        END), (0)::numeric) AS value_lost_major,
    (COALESCE(sum(b.value_added), (0)::numeric) + COALESCE(sum(b.value_lost), (0)::numeric)) AS value_total,
    COALESCE(sum(
        CASE
            WHEN (a.frequency = 'monthly'::giveffektivt.donation_frequency) THEN a.payments
            ELSE (0)::bigint
        END), (0)::numeric) AS monthly_donors,
    COALESCE(sum(a.payments), (0)::numeric) AS payments_total,
    COALESCE(sum(a.amount), (0)::numeric) AS dkk_total,
    COALESCE(sum(b.value_added), (0)::numeric) AS value_added,
    COALESCE(sum(
        CASE
            WHEN (b.frequency = 'once'::giveffektivt.donation_frequency) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_once,
    COALESCE(sum(
        CASE
            WHEN (b.frequency = 'monthly'::giveffektivt.donation_frequency) THEN b.value_added
            ELSE (0)::numeric
        END), (0)::numeric) AS value_added_monthly,
    COALESCE(sum(b.value_lost), (0)::numeric) AS value_lost,
    COALESCE(max(c.amount), (0)::numeric) AS amount_new,
    (COALESCE(max(c.payments), (0)::bigint))::numeric AS payments_new
   FROM (((payments a
     FULL JOIN value_added_lost b ON (((a.period = b.period) AND (a.frequency = b.frequency) AND (a.bucket = b.bucket))))
     FULL JOIN first_time_donations c ON ((a.period = c.period)))
     FULL JOIN payments_new_donors d ON (((a.period = d.period) AND (a.frequency = d.frequency) AND (a.bucket = d.bucket))))
  GROUP BY COALESCE(a.period, b.period)
  ORDER BY COALESCE(a.period, b.period) DESC;


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
            WHEN (t.recipient = 'Against Malaria Foundation'::giveffektivt.transfer_recipient) THEN 'Antimalaria myggenet'::text
            WHEN (t.recipient = 'Malaria Consortium'::giveffektivt.transfer_recipient) THEN 'Malariabehandlinger'::text
            WHEN (t.recipient = 'Helen Keller International'::giveffektivt.transfer_recipient) THEN 'A-vitamintilskud'::text
            WHEN (t.recipient = 'New Incentives'::giveffektivt.transfer_recipient) THEN 'Vaccinationsprogrammer'::text
            WHEN (t.recipient = 'Give Directly'::giveffektivt.transfer_recipient) THEN 'Dollars'::text
            WHEN (t.recipient = 'SCI Foundation'::giveffektivt.transfer_recipient) THEN 'Ormekure'::text
            ELSE NULL::text
        END AS unit,
    round(sum(cdt.amount)) AS total_dkk,
    round((sum(cdt.amount) / max(t.exchange_rate))) AS total_usd,
    round(max(t.unit_cost_external), 2) AS unit_cost_external,
    round(max(t.unit_cost_conversion), 2) AS unit_cost_conversion,
    round(((max(t.unit_cost_external) / max(t.unit_cost_conversion)) * max(t.exchange_rate)), 2) AS unit_cost_dkk,
    round(((sum(cdt.amount) / max(t.exchange_rate)) / (max(t.unit_cost_external) / max(t.unit_cost_conversion))), 1) AS unit_impact,
    round(max(t.life_cost_external), 2) AS life_cost_external,
    round((max(t.life_cost_external) * max(t.exchange_rate)), 2) AS life_cost_dkk,
    round(((sum(cdt.amount) / max(t.exchange_rate)) / max(t.life_cost_external)), 1) AS life_impact,
    max(cdt.charged_at) AS computed_at,
        CASE
            WHEN (t.created_at > now()) THEN 'Næste overførsel'::text
            ELSE to_char(t.created_at, 'yyyy-mm-dd'::text)
        END AS transferred_at
   FROM (giveffektivt.charged_donations_by_transfer cdt
     JOIN giveffektivt.transfer t ON (((cdt.transfer_id = t.id) OR ((cdt.transfer_id IS NULL) AND (cdt.earmark = t.earmark) AND (t.created_at > now())))))
  GROUP BY t.id, t.earmark, t.recipient, t.created_at
  ORDER BY t.created_at, (sum(cdt.amount)) DESC;


--
-- Name: transferred_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.transferred_distribution AS
 SELECT t.recipient,
    round(sum(cdt.amount)) AS dkk_total,
    (count(*))::numeric AS payments_total
   FROM (giveffektivt.charged_donations_by_transfer cdt
     JOIN giveffektivt.transfer t ON ((cdt.transfer_id = t.id)))
  GROUP BY t.recipient
  ORDER BY (round(sum(cdt.amount))) DESC;


--
-- Name: value_lost_analysis; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.value_lost_analysis AS
 WITH buckets AS (
         SELECT bucket_table.frequency,
            bucket_table.start,
            bucket_table.stop,
            bucket_table.bucket
           FROM ( VALUES ('once'::giveffektivt.donation_frequency,0,1000,'small'::text), ('once'::giveffektivt.donation_frequency,1000,6000,'medium'::text), ('once'::giveffektivt.donation_frequency,6000,24000,'large'::text), ('once'::giveffektivt.donation_frequency,24000,'999999999999'::bigint,'major'::text), ('monthly'::giveffektivt.donation_frequency,0,200,'small'::text), ('monthly'::giveffektivt.donation_frequency,200,500,'medium'::text), ('monthly'::giveffektivt.donation_frequency,500,2000,'large'::text), ('monthly'::giveffektivt.donation_frequency,2000,'999999999999'::bigint,'major'::text)) bucket_table(frequency, start, stop, bucket)
        ), monthly_donations_charged_exactly_once AS (
         SELECT unnamed_subquery.donation_id
           FROM ( SELECT charged_donations.donation_id,
                    bool_or(charged_donations.cancelled) AS cancelled,
                    count(charged_donations.charge_id) AS number_of_donations,
                    max(charged_donations.charged_at) AS last_donated_at
                   FROM giveffektivt.charged_donations
                  WHERE (charged_donations.frequency = 'monthly'::giveffektivt.donation_frequency)
                  GROUP BY charged_donations.donation_id) unnamed_subquery
          WHERE ((unnamed_subquery.number_of_donations = 1) AND (unnamed_subquery.cancelled OR (unnamed_subquery.last_donated_at < (now() - '40 days'::interval))))
        ), successful_charges AS (
         SELECT a.period,
            a.month,
            a.charged_at,
            a.email,
            a.donation_id,
            a.cancelled,
            a.amount,
            a.frequency,
            b.bucket
           FROM (( SELECT date_trunc('month'::text, cd.charged_at) AS period,
                    date_trunc('month'::text, cd.charged_at) AS month,
                    cd.charged_at,
                    cd.email,
                    cd.donation_id,
                    cd.cancelled,
                    cd.amount,
                        CASE
                            WHEN (EXISTS ( SELECT 1
                               FROM monthly_donations_charged_exactly_once m
                              WHERE (cd.donation_id = m.donation_id))) THEN 'once'::giveffektivt.donation_frequency
                            ELSE cd.frequency
                        END AS frequency
                   FROM giveffektivt.charged_donations cd) a
             JOIN buckets b ON (((a.frequency = b.frequency) AND (a.amount > (b.start)::numeric) AND (a.amount <= (b.stop)::numeric))))
        ), first_time_donations AS (
         SELECT unnamed_subquery.period,
            sum(unnamed_subquery.amount) AS amount,
            count(1) AS payments
           FROM ( SELECT DISTINCT ON (charged_donations.email) charged_donations.email,
                    charged_donations.amount,
                    date_trunc('month'::text, charged_donations.charged_at) AS period,
                    charged_donations.charged_at
                   FROM giveffektivt.charged_donations
                  ORDER BY charged_donations.email, charged_donations.charged_at) unnamed_subquery
          GROUP BY unnamed_subquery.period
        ), stopped_monthly_donations AS (
         SELECT a.email,
            date_trunc('month'::text, (a.last_donated_at + '1 mon'::interval)) AS stop_period,
            (- sum(a.amount)) AS amount,
            a.frequency
           FROM ( SELECT DISTINCT ON (s.donation_id) s.email,
                    s.charged_at AS last_donated_at,
                    s.amount,
                    s.frequency,
                    s.cancelled
                   FROM successful_charges s
                  WHERE (s.frequency = 'monthly'::giveffektivt.donation_frequency)
                  ORDER BY s.donation_id, s.charged_at DESC) a
          WHERE (((a.last_donated_at + '40 days'::interval) < now()) OR a.cancelled)
          GROUP BY a.email, (date_trunc('month'::text, (a.last_donated_at + '1 mon'::interval))), a.frequency
        ), started_donations AS (
         SELECT unnamed_subquery.email,
            unnamed_subquery.period AS start_period,
            sum(unnamed_subquery.amount) AS amount,
            unnamed_subquery.frequency
           FROM ( SELECT DISTINCT ON (successful_charges.donation_id) successful_charges.email,
                    successful_charges.period,
                    successful_charges.amount,
                    successful_charges.frequency
                   FROM successful_charges
                  ORDER BY successful_charges.donation_id, successful_charges.charged_at) unnamed_subquery
          GROUP BY unnamed_subquery.email, unnamed_subquery.period, unnamed_subquery.frequency
        ), changed_donations AS (
         SELECT a.period,
            a.frequency,
            a.amount,
            a.email,
            a.has_active_donation,
            b.bucket
           FROM (( SELECT COALESCE(a_1.start_period, b_1.stop_period) AS period,
                    COALESCE(a_1.frequency, b_1.frequency) AS frequency,
                    (sum(COALESCE(a_1.amount, (0)::numeric)) + sum(COALESCE(b_1.amount, (0)::numeric))) AS amount,
                    COALESCE(a_1.email, b_1.email) AS email,
                    (min(a_1.frequency) IS NOT NULL) AS has_active_donation
                   FROM (started_donations a_1
                     FULL JOIN stopped_monthly_donations b_1 ON (((a_1.email = b_1.email) AND (a_1.frequency = b_1.frequency) AND (date_trunc('month'::text, a_1.start_period) = date_trunc('month'::text, b_1.stop_period)))))
                  GROUP BY COALESCE(a_1.email, b_1.email), COALESCE(a_1.frequency, b_1.frequency), COALESCE(a_1.start_period, b_1.stop_period)) a
             JOIN buckets b ON (((a.frequency = b.frequency) AND (abs(a.amount) > (b.start)::numeric) AND (abs(a.amount) <= (b.stop)::numeric))))
        )
 SELECT period,
    frequency,
    amount,
    email,
    has_active_donation,
    bucket
   FROM changed_donations
  WHERE ((amount < (0)::numeric) AND (period <= now()))
  ORDER BY period DESC, amount;


--
-- Name: charge _charge_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge
    ADD CONSTRAINT _charge_pkey PRIMARY KEY (id);


--
-- Name: charge _charge_short_id_key; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge
    ADD CONSTRAINT _charge_short_id_key UNIQUE (short_id);


--
-- Name: donation _donation_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.donation
    ADD CONSTRAINT _donation_pkey PRIMARY KEY (id);


--
-- Name: donor _donor_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.donor
    ADD CONSTRAINT _donor_pkey PRIMARY KEY (id);


--
-- Name: fundraiser_activity_checkin _fundraiser_activity_checkin_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.fundraiser_activity_checkin
    ADD CONSTRAINT _fundraiser_activity_checkin_pkey PRIMARY KEY (id);


--
-- Name: fundraiser _fundraiser_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.fundraiser
    ADD CONSTRAINT _fundraiser_pkey PRIMARY KEY (id);


--
-- Name: gavebrev_checkin _gavebrev_checkin_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gavebrev_checkin
    ADD CONSTRAINT _gavebrev_checkin_pkey PRIMARY KEY (id);


--
-- Name: gavebrev _gavebrev_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gavebrev
    ADD CONSTRAINT _gavebrev_pkey PRIMARY KEY (id);


--
-- Name: skat_gaveskema _skat_gaveskema_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.skat_gaveskema
    ADD CONSTRAINT _skat_gaveskema_pkey PRIMARY KEY (id);


--
-- Name: skat _skat_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.skat
    ADD CONSTRAINT _skat_pkey PRIMARY KEY (id);


--
-- Name: transfer _transfer_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.transfer
    ADD CONSTRAINT _transfer_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: charge charge_id_donation_id_uniq; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge
    ADD CONSTRAINT charge_id_donation_id_uniq UNIQUE (id, donation_id);


--
-- Name: charge_transfer charge_transfer_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge_transfer
    ADD CONSTRAINT charge_transfer_pkey PRIMARY KEY (charge_id, transfer_id, earmark);


--
-- Name: clearhaus_settlement clearhaus_settlement_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.clearhaus_settlement
    ADD CONSTRAINT clearhaus_settlement_pkey PRIMARY KEY (merchant_id, created_at);


--
-- Name: earmark earmark_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.earmark
    ADD CONSTRAINT earmark_pkey PRIMARY KEY (donation_id, recipient);


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
-- Name: transfer transfer_id_earmark_uniq; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.transfer
    ADD CONSTRAINT transfer_id_earmark_uniq UNIQUE (id, earmark);


--
-- Name: audit_log_changed_at_idx; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE INDEX audit_log_changed_at_idx ON giveffektivt.audit_log USING btree (changed_at);


--
-- Name: audit_log_data_idx; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE INDEX audit_log_data_idx ON giveffektivt.audit_log USING gin (data);


--
-- Name: audit_log_record_id_idx; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE INDEX audit_log_record_id_idx ON giveffektivt.audit_log USING btree (record_id);


--
-- Name: audit_log_table_name_idx; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE INDEX audit_log_table_name_idx ON giveffektivt.audit_log USING btree (table_name);


--
-- Name: donor_unique_email_tin; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE UNIQUE INDEX donor_unique_email_tin ON giveffektivt.donor USING btree (email, COALESCE(tin, ''::text));


--
-- Name: idx_clearhaus_settlement_merchant_latest_amount; Type: INDEX; Schema: giveffektivt; Owner: -
--

CREATE INDEX idx_clearhaus_settlement_merchant_latest_amount ON giveffektivt.clearhaus_settlement USING btree (merchant_id, created_at DESC) INCLUDE (amount);


--
-- Name: charge charge_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER charge_update_timestamp BEFORE UPDATE ON giveffektivt.charge FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: donation donation_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER donation_update_timestamp BEFORE UPDATE ON giveffektivt.donation FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: donor donor_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER donor_update_timestamp BEFORE UPDATE ON giveffektivt.donor FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: earmark earmark_sum_check; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE CONSTRAINT TRIGGER earmark_sum_check AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.earmark DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION giveffektivt.earmark_sum_check();


--
-- Name: fundraiser fundraiser_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER fundraiser_update_timestamp BEFORE UPDATE ON giveffektivt.fundraiser FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: gavebrev_checkin gavebrev_checkin_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER gavebrev_checkin_update_timestamp BEFORE UPDATE ON giveffektivt.gavebrev_checkin FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: gavebrev gavebrev_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER gavebrev_update_timestamp BEFORE UPDATE ON giveffektivt.gavebrev FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: max_tax_deduction max_tax_deduction_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER max_tax_deduction_update_timestamp BEFORE UPDATE ON giveffektivt.max_tax_deduction FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: skat_gaveskema skat_gaveskema_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER skat_gaveskema_update_timestamp BEFORE UPDATE ON giveffektivt.skat_gaveskema FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: skat skat_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER skat_update_timestamp BEFORE UPDATE ON giveffektivt.skat FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: transfer transfers_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER transfers_update_timestamp BEFORE UPDATE ON giveffektivt.transfer FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: charge trigger_audit_log_charge; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_charge AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.charge FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: donation trigger_audit_log_donation; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_donation AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.donation FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: donor trigger_audit_log_donor; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_donor AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.donor FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: fundraiser trigger_audit_log_fundraiser; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_fundraiser AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.fundraiser FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: fundraiser_activity_checkin trigger_audit_log_fundraiser_activity_checkin; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_fundraiser_activity_checkin AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.fundraiser_activity_checkin FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: gavebrev trigger_audit_log_gavebrev; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_gavebrev AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.gavebrev FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: gavebrev_checkin trigger_audit_log_gavebrev_checkin; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_gavebrev_checkin AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.gavebrev_checkin FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: skat trigger_audit_log_skat; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_skat AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.skat FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: skat_gaveskema trigger_audit_log_skat_gaveskema; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_skat_gaveskema AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.skat_gaveskema FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: transfer trigger_audit_log_transfer; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER trigger_audit_log_transfer AFTER INSERT OR DELETE OR UPDATE ON giveffektivt.transfer FOR EACH ROW EXECUTE FUNCTION giveffektivt.record_audit_log();


--
-- Name: charge _charge_donation_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge
    ADD CONSTRAINT _charge_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES giveffektivt.donation(id);


--
-- Name: donation _donation_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.donation
    ADD CONSTRAINT _donation_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt.donor(id);


--
-- Name: fundraiser_activity_checkin _fundraiser_activity_checkin_fundraiser_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.fundraiser_activity_checkin
    ADD CONSTRAINT _fundraiser_activity_checkin_fundraiser_id_fkey FOREIGN KEY (fundraiser_id) REFERENCES giveffektivt.fundraiser(id);


--
-- Name: gavebrev_checkin _gavebrev_checkin_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gavebrev_checkin
    ADD CONSTRAINT _gavebrev_checkin_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt.donor(id);


--
-- Name: gavebrev _gavebrev_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gavebrev
    ADD CONSTRAINT _gavebrev_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt.donor(id);


--
-- Name: charge_transfer charge_transfer_charge_id_donation_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge_transfer
    ADD CONSTRAINT charge_transfer_charge_id_donation_id_fkey FOREIGN KEY (charge_id, donation_id) REFERENCES giveffektivt.charge(id, donation_id);


--
-- Name: charge_transfer charge_transfer_donation_id_earmark_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge_transfer
    ADD CONSTRAINT charge_transfer_donation_id_earmark_fkey FOREIGN KEY (donation_id, earmark) REFERENCES giveffektivt.earmark(donation_id, recipient);


--
-- Name: charge_transfer charge_transfer_transfer_id_earmark_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.charge_transfer
    ADD CONSTRAINT charge_transfer_transfer_id_earmark_fkey FOREIGN KEY (transfer_id, earmark) REFERENCES giveffektivt.transfer(id, earmark);


--
-- Name: earmark earmark_donation_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.earmark
    ADD CONSTRAINT earmark_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES giveffektivt.donation(id);


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
    ('20250330185137'),
    ('20250725112716'),
    ('20250802174406'),
    ('20250810104141'),
    ('20250810124953'),
    ('20250810164551'),
    ('20250819212352'),
    ('99999999999999');
