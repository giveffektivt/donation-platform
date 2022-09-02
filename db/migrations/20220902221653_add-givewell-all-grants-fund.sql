-- migrate:up
alter type donation_recipient
    add value 'GiveWell All Grants Fund' after 'GiveWell Maximum Impact Fund';

-- migrate:down
