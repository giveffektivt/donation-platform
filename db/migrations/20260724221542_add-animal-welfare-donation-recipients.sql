-- migrate:up
alter type donation_recipient
rename value 'Giv Effektivts anbefaling' to 'Smart fordeling';

alter type donation_recipient
add value 'Andet'
after 'Giv Effektivts arbejde og vækst';

alter type donation_recipient
add value 'Smart fordeling - dyrevelfærd'
after 'Giv Effektivts arbejde og vækst';

alter type donation_recipient
add value 'Smart fordeling - global sundhed'
after 'Giv Effektivts arbejde og vækst';

-- migrate:down
