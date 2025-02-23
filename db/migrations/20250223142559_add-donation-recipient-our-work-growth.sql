-- migrate:up
alter type donation_recipient
rename value 'Giv Effektivt' to 'Giv Effektivts medlemskab';

alter type donation_recipient
add value 'Giv Effektivts arbejde og vækst'
after 'Giv Effektivts anbefaling';

-- migrate:down
