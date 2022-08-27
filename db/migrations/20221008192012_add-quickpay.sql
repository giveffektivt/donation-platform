-- migrate:up
alter type payment_gateway rename value 'ScanPay' to 'Scanpay';

alter type payment_gateway
    add value 'Quickpay' before 'Scanpay';

-- migrate:down
