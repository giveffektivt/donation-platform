-- migrate:up
create view monthly_distribution as
SELECT to_char("charge"."updated_at", 'Mon') as month,
to_char("charge"."updated_at", 'yyyy') as year,
       sum("amount") 
FROM "charge"
INNER JOIN "donation" on "charge"."donation_id" = "donation"."id"
WHERE 
"charge"."status" = 'charged'::giveffektivt.charge_status AND 
"recipient" != 'Giv Effektivt membership'::giveffektivt.donation_recipient
GROUP BY "month", "year"

grant select on monthly_distribution to reader;

-- migrate:down
