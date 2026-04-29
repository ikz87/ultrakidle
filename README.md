# Ultrakidle

The daily character guessing game for machines.

## IMPORTANT
I will *not* be tracking issues in this repo, since they will most likely all be UI/UX rather than directly related to code. You can instead submit issues through the [discord server](https://discord.gg/6dsMavu6mH). that's where discussion around the game happens

## Quick Start
### Prerequisites
- Docker
- Docker compose
 
### Configuration
All environment variables are stored in `.env.example` for both the React and Supabase services.

To build the app locally, simply copy the example environment files:
```sh
cp .env.example .env
cp ./supabase/.env.example ./supabase/.env 
```

### Building the app
```sh
docker compose up -d
```

- Ultrakidle : `localhost:5173`
- Supabase dashboard : `localhost:8000`

The Supabase docker-compose is based on the [official documentation](https://supabase.com/docs/guides/self-hosting/docker)

(All docker-composes are on *restart unless-stopped* so don't forget to stop everything!)

### Import the database
(Note: The import process is in WIP. In the future, manual imports will no longer be necessary)

Import the db schema
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres < schema.sql
```

Import the data
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres < data/import.sql
```

Select a daily enemy in the classic mode (usable multiple times)
```sh
docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT pick_daily_enemy();"
```

#### Reset the database

You cannot reset the database by simply stopping the db container. You must delete the `supabase/volumes/db/data` folder (Root access required) **after stopping the services**:
```sh
sudo rm -rf supabase/volumes/db/data
```
