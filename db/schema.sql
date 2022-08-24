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
    'Giv Effektivt membership',
    'GiveWell Maximum Impact Fund',
    'Against Malaria Foundation',
    'Give Directly',
    'Malaria Consortium',
    'Helen Keller International',
    'SCI Foundation',
    'New Incentives'
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
-- Name: payment_gateway; Type: TYPE; Schema: giveffektivt; Owner: -
--

CREATE TYPE giveffektivt.payment_gateway AS ENUM (
    'ScanPay',
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
    donation_id uuid,
    short_id text DEFAULT giveffektivt.gen_short_id('_charge'::text, 'short_id'::text) NOT NULL,
    status giveffektivt.charge_status NOT NULL,
    gateway_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    gateway_response jsonb DEFAULT '{}'::jsonb NOT NULL,
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
    donor_id uuid,
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
-- Name: charge_with_gateway_info; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.charge_with_gateway_info AS
 SELECT _charge.id,
    _charge.donation_id,
    _charge.short_id,
    _charge.status,
    _charge.gateway_metadata,
    _charge.gateway_response,
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
    c.gateway_metadata,
    d.gateway_metadata AS donation_gateway_metadata
   FROM ((giveffektivt.donor_with_contact_info dc
     JOIN giveffektivt.donation_with_gateway_info d ON ((d.donor_id = dc.id)))
     JOIN giveffektivt.charge_with_gateway_info c ON ((c.donation_id = d.id)))
  WHERE ((d.gateway = 'ScanPay'::giveffektivt.payment_gateway) AND (NOT d.cancelled) AND (c.status = 'created'::giveffektivt.charge_status));


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
          WHERE ((d.gateway = 'ScanPay'::giveffektivt.payment_gateway) AND (NOT d.cancelled) AND (d.frequency = ANY (ARRAY['monthly'::giveffektivt.donation_frequency, 'yearly'::giveffektivt.donation_frequency])))
          ORDER BY d.id, c.created_at DESC) s
  WHERE (s.next_charge <= now());


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
-- Name: donations_to_email; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.donations_to_email AS
 SELECT DISTINCT ON (d.id) d.id,
    p.email,
    d.amount,
    d.recipient,
    d.frequency,
    d.tax_deductible,
    p.country
   FROM ((giveffektivt.donor_with_sensitive_info p
     JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
  WHERE ((d.emailed = 'no'::giveffektivt.emailed_status) AND (c.status = 'charged'::giveffektivt.charge_status))
  ORDER BY d.id, c.created_at DESC;


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
-- Name: kpi; Type: VIEW; Schema: giveffektivt; Owner: -
--

CREATE VIEW giveffektivt.kpi AS
 WITH donations_total AS (
         SELECT sum(d.amount) AS donations_total
           FROM (giveffektivt.donation d
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((c.status = 'charged'::giveffektivt.charge_status) AND (d.recipient <> 'Giv Effektivt membership'::giveffektivt.donation_recipient))
        ), donations_recurring_per_year AS (
         SELECT ((12)::numeric * sum(c1.amount)) AS donations_recurring_per_year
           FROM ( SELECT DISTINCT ON (d.id) d.amount,
                    c.status
                   FROM (giveffektivt.donation d
                     JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
                  WHERE ((d.recipient <> 'Giv Effektivt membership'::giveffektivt.donation_recipient) AND (d.frequency = 'monthly'::giveffektivt.donation_frequency) AND (NOT d.cancelled))
                  ORDER BY d.id, c.created_at DESC) c1
          WHERE (c1.status = 'charged'::giveffektivt.charge_status)
        ), members_dk AS (
         SELECT (count(DISTINCT p.tin))::numeric AS members_dk
           FROM ((giveffektivt.donor_with_sensitive_info p
             JOIN giveffektivt.donation d ON ((d.donor_id = p.id)))
             JOIN giveffektivt.charge c ON ((c.donation_id = d.id)))
          WHERE ((d.recipient = 'Giv Effektivt membership'::giveffektivt.donation_recipient) AND (c.status = 'charged'::giveffektivt.charge_status) AND (p.country = 'Denmark'::text))
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
  WHERE (c.status = 'charged'::giveffektivt.charge_status)
  GROUP BY d.recipient;


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
    ('20220824195743');
