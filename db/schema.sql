SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
    'yearly'
);


--
-- Name: donation_recipient; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.donation_recipient AS ENUM (
    'Giv Effektivt',
    'Stor og velkendt effekt',
    'Giv Effektivts anbefaling',
    'Myggenet mod malaria',
    'Kontanter overførsler til verdens fattigste',
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
-- Name: gen_short_id(text, text, integer, text); Type: FUNCTION; Schema: giveffektivt; Owner: -
--

CREATE FUNCTION giveffektivt.gen_short_id(table_name text, column_name text, min_length integer DEFAULT 4, chars text DEFAULT '23456789abcdefghjkmnpqrstuvwxyz'::text) RETURNS text
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
        random_id := gen_random_string (current_len, chars);
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
    short_id text DEFAULT giveffektivt.gen_short_id('_charge'::text, 'short_id'::text) NOT NULL,
    status giveffektivt.charge_status NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    _old_id integer
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
    _old_id integer
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
-- Name: charge; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charge AS
 SELECT _charge.id,
    _charge.donation_id,
    _charge.short_id,
    _charge.status,
    _charge.created_at,
    _charge.updated_at
   FROM giveffektivt._charge
  WHERE (_charge.deleted_at IS NULL);


--
-- Name: donation; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donation AS
 SELECT _donation.id,
    _donation.donor_id,
    _donation.emailed,
    _donation.amount,
    _donation.recipient,
    _donation.frequency,
    _donation.cancelled,
    _donation.gateway,
    _donation.method,
    _donation.tax_deductible,
    _donation.created_at,
    _donation.updated_at
   FROM giveffektivt._donation
  WHERE (_donation.deleted_at IS NULL);


--
-- Name: donor_with_sensitive_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_with_sensitive_info AS
 SELECT _donor.id,
    _donor.name,
    _donor.email,
    _donor.address,
    _donor.postcode,
    _donor.city,
    _donor.country,
    _donor.tin,
    _donor.birthday,
    _donor.created_at,
    _donor.updated_at
   FROM giveffektivt._donor
  WHERE (_donor.deleted_at IS NULL);


--
-- Name: annual_email_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_email_report AS
 WITH const AS (
         SELECT date_trunc('year'::text, (now() - '9 mons'::interval)) AS year_from,
            date_trunc('year'::text, (now() + '3 mons'::interval)) AS year_to
        ), data AS (
         SELECT p.tin,
            p.email,
            d.tax_deductible,
            sum(d.amount) AS total
           FROM (((const
             CROSS JOIN giveffektivt.donor_with_sensitive_info p)
             LEFT JOIN giveffektivt.donation d ON ((p.id = d.donor_id)))
             LEFT JOIN giveffektivt.charge c_1 ON ((d.id = c_1.donation_id)))
          WHERE ((c_1.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient) AND (c_1.created_at <@ tstzrange(const.year_from, const.year_to, '[)'::text)))
          GROUP BY p.tin, p.email, d.tax_deductible
        ), with_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.total
           FROM data
          WHERE data.tax_deductible
        ), with_tin_no_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.total
           FROM data
          WHERE ((NOT data.tax_deductible) AND (data.tin IS NOT NULL))
        ), with_no_tin_no_tax AS (
         SELECT data.tin,
            data.email,
            data.tax_deductible,
            data.total
           FROM data
          WHERE ((NOT data.tax_deductible) AND (data.tin IS NULL))
        )
 SELECT COALESCE(a.tin, b.tin) AS tin,
    COALESCE(a.email, b.email, c.email) AS email,
    a.total AS tax_deductible,
    NULLIF((COALESCE(b.total, (0)::numeric) + COALESCE(c.total, (0)::numeric)), (0)::numeric) AS not_deductible,
    ((COALESCE(a.total, (0)::numeric) + COALESCE(b.total, (0)::numeric)) + COALESCE(c.total, (0)::numeric)) AS total
   FROM ((with_tax a
     FULL JOIN with_tin_no_tax b ON (((a.tin = b.tin) AND (a.email = b.email))))
     FULL JOIN with_no_tin_no_tax c ON ((COALESCE(a.email, b.email) = c.email)))
  ORDER BY COALESCE(a.email, b.email, c.email);


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
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient) AND (c.created_at <@ tstzrange(annual_tax_report_const.year_from, annual_tax_report_const.year_to, '[)'::text)) AND d.tax_deductible)
  GROUP BY p.tin;


--
-- Name: annual_tax_report_gavebrev_all_payments; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report_gavebrev_all_payments AS
 SELECT p.tin,
    EXTRACT(year FROM c.created_at) AS year,
    round(sum(d.amount)) AS actual_total
   FROM (((giveffektivt.annual_tax_report_const
     CROSS JOIN giveffektivt.donor_with_sensitive_info p)
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient) AND (c.created_at < annual_tax_report_const.year_to) AND d.tax_deductible)
  GROUP BY p.tin, (EXTRACT(year FROM c.created_at));


--
-- Name: gavebrev; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.gavebrev AS
 SELECT _gavebrev.id,
    _gavebrev.donor_id,
    _gavebrev.status,
    _gavebrev.type,
    _gavebrev.amount,
    _gavebrev.minimal_income,
    _gavebrev.started_at,
    _gavebrev.stopped_at,
    _gavebrev.created_at,
    _gavebrev.updated_at
   FROM giveffektivt._gavebrev
  WHERE (_gavebrev.deleted_at IS NULL);


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
 SELECT _gavebrev_checkin.id,
    _gavebrev_checkin.donor_id,
    _gavebrev_checkin.year,
    _gavebrev_checkin.income_inferred,
    _gavebrev_checkin.income_preliminary,
    _gavebrev_checkin.income_verified,
    _gavebrev_checkin.maximize_tax_deduction,
    _gavebrev_checkin.created_at,
    _gavebrev_checkin.updated_at
   FROM giveffektivt._gavebrev_checkin
  WHERE (_gavebrev_checkin.deleted_at IS NULL);


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
            WHEN (g.type = 'amount'::giveffektivt.gavebrev_type) THEN GREATEST((0)::numeric, ((((c.income > COALESCE(g.minimal_income, (0)::numeric)))::integer)::numeric * g.amount))
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
         SELECT DISTINCT ON (get.tin) get.tin,
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
 SELECT data.tin,
    data.year,
    data.can_be_reported_this_year,
    data.expected_total,
    data.actual_total,
    data.non_gavebrev_total,
    data.result,
    data.aconto_debt
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
 SELECT data.ll8a_or_gavebrev,
    data.tin,
    data.total,
    data.aconto_debt,
    data.year
   FROM data
  WHERE ((data.total > (0)::numeric) OR (data.aconto_debt > (0)::numeric))
  ORDER BY data.tin, data.ll8a_or_gavebrev DESC;


--
-- Name: annual_tax_report; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.annual_tax_report AS
 SELECT 2262 AS const,
    42490903 AS ge_cvr,
    replace(annual_tax_report_data.tin, '-'::text, ''::text) AS donor_cpr,
    annual_tax_report_data.year,
    ''::text AS blank,
    annual_tax_report_data.total,
    annual_tax_report_data.ll8a_or_gavebrev,
    ''::text AS ge_notes,
    0 AS rettekode
   FROM giveffektivt.annual_tax_report_data
  WHERE (annual_tax_report_data.total > (0)::numeric);


--
-- Name: charge_with_gateway_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charge_with_gateway_info AS
 SELECT _charge.id,
    _charge.donation_id,
    _charge.short_id,
    _charge.status,
    _charge.gateway_metadata,
    _charge.created_at,
    _charge.updated_at
   FROM giveffektivt._charge
  WHERE (_charge.deleted_at IS NULL);


--
-- Name: donation_with_gateway_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donation_with_gateway_info AS
 SELECT _donation.id,
    _donation.donor_id,
    _donation.emailed,
    _donation.amount,
    _donation.recipient,
    _donation.frequency,
    _donation.cancelled,
    _donation.gateway,
    _donation.method,
    _donation.tax_deductible,
    _donation.gateway_metadata,
    _donation.created_at,
    _donation.updated_at
   FROM giveffektivt._donation
  WHERE (_donation.deleted_at IS NULL);


--
-- Name: donor_with_contact_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donor_with_contact_info AS
 SELECT _donor.id,
    _donor.name,
    _donor.email,
    _donor.created_at,
    _donor.updated_at
   FROM giveffektivt._donor
  WHERE (_donor.deleted_at IS NULL);


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
     JOIN giveffektivt.donation_with_gateway_info d ON ((d.donor_id = dc.id)))
     JOIN giveffektivt.charge_with_gateway_info c ON ((c.donation_id = d.id)))
  WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (c.status = 'created'::giveffektivt.charge_status) AND (c.created_at <= now()));


--
-- Name: donations_to_create_charges; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donations_to_create_charges AS
 SELECT s.donation_id,
    s.frequency,
    s.last_charge,
    s.next_charge
   FROM ( SELECT DISTINCT ON (d.id) d.id AS donation_id,
            d.frequency,
            c.created_at AS last_charge,
                CASE
                    WHEN (d.frequency = 'monthly'::giveffektivt.donation_frequency) THEN (c.created_at + '1 mon'::interval month)
                    WHEN (d.frequency = 'yearly'::giveffektivt.donation_frequency) THEN (c.created_at + '1 year'::interval year)
                    ELSE NULL::timestamp with time zone
                END AS next_charge
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.gateway = ANY (ARRAY['Quickpay'::giveffektivt.payment_gateway, 'Scanpay'::giveffektivt.payment_gateway])) AND (NOT d.cancelled) AND (d.frequency = ANY (ARRAY['monthly'::giveffektivt.donation_frequency, 'yearly'::giveffektivt.donation_frequency])))
          ORDER BY d.id, c.created_at DESC) s
  WHERE (s.next_charge <= now());


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
 SELECT _donor.id,
    _donor.created_at,
    _donor.updated_at
   FROM giveffektivt._donor
  WHERE (_donor.deleted_at IS NULL);


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
 SELECT s.donor_id,
    s.year,
    s.income_inferred
   FROM ( SELECT DISTINCT ON (c.donor_id) c.donor_id,
            (c.year + (1)::numeric) AS year,
            COALESCE(c.income_verified, COALESCE(c.income_preliminary, c.income_inferred)) AS income_inferred
           FROM (giveffektivt.gavebrev_checkin c
             JOIN giveffektivt.gavebrev g ON ((g.donor_id = c.donor_id)))
          WHERE ((g.status = 'signed'::giveffektivt.gavebrev_status) AND (g.stopped_at >= now()))
          ORDER BY c.donor_id, c.year DESC) s
  WHERE ((s.year)::double precision <= date_part('year'::text, now()));


--
-- Name: kpi; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.kpi AS
 WITH donations_total AS (
         SELECT sum(d.amount) AS donations_total
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient))
        ), donations_recurring_per_year AS (
         SELECT ((12)::numeric * sum(c1.amount)) AS donations_recurring_per_year
           FROM ( SELECT DISTINCT ON (d.id) d.amount,
                    c.status
                   FROM (giveffektivt.donation d
                     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
                  WHERE ((d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient) AND (d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (NOT d.cancelled))
                  ORDER BY d.id, c.created_at DESC) c1
          WHERE (c1.status = 'charged'::giveffektivt.charge_status)
        ), members_dk AS (
         SELECT (count(DISTINCT p.tin))::numeric AS members_dk
           FROM ((giveffektivt.donor_with_sensitive_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.recipient = 'Giv Effektivt'::giveffektivt.donation_recipient) AND (c.status = 'charged'::giveffektivt.charge_status) AND (p.country = 'Denmark'::text))
        )
 SELECT members_dk.members_dk,
    donations_total.donations_total,
    donations_recurring_per_year.donations_recurring_per_year
   FROM members_dk,
    donations_total,
    donations_recurring_per_year;


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
-- Name: recipient_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.recipient_distribution AS
 SELECT d.recipient,
    count(*) AS count,
    sum(d.amount) AS sum
   FROM (giveffektivt.donation d
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient))
  GROUP BY d.recipient
  ORDER BY (sum(d.amount)) DESC;


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
    version character varying(255) NOT NULL
);


--
-- Name: skat; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.skat AS
 SELECT _skat.const,
    _skat.ge_cvr,
    _skat.donor_cpr,
    _skat.year,
    _skat.blank,
    _skat.total,
    _skat.ll8a_or_gavebrev,
    _skat.ge_notes,
    _skat.rettekode,
    _skat.id,
    _skat.created_at,
    _skat.updated_at
   FROM giveffektivt._skat
  WHERE (_skat.deleted_at IS NULL);


--
-- Name: time_distribution; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.time_distribution AS
 SELECT to_char(a.year, 'yyyy'::text) AS year,
    to_char(a.month, 'Mon'::text) AS month,
    a.sum
   FROM ( SELECT date_trunc('year'::text, c.created_at) AS year,
            date_trunc('month'::text, c.created_at) AS month,
            sum(d.amount) AS sum
           FROM (giveffektivt.charge c
             JOIN giveffektivt.donation d ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt'::giveffektivt.donation_recipient))
          GROUP BY (date_trunc('year'::text, c.created_at)), (date_trunc('month'::text, c.created_at))
          ORDER BY (date_trunc('year'::text, c.created_at)) DESC, (date_trunc('month'::text, c.created_at)) DESC) a;


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
-- Name: _skat _skat_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._skat
    ADD CONSTRAINT _skat_pkey PRIMARY KEY (id);


--
-- Name: gateway_webhook gateway_webhook_pkey; Type: CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt.gateway_webhook
    ADD CONSTRAINT gateway_webhook_pkey PRIMARY KEY (id);


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
-- Name: skat skat_soft_delete; Type: RULE; Schema: giveffektivt; Owner: -
--

CREATE RULE skat_soft_delete AS
    ON DELETE TO giveffektivt.skat DO INSTEAD  UPDATE giveffektivt._skat SET deleted_at = now()
  WHERE ((_skat.deleted_at IS NULL) AND (_skat.id = old.id));


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
-- Name: _skat skat_update_timestamp; Type: TRIGGER; Schema: giveffektivt; Owner: -
--

CREATE TRIGGER skat_update_timestamp BEFORE UPDATE ON giveffektivt._skat FOR EACH ROW EXECUTE FUNCTION giveffektivt.trigger_update_timestamp();


--
-- Name: _charge _charge_donation_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._charge
    ADD CONSTRAINT _charge_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES giveffektivt._donation(id);


--
-- Name: _donation _donation_donor_id_fkey; Type: FK CONSTRAINT; Schema: giveffektivt; Owner: -
--

ALTER TABLE ONLY giveffektivt._donation
    ADD CONSTRAINT _donation_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES giveffektivt._donor(id);


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
    ('20230402233805');
