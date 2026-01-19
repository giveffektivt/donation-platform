FROM postgres:17-alpine3.22

RUN apk add postgresql-pg_cron

RUN ls -al /usr/share
RUN cp -a /usr/share/postgresql17/extension/* /usr/local/share/postgresql/extension/
RUN cp -a /usr/lib/postgresql17/* /usr/local/lib/postgresql/

CMD ["-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=giveffektivt"]
