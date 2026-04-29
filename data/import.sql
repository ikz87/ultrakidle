COPY public.levels FROM '/docker-entrypoint-initdb.d/data/levels_rows.csv' DELIMITER ',' CSV HEADER;

COPY public.ultrakill_enemies FROM '/docker-entrypoint-initdb.d/data/ultrakill_enemies_rows.csv' DELIMITER ',' CSV HEADER;

COPY public.level_enemies FROM '/docker-entrypoint-initdb.d/data/level_enemies_rows.csv' DELIMITER ',' CSV HEADER;
