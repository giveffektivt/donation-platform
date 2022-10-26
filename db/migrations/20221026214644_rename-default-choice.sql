-- migrate:up
alter type donation_recipient rename value 'Vores anbefaling' to 'Giv Effektivts anbefaling';

-- migrate:down
