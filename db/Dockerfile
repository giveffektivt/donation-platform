FROM postgres:17-alpine

RUN apk add postgresql-pg_cron

RUN cp -a /usr/share/postgresql17/extension/* /usr/local/share/postgresql/extension/
RUN cp -a /usr/lib/postgresql17/* /usr/local/lib/postgresql/

CMD ["-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=giveffektivt"]
