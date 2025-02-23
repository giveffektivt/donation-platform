![Giv Effektivt logo](https://user-images.githubusercontent.com/1177900/176930348-0efe7a21-4a6e-474f-a485-3351ddce57a8.png)

## What is Giv Effektivt?

Giv Effektivt is a charity organisation enabling people to donate from Denmark to highly effective charities around the world.

## Architecture

- API is written using NextJS framework.
- Data in stored in a PostgreSQL database.
- Frontend is hosted on Framer.

## How to run the local development environment?

### Postgres and related tools

#### docker and docker-compose

To install, follow https://docs.docker.com/engine/install/ubuntu/.

#### dbmate

`dbmate` is used to apply migrations from `db/migrations` directory. You can use it to apply migrations to your local database for testing.
`dbmate` uses `DATABASE_URL`, most likely you can put exactly this in `.envrc`:

```
export DATABASE_URL=postgres://$PGUSER:$PGPASSWORD@$PGHOST:5432/$PGDATABASE?sslmode=disable&search_path=giveffektivt
```

or, if you are not using `direnv`, you can specify the url like that:

```
dbmate -u "postgres://postgres:password@localhost:5432/giveffektivt?sslmode=disable&search_path=giveffektivt"  migrate
```

The `-u` just after `dbmate` is used to set a flag for the `dbmate` not `migrate`

To install, follow https://github.com/amacneil/dbmate

#### Spinning up the database

1. `docker-compose up` to get the local database.
2. `dbmate migrate` to apply the migrations. Run `dbmate -u "postgres://postgres:password@localhost:5432/giveffektivt?sslmode=disable&search_path=giveffektivt" migrate` if you are not using
3. Optionally, to fill local DB with a copy of data from DEV: `pg_dump postgres://<dev-connection-string> --data-only --exclude-table schema_migrations --exclude-schema cron | psql` **`psql` required. Check section database tools**
4. `docker-compose down` to shut it down preserving the local data (add `-v` to also clear the data).

### Front end

1. Clone the app.
2. Run `yarn install` to install dependencies.
3. Spin up the database with `docker-compose up` and (if you haven't done that) apply migrations with `dbmate migrate` (check spinning up the database)
4. Create a file `.env` and copy contents of `.env.example` to it.
5. Swap value of email username and email password with real values.
6. Set `PAYMENT_GATEWAY` to a preferred payment gateway (supported values are listed in `payment_gateway` enum in database).
7. Set values for corresponding payment gateways (leave `QUICKPAY_CALLBACK_URL` empty unless you want Quickpay to send you a callback).
8. and `yarn dev` to run the app.

## Running tests

There are integration tests validating database logic, which can be executed using `yarn test`. The tests require database to be present, as per documentation above. The tests will run in a separate database called `test`, which is fully recreated on every run.

## FAQ

- _How to test the payment gateway?_

Use [Quickpay test cards](https://learn.quickpay.net/tech-talk/appendixes/test/#test-data) and these transactions would automatically be treated as test transactions.
