-- migrate:up
alter type donation_recipient rename value 'Giv Effektivts anbefaling' to 'Stor og velkendt effekt';

alter type donation_recipient rename value 'Større, men variabel effekt' to 'Giv Effektivts anbefaling';

update
    donation
set
    recipient = 'Giv Effektivts anbefaling'
where
    recipient = 'Stor og velkendt effekt'
    and created_at >= '2022-09-22';

-- migrate:down
