-- migrate:up
alter type donation_recipient rename value 'Kontanter overførsler til verdens fattigste' to 'Kontantoverførsler til verdens fattigste';

-- migrate:down
