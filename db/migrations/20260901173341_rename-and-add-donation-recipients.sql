-- migrate:up

alter type donation_recipient rename value 'Giv Effektivts medlemskab' to 'medlemskab';
alter type donation_recipient rename value 'Stor og velkendt effekt' to 'stor-velkendt-effekt';
alter type donation_recipient rename value 'Smart fordeling' to 'smart-fordeling';
alter type donation_recipient rename value 'Giv Effektivts arbejde og vækst' to 'drift';
alter type donation_recipient rename value 'Smart fordeling - global sundhed' to 'smart-fordeling-global';
alter type donation_recipient rename value 'Smart fordeling - dyrevelfærd' to 'smart-fordeling-dyr';
alter type donation_recipient rename value 'Andet' to 'andet';
alter type donation_recipient rename value 'Myggenet mod malaria' to 'myggenet';
alter type donation_recipient rename value 'Kontantoverførsler til verdens fattigste' to 'kontantoverførsler';
alter type donation_recipient rename value 'Medicin mod malaria' to 'malariamedicin';
alter type donation_recipient rename value 'A-vitamin mod fejlernæring' to 'a-vitamin';
alter type donation_recipient rename value 'Ormekur' to 'ormekur';
alter type donation_recipient rename value 'Vacciner til spædbørn' to 'spædbørnsvacciner';

alter type donation_recipient
add value 'dyrevelfærd'
after 'smart-fordeling-dyr';

alter type donation_recipient
add value 'fødevareomstilling'
after 'dyrevelfærd';

-- migrate:down
