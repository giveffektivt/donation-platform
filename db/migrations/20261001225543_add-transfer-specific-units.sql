-- migrate:up
alter table transfer
    add column unit text,
    add constraint transfer_unit_not_blank check (unit is null or length(btrim(unit)) > 0);

create function set_transfer_default_unit() returns trigger language plpgsql as $$
begin
    if new.unit is null then
        new.unit := case new.recipient
            when 'Against Malaria Foundation' then 'Antimalaria myggenet'
            when 'Malaria Consortium' then 'Malariabehandlinger'
            when 'Helen Keller International' then 'A-vitamintilskud'
            when 'New Incentives' then 'Vaccinationsprogrammer'
            when 'Give Directly' then 'Dollars'
            when 'SCI Foundation' then 'Ormekure'
            when 'TaRL Africa' then 'Børn med målrettet undervisning'
            when 'Taimaka' then 'Børn behandlet for akut underernæring'
            when 'Lafiya' then 'Par-år med præventionsbeskyttelse'
        end;
    end if;
    return new;
end
$$;

create trigger set_transfer_default_unit
    before insert on transfer
    for each row execute function set_transfer_default_unit();

update transfer
set unit = case recipient
    when 'Against Malaria Foundation' then 'Antimalaria myggenet'
    when 'Malaria Consortium' then 'Malariabehandlinger'
    when 'Helen Keller International' then 'A-vitamintilskud'
    when 'New Incentives' then 'Vaccinationsprogrammer'
    when 'Give Directly' then 'Dollars'
    when 'SCI Foundation' then 'Ormekure'
    when 'TaRL Africa' then 'Børn med målrettet undervisning'
    when 'Taimaka' then 'Børn behandlet for akut underernæring'
    when 'Lafiya' then 'Par-år med præventionsbeskyttelse'
end;


-- migrate:down

