-- migrate:up

alter table donation add column subscription_confirmed_at timestamptz;

update donation d
set subscription_confirmed_at = c.first_capture_at
from (
    select donation_id, min(created_at) as first_capture_at
    from charge
    where status = 'charged'
    group by donation_id
) c
where d.id = c.donation_id
    and d.gateway in ('Quickpay', 'Scanpay')
    and d.frequency in ('monthly', 'yearly');

create function confirm_subscription_from_capture() returns trigger language plpgsql as $$
begin
    if new.status = 'charged' then
        update donation
        set subscription_confirmed_at = new.created_at
        where id = new.donation_id
            and subscription_confirmed_at is null
            and gateway in ('Quickpay', 'Scanpay')
            and frequency in ('monthly', 'yearly');
    end if;
    return new;
end
$$;

create trigger confirm_subscription_from_capture
    after insert or update of status on charge
    for each row execute function confirm_subscription_from_capture();

-- migrate:down

