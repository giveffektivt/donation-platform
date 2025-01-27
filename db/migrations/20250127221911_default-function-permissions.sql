-- migrate:up
alter default privileges
revoke
execute on functions
from
    public;

grant
execute on function gen_random_string (integer, text) to writer;

grant
execute on function gen_short_id (text, text, text, integer, text) to writer;

grant
execute on function trigger_update_timestamp () to writer;

-- migrate:down
