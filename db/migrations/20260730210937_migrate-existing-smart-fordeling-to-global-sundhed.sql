-- migrate:up

alter table charge_transfer alter constraint charge_transfer_donation_id_earmark_fkey deferrable;
alter table charge_transfer alter constraint charge_transfer_transfer_id_earmark_fkey deferrable;

set constraints charge_transfer_donation_id_earmark_fkey, charge_transfer_transfer_id_earmark_fkey deferred;

update earmark set recipient='Smart fordeling - global sundhed' where recipient = 'Smart fordeling';

update charge_transfer set earmark='Smart fordeling - global sundhed' where earmark='Smart fordeling';

update transfer set earmark='Smart fordeling - global sundhed' where earmark='Smart fordeling';

set constraints charge_transfer_donation_id_earmark_fkey, charge_transfer_transfer_id_earmark_fkey immediate;

alter table charge_transfer alter constraint charge_transfer_donation_id_earmark_fkey not deferrable;
alter table charge_transfer alter constraint charge_transfer_transfer_id_earmark_fkey not deferrable;

-- migrate:down

