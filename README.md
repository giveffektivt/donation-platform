![Giv Effektivt logo](https://user-images.githubusercontent.com/1177900/176930348-0efe7a21-4a6e-474f-a485-3351ddce57a8.png)

## What is Giv Effektivt?

Giv Effektivt is a regranting charity organisation enabling Danish users to donate to highly effective charities around the world and get a tax deduction (hopefully in a few months.)
There is no easily adjustable and good-looking donation platforms available on the Danish market. This projects enables the charity organisation giveffektivt.dk to collect donations with a custom made payment system.

## Architecture

The front end and back end are developed with NextJS framework and deployed using Vercel. The database is hosted on AWS.

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

### Database tools

_All of those tools are optional!_

#### direnv

We use direnv to save us some time from typing the connection strings, users and passwords every time we want to use `dbmate`, `pgcli` or `psql`. Direnv will set your env variables based on `.envrc` when you enter the donation platform directory and unset them when you leave it.

**To install, follow instructions here https://direnv.net/.** After that have a look at `.envrc.example` and copy contents to `.envrc`.

#### psql

psql is used to dump data from dev instance on AWS to local database.

```
sudo apt-get update
sudo apt-get install postgresql-client
```

#### pgcli

pgcli can be used to run queries from the terminal.

```
sudo apt-get update
sudo apt-get install pgcli
```

`psql` and `pgcli` use the `PGHOST`, `PGDATABASE`, `PGPORT`, `PGUSER` and `PGPASSWORD` environment variables. Default values set in `.envrc.example` will enable you to connect to local database spun up with docker compose, but you need `direnv` to make it work! Otherwise check documentation..

#### Adminer

Adminer is a gui tool that makes the database management easier. It will be automatically available on port 8080 when you run `docker-compose up`

Use `giveffektivt-db:5432` as the ip address when logging in to access local database. `giveffektivt-db:5432` is the ip address that points towards giveffektivt-db from inside of adminer container. The other credentials are in docker-compose.yml file. Leave the database field empty.

## Running tests

There are integration tests validating database logic, which can be executed using `yarn test`. The tests require database to be present, as per documentation above. The tests will run in a separate database called `test`, which is fully recreated on every run.

## FAQ

- _How to test the payment gateway?_

There is no way to test the payment gateway locally, but for a development environment:

- For Quickpay, use [Quickpay test cards](https://learn.quickpay.net/tech-talk/appendixes/test/#test-data) and these transactions would automatically be treated as test transactions.
- For Scanpay, you can ask them for a test account. Then use `4111 1111 1111 1111` as the card number.

## Credits

Thanks to @maximbaz, @noverby, @lindeloev and @alimony for helping me to create this app :)

