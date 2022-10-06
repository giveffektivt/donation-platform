-- migrate:up
alter type donation_recipient rename value 'Giv Effektivt membership' to 'Giv Effektivt';

alter type donation_recipient rename value 'GiveWell Maximum Impact Fund' to 'Vores anbefaling';

alter type donation_recipient rename value 'GiveWell All Grants Fund' to 'Større, men variabel effekt';

alter type donation_recipient rename value 'Against Malaria Foundation' to 'Myggenet mod malaria';

alter type donation_recipient rename value 'Malaria Consortium' to 'Medicin mod malaria';

alter type donation_recipient rename value 'Helen Keller International' to 'Vitamin mod mangelsygdomme';

alter type donation_recipient rename value 'New Incentives' to 'Vacciner til spædbørn';

alter type donation_recipient rename value 'Give Directly' to 'Kontanter overførsler til verdens fattigste';

alter type donation_recipient rename value 'SCI Foundation' to 'Ormekur';

-- migrate:down
