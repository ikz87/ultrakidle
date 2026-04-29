


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."cybergrind_modifier_enum" AS ENUM (
    'PENANCE',
    'FALSIFIER',
    'LETHE',
    'ECLIPSE',
    'RADIANCE',
    'IDOL'
);


ALTER TYPE "public"."cybergrind_modifier_enum" OWNER TO "postgres";


CREATE TYPE "public"."cybergrind_run_status_enum" AS ENUM (
    'active',
    'failed',
    'abandoned'
);


ALTER TYPE "public"."cybergrind_run_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."enemy_type_enum" AS ENUM (
    '???',
    'DEMON',
    'MACHINE',
    'HUSK',
    'ANGEL',
    'PRIME SOUL'
);


ALTER TYPE "public"."enemy_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."hint_color" AS ENUM (
    'RED',
    'GREEN',
    'YELLOW'
);


ALTER TYPE "public"."hint_color" OWNER TO "postgres";


CREATE TYPE "public"."weight_class_enum" AS ENUM (
    'LIGHT',
    'MEDIUM',
    'HEAVY',
    'SUPERHEAVY'
);


ALTER TYPE "public"."weight_class_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."abandon_cybergrind_run"("version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_min_client_version text;
  v_is_experimental boolean;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  v_is_experimental := (version like '%experimental%');

  if version is null or (version <> v_min_client_version and not v_is_experimental) then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  if auth.uid() is null then
    raise exception 'User must be authenticated.';
  end if;

  if not exists (
    select 1 from cybergrind_runs
    where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'No active Cybergrind run found.';
  end if;

  return public.end_cybergrind_run('abandoned');
end;
$$;


ALTER FUNCTION "public"."abandon_cybergrind_run"("version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_hint_modifiers"("p_hint" "jsonb", "p_modifiers" "public"."cybergrind_modifier_enum"[], "p_eclipsed_column" smallint, "p_radiance_targets" "public"."cybergrind_modifier_enum"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_flip_count int;
  v_arrow_cols text[];
  v_picked text;
  v_cur_result text;
begin
  if 'ECLIPSE' = ANY(p_modifiers) then
    if 'ECLIPSE' = ANY(p_radiance_targets) then
      p_hint := jsonb_set(
        p_hint, '{properties,enemy_type,result}', 'null'::jsonb);
      p_hint := jsonb_set(
        p_hint, '{properties,weight_class,result}', 'null'::jsonb);
    else
      case p_eclipsed_column
        when 1 then
          p_hint := jsonb_set(
            p_hint, '{properties,enemy_type,result}', 'null'::jsonb);
        when 2 then
          p_hint := jsonb_set(
            p_hint, '{properties,weight_class,result}', 'null'::jsonb);
      end case;
    end if;
  end if;

  if 'FALSIFIER' = ANY(p_modifiers) then
    v_flip_count := case
      when 'FALSIFIER' = ANY(p_radiance_targets) then 2 else 1 end;

    v_arrow_cols := '{}';
    if (p_hint #>> '{properties,health,result}')
      in ('higher', 'lower') then
      v_arrow_cols := array_append(v_arrow_cols, 'health');
    end if;
    if (p_hint #>> '{properties,level_count,result}')
      in ('higher', 'lower') then
      v_arrow_cols := array_append(v_arrow_cols, 'level_count');
    end if;
    if (p_hint #>> '{properties,appearance,result}')
      in ('later', 'earlier') then
      v_arrow_cols := array_append(v_arrow_cols, 'appearance');
    end if;

    for i in 1..v_flip_count loop
      if coalesce(array_length(v_arrow_cols, 1), 0) = 0 then
        exit;
      end if;

      v_picked := v_arrow_cols[
        1 + floor(random() * array_length(v_arrow_cols, 1))::int];
      v_cur_result := p_hint #>> array[
        'properties', v_picked, 'result'];
      p_hint := jsonb_set(
        p_hint,
        array['properties', v_picked, 'result'],
        to_jsonb(case v_cur_result
          when 'higher' then 'lower'
          when 'lower' then 'higher'
          when 'later' then 'earlier'
          when 'earlier' then 'later'
        end)
      );
    end loop;
  end if;

  return p_hint;
end;
$$;


ALTER FUNCTION "public"."apply_hint_modifiers"("p_hint" "jsonb", "p_modifiers" "public"."cybergrind_modifier_enum"[], "p_eclipsed_column" smallint, "p_radiance_targets" "public"."cybergrind_modifier_enum"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_guild_member"("p_guild_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  if auth.role() = 'service_role' then
    return;
  end if;

  if not exists (
    select 1 from user_guilds
    where user_id = auth.uid()
      and guild_id = p_guild_id
  ) then
    raise exception 'Access denied: not a member of this guild.';
  end if;
end;
$$;


ALTER FUNCTION "public"."assert_guild_member"("p_guild_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_enemy_hint"("p_target_id" bigint, "p_guess_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  t ultrakill_enemies%rowtype;
  g ultrakill_enemies%rowtype;
  tl levels%rowtype;
  gl levels%rowtype;
  tc int;
  gc int;
  dd int;
begin
  select * into t from ultrakill_enemies where id = p_target_id;
  select * into g from ultrakill_enemies where id = p_guess_id;
  select * into tl from levels where id = t.debut_level_id;
  select * into gl from levels where id = g.debut_level_id;
  select count(*) into tc from level_enemies where enemy_id = p_target_id;
  select count(*) into gc from level_enemies where enemy_id = p_guess_id;
  dd := abs(coalesce(tl.order_index, 0) - coalesce(gl.order_index, 0));

  return jsonb_build_object(
    'correct', p_target_id = p_guess_id,
    'properties', jsonb_build_object(
      'enemy_type', jsonb_build_object(
        'value', g.enemy_type,
        'result', case when t.enemy_type = g.enemy_type
          then 'correct' else 'incorrect' end
      ),
      'weight_class', jsonb_build_object(
        'value', g.weight_class,
        'result', case when t.weight_class = g.weight_class
          then 'correct' else 'incorrect' end
      ),
      'health', jsonb_build_object(
        'value', g.health,
        'result', case
          when t.health = g.health then 'correct'
          when t.health > g.health then 'higher'
          else 'lower' end,
        'color', case
          when t.health = g.health then 'green'
          when abs(t.health - g.health) <= 10 then 'yellow'
          else 'red' end
      ),
      'level_count', jsonb_build_object(
        'value', gc,
        'result', case
          when tc = gc then 'correct'
          when tc > gc then 'higher'
          else 'lower' end,
        'color', case
          when tc = gc then 'green'
          when abs(tc - gc) <= 3 then 'yellow'
          else 'red' end
      ),
      'appearance', jsonb_build_object(
        'value', g.first_appearance,
        'result', case
          when t.debut_level_id = g.debut_level_id then 'correct'
          when coalesce(tl.order_index, 0) > coalesce(gl.order_index, 0) then 'later'
          else 'earlier' end,
        'color', case
          when t.debut_level_id = g.debut_level_id then 'green'
          when dd <= 10 then 'yellow'
          else 'red' end
      )
    )
  );
end;
$$;


ALTER FUNCTION "public"."compute_enemy_hint"("p_target_id" bigint, "p_guess_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_hint_accuracy"("p_hint" "jsonb") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  p jsonb;
  acc numeric(10,1) := 0;
begin
  p := p_hint->'properties';

  acc := acc + case when (p->'enemy_type'->>'result') = 'correct'
    then 1 else 0 end;
  acc := acc + case when (p->'weight_class'->>'result') = 'correct'
    then 1 else 0 end;
  acc := acc + case (p->'health'->>'color')
    when 'green' then 1 when 'yellow' then 0.5 else 0 end;
  acc := acc + case (p->'level_count'->>'color')
    when 'green' then 1 when 'yellow' then 0.5 else 0 end;
  acc := acc + case (p->'appearance'->>'color')
    when 'green' then 1 when 'yellow' then 0.5 else 0 end;

  return acc;
end;
$$;


ALTER FUNCTION "public"."compute_hint_accuracy"("p_hint" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_cybergrind_run"("p_status" "public"."cybergrind_run_status_enum") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  caller_id uuid;
  v_run record;
  v_waves_reached int;
  v_is_new_record boolean := false;
  v_existing record;
  v_profile record;
  v_rank int;
  v_avg_accuracy numeric(10,4);
  v_display_accuracy numeric(10,2);
  v_service_key text;
  v_msg text;
  v_user_mention text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  if p_status = 'active' then
    raise exception 'Cannot end a run with status active.';
  end if;

  select * into v_run
  from cybergrind_runs
  where user_id = caller_id and status = 'active';

  if v_run.id is null then
    raise exception 'No active Cybergrind run found.';
  end if;

  update cybergrind_runs
  set status = p_status, ended_at = now()
  where id = v_run.id;

  v_waves_reached := v_run.current_wave - 1;

  v_avg_accuracy := case
    when v_run.total_guesses > 0
    then v_run.hint_accuracy / v_run.total_guesses
    else 0
  end;

  select * into v_existing
  from cybergrind_records
  where user_id = caller_id and client_version = v_run.client_version;

  if v_existing.user_id is null
    or v_waves_reached > v_existing.best_wave
    or (v_waves_reached = v_existing.best_wave
        and v_avg_accuracy > v_existing.avg_accuracy)
  then
    insert into cybergrind_records (
      user_id, best_wave, total_guesses, hint_accuracy,
      avg_accuracy, run_id, achieved_at, client_version
    ) values (
      caller_id, v_waves_reached, v_run.total_guesses,
      v_run.hint_accuracy, v_avg_accuracy, v_run.id, now(), v_run.client_version
    )
    on conflict (user_id, client_version) do update set
      best_wave = excluded.best_wave,
      total_guesses = excluded.total_guesses,
      hint_accuracy = excluded.hint_accuracy,
      avg_accuracy = excluded.avg_accuracy,
      run_id = excluded.run_id,
      achieved_at = excluded.achieved_at;

    v_is_new_record := true;

    if v_waves_reached > 0 then
      select discord_id, discord_name, pings_opted_in, channel_id, avatar_url
      into v_profile
      from profiles where id = caller_id;

      if v_profile.channel_id is not null then
        select rank into v_rank
        from cybergrind_leaderboard
        where user_id = caller_id;

        v_display_accuracy := round(v_avg_accuracy * 20.0, 2);

        if v_profile.pings_opted_in and v_profile.discord_id is not null then
          v_user_mention := '<@' || v_profile.discord_id || '>';
        else
          v_user_mention := '**' || coalesce(v_profile.discord_name, 'Unknown') || '**';
        end if;

        v_msg := 'New Cybergrind record for ' || v_user_mention || '!'
              || chr(10) || 'Their new global rank is **#' || v_rank || '**';

        select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key';

        perform net.http_post(
          url := 'https://sbvjehmbkmdlflocjjtu.supabase.co'
                 || '/functions/v1/send-message',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_service_key,
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'channel_id', v_profile.channel_id,
            'message', v_msg,
            'embeds', jsonb_build_array(
              jsonb_build_object(
                'color', 16711680,
                'thumbnail', case
                  when v_profile.avatar_url is not null
                  then jsonb_build_object('url', v_profile.avatar_url)
                  else null
                end,
                'description',
                  '```' || chr(10)
                  || 'Waves           ' || v_waves_reached || chr(10)
                  || 'Total Guesses   ' || v_run.total_guesses || chr(10)
                  || 'Accuracy        ' || v_display_accuracy || '%' || chr(10)
                  || '```'
              )
            )
          )
        );
      end if;
    end if;
  end if;

  return json_build_object(
    'is_new_record', v_is_new_record,
    'waves_reached', v_waves_reached,
    'total_guesses', v_run.total_guesses,
    'hint_accuracy', v_run.hint_accuracy,
    'avg_accuracy', v_avg_accuracy
  );
end;
$$;


ALTER FUNCTION "public"."end_cybergrind_run"("p_status" "public"."cybergrind_run_status_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_classic_init"("version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_min_client_version text;
  caller_id uuid;
  current_choice bigint;
  day_number bigint;
  result_history json;
  result_settings jsonb;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  caller_id := auth.uid();

  select daily_choice_id into current_choice
  from current_daily_choice limit 1;

  select count(*) into day_number
  from daily_choices where id <= current_choice;

  select coalesce(json_agg(
    json_build_object(
      'guess_enemy_id', ug.guess_enemy_id,
      'hint_data', ug.hint_data
    ) order by ug.created_at
  ), '[]'::json)
  into result_history
  from user_guesses ug
  where ug.user_id = caller_id
    and ug.daily_choice_id = current_choice;

  select settings into result_settings
  from user_settings where user_id = caller_id;

  return json_build_object(
    'daily_id', current_choice,
    'day_number', day_number,
    'history', result_history,
    'settings', coalesce(result_settings, '{}'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."get_classic_init"("version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cybergrind_start_waves"() RETURNS integer[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_best_wave int;
  v_max int;
  v_waves int[] := '{}';
begin
  select coalesce(best_wave, 0) into v_best_wave
  from cybergrind_records where user_id = auth.uid();

  v_max := (floor(least(coalesce(v_best_wave, 0), 80)::numeric / 10) * 5)::int;

  for i in 1..(v_max / 5) loop
    v_waves := array_append(v_waves, i * 5);
  end loop;

  return v_waves;
end;
$$;


ALTER FUNCTION "public"."get_cybergrind_start_waves"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cybergrind_state"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  caller_id uuid;
  v_run record;
  v_round record;
  v_guesses json;
  v_guess_count int;
  v_lethe boolean;
  v_lethe_limit int;
  v_best record;
  v_min_client_version text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  select best_wave, total_guesses, hint_accuracy, avg_accuracy, client_version
  into v_best
  from cybergrind_records
  where user_id = caller_id;

  select * into v_run
  from cybergrind_runs
  where user_id = caller_id and status = 'active';

  if v_run.id is not null and coalesce(v_run.client_version, '') <> coalesce(v_min_client_version, '') and v_run.client_version not like '%experimental%' then
    update cybergrind_runs
    set status = 'abandoned', ended_at = now()
    where id = v_run.id;

    v_run := null;
  end if;

  if v_run is null or v_run.id is null then
    return json_build_object(
      'status', 'no_run',
      'start_waves', public.get_cybergrind_start_waves(),
      'best', case when v_best is not null then
        json_build_object(
          'best_wave', v_best.best_wave,
          'total_guesses', v_best.total_guesses,
          'avg_accuracy', v_best.avg_accuracy,
          'hint_accuracy', v_best.hint_accuracy,
          'client_version', v_best.client_version
        )
      else null end
    );
  end if;

  select * into v_round
  from cybergrind_rounds
  where run_id = v_run.id
  order by round_number desc
  limit 1;

  v_lethe := 'LETHE' = ANY(v_round.modifiers);

  if v_lethe then
    v_lethe_limit := case
      when 'LETHE' = ANY(v_round.radiance_targets) then 1
      else 2
    end;
  else
    v_lethe_limit := 6;
  end if;

  select count(*) into v_guess_count
  from cybergrind_guesses
  where round_id = v_round.id;

  select coalesce(json_agg(t order by t.created_at), '[]'::json)
  into v_guesses
  from (
    select
      cg.guess_enemy_id,
      cg.hint_data,
      cg.is_penance,
      cg.is_blessed,
      cg.created_at
    from cybergrind_guesses cg
    where cg.round_id = v_round.id
    order by cg.created_at desc
    limit v_lethe_limit
  ) t;

  return json_build_object(
    'status', 'active',
    'run_id', v_run.id,
    'current_wave', v_run.current_wave,
    'round_id', v_round.id,
    'modifiers', to_json(v_round.modifiers),
    'eclipsed_column', v_round.eclipsed_column,
    'radiance_targets', to_json(v_round.radiance_targets),
    'guesses', v_guesses,
    'guess_count', v_guess_count,
    'lethe_active', v_lethe,
    'client_version', v_run.client_version,
    'best', case when v_best is not null then
      json_build_object(
        'best_wave', v_best.best_wave,
        'total_guesses', v_best.total_guesses,
        'avg_accuracy', v_best.avg_accuracy,
        'hint_accuracy', v_best.hint_accuracy,
        'client_version', v_best.client_version
      )
    else null end
  );
end;
$$;


ALTER FUNCTION "public"."get_cybergrind_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_guesses"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  caller_id uuid;
  current_choice bigint;
  result json;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  select daily_choice_id into current_choice
  from current_daily_choice limit 1;

  select coalesce(json_agg(
    json_build_object(
      'guess_enemy_id', ug.guess_enemy_id,
      'hint_data', ug.hint_data
    ) order by ug.created_at
  ), '[]'::json) into result
  from user_guesses ug
  where ug.user_id = caller_id
    and ug.daily_choice_id = current_choice;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_daily_guesses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_inferno_share"("p_discord_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  target_user_id uuid;
  today_set_id bigint;
  result_row record;
  grid text := '';
  s int;
  day_number bigint;
  total_mins int;
  total_secs numeric;
  time_text text;
begin
  select id into target_user_id
  from auth.users
  where email = p_discord_id || '@discord.internal'
  limit 1;

  if target_user_id is null then return null; end if;

  select id into today_set_id
  from inferno_daily_sets
  where game_date = (now() AT TIME ZONE 'America/Managua')::date;

  if today_set_id is null then return null; end if;

  select total_score, score_history, total_time_seconds, completed_at
  into result_row
  from inferno_results
  where user_id = target_user_id and set_id = today_set_id;

  if result_row.completed_at is null then return null; end if;

  foreach s in array result_row.score_history loop
    grid := grid || case
      when s = 100 then '🟩'
      when s >= 60 then '🟧'
      else '🟥'
    end;
    grid := grid || ' +' || s || E'\n';
  end loop;

  select count(*) into day_number
  from inferno_daily_sets where id <= today_set_id;

  total_mins := floor(result_row.total_time_seconds / 60)::int;
  total_secs := result_row.total_time_seconds - (total_mins * 60);
  time_text := total_mins || ':' || lpad(to_char(total_secs, 'FM00.0'), 4, '0');

  return json_build_object(
    'grid', rtrim(grid, E'\n'),
    'total_score', result_row.total_score,
    'max_score', array_length(result_row.score_history, 1) * 100,
    'time_text', time_text,
    'day_number', day_number
  );
end;
$$;


ALTER FUNCTION "public"."get_daily_inferno_share"("p_discord_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_share"("p_discord_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  target_user_id uuid;
  current_choice bigint;
  grid text := '';
  color_row record;
  c hint_color;
  win_data record;
  day_number bigint;
begin
  select id into target_user_id
  from auth.users
  where email = p_discord_id || '@discord.internal'
  limit 1;

  if target_user_id is null then return null; end if;

  select daily_choice_id into current_choice
  from current_daily_choice limit 1;

  select is_win, attempt_count into win_data
  from user_wins
  where user_id = target_user_id
  and daily_choice_id = current_choice;

  -- Only allow sharing completed games
  if win_data.is_win is null then return null; end if;

  for color_row in
    select colors from guess_colors
    where user_id = target_user_id
    and daily_choice_id = current_choice
    order by guess_number
  loop
    foreach c in array color_row.colors loop
      grid := grid || case c
        when 'GREEN' then '🟩'
        when 'RED' then '🟥'
        when 'YELLOW' then '🟧'
      end;
    end loop;
    grid := grid || E'\n';
  end loop;

  -- Count how many dailies have existed (for display number)
  select count(*) into day_number from daily_choices where id <= current_choice;

  return json_build_object(
    'grid', rtrim(grid, E'\n'),
    'is_win', win_data.is_win,
    'attempts', win_data.attempt_count,
    'day_number', day_number
  );
end;
$$;


ALTER FUNCTION "public"."get_daily_share"("p_discord_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_choice bigint;
  result json;
begin
  select daily_choice_id into current_choice
  from current_daily_choice limit 1;

  select json_build_object(
    'total_players', coalesce(total_wins, 0) + coalesce(total_losses, 0),
    'total_wins', coalesce(total_wins, 0),
    'total_losses', coalesce(total_losses, 0)
  ) into result
  from daily_stats_cache
  where daily_choice_id = current_choice;

  return coalesce(result, json_build_object(
    'total_players', 0, 'total_wins', 0, 'total_losses', 0
  ));
end;
$$;


ALTER FUNCTION "public"."get_daily_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_combined_summary"("p_guild_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  prev_daily_id bigint;
  guild_created_at timestamptz;
  guild_start timestamptz;
  streak int := 0;
  daily_results json;
  daily_row record;
  day_num bigint;
  v_set_id bigint;
  v_set_number bigint;
  inferno_result json;
  v_inactive_pings json;
  v_played_user_ids uuid[];
begin

	PERFORM public.assert_guild_member(p_guild_id);
  select created_at into guild_created_at
  from guilds where guild_id = p_guild_id;

  if guild_created_at is null then return null; end if;

  guild_start := date_trunc('day', guild_created_at AT TIME ZONE 'America/Managua')
                 AT TIME ZONE 'America/Managua';

  -- === DAILY SUMMARY ===
  select id into prev_daily_id
  from daily_choices
  order by chosen_at desc
  offset 1 limit 1;

  if prev_daily_id is not null then
    select json_agg(
      json_build_object(
        'name', t.discord_name,
        'discord_id', t.discord_id,
        'pings_opted_in', t.pings_opted_in,
        'is_win', t.is_win,
        'avatar_url', t.avatar_url,
        'attempts', t.attempt_count,
        'colors', t.colors
      ) order by t.attempt_count, t.completed_at
    )
    into daily_results
    from (
      select p.discord_name, p.discord_id, p.pings_opted_in,
             p.avatar_url, uw.is_win,
             uw.attempt_count, uw.completed_at,
             (select json_agg(gc.colors order by gc.guess_number)
              from guess_colors gc
              where gc.user_id = uw.user_id
              and gc.daily_choice_id = prev_daily_id
             ) as colors
      from user_wins uw
      join user_guilds ug on ug.user_id = uw.user_id
      join profiles p on p.id = uw.user_id
      where uw.daily_choice_id = prev_daily_id
      and ug.guild_id = p_guild_id
    ) t;

    if daily_results is not null then
      for daily_row in
        select dc.id
        from daily_choices dc
        where dc.id <= prev_daily_id
        and dc.chosen_at >= guild_start
        order by dc.chosen_at desc
      loop
        if exists (
          select 1 from user_wins uw
          join user_guilds ug on ug.user_id = uw.user_id
          where uw.daily_choice_id = daily_row.id
          and ug.guild_id = p_guild_id
          and uw.is_win = true
        ) then
          streak := streak + 1;
        else
          exit;
        end if;
      end loop;

      select count(*) into day_num
      from daily_choices where id <= prev_daily_id;
    end if;
  end if;

  -- === INFERNO SUMMARY ===
  select id into v_set_id
  from inferno_daily_sets
  where game_date = (CURRENT_DATE - interval '1 day')
  limit 1;

  if v_set_id is not null then
    select count(*) into v_set_number
    from inferno_daily_sets
    where id <= v_set_id;

    select json_build_object(
      'set_number', v_set_number,
      'results', coalesce(
        json_agg(row_to_json(t) order by t.total_score desc, t.total_time_seconds asc),
        '[]'::json
      )
    ) into inferno_result
    from (
      select
        p.discord_name as name,
        p.discord_id,
        p.pings_opted_in,
        p.avatar_url,
        ir.total_score,
        ir.total_time_seconds,
        ir.score_history
      from inferno_results ir
      join profiles p on p.id = ir.user_id
      join user_guilds ug on ug.user_id = ir.user_id
      where ir.set_id = v_set_id
        and ug.guild_id = p_guild_id
        and ir.total_score is not null
    ) t;
  end if;

  -- === INACTIVE OPTED-IN PINGS ===
  -- Collect user_ids who played yesterday in this guild
  v_played_user_ids := array(
    select distinct uid from (
      select uw.user_id as uid
      from user_wins uw
      join user_guilds ug on ug.user_id = uw.user_id
      where uw.daily_choice_id = prev_daily_id
        and ug.guild_id = p_guild_id
      union
      select ir.user_id as uid
      from inferno_results ir
      join user_guilds ug on ug.user_id = ir.user_id
      where ir.set_id = v_set_id
        and ug.guild_id = p_guild_id
        and ir.total_score is not null
    ) played
  );

  select coalesce(json_agg(p.discord_id), '[]'::json)
  into v_inactive_pings
  from profiles p
  join user_guilds ug on ug.user_id = p.id
  where ug.guild_id = p_guild_id
    and p.pings_opted_in = true
    and p.discord_id is not null
    and p.id != all(coalesce(v_played_user_ids, array[]::uuid[]));

  return json_build_object(
    'daily', case
      when daily_results is not null then
        json_build_object('results', daily_results, 'streak', streak, 'day_number', day_num)
      else null
    end,
    'inferno', coalesce(inferno_result, json_build_object('results', '[]'::json, 'set_number', 0)),
    'inactive_pings', v_inactive_pings
  );
end;
$$;


ALTER FUNCTION "public"."get_guild_combined_summary"("p_guild_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_inferno_summary"("p_guild_id" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result json;
  v_set_id bigint;
  v_set_number bigint;
BEGIN

	PERFORM public.assert_guild_member(p_guild_id);
  SELECT id INTO v_set_id
  FROM inferno_daily_sets
  WHERE game_date = (CURRENT_DATE - INTERVAL '1 day')
  LIMIT 1;

  IF v_set_id IS NULL THEN
    RETURN json_build_object('results', '[]'::json, 'set_number', 0);
  END IF;

  SELECT count(*) INTO v_set_number
  FROM inferno_daily_sets
  WHERE id <= v_set_id;

  SELECT json_build_object(
    'set_number', v_set_number,
    'results', COALESCE(
      json_agg(row_to_json(t) ORDER BY t.total_score DESC, t.total_time_seconds ASC),
      '[]'::json
    )
  ) INTO result
  FROM (
    SELECT
      p.discord_name AS name,
      p.avatar_url,
      ir.total_score,
      ir.total_time_seconds,
      ir.score_history
    FROM inferno_results ir
    JOIN profiles p ON p.id = ir.user_id
    JOIN user_guilds ug ON ug.user_id = ir.user_id
    WHERE ir.set_id = v_set_id
      AND ug.guild_id = p_guild_id
      AND ir.total_score IS NOT NULL
  ) t;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_guild_inferno_summary"("p_guild_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_streaks"("p_guild_id" "text") RETURNS TABLE("user_id" "uuid", "streak" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  curr_daily_id bigint;
  prev_daily_id bigint;
BEGIN

	PERFORM public.assert_guild_member(p_guild_id);
  -- Get the current active daily choice
  SELECT daily_choice_id INTO curr_daily_id
  FROM current_daily_choice LIMIT 1;

  -- Get the previous daily choice
  SELECT id INTO prev_daily_id
  FROM daily_choices
  WHERE id < curr_daily_id
  ORDER BY chosen_at DESC LIMIT 1;

  -- Return the calculated streak for everyone in the guild
  RETURN QUERY
  SELECT
    ug.user_id,
    COALESCE(
      CASE
        WHEN sc.last_win_daily_id >= COALESCE(prev_daily_id, curr_daily_id) THEN sc.current_streak
        ELSE 0
      END,
      0
    )::integer AS streak
  FROM user_guilds ug
  LEFT JOIN streak_cache sc ON sc.user_id = ug.user_id
  WHERE ug.guild_id = p_guild_id;
END;
$$;


ALTER FUNCTION "public"."get_guild_streaks"("p_guild_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inferno_round"("version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  v_min_client_version text;
  caller_id uuid;
  today_set_id bigint;
  completed_count int;
  user_total_score int;
  rounds_data json;
  current_round_row record;
  response_data json;
  viewed_at_val timestamptz;
  elapsed_seconds numeric(10,3);
  v_day_number bigint;
  v_paths json;
  v_settings jsonb;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  select count(*) into v_day_number
  from daily_choices
  where id <= (select daily_choice_id from current_daily_choice limit 1);

  select settings into v_settings
  from user_settings where user_id = caller_id;

  select id into today_set_id
  from inferno_daily_sets
  where game_date = (now() AT TIME ZONE 'America/Managua')::date;

  if today_set_id is null then
    return json_build_object(
      'status', 'no_game_today',
      'day_number', v_day_number,
      'paths', '[]'::json,
      'settings', coalesce(v_settings, '{}'::jsonb)
    );
  end if;

  select json_agg(
    json_build_object(
      'round_number', idr.round_number,
      'image_url', idr.public_image_url
    ) order by idr.round_number
  ) into v_paths
  from inferno_daily_rounds idr
  where idr.set_id = today_set_id;

  select count(*) into completed_count
  from inferno_guesses ig
  join inferno_daily_rounds idr on ig.round_id = idr.id
  where idr.set_id = today_set_id and ig.user_id = caller_id;

  if completed_count < 5 then
    if completed_count = 0 then
      insert into inferno_round_views (user_id, set_id, round_number, viewed_at)
      values (caller_id, today_set_id, 1, now())
      on conflict (user_id, set_id, round_number) do update set viewed_at = now();
    else
      insert into inferno_round_views (user_id, set_id, round_number, viewed_at)
      values (caller_id, today_set_id, (completed_count + 1)::smallint, now())
      on conflict (user_id, set_id, round_number) do nothing;
    end if;

    select viewed_at into viewed_at_val
    from inferno_round_views
    where user_id = caller_id and set_id = today_set_id and round_number = completed_count + 1;

    elapsed_seconds := extract(epoch from (now() - coalesce(viewed_at_val, now())));
  end if;

  select json_agg(
    json_build_object(
      'round_number', idr.round_number,
      'image_url', idr.public_image_url,
      'distance', ig.distance,
      'score', ig.score,
      'time_spent_seconds', ig.time_spent_seconds,
      'guessed_level', json_build_object('id', gl.id, 'level_number', gl.level_number, 'level_name', gl.level_name),
      'correct_level', json_build_object('id', cl.id, 'level_number', cl.level_number, 'level_name', cl.level_name),
      'submitted_by', json_build_object('name', ims.discord_name, 'avatar_url', ims.discord_avatar_url)
    ) order by idr.round_number
  ) into rounds_data
  from inferno_guesses ig
  join inferno_daily_rounds idr on ig.round_id = idr.id
  join levels gl on gl.id = ig.guessed_level_id
  join levels cl on cl.id = idr.correct_level_id
  join image_submissions ims on ims.id = idr.image_submission_id
  where idr.set_id = today_set_id and ig.user_id = caller_id;

  if completed_count >= 5 then
    select total_score into user_total_score
    from inferno_results
    where set_id = today_set_id and user_id = caller_id;

    response_data := json_build_object(
      'status', 'completed',
      'set_id', today_set_id,
      'total_score', user_total_score,
      'rounds', coalesce(rounds_data, '[]'::json),
      'day_number', v_day_number,
      'paths', coalesce(v_paths, '[]'::json),
      'settings', coalesce(v_settings, '{}'::jsonb)
    );
  else
    select idr.id, idr.public_image_url, ims.discord_name, ims.discord_avatar_url
    into current_round_row
    from inferno_daily_rounds idr
    join image_submissions ims on ims.id = idr.image_submission_id
    where idr.set_id = today_set_id
      and idr.round_number = completed_count + 1;

    response_data := json_build_object(
      'status', 'in_progress',
      'set_id', today_set_id,
      'round_number', completed_count + 1,
      'round_id', current_round_row.id,
      'image_url', current_round_row.public_image_url,
      'elapsed_seconds', elapsed_seconds,
      'submitted_by', json_build_object('name', current_round_row.discord_name, 'avatar_url', current_round_row.discord_avatar_url),
      'previous_rounds', coalesce(rounds_data, '[]'::json),
      'day_number', v_day_number,
      'paths', coalesce(v_paths, '[]'::json),
      'settings', coalesce(v_settings, '{}'::jsonb)
    );
  end if;

  return response_data;
end;
$$;


ALTER FUNCTION "public"."get_inferno_round"("version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_min_client_version"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'min_client_version'
$$;


ALTER FUNCTION "public"."get_min_client_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_submission_stats"("p_submission_ids" bigint[]) RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        s.id as submission_id,
        (select count(*)
         from inferno_daily_rounds r
         where r.image_submission_id = s.id
        )::int as times_picked,
        round(avg(ig.time_spent_seconds)::numeric, 2) as avg_time_seconds,
        round(avg(ig.score)::numeric, 2) as avg_score
      from unnest(p_submission_ids) as s(id)
      left join inferno_daily_rounds idr
        on idr.image_submission_id = s.id
      left join inferno_guesses ig
        on ig.round_id = idr.id
      group by s.id
      order by s.id
    ) t
  );
end;
$$;


ALTER FUNCTION "public"."get_submission_stats"("p_submission_ids" bigint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_longest_streak"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  caller_id uuid;
  result int;
begin
  caller_id := auth.uid();

  if caller_id is distinct from p_user_id
    and not exists (
      select 1 from user_guilds ug1
      join user_guilds ug2 on ug1.guild_id = ug2.guild_id
      where ug1.user_id = caller_id
        and ug2.user_id = p_user_id
    )
  then
    raise exception 'Access denied: not in a shared guild.';
  end if;

  with ordered_dailies as (
    select id, row_number() over (order by chosen_at) as rn
    from daily_choices
  ),
  wins_with_groups as (
    select
      od.rn - row_number() over (order by od.rn) as grp
    from user_wins uw
    join ordered_dailies od on od.id = uw.daily_choice_id
    where uw.user_id = p_user_id
      and uw.is_win = true
  )
  select coalesce(max(cnt), 0) into result
  from (
    select count(*) as cnt
    from wins_with_groups
    group by grp
  ) t;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_user_longest_streak"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_streak_by_id"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  curr_daily_id bigint;
  prev_daily_id bigint;
  cached_streak int;
begin
  if auth.uid() is distinct from p_user_id
    and not public.shares_guild_with(p_user_id)
  then
    raise exception 'Access denied: not in a shared guild.';
  end if;

  select daily_choice_id into curr_daily_id
  from current_daily_choice limit 1;

  select id into prev_daily_id
  from daily_choices
  where id < curr_daily_id
  order by chosen_at desc
  limit 1;

  select case
    when last_win_daily_id >= coalesce(prev_daily_id, curr_daily_id)
    then current_streak
    else 0
  end into cached_streak
  from streak_cache
  where user_id = p_user_id;

  return coalesce(cached_streak, 0);
end;
$$;


ALTER FUNCTION "public"."get_user_streak_by_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_never_played"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  return not exists (
    select 1 from user_guesses where user_id = auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."has_never_played"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."init_game"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  caller_id uuid;
  current_choice bigint;
  result_history json;
  result_stats json;
  result_streak int;
  result_donors json;
  day_number bigint;
  today_set_id bigint;
  inferno_total json;
  inferno_avg json;
  inferno_status json;
  inferno_paths json;
  completed_count int;
  user_total_score int;
  rounds_data json;
  result_settings jsonb;
  current_round_row record;
  viewed_at_val timestamptz;
  elapsed_seconds numeric(10,3);
  -- rank vars
  curr_daily_id bigint;
  prev_daily_id bigint;
  my_streak int;
  streak_rank bigint;
  streak_tied bigint;
  my_score int;
  my_time numeric(10,3);
  inferno_rank bigint;
  inferno_total_players bigint;
begin
  caller_id := auth.uid();
  select daily_choice_id into current_choice from current_daily_choice limit 1;
  select count(*) into day_number from daily_choices where id <= current_choice;

  -- Guess history
  select coalesce(json_agg(json_build_object('guess_enemy_id', ug.guess_enemy_id, 'hint_data', ug.hint_data) order by ug.created_at), '[]'::json) into result_history
  from user_guesses ug where ug.user_id = caller_id and ug.daily_choice_id = current_choice;

  -- Daily stats
  select json_build_object('total_players', coalesce(total_wins, 0) + coalesce(total_losses, 0), 'total_wins', coalesce(total_wins, 0), 'total_losses', coalesce(total_losses, 0))
  into result_stats from daily_stats_cache where daily_choice_id = current_choice;

  -- Streak from cache
  curr_daily_id := current_choice;

  select id into prev_daily_id
  from daily_choices
  where id < curr_daily_id
  order by chosen_at desc limit 1;

  select case
    when last_win_daily_id >= coalesce(prev_daily_id, curr_daily_id)
    then current_streak else 0
  end into my_streak
  from streak_cache where user_id = caller_id;

  my_streak := coalesce(my_streak, 0);
  result_streak := my_streak;

  -- Classic rank
  if my_streak > 0 then
    select count(*) + 1 into streak_rank
    from streak_cache
    where current_streak > my_streak
      and last_win_daily_id >= coalesce(prev_daily_id, curr_daily_id);

    select count(*) into streak_tied
    from streak_cache
    where current_streak = my_streak
      and last_win_daily_id >= coalesce(prev_daily_id, curr_daily_id);
  end if;

  -- Inferno
  select id into today_set_id from inferno_daily_sets where game_date = (now() AT TIME ZONE 'America/Managua')::date;

  if today_set_id is not null then
    select json_agg(
      json_build_object(
        'round_number', idr.round_number,
        'image_url', idr.public_image_url
      ) order by idr.round_number
    ) into inferno_paths
    from inferno_daily_rounds idr
    where idr.set_id = today_set_id;
  end if;

  if today_set_id is null then
    inferno_status := json_build_object('status', 'no_game_today');
  else
    select json_build_object('total_score', coalesce(total_score, 0), 'games_played', coalesce(games_played, 0))
    into inferno_total from inferno_user_stats_cache where user_id = caller_id;

    select json_build_object('avg_score', case when total_completed > 0 then round(total_score_sum::numeric / total_completed, 2) else null end, 'total_completed', coalesce(total_completed, 0))
    into inferno_avg from inferno_daily_stats_cache where set_id = today_set_id;

    select count(*) into completed_count from inferno_guesses ig join inferno_daily_rounds idr on ig.round_id = idr.id
    where idr.set_id = today_set_id and ig.user_id = caller_id;

    if completed_count < 5 then
      if completed_count = 0 then
        insert into inferno_round_views (user_id, set_id, round_number, viewed_at)
        values (caller_id, today_set_id, 1, now()) on conflict (user_id, set_id, round_number) do update set viewed_at = now();
      else
        insert into inferno_round_views (user_id, set_id, round_number, viewed_at)
        values (caller_id, today_set_id, (completed_count + 1)::smallint, now()) on conflict (user_id, set_id, round_number) do nothing;
      end if;
      select viewed_at into viewed_at_val from inferno_round_views where user_id = caller_id and set_id = today_set_id and round_number = completed_count + 1;
      elapsed_seconds := extract(epoch from (now() - coalesce(viewed_at_val, now())));
    end if;

    select json_agg(json_build_object(
        'round_number', idr.round_number, 'image_url', idr.public_image_url, 'distance', ig.distance, 'score', ig.score, 'time_spent_seconds', ig.time_spent_seconds,
        'guessed_level', json_build_object('id', gl.id, 'level_number', gl.level_number, 'level_name', gl.level_name),
        'correct_level', json_build_object('id', cl.id, 'level_number', cl.level_number, 'level_name', cl.level_name),
        'submitted_by', json_build_object('name', ims.discord_name, 'avatar_url', ims.discord_avatar_url)
      ) order by idr.round_number
    ) into rounds_data
    from inferno_guesses ig join inferno_daily_rounds idr on ig.round_id = idr.id join levels gl on gl.id = ig.guessed_level_id
    join levels cl on cl.id = idr.correct_level_id join image_submissions ims on ims.id = idr.image_submission_id
    where idr.set_id = today_set_id and ig.user_id = caller_id;

    if completed_count >= 5 then
      select total_score into user_total_score from inferno_results where set_id = today_set_id and user_id = caller_id;
      inferno_status := json_build_object('status', 'completed', 'set_id', today_set_id, 'total_score', user_total_score, 'rounds', coalesce(rounds_data, '[]'::json));
    else
      select idr.id, idr.public_image_url, ims.discord_name, ims.discord_avatar_url into current_round_row
      from inferno_daily_rounds idr join image_submissions ims on ims.id = idr.image_submission_id
      where idr.set_id = today_set_id and idr.round_number = completed_count + 1;

      inferno_status := json_build_object(
        'status', 'in_progress', 'set_id', today_set_id, 'round_number', completed_count + 1, 'round_id', current_round_row.id,
        'image_url', current_round_row.public_image_url, 'elapsed_seconds', elapsed_seconds,
        'submitted_by', json_build_object('name', current_round_row.discord_name, 'avatar_url', current_round_row.discord_avatar_url),
        'previous_rounds', coalesce(rounds_data, '[]'::json)
      );
    end if;

    -- Inferno rank (only if completed today)
    select total_score, total_time_seconds into my_score, my_time
    from inferno_results
    where set_id = today_set_id and user_id = caller_id and completed_at is not null;

    if my_score is not null then
      select count(*) + 1 into inferno_rank
      from inferno_results
      where set_id = today_set_id
        and completed_at is not null
        and (
          total_score > my_score
          or (total_score = my_score and total_time_seconds < my_time)
        );

      select count(*) into inferno_total_players
      from inferno_results
      where set_id = today_set_id and completed_at is not null;
    end if;
  end if;

  -- Donors
  select coalesce(json_agg(json_build_object('name', s.name, 'amount', s.amount, 'currency', s.currency, 'created_at', s.created_at) order by s.created_at desc), '[]'::json)
  into result_donors from supporters s where s.board_expiry > now();

  select settings into result_settings
  from user_settings
  where user_id = caller_id;

  return json_build_object(
    'daily_id', current_choice, 'day_number', day_number, 'history', result_history, 'stats', result_stats, 'streak', result_streak, 'donors', result_donors,
	'settings', coalesce(result_settings, '{}'::jsonb),
    'ranks', json_build_object(
      'classic', json_build_object(
        'rank', case when my_streak > 0 then streak_rank else null end,
        'tied_with', case when my_streak > 0 then streak_tied else null end,
        'streak', my_streak
      ),
      'inferno', json_build_object(
        'rank', inferno_rank,
        'total_players', inferno_total_players,
        'score', my_score,
        'time', my_time
      )
    ),
    'inferno', json_build_object(
      'total', coalesce(inferno_total, json_build_object('total_score', 0, 'games_played', 0)),
      'daily_avg', coalesce(inferno_avg, json_build_object('avg_score', null, 'total_completed', 0)),
      'status', inferno_status,
      'paths', coalesce(inferno_paths, '[]'::json)
    )
  );
end;
$$;


ALTER FUNCTION "public"."init_game"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of_guild"("p_guild_id" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_guilds
    WHERE user_id = auth.uid()
      AND guild_id = p_guild_id
  );
$$;


ALTER FUNCTION "public"."is_member_of_guild"("p_guild_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pick_daily_enemy"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_id bigint;
  today_nicaragua date;
begin
  today_nicaragua := (now() AT TIME ZONE 'America/Managua')::date;

  insert into daily_choices (enemy_id, chosen_at)
  select id, now()
  from ultrakill_enemies
  where active = true
    and id not in (
      select enemy_id from daily_choices
      order by chosen_at desc
      limit 5
    )
  order by random()
  limit 1
  returning id into new_id;

  delete from current_daily_choice;

  insert into current_daily_choice (daily_choice_id, game_date)
  values (new_id, today_nicaragua);
end;
$$;


ALTER FUNCTION "public"."pick_daily_enemy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_user_daily"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_choice_id bigint;
begin
  select daily_choice_id into current_choice_id
  from current_daily_choice limit 1;

  if current_choice_id is null then
    raise exception 'No active daily choice found.';
  end if;

  delete from user_wins
  where user_id = p_user_id and daily_choice_id = current_choice_id;

  delete from guess_colors
  where user_id = p_user_id and daily_choice_id = current_choice_id;

  delete from user_guesses
  where user_id = p_user_id and daily_choice_id = current_choice_id;
end;
$$;


ALTER FUNCTION "public"."reset_user_daily"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_daily_rotation"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  today_nicaragua date;
  new_set_id bigint;
  submission record;
  round_num smallint := 0;
  service_key text;
  classic_success boolean := false;
  inferno_success boolean := false;
  classic_error text;
  inferno_error text;
begin
  today_nicaragua := (now() AT TIME ZONE 'America/Managua')::date;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  begin
    perform pick_daily_enemy();
    classic_success := true;
  exception when others then
    classic_error := SQLERRM;
    insert into debug_logs (event, payload)
    values ('classic_rotation_failed', jsonb_build_object(
      'error', classic_error,
      'date', today_nicaragua
    ));
  end;

  begin
    if not exists (select 1 from inferno_daily_sets where game_date = today_nicaragua) then
      insert into inferno_daily_sets (game_date)
      values (today_nicaragua)
      returning id into new_set_id;

      for submission in
        select id, level_id
        from image_submissions
        where status = 'approved'
          and id not in (
            select idr.image_submission_id
            from inferno_daily_rounds idr
            join inferno_daily_sets ids on ids.id = idr.set_id
            where ids.game_date > today_nicaragua - interval '30 days'
          )
        order by random()
        limit 5
      loop
        round_num := round_num + 1;
        insert into inferno_daily_rounds
          (set_id, round_number, image_submission_id, correct_level_id,
           public_image_url)
        values
          (new_set_id, round_num, submission.id, submission.level_id, '');
      end loop;

      if round_num < 5 then
        raise exception 'Not enough approved submissions (got %).', round_num;
      end if;

      perform net.http_post(
        url := 'https://sbvjehmbkmdlflocjjtu.supabase.co'
               || '/functions/v1/inferno-daily-setup',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'set_id', new_set_id,
          'date', today_nicaragua
        )
      );
    else
      select id into new_set_id from inferno_daily_sets where game_date = today_nicaragua;
    end if;

    inferno_success := true;

  exception when others then
    inferno_error := SQLERRM;
    insert into debug_logs (event, payload)
    values ('inferno_rotation_failed', jsonb_build_object(
      'error', inferno_error,
      'date', today_nicaragua
    ));
  end;

  perform net.http_post(
    url := 'https://ultrakidle-automations.onrender.com/cron/daily-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."run_daily_rotation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shares_guild_with"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_guilds ug1
    JOIN user_guilds ug2 ON ug1.guild_id = ug2.guild_id
    WHERE ug1.user_id = auth.uid()
      AND ug2.user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."shares_guild_with"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_cybergrind_run"("start_wave" integer DEFAULT 1, "version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  v_min_client_version text;
  caller_id uuid;
  v_run_id bigint;
  v_round_id bigint;
  v_enemy_id bigint;
  v_best_wave int;
  v_max_start_wave int;
  v_mod_count int;
  v_mods public.cybergrind_modifier_enum[];
  v_radiance_count int;
  v_radiance_targets public.cybergrind_modifier_enum[];
  v_eclipsed smallint;
  v_penance_ids bigint[];
  v_blessed_ids bigint[];
  v_penance_count int;
  v_pid bigint;
  v_p_hint jsonb;
  v_guesses json;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  if exists (
    select 1 from cybergrind_runs
    where user_id = caller_id and status = 'active'
  ) then
    return (select get_cybergrind_state());
  end if;

  if start_wave < 1 then
    raise exception 'Start wave must be at least 1.';
  end if;

  if start_wave > 1 then
    if start_wave % 5 <> 0 then
      raise exception 'Start wave must be 1 or a multiple of 5.';
    end if;

    select coalesce(max(best_wave), 0) into v_best_wave
    from cybergrind_records where user_id = caller_id;

    v_max_start_wave :=
      (floor(least(coalesce(v_best_wave, 0), 80)::numeric / 10) * 5)::int;

    if start_wave > v_max_start_wave then
      raise exception 'Start wave % exceeds maximum allowed (%)',
        start_wave, v_max_start_wave;
    end if;
  end if;

  insert into cybergrind_runs (user_id, current_wave, client_version)
  values (caller_id, start_wave, version)
  returning id into v_run_id;

  select id into v_enemy_id
  from ultrakill_enemies
  where active = true
  order by random() limit 1;

  v_mod_count := case
    when start_wave <= 2  then 0
    when start_wave <= 5  then 1
    when start_wave <= 10 then 2
    when start_wave <= 15 then 3
    when start_wave <= 25 then 4
    when start_wave <= 35 then 5
    else 6
  end;

  if v_mod_count = 0 then
    v_mods := '{}';
  elsif v_mod_count = 1 then
    with shuffled as materialized (
      select unnest(ARRAY['PENANCE','FALSIFIER','LETHE','ECLIPSE']::cybergrind_modifier_enum[]) as m, random() as r
    )
    select array(select m from shuffled order by r limit 1)
    into v_mods;
  else
    with shuffled as materialized (
      select unnest(ARRAY['PENANCE','FALSIFIER','LETHE','ECLIPSE','RADIANCE','IDOL']::cybergrind_modifier_enum[]) as m, random() as r
    )
    select array(select m from shuffled order by r limit v_mod_count)
    into v_mods;
  end if;

  v_radiance_targets := '{}';
  if 'RADIANCE' = ANY(v_mods) then
    v_radiance_count := case
      when start_wave < 46 then 1
      when start_wave < 61 then 2
      when start_wave < 76 then 3
      when start_wave < 91 then 4
      else 5
    end;

    select array(
      select m from unnest(v_mods) m
      where m <> 'RADIANCE'
      order by random()
      limit v_radiance_count
    ) into v_radiance_targets;
  end if;

  v_eclipsed := null;
  if 'ECLIPSE' = ANY(v_mods) then
    v_eclipsed := (1 + floor(random() * 2))::smallint;
  end if;

  v_blessed_ids := null;

  v_penance_ids := null;
  if 'PENANCE' = ANY(v_mods) then
    v_penance_count := case
      when 'PENANCE' = ANY(v_radiance_targets) then 2 else 1 end;
    select array(
      select id from ultrakill_enemies
      where active = true and id <> v_enemy_id
      order by random() limit v_penance_count
    ) into v_penance_ids;
  end if;

  insert into cybergrind_rounds (
    run_id, round_number, enemy_id, modifiers,
    eclipsed_column, penance_enemy_ids, radiance_targets,
    blessed_enemy_ids
  ) values (
    v_run_id, start_wave, v_enemy_id, v_mods,
    v_eclipsed, v_penance_ids, v_radiance_targets,
    v_blessed_ids
  ) returning id into v_round_id;

  if v_penance_ids is not null then
    foreach v_pid in array v_penance_ids loop
      v_p_hint := public.compute_enemy_hint(v_enemy_id, v_pid);
      v_p_hint := public.apply_hint_modifiers(
        v_p_hint, v_mods, v_eclipsed, v_radiance_targets
      );
      insert into cybergrind_guesses (
        round_id, user_id, guess_enemy_id, hint_data, is_penance
      ) values (
        v_round_id, caller_id, v_pid, v_p_hint, true
      );
    end loop;
  end if;

  select coalesce(json_agg(
    json_build_object(
      'guess_enemy_id', cg.guess_enemy_id,
      'hint_data', cg.hint_data,
      'is_penance', cg.is_penance,
      'is_blessed', cg.is_blessed,
      'created_at', cg.created_at
    ) order by cg.created_at
  ), '[]'::json)
  into v_guesses
  from cybergrind_guesses cg
  where cg.round_id = v_round_id;

  return json_build_object(
    'run_id', v_run_id,
    'round_id', v_round_id,
    'round_number', start_wave,
    'modifiers', to_json(v_mods),
    'eclipsed_column', v_eclipsed,
    'radiance_targets', to_json(v_radiance_targets),
    'guesses', v_guesses
  );
end;
$$;


ALTER FUNCTION "public"."start_cybergrind_run"("start_wave" integer, "version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_cybergrind_guess"("guess_id" bigint, "version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  v_min_client_version text;
  caller_id uuid;
  v_run record;
  v_round record;
  v_guess_count int;
  v_guess_number int;
  is_correct boolean;
  v_hint_data jsonb;
  v_accuracy_delta numeric(10,1);
  v_is_blessed boolean := false;

  v_new_wave int;
  v_mod_count int;
  v_new_modifiers public.cybergrind_modifier_enum[];
  v_radiance_count int;
  v_new_radiance_targets public.cybergrind_modifier_enum[];
  v_new_enemy_id bigint;
  v_new_round_id bigint;
  v_new_eclipsed smallint;
  v_new_penance_ids bigint[];
  v_new_blessed_ids bigint[];
  v_idol_count int;
  v_idol_rounds int;
  v_penance_count int;
  v_pid bigint;
  v_p_hint jsonb;

  v_end_result json;
  v_total_guesses int;
  v_run_hint_accuracy numeric(10,1);
  v_avg_accuracy numeric(10,4);

  v_state_round_id bigint;
  v_state_round record;
  v_state_wave int;
  v_state_status text;
  v_lethe boolean;
  v_lethe_limit int;
  v_state_guess_count int;
  v_state_guesses json;

  v_completed_guesses json;

  v_correct_id bigint;
  v_is_new_record boolean;
  v_waves_reached int;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'User must be authenticated.';
  end if;

  select * into v_run
  from cybergrind_runs
  where user_id = caller_id and status = 'active';

  if v_run.id is null then
    raise exception 'No active Cybergrind run found.';
  end if;

  select * into v_round
  from cybergrind_rounds
  where run_id = v_run.id
  order by round_number desc
  limit 1;

  if v_round.id is null then
    raise exception 'No round found for this run.';
  end if;

  select count(*) into v_guess_count
  from cybergrind_guesses where round_id = v_round.id;

  if v_guess_count >= 6 then
    raise exception 'Maximum guesses reached for this round.';
  end if;

  if guess_id = 0 then
    select id into guess_id
    from ultrakill_enemies
    where active = true
      and id <> v_round.enemy_id
      and id not in (
        select guess_enemy_id from cybergrind_guesses
        where round_id = v_round.id
      )
    order by random()
    limit 1;

    if guess_id is null then
      raise exception 'No valid random enemy available.';
    end if;
  end if;

  v_hint_data := public.compute_enemy_hint(v_round.enemy_id, guess_id);
  is_correct := (v_hint_data->>'correct')::boolean;
  v_accuracy_delta := public.compute_hint_accuracy(v_hint_data);
  v_guess_number := v_guess_count + 1;

  if v_round.blessed_enemy_ids is not null and guess_id = ANY(v_round.blessed_enemy_ids) then
    v_is_blessed := true;
  end if;

  if not is_correct then
    if v_is_blessed then
      v_hint_data := jsonb_set(v_hint_data, '{properties,enemy_type,result}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,weight_class,result}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,health,result}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,health,color}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,level_count,result}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,level_count,color}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,appearance,result}', 'null'::jsonb);
      v_hint_data := jsonb_set(v_hint_data, '{properties,appearance,color}', 'null'::jsonb);
    else
      v_hint_data := public.apply_hint_modifiers(
        v_hint_data, v_round.modifiers,
        v_round.eclipsed_column, v_round.radiance_targets
      );
    end if;
  end if;

  insert into cybergrind_guesses (
    round_id, user_id, guess_enemy_id, hint_data, is_penance, is_blessed
  ) values (
    v_round.id, caller_id, guess_id, v_hint_data, false, v_is_blessed
  );

  update cybergrind_runs
  set total_guesses = total_guesses + 1,
      hint_accuracy = hint_accuracy + v_accuracy_delta
  where id = v_run.id;

  v_correct_id := null;
  v_is_new_record := null;
  v_waves_reached := null;
  v_avg_accuracy := null;
  v_state_status := 'active';
  v_completed_guesses := null;

  if is_correct then
    v_new_wave := v_run.current_wave + 1;

    update cybergrind_runs
    set current_wave = v_new_wave
    where id = v_run.id;

    v_mod_count := case
      when v_new_wave <= 2  then 0
      when v_new_wave <= 5  then 1
      when v_new_wave <= 10 then 2
      when v_new_wave <= 15 then 3
      when v_new_wave <= 25 then 4
      when v_new_wave <= 35 then 5
      else 6
    end;

    if v_mod_count = 0 then
      v_new_modifiers := '{}';
    elsif v_mod_count = 1 then
      with shuffled as materialized (
        select unnest(ARRAY['PENANCE','FALSIFIER','LETHE','ECLIPSE']::cybergrind_modifier_enum[]) as m, random() as r
      )
      select array(select m from shuffled order by r limit 1)
      into v_new_modifiers;
    else
      with shuffled as materialized (
        select unnest(ARRAY['PENANCE','FALSIFIER','LETHE','ECLIPSE','RADIANCE','IDOL']::cybergrind_modifier_enum[]) as m, random() as r
      )
      select array(select m from shuffled order by r limit v_mod_count)
      into v_new_modifiers;
    end if;

    v_new_radiance_targets := '{}';
    if 'RADIANCE' = ANY(v_new_modifiers) then
      v_radiance_count := case
        when v_new_wave < 46 then 1
        when v_new_wave < 61 then 2
        when v_new_wave < 76 then 3
        when v_new_wave < 91 then 4
        else 5
      end;

      select array(
        select m from unnest(v_new_modifiers) m
        where m <> 'RADIANCE'
        order by random()
        limit v_radiance_count
      ) into v_new_radiance_targets;
    end if;

    select id into v_new_enemy_id
    from ultrakill_enemies
    where active = true
    order by random() limit 1;

    v_new_eclipsed := null;
    if 'ECLIPSE' = ANY(v_new_modifiers) then
      v_new_eclipsed := (1 + floor(random() * 2))::smallint;
    end if;

    v_new_blessed_ids := null;
    if 'IDOL' = ANY(v_new_modifiers) then
      v_idol_count := case when 'IDOL' = ANY(v_new_radiance_targets) then 6 else 3 end;
      v_idol_rounds := case when 'IDOL' = ANY(v_new_radiance_targets) then 4 else 2 end;

      select array(
        select enemy_id
        from (
          select distinct enemy_id
          from (
            select cg.guess_enemy_id as enemy_id
            from cybergrind_guesses cg
            join cybergrind_rounds cr on cr.id = cg.round_id
            where cr.run_id = v_run.id
              and cr.round_number >= (v_new_wave - v_idol_rounds)

            union

            select cr.enemy_id
            from cybergrind_rounds cr
            where cr.run_id = v_run.id
              and cr.round_number >= (v_new_wave - v_idol_rounds)
          ) candidates
          where enemy_id <> v_new_enemy_id
        ) distinct_candidates
        order by random()
        limit v_idol_count
      ) into v_new_blessed_ids;
    end if;

    v_new_penance_ids := null;
    if 'PENANCE' = ANY(v_new_modifiers) then
      v_penance_count := case
        when 'PENANCE' = ANY(v_new_radiance_targets) then 2 else 1 end;
      select array(
        select id from ultrakill_enemies
        where active = true and id <> v_new_enemy_id
        order by random() limit v_penance_count
      ) into v_new_penance_ids;
    end if;

    insert into cybergrind_rounds (
      run_id, round_number, enemy_id, modifiers,
      eclipsed_column, penance_enemy_ids, radiance_targets,
      blessed_enemy_ids
    ) values (
      v_run.id, v_new_wave, v_new_enemy_id, v_new_modifiers,
      v_new_eclipsed, v_new_penance_ids, v_new_radiance_targets,
      v_new_blessed_ids
    ) returning id into v_new_round_id;

    if v_new_penance_ids is not null then
      foreach v_pid in array v_new_penance_ids loop
        v_p_hint := public.compute_enemy_hint(v_new_enemy_id, v_pid);
        v_p_hint := public.apply_hint_modifiers(
          v_p_hint, v_new_modifiers,
          v_new_eclipsed, v_new_radiance_targets
        );
        insert into cybergrind_guesses (
          round_id, user_id, guess_enemy_id, hint_data, is_penance, is_blessed
        ) values (
          v_new_round_id, caller_id, v_pid, v_p_hint, true, false
        );
      end loop;
    end if;

    v_state_round_id := v_new_round_id;
    v_state_wave := v_new_wave;

  elsif v_guess_number = 6 then
    v_end_result := public.end_cybergrind_run('failed');
    v_correct_id := v_round.enemy_id;
    v_is_new_record := (v_end_result->>'is_new_record')::boolean;
    v_waves_reached := (v_end_result->>'waves_reached')::int;
    v_total_guesses := (v_end_result->>'total_guesses')::int;
    v_run_hint_accuracy := (v_end_result->>'hint_accuracy')::numeric;
    v_avg_accuracy := (v_end_result->>'avg_accuracy')::numeric;
    v_state_status := 'failed';
    v_state_round_id := v_round.id;
    v_state_wave := v_run.current_wave;

  else
    v_state_round_id := v_round.id;
    v_state_wave := v_run.current_wave;
  end if;

  if is_correct or v_state_status = 'failed' then
    select coalesce(json_agg(t order by t.created_at), '[]'::json)
    into v_completed_guesses
    from (
      select
        cg.guess_enemy_id,
        cg.hint_data,
        cg.is_penance,
        cg.is_blessed,
        cg.created_at
      from cybergrind_guesses cg
      where cg.round_id = v_round.id
      order by cg.created_at
    ) t;
  end if;

  select * into v_state_round
  from cybergrind_rounds where id = v_state_round_id;

  v_lethe := 'LETHE' = ANY(v_state_round.modifiers);
  if v_lethe then
    v_lethe_limit := case
      when 'LETHE' = ANY(v_state_round.radiance_targets) then 1
      else 2
    end;
  else
    v_lethe_limit := 6;
  end if;

  select count(*) into v_state_guess_count
  from cybergrind_guesses where round_id = v_state_round_id;

  select coalesce(json_agg(t order by t.created_at), '[]'::json)
  into v_state_guesses
  from (
    select
      cg.guess_enemy_id,
      cg.hint_data,
      cg.is_penance,
      cg.is_blessed,
      cg.created_at
    from cybergrind_guesses cg
    where cg.round_id = v_state_round_id
    order by cg.created_at desc
    limit v_lethe_limit
  ) t;

  return json_build_object(
    'result', case when is_correct then 'correct' else 'incorrect' end,
    'hint_data', v_hint_data,
    'round_guesses', v_completed_guesses,
    'game_over', (v_state_status = 'failed'),
    'correct_id', v_correct_id,
    'is_new_record', v_is_new_record,
    'waves_reached', v_waves_reached,
    'total_guesses', v_total_guesses,
    'hint_accuracy', v_run_hint_accuracy,
    'avg_accuracy', v_avg_accuracy,
    'state', json_build_object(
      'status', v_state_status,
      'run_id', v_run.id,
      'current_wave', v_state_wave,
      'round_id', v_state_round_id,
      'modifiers', to_json(v_state_round.modifiers),
      'eclipsed_column', v_state_round.eclipsed_column,
      'radiance_targets', to_json(v_state_round.radiance_targets),
      'guesses', v_state_guesses,
      'guess_count', v_state_guess_count,
      'guesses_left', greatest(0, 6 - v_state_guess_count),
      'lethe_active', v_lethe
    )
  );
end;
$$;


ALTER FUNCTION "public"."submit_cybergrind_guess"("guess_id" bigint, "version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_daily_guess"("guess_id" bigint, "version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  v_min_client_version text;
  current_choice_id bigint;
  target_enemy_id bigint;
  guess_count int;
  already_played boolean;
  t_row ultrakill_enemies%rowtype;
  g_row ultrakill_enemies%rowtype;
  t_level_row levels%rowtype;
  g_level_row levels%rowtype;
  t_level_count int;
  g_level_count int;
  caller_id uuid;
  response_data json;
  is_correct boolean;
  debut_distance int;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED'
      using hint = 'Client version mismatch. Please refresh the page.';
  end if;

  caller_id := auth.uid();

  insert into debug_logs (user_id, event, payload)
  values (caller_id, 'guess_attempt_started', json_build_object('guess_id', guess_id));

  if caller_id is null then
    raise exception 'User must be authenticated (Anonymous session missing).';
  end if;

  select daily_choice_id into current_choice_id
  from current_daily_choice
  limit 1;

  if current_choice_id is null then
    raise exception 'No daily choice active in current_daily_choice table.';
  end if;

  select enemy_id into target_enemy_id
  from daily_choices
  where id = current_choice_id;

  if guess_id = 0 then
    select id into guess_id
    from ultrakill_enemies
    where active = true
      and id <> target_enemy_id
      and id not in (
        select guess_enemy_id from user_guesses
        where user_id = caller_id and daily_choice_id = current_choice_id
      )
    order by random()
    limit 1;

    if guess_id is null then
      raise exception 'No valid random enemy available.';
    end if;
  end if;

  select exists(
    select 1 from user_wins
    where user_id = caller_id
    and daily_choice_id = current_choice_id
  ) into already_played;

  if already_played then
    raise exception 'User already completed today challenge.';
  end if;

  select count(*) into guess_count
  from user_guesses
  where user_id = caller_id and daily_choice_id = current_choice_id;

  if guess_count >= 5 then
    raise exception 'Maximum guess limit reached.';
  end if;

  select * into t_row from ultrakill_enemies where id = target_enemy_id;
  select * into g_row from ultrakill_enemies where id = guess_id;

  if g_row.id is null then
    raise exception 'Invalid guess_id: enemy not found.';
  end if;

  select * into t_level_row from levels where id = t_row.debut_level_id;
  select * into g_level_row from levels where id = g_row.debut_level_id;

  select count(*) into t_level_count from level_enemies where enemy_id = target_enemy_id;
  select count(*) into g_level_count from level_enemies where enemy_id = guess_id;

  is_correct := (target_enemy_id = guess_id);

  debut_distance := abs(coalesce(t_level_row.order_index, 0) - coalesce(g_level_row.order_index, 0));

  response_data := json_build_object(
    'correct', is_correct,
    'guess_id', guess_id,
    'properties', json_build_object(
      'enemy_type', json_build_object(
        'value', g_row.enemy_type,
        'result', (case when t_row.enemy_type = g_row.enemy_type then 'correct' else 'incorrect' end)
      ),
      'weight_class', json_build_object(
        'value', g_row.weight_class,
        'result', (case when t_row.weight_class = g_row.weight_class then 'correct' else 'incorrect' end)
      ),
      'health', json_build_object(
        'value', g_row.health,
        'result', (case
            when t_row.health = g_row.health then 'correct'
            when t_row.health > g_row.health then 'higher'
            else 'lower'
          end),
        'color', (case
            when t_row.health = g_row.health then 'green'
            when abs(t_row.health - g_row.health) <= 10 then 'yellow'
            else 'red'
          end)
      ),
      'level_count', json_build_object(
        'value', g_level_count,
        'result', (case
            when t_level_count = g_level_count then 'correct'
            when t_level_count > g_level_count then 'higher'
            else 'lower'
          end),
        'color', (case
            when t_level_count = g_level_count then 'green'
            when abs(t_level_count - g_level_count) <= 3 then 'yellow'
            else 'red'
          end)
      ),
      'appearance', json_build_object(
        'value', g_row.first_appearance,
        'result', (case
            when t_row.debut_level_id = g_row.debut_level_id then 'correct'
            when coalesce(t_level_row.order_index, 0) > coalesce(g_level_row.order_index, 0) then 'later'
            else 'earlier'
          end),
        'color', (case
            when t_row.debut_level_id = g_row.debut_level_id then 'green'
            when debut_distance <= 10 then 'yellow'
            else 'red'
          end)
      )
    )
  );

  if not is_correct and guess_count = 4 then
    response_data := response_data::jsonb || jsonb_build_object('correct_id', target_enemy_id);
  end if;

  begin
    insert into user_guesses (user_id, daily_choice_id, guess_enemy_id, hint_data)
    values (caller_id, current_choice_id, guess_id, response_data);
  exception
    when unique_violation then
      raise exception 'Duplicate guess detected.';
    when others then
      insert into debug_logs (user_id, event, payload)
      values (caller_id, 'insert_guess_failed', json_build_object('error', SQLERRM, 'detail', SQLSTATE));
      raise;
  end;

  insert into guess_colors (user_id, daily_choice_id, guess_number, colors)
  values (
    caller_id, current_choice_id, guess_count + 1,
    ARRAY[
      (case when target_enemy_id = guess_id then 'GREEN' else 'RED' end)::hint_color,
      (case when t_row.enemy_type = g_row.enemy_type then 'GREEN' else 'RED' end)::hint_color,
      (case when t_row.weight_class = g_row.weight_class then 'GREEN' else 'RED' end)::hint_color,
      (case when t_row.health = g_row.health then 'GREEN' when abs(t_row.health - g_row.health) <= 10 then 'YELLOW' else 'RED' end)::hint_color,
      (case when t_level_count = g_level_count then 'GREEN' when abs(t_level_count - g_level_count) <= 3 then 'YELLOW' else 'RED' end)::hint_color,
      (case when t_row.debut_level_id = g_row.debut_level_id then 'GREEN' when debut_distance <= 10 then 'YELLOW' else 'RED' end)::hint_color
    ]
  );

  if is_correct then
    insert into user_wins (user_id, daily_choice_id, is_win, attempt_count)
    values (caller_id, current_choice_id, true, guess_count + 1);
  elsif guess_count = 4 then
    insert into user_wins (user_id, daily_choice_id, is_win, attempt_count)
    values (caller_id, current_choice_id, false, 5);
  end if;

  insert into debug_logs (user_id, event, payload)
  values (caller_id, 'guess_success', json_build_object('is_correct', is_correct));

  return response_data;

exception when others then
  insert into debug_logs (user_id, event, payload)
  values (auth.uid(), 'function_crashed', json_build_object('error', SQLERRM, 'detail', SQLSTATE));
  raise;
end;
$$;


ALTER FUNCTION "public"."submit_daily_guess"("guess_id" bigint, "version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_inferno_guess"("p_round_id" bigint, "p_guessed_level_id" bigint, "version" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
declare
  v_min_client_version text;
  TOTAL_ROUNDS constant int := 5;
  caller_id uuid;
  round_row record;
  guess_count int;
  computed_dist int;
  computed_score int;
  computed_time_seconds numeric(10,3);
  view_time timestamptz;
  t_total_score int;
  response_data json;
  guessed_level_info record;
  correct_level_info record;
begin
  select decrypted_secret into v_min_client_version
  from vault.decrypted_secrets
  where name = 'min_client_version';

  if version is null or version <> v_min_client_version then
    raise exception 'CLIENT_OUTDATED' using hint = 'Client version mismatch.';
  end if;

  caller_id := auth.uid();
  if caller_id is null then raise exception 'User must be authenticated.'; end if;

  select idr.set_id, idr.round_number, idr.correct_level_id into round_row
  from inferno_daily_rounds idr
  join inferno_daily_sets ids on ids.id = idr.set_id
  where idr.id = p_round_id
    and ids.game_date = (now() AT TIME ZONE 'America/Managua')::date;

  if round_row.set_id is null then raise exception 'Round not found.'; end if;

  select count(*) into guess_count
  from inferno_guesses ig
  join inferno_daily_rounds idr on ig.round_id = idr.id
  where idr.set_id = round_row.set_id and ig.user_id = caller_id;

  if guess_count >= TOTAL_ROUNDS then raise exception 'Game already completed.'; end if;

  select viewed_at into view_time
  from inferno_round_views
  where user_id = caller_id and set_id = round_row.set_id and round_number = round_row.round_number;

  computed_time_seconds := extract(epoch from (now() - coalesce(view_time, now())));

  select order_index, level_number, level_name into correct_level_info from levels where id = round_row.correct_level_id;
  select order_index, level_number, level_name into guessed_level_info from levels where id = p_guessed_level_id;

  computed_dist := abs(coalesce(correct_level_info.order_index, 0) - coalesce(guessed_level_info.order_index, 0));
  computed_score := round(100.0 * power(0.85, computed_dist))::integer;

  begin
    insert into inferno_guesses (user_id, round_id, guessed_level_id, distance, score, time_spent_seconds)
    values (caller_id, p_round_id, p_guessed_level_id, computed_dist, computed_score, computed_time_seconds);
  exception when unique_violation then
      raise exception 'Duplicate guess detected.';
  end;

  if guess_count = 0 then
    insert into inferno_results (user_id, set_id, score_history, distance_history, completed_at)
    values (caller_id, round_row.set_id, ARRAY[computed_score], ARRAY[computed_dist], null);
  else
    update inferno_results
    set score_history = array_append(score_history, computed_score),
        distance_history = array_append(distance_history, computed_dist),
        total_score = case when guess_count = TOTAL_ROUNDS - 1 then (select sum(s) from unnest(score_history) s) + computed_score else total_score end,
        completed_at = case when guess_count = TOTAL_ROUNDS - 1 then now() else completed_at end
    where user_id = caller_id and set_id = round_row.set_id
    returning total_score into t_total_score;
  end if;

  response_data := json_build_object(
    'round_number', round_row.round_number,
    'guessed_level', json_build_object('id', p_guessed_level_id, 'level_number', guessed_level_info.level_number, 'level_name', guessed_level_info.level_name),
    'correct_level', json_build_object('id', round_row.correct_level_id, 'level_number', correct_level_info.level_number, 'level_name', correct_level_info.level_name),
    'distance', computed_dist,
    'score', computed_score,
    'time_spent_seconds', computed_time_seconds,
    'game_complete', (guess_count = TOTAL_ROUNDS - 1),
    'total_score', t_total_score
  );

  return response_data;
end;
$$;


ALTER FUNCTION "public"."submit_inferno_guess"("p_round_id" bigint, "p_guessed_level_id" bigint, "version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_dispatch_submissions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  service_key text;
  request_id bigint;
begin
  -- Retrieve the service role key from Vault
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if service_key is null then
    raise exception 'service_role_key not found in vault';
  end if;

  -- Fire the webhook asynchronously using pg_net
  select net.http_post(
    url := 'https://sbvjehmbkmdlflocjjtu.supabase.co/functions/v1/dispatch-submissions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) into request_id;

exception when others then
  -- Log errors to your debug_logs table if something goes wrong during the request buildup
  insert into debug_logs (event, payload)
  values ('dispatch_submissions_failed', jsonb_build_object(
    'error', SQLERRM,
    'timestamp', now()
  ));
end;
$$;


ALTER FUNCTION "public"."trigger_dispatch_submissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_poll_submissions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  service_key text;
  request_id bigint;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if service_key is null then
    raise exception 'service_role_key not found in vault';
  end if;

  select net.http_post(
    url := 'https://ultrakidle-automations.onrender.com/run',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) into request_id;

exception when others then
  insert into debug_logs (event, payload)
  values ('poll_submissions_failed', jsonb_build_object(
    'error', SQLERRM,
    'timestamp', now()
  ));
end;
$$;


ALTER FUNCTION "public"."trigger_poll_submissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_stats_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    INSERT INTO daily_stats_cache (daily_choice_id, total_wins, total_losses)
    VALUES (
        NEW.daily_choice_id,
        CASE WHEN NEW.is_win THEN 1 ELSE 0 END,
        CASE WHEN NEW.is_win THEN 0 ELSE 1 END
    )
    ON CONFLICT (daily_choice_id) DO UPDATE SET
        total_wins = daily_stats_cache.total_wins + CASE WHEN NEW.is_win THEN 1 ELSE 0 END,
        total_losses = daily_stats_cache.total_losses + CASE WHEN NEW.is_win THEN 0 ELSE 1 END,
        updated_at = now();
    RETURN NEW;
end;
$$;


ALTER FUNCTION "public"."update_daily_stats_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inferno_stats_caches"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    summed_time numeric(10,3);
begin
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        -- Calculate total time from all rounds in this set for this user
        select sum(time_spent_seconds) into summed_time
        from inferno_guesses ig
        join inferno_daily_rounds idr on ig.round_id = idr.id
        where idr.set_id = NEW.set_id and ig.user_id = NEW.user_id;

        -- Update the result record with the total time
        update inferno_results
        set total_time_seconds = coalesce(summed_time, 0)
        where id = NEW.id;

        -- Update Daily Cache
        INSERT INTO inferno_daily_stats_cache (set_id, total_score_sum, total_completed)
        VALUES (NEW.set_id, coalesce(NEW.total_score, 0), 1)
        ON CONFLICT (set_id) DO UPDATE SET
            total_score_sum = inferno_daily_stats_cache.total_score_sum + coalesce(NEW.total_score, 0),
            total_completed = inferno_daily_stats_cache.total_completed + 1,
            updated_at = now();

        -- Update User Cache
        INSERT INTO inferno_user_stats_cache (user_id, total_score, games_played)
        VALUES (NEW.user_id, coalesce(NEW.total_score, 0), 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_score = inferno_user_stats_cache.total_score + coalesce(NEW.total_score, 0),
            games_played = inferno_user_stats_cache.games_played + 1,
            updated_at = now();
    END IF;
    RETURN NEW;
end;
$$;


ALTER FUNCTION "public"."update_inferno_stats_caches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  prev_daily_id bigint;
  cached record;
BEGIN
  IF NEW.is_win THEN
    SELECT id INTO prev_daily_id
    FROM daily_choices
    WHERE id < NEW.daily_choice_id
    ORDER BY chosen_at DESC
    LIMIT 1;

    SELECT current_streak, last_win_daily_id
    INTO cached
    FROM streak_cache
    WHERE user_id = NEW.user_id;

    IF FOUND AND cached.last_win_daily_id = prev_daily_id THEN
      UPDATE streak_cache
      SET current_streak = cached.current_streak + 1,
          last_win_daily_id = NEW.daily_choice_id,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      INSERT INTO streak_cache (user_id, current_streak, last_win_daily_id)
      VALUES (NEW.user_id, 1, NEW.daily_choice_id)
      ON CONFLICT (user_id) DO UPDATE
      SET current_streak = 1,
          last_win_daily_id = NEW.daily_choice_id,
          updated_at = now();
    END IF;
  ELSE
    INSERT INTO streak_cache (user_id, current_streak, last_win_daily_id)
    VALUES (NEW.user_id, 0, NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET current_streak = 0,
        last_win_daily_id = NULL,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_streak_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wipe_user_data"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from user_wins where user_id = p_user_id;
  delete from guess_colors where user_id = p_user_id;
  delete from user_guesses where user_id = p_user_id;
end;
$$;


ALTER FUNCTION "public"."wipe_user_data"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."current_daily_choice" (
    "daily_choice_id" bigint NOT NULL,
    "game_date" "date" NOT NULL
);


ALTER TABLE "public"."current_daily_choice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cybergrind_guesses" (
    "id" bigint NOT NULL,
    "round_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "guess_enemy_id" bigint NOT NULL,
    "hint_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_penance" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_blessed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."cybergrind_guesses" OWNER TO "postgres";


ALTER TABLE "public"."cybergrind_guesses" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cybergrind_guesses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cybergrind_records" (
    "user_id" "uuid" NOT NULL,
    "best_wave" integer DEFAULT 0 NOT NULL,
    "total_guesses" integer DEFAULT 0 NOT NULL,
    "hint_accuracy" numeric(10,1) DEFAULT 0 NOT NULL,
    "run_id" bigint,
    "achieved_at" timestamp with time zone DEFAULT "now"(),
    "avg_accuracy" numeric(10,4) DEFAULT 0 NOT NULL,
    "client_version" "text" DEFAULT '1.2.0'::"text" NOT NULL
);


ALTER TABLE "public"."cybergrind_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "discord_name" "text" NOT NULL,
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discord_id" "text",
    "pings_opted_in" boolean DEFAULT false NOT NULL,
    "channel_id" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cybergrind_leaderboard" AS
 SELECT "cr"."user_id",
    "p"."discord_name",
    "p"."avatar_url",
    "cr"."best_wave",
    "cr"."total_guesses",
    "cr"."hint_accuracy",
    "cr"."avg_accuracy",
    "cr"."achieved_at",
    "cr"."client_version",
    ("rank"() OVER (ORDER BY "cr"."best_wave" DESC, "cr"."avg_accuracy" DESC))::integer AS "rank"
   FROM ("public"."cybergrind_records" "cr"
     JOIN "public"."profiles" "p" ON (("p"."id" = "cr"."user_id")))
  WHERE (("cr"."best_wave" > 0) AND ("cr"."client_version" = "public"."get_min_client_version"()));


ALTER VIEW "public"."cybergrind_leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cybergrind_rounds" (
    "id" bigint NOT NULL,
    "run_id" bigint NOT NULL,
    "round_number" integer NOT NULL,
    "enemy_id" bigint NOT NULL,
    "modifiers" "public"."cybergrind_modifier_enum"[] DEFAULT '{}'::"public"."cybergrind_modifier_enum"[] NOT NULL,
    "eclipsed_column" smallint,
    "radiance_targets" "public"."cybergrind_modifier_enum"[] DEFAULT '{}'::"public"."cybergrind_modifier_enum"[],
    "penance_enemy_ids" bigint[],
    "blessed_enemy_ids" bigint[] DEFAULT '{}'::bigint[]
);


ALTER TABLE "public"."cybergrind_rounds" OWNER TO "postgres";


ALTER TABLE "public"."cybergrind_rounds" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cybergrind_rounds_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cybergrind_runs" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_wave" integer DEFAULT 1 NOT NULL,
    "status" "public"."cybergrind_run_status_enum" DEFAULT 'active'::"public"."cybergrind_run_status_enum" NOT NULL,
    "total_guesses" integer DEFAULT 0 NOT NULL,
    "hint_accuracy" numeric(10,1) DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "client_version" "text" DEFAULT '1.2.0'::"text" NOT NULL
);


ALTER TABLE "public"."cybergrind_runs" OWNER TO "postgres";


ALTER TABLE "public"."cybergrind_runs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cybergrind_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_choices" (
    "id" bigint NOT NULL,
    "enemy_id" bigint NOT NULL,
    "chosen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_choices" OWNER TO "postgres";


ALTER TABLE "public"."daily_choices" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."daily_choices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_notification_channels" (
    "guild_id" "text" NOT NULL,
    "channel_id" "text" NOT NULL,
    "configured_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_notification_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_stats_cache" (
    "daily_choice_id" bigint NOT NULL,
    "total_wins" integer DEFAULT 0 NOT NULL,
    "total_losses" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_stats_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debug_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "event" "text",
    "payload" "jsonb"
);


ALTER TABLE "public"."debug_logs" OWNER TO "postgres";


ALTER TABLE "public"."debug_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."debug_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."guess_colors" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "daily_choice_id" bigint NOT NULL,
    "guess_number" smallint NOT NULL,
    "colors" "public"."hint_color"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."guess_colors" REPLICA IDENTITY FULL;


ALTER TABLE "public"."guess_colors" OWNER TO "postgres";


ALTER TABLE "public"."guess_colors" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."guess_colors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."guilds" (
    "guild_id" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guilds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_submissions" (
    "id" bigint NOT NULL,
    "guild_id" "text" NOT NULL,
    "channel_id" "text" NOT NULL,
    "message_id" "text" NOT NULL,
    "discord_user_id" "text" NOT NULL,
    "discord_name" "text" NOT NULL,
    "discord_avatar_url" "text",
    "level_id" bigint NOT NULL,
    "image_url" "text" NOT NULL,
    "storage_path" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "thumbs_up" integer DEFAULT 0,
    "thumbs_down" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."image_submissions" OWNER TO "postgres";


ALTER TABLE "public"."image_submissions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."image_submissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inferno_daily_rounds" (
    "id" bigint NOT NULL,
    "set_id" bigint NOT NULL,
    "round_number" smallint NOT NULL,
    "image_submission_id" bigint NOT NULL,
    "correct_level_id" bigint NOT NULL,
    "public_image_url" "text" NOT NULL,
    CONSTRAINT "inferno_daily_rounds_round_number_check" CHECK ((("round_number" >= 1) AND ("round_number" <= 5)))
);


ALTER TABLE "public"."inferno_daily_rounds" OWNER TO "postgres";


ALTER TABLE "public"."inferno_daily_rounds" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."inferno_daily_rounds_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inferno_daily_sets" (
    "id" bigint NOT NULL,
    "game_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inferno_daily_sets" OWNER TO "postgres";


ALTER TABLE "public"."inferno_daily_sets" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."inferno_daily_sets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inferno_daily_stats_cache" (
    "set_id" bigint NOT NULL,
    "total_score_sum" bigint DEFAULT 0 NOT NULL,
    "total_completed" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inferno_daily_stats_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inferno_guesses" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "round_id" bigint NOT NULL,
    "guessed_level_id" bigint NOT NULL,
    "distance" integer NOT NULL,
    "score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "time_spent_seconds" numeric(10,3)
);

ALTER TABLE ONLY "public"."inferno_guesses" REPLICA IDENTITY FULL;


ALTER TABLE "public"."inferno_guesses" OWNER TO "postgres";


ALTER TABLE "public"."inferno_guesses" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."inferno_guesses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inferno_results" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "set_id" bigint NOT NULL,
    "total_score" integer,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "score_history" integer[] DEFAULT '{}'::integer[],
    "distance_history" integer[] DEFAULT '{}'::integer[],
    "total_time_seconds" numeric(10,3) DEFAULT 0
);

ALTER TABLE ONLY "public"."inferno_results" REPLICA IDENTITY FULL;


ALTER TABLE "public"."inferno_results" OWNER TO "postgres";


ALTER TABLE "public"."inferno_results" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."inferno_results_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inferno_round_views" (
    "user_id" "uuid" NOT NULL,
    "set_id" bigint NOT NULL,
    "round_number" smallint NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inferno_round_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inferno_user_stats_cache" (
    "user_id" "uuid" NOT NULL,
    "total_score" bigint DEFAULT 0 NOT NULL,
    "games_played" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inferno_user_stats_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."level_enemies" (
    "level_id" bigint NOT NULL,
    "enemy_id" bigint NOT NULL
);


ALTER TABLE "public"."level_enemies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" bigint NOT NULL,
    "level_number" "text" NOT NULL,
    "level_name" "text" NOT NULL,
    "order_index" integer,
    "thumbnail_url" "text",
    "wiki_url" "text"
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


ALTER TABLE "public"."levels" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."levels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."read_messages" (
    "user_id" "uuid" NOT NULL,
    "message_id" "text" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."read_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rejected_threads" (
    "thread_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rejected_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streak_cache" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "last_win_daily_id" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."streak_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submission_forums" (
    "channel_id" "text" NOT NULL,
    "guild_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submission_forums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submitter_profiles" (
    "discord_user_id" "text" NOT NULL,
    "discord_name" "text" NOT NULL,
    "discord_avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submitter_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supporters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kofi_transaction_id" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "amount" numeric(10,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "message" "text",
    "shipping_address" "text",
    "created_at" timestamp with time zone,
    "payment_provider" "text",
    "transaction_type" "text",
    "is_subscription" boolean DEFAULT false,
    "subscription_expiry" timestamp with time zone,
    "kofi_id" "text",
    "board_expiry" timestamp with time zone
);


ALTER TABLE "public"."supporters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ultrakill_enemies" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "enemy_type" "public"."enemy_type_enum",
    "weight_class" "public"."weight_class_enum",
    "is_boss" boolean,
    "can_spawn_in_grind" boolean,
    "is_flammable" boolean,
    "has_head_hitzone" boolean,
    "has_limb_hitzone" boolean,
    "health" double precision,
    "first_appearance" "text",
    "debut_level_id" bigint,
    "icon_urls" "text"[],
    "wiki_link" "text",
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."ultrakill_enemies" OWNER TO "postgres";


ALTER TABLE "public"."ultrakill_enemies" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ultrakill_enemies_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_guesses" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "daily_choice_id" bigint NOT NULL,
    "guess_enemy_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hint_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_guesses" OWNER TO "postgres";


ALTER TABLE "public"."user_guesses" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_guesses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_guilds" (
    "user_id" "uuid" NOT NULL,
    "guild_id" "text" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_guilds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "settings" "jsonb"
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_wins" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "daily_choice_id" bigint NOT NULL,
    "is_win" boolean DEFAULT false NOT NULL,
    "attempt_count" integer DEFAULT 0,
    "completed_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."user_wins" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_wins" OWNER TO "postgres";


ALTER TABLE "public"."user_wins" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_wins_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."current_daily_choice"
    ADD CONSTRAINT "current_daily_choice_pkey" PRIMARY KEY ("daily_choice_id");



ALTER TABLE ONLY "public"."cybergrind_guesses"
    ADD CONSTRAINT "cybergrind_guesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cybergrind_records"
    ADD CONSTRAINT "cybergrind_records_pkey" PRIMARY KEY ("user_id", "client_version");



ALTER TABLE ONLY "public"."cybergrind_records"
    ADD CONSTRAINT "cybergrind_records_user_id_client_version_key" UNIQUE ("user_id", "client_version");



ALTER TABLE ONLY "public"."cybergrind_rounds"
    ADD CONSTRAINT "cybergrind_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cybergrind_rounds"
    ADD CONSTRAINT "cybergrind_rounds_run_id_round_number_key" UNIQUE ("run_id", "round_number");



ALTER TABLE ONLY "public"."cybergrind_runs"
    ADD CONSTRAINT "cybergrind_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_choices"
    ADD CONSTRAINT "daily_choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_notification_channels"
    ADD CONSTRAINT "daily_notification_channels_pkey" PRIMARY KEY ("guild_id");



ALTER TABLE ONLY "public"."daily_stats_cache"
    ADD CONSTRAINT "daily_stats_cache_pkey" PRIMARY KEY ("daily_choice_id");



ALTER TABLE ONLY "public"."debug_logs"
    ADD CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guess_colors"
    ADD CONSTRAINT "guess_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guilds"
    ADD CONSTRAINT "guilds_pkey" PRIMARY KEY ("guild_id");



ALTER TABLE ONLY "public"."image_submissions"
    ADD CONSTRAINT "image_submissions_message_id_key" UNIQUE ("message_id");



ALTER TABLE ONLY "public"."image_submissions"
    ADD CONSTRAINT "image_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inferno_daily_rounds"
    ADD CONSTRAINT "inferno_daily_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inferno_daily_rounds"
    ADD CONSTRAINT "inferno_daily_rounds_set_id_round_number_key" UNIQUE ("set_id", "round_number");



ALTER TABLE ONLY "public"."inferno_daily_sets"
    ADD CONSTRAINT "inferno_daily_sets_game_date_key" UNIQUE ("game_date");



ALTER TABLE ONLY "public"."inferno_daily_sets"
    ADD CONSTRAINT "inferno_daily_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inferno_daily_stats_cache"
    ADD CONSTRAINT "inferno_daily_stats_cache_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."inferno_guesses"
    ADD CONSTRAINT "inferno_guesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inferno_guesses"
    ADD CONSTRAINT "inferno_guesses_user_id_round_id_key" UNIQUE ("user_id", "round_id");



ALTER TABLE ONLY "public"."inferno_results"
    ADD CONSTRAINT "inferno_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inferno_results"
    ADD CONSTRAINT "inferno_results_user_id_set_id_key" UNIQUE ("user_id", "set_id");



ALTER TABLE ONLY "public"."inferno_round_views"
    ADD CONSTRAINT "inferno_round_views_pkey" PRIMARY KEY ("user_id", "set_id", "round_number");



ALTER TABLE ONLY "public"."inferno_user_stats_cache"
    ADD CONSTRAINT "inferno_user_stats_cache_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."level_enemies"
    ADD CONSTRAINT "level_enemies_pkey" PRIMARY KEY ("level_id", "enemy_id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."read_messages"
    ADD CONSTRAINT "read_messages_pkey" PRIMARY KEY ("user_id", "message_id");



ALTER TABLE ONLY "public"."rejected_threads"
    ADD CONSTRAINT "rejected_threads_pkey" PRIMARY KEY ("thread_id");



ALTER TABLE ONLY "public"."streak_cache"
    ADD CONSTRAINT "streak_cache_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."submission_forums"
    ADD CONSTRAINT "submission_forums_pkey" PRIMARY KEY ("channel_id");



ALTER TABLE ONLY "public"."submitter_profiles"
    ADD CONSTRAINT "submitter_profiles_pkey" PRIMARY KEY ("discord_user_id");



ALTER TABLE ONLY "public"."supporters"
    ADD CONSTRAINT "supporters_kofi_transaction_id_key" UNIQUE ("kofi_transaction_id");



ALTER TABLE ONLY "public"."supporters"
    ADD CONSTRAINT "supporters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ultrakill_enemies"
    ADD CONSTRAINT "ultrakill_enemies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_choices"
    ADD CONSTRAINT "unique_daily_enemy" UNIQUE ("chosen_at");



ALTER TABLE ONLY "public"."user_guesses"
    ADD CONSTRAINT "unique_user_guess" UNIQUE ("user_id", "daily_choice_id", "guess_enemy_id");



ALTER TABLE ONLY "public"."user_guesses"
    ADD CONSTRAINT "user_guesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_guilds"
    ADD CONSTRAINT "user_guilds_pkey" PRIMARY KEY ("user_id", "guild_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_wins"
    ADD CONSTRAINT "user_wins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_wins"
    ADD CONSTRAINT "user_wins_user_id_daily_choice_id_key" UNIQUE ("user_id", "daily_choice_id");



CREATE INDEX "idx_cybergrind_guesses_round" ON "public"."cybergrind_guesses" USING "btree" ("round_id");



CREATE INDEX "idx_cybergrind_guesses_user" ON "public"."cybergrind_guesses" USING "btree" ("user_id");



CREATE INDEX "idx_cybergrind_records_leaderboard" ON "public"."cybergrind_records" USING "btree" ("best_wave" DESC, "avg_accuracy" DESC);



CREATE INDEX "idx_cybergrind_rounds_run" ON "public"."cybergrind_rounds" USING "btree" ("run_id");



CREATE UNIQUE INDEX "idx_cybergrind_runs_active_user" ON "public"."cybergrind_runs" USING "btree" ("user_id") WHERE ("status" = 'active'::"public"."cybergrind_run_status_enum");



CREATE INDEX "idx_guess_colors_daily_user" ON "public"."guess_colors" USING "btree" ("daily_choice_id", "user_id");



CREATE INDEX "idx_inferno_daily_rounds_set" ON "public"."inferno_daily_rounds" USING "btree" ("set_id");



CREATE INDEX "idx_inferno_daily_rounds_submission" ON "public"."inferno_daily_rounds" USING "btree" ("image_submission_id");



CREATE INDEX "idx_inferno_guesses_round" ON "public"."inferno_guesses" USING "btree" ("round_id");



CREATE INDEX "idx_inferno_guesses_user" ON "public"."inferno_guesses" USING "btree" ("user_id");



CREATE INDEX "idx_inferno_results_set" ON "public"."inferno_results" USING "btree" ("set_id");



CREATE INDEX "idx_user_guilds_guild_id" ON "public"."user_guilds" USING "btree" ("guild_id");



CREATE INDEX "idx_user_guilds_user_id" ON "public"."user_guilds" USING "btree" ("user_id");



CREATE INDEX "idx_user_wins_daily" ON "public"."user_wins" USING "btree" ("daily_choice_id");



CREATE OR REPLACE TRIGGER "trg_update_daily_stats" AFTER INSERT ON "public"."user_wins" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_stats_cache"();



CREATE OR REPLACE TRIGGER "trg_update_inferno_stats" AFTER UPDATE ON "public"."inferno_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_inferno_stats_caches"();



CREATE OR REPLACE TRIGGER "trg_update_streak_cache" AFTER INSERT ON "public"."user_wins" FOR EACH ROW EXECUTE FUNCTION "public"."update_streak_cache"();



ALTER TABLE ONLY "public"."current_daily_choice"
    ADD CONSTRAINT "current_daily_choice_daily_choice_id_fkey" FOREIGN KEY ("daily_choice_id") REFERENCES "public"."daily_choices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_guesses"
    ADD CONSTRAINT "cybergrind_guesses_guess_enemy_id_fkey" FOREIGN KEY ("guess_enemy_id") REFERENCES "public"."ultrakill_enemies"("id");



ALTER TABLE ONLY "public"."cybergrind_guesses"
    ADD CONSTRAINT "cybergrind_guesses_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."cybergrind_rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_guesses"
    ADD CONSTRAINT "cybergrind_guesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_records"
    ADD CONSTRAINT "cybergrind_records_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."cybergrind_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_records"
    ADD CONSTRAINT "cybergrind_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_rounds"
    ADD CONSTRAINT "cybergrind_rounds_enemy_id_fkey" FOREIGN KEY ("enemy_id") REFERENCES "public"."ultrakill_enemies"("id");



ALTER TABLE ONLY "public"."cybergrind_rounds"
    ADD CONSTRAINT "cybergrind_rounds_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."cybergrind_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cybergrind_runs"
    ADD CONSTRAINT "cybergrind_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_choices"
    ADD CONSTRAINT "daily_choices_enemy_id_fkey" FOREIGN KEY ("enemy_id") REFERENCES "public"."ultrakill_enemies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_notification_channels"
    ADD CONSTRAINT "daily_notification_channels_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_stats_cache"
    ADD CONSTRAINT "daily_stats_cache_daily_choice_id_fkey" FOREIGN KEY ("daily_choice_id") REFERENCES "public"."daily_choices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guess_colors"
    ADD CONSTRAINT "guess_colors_daily_choice_id_fkey" FOREIGN KEY ("daily_choice_id") REFERENCES "public"."daily_choices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guess_colors"
    ADD CONSTRAINT "guess_colors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_submissions"
    ADD CONSTRAINT "image_submissions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_submissions"
    ADD CONSTRAINT "image_submissions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id");



ALTER TABLE ONLY "public"."inferno_daily_rounds"
    ADD CONSTRAINT "inferno_daily_rounds_correct_level_id_fkey" FOREIGN KEY ("correct_level_id") REFERENCES "public"."levels"("id");



ALTER TABLE ONLY "public"."inferno_daily_rounds"
    ADD CONSTRAINT "inferno_daily_rounds_image_submission_id_fkey" FOREIGN KEY ("image_submission_id") REFERENCES "public"."image_submissions"("id");



ALTER TABLE ONLY "public"."inferno_daily_rounds"
    ADD CONSTRAINT "inferno_daily_rounds_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."inferno_daily_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_daily_stats_cache"
    ADD CONSTRAINT "inferno_daily_stats_cache_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."inferno_daily_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_guesses"
    ADD CONSTRAINT "inferno_guesses_guessed_level_id_fkey" FOREIGN KEY ("guessed_level_id") REFERENCES "public"."levels"("id");



ALTER TABLE ONLY "public"."inferno_guesses"
    ADD CONSTRAINT "inferno_guesses_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."inferno_daily_rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_guesses"
    ADD CONSTRAINT "inferno_guesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_results"
    ADD CONSTRAINT "inferno_results_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."inferno_daily_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_results"
    ADD CONSTRAINT "inferno_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_round_views"
    ADD CONSTRAINT "inferno_round_views_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."inferno_daily_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_round_views"
    ADD CONSTRAINT "inferno_round_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inferno_user_stats_cache"
    ADD CONSTRAINT "inferno_user_stats_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."level_enemies"
    ADD CONSTRAINT "level_enemies_enemy_id_fkey" FOREIGN KEY ("enemy_id") REFERENCES "public"."ultrakill_enemies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."level_enemies"
    ADD CONSTRAINT "level_enemies_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."read_messages"
    ADD CONSTRAINT "read_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streak_cache"
    ADD CONSTRAINT "streak_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ultrakill_enemies"
    ADD CONSTRAINT "ultrakill_enemies_debut_level_id_fkey" FOREIGN KEY ("debut_level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_guesses"
    ADD CONSTRAINT "user_guesses_daily_choice_id_fkey" FOREIGN KEY ("daily_choice_id") REFERENCES "public"."daily_choices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_guesses"
    ADD CONSTRAINT "user_guesses_guess_enemy_id_fkey" FOREIGN KEY ("guess_enemy_id") REFERENCES "public"."ultrakill_enemies"("id");



ALTER TABLE ONLY "public"."user_guilds"
    ADD CONSTRAINT "user_guilds_auth_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_guilds"
    ADD CONSTRAINT "user_guilds_guild_id_fkey_guilds" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_guilds"
    ADD CONSTRAINT "user_guilds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wins"
    ADD CONSTRAINT "user_wins_auth_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wins"
    ADD CONSTRAINT "user_wins_daily_choice_id_fkey" FOREIGN KEY ("daily_choice_id") REFERENCES "public"."daily_choices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wins"
    ADD CONSTRAINT "user_wins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All authenticated users can view cybergrind records" ON "public"."cybergrind_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read access for enemy list" ON "public"."ultrakill_enemies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public read" ON "public"."daily_stats_cache" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read" ON "public"."inferno_daily_stats_cache" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read" ON "public"."inferno_user_stats_cache" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read access" ON "public"."current_daily_choice" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read access" ON "public"."inferno_daily_sets" FOR SELECT USING (true);



CREATE POLICY "Allow public read access for enemy list" ON "public"."ultrakill_enemies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anyone can read submitter_profiles" ON "public"."submitter_profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view approved submissions" ON "public"."image_submissions" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."user_settings" TO "authenticated", "anon" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."levels" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Read history or finished games" ON "public"."daily_choices" FOR SELECT USING (((NOT ("id" IN ( SELECT "current_daily_choice"."daily_choice_id"
   FROM "public"."current_daily_choice"))) OR (EXISTS ( SELECT 1
   FROM "public"."user_wins"
  WHERE (("user_wins"."daily_choice_id" = "daily_choices"."id") AND ("user_wins"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own guesses" ON "public"."user_guesses" FOR INSERT TO "authenticated", "anon" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can mark messages as read" ON "public"."read_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own guild membership" ON "public"."user_guilds" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all streaks" ON "public"."streak_cache" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users can view memberships in their guilds" ON "public"."user_guilds" FOR SELECT USING ("public"."is_member_of_guild"("guild_id"));



CREATE POLICY "Users can view own colors" ON "public"."guess_colors" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own guesses" ON "public"."user_guesses" FOR SELECT TO "authenticated", "anon" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own run rounds" ON "public"."cybergrind_rounds" FOR SELECT USING (("run_id" IN ( SELECT "cybergrind_runs"."id"
   FROM "public"."cybergrind_runs"
  WHERE ("cybergrind_runs"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own runs" ON "public"."cybergrind_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own read message statuses" ON "public"."read_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own inferno guesses" ON "public"."inferno_guesses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own inferno results" ON "public"."inferno_results" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own round views" ON "public"."inferno_round_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own wins" ON "public"."user_wins" FOR SELECT TO "authenticated", "anon" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View colors of guild members" ON "public"."guess_colors" FOR SELECT USING ("public"."shares_guild_with"("user_id"));



CREATE POLICY "View inferno results of guild members" ON "public"."inferno_results" FOR SELECT USING ("public"."shares_guild_with"("user_id"));



CREATE POLICY "View profiles of guild members" ON "public"."profiles" FOR SELECT USING ("public"."shares_guild_with"("id"));



CREATE POLICY "View wins of people in the same server" ON "public"."user_wins" FOR SELECT USING ("public"."shares_guild_with"("user_id"));



ALTER TABLE "public"."current_daily_choice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cybergrind_guesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cybergrind_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cybergrind_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cybergrind_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_choices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_notification_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_stats_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debug_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guess_colors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guilds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."image_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_daily_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_daily_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_daily_stats_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_guesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_round_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inferno_user_stats_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."level_enemies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."read_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rejected_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streak_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submission_forums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submitter_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supporters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ultrakill_enemies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_guesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_guilds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_wins" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."current_daily_choice";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."guess_colors";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."inferno_guesses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."inferno_results";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_wins";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";











































































































































































GRANT ALL ON FUNCTION "public"."abandon_cybergrind_run"("version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."abandon_cybergrind_run"("version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."abandon_cybergrind_run"("version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_hint_modifiers"("p_hint" "jsonb", "p_modifiers" "public"."cybergrind_modifier_enum"[], "p_eclipsed_column" smallint, "p_radiance_targets" "public"."cybergrind_modifier_enum"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_hint_modifiers"("p_hint" "jsonb", "p_modifiers" "public"."cybergrind_modifier_enum"[], "p_eclipsed_column" smallint, "p_radiance_targets" "public"."cybergrind_modifier_enum"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_hint_modifiers"("p_hint" "jsonb", "p_modifiers" "public"."cybergrind_modifier_enum"[], "p_eclipsed_column" smallint, "p_radiance_targets" "public"."cybergrind_modifier_enum"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."assert_guild_member"("p_guild_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_guild_member"("p_guild_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_guild_member"("p_guild_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_enemy_hint"("p_target_id" bigint, "p_guess_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_hint_accuracy"("p_hint" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_hint_accuracy"("p_hint" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_hint_accuracy"("p_hint" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_cybergrind_run"("p_status" "public"."cybergrind_run_status_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."end_cybergrind_run"("p_status" "public"."cybergrind_run_status_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_cybergrind_run"("p_status" "public"."cybergrind_run_status_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_classic_init"("version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_classic_init"("version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_classic_init"("version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cybergrind_start_waves"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cybergrind_start_waves"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cybergrind_start_waves"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cybergrind_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cybergrind_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cybergrind_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_guesses"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_guesses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_guesses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_inferno_share"("p_discord_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_share"("p_discord_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_combined_summary"("p_guild_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_combined_summary"("p_guild_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_combined_summary"("p_guild_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_inferno_summary"("p_guild_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_inferno_summary"("p_guild_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_inferno_summary"("p_guild_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_streaks"("p_guild_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_streaks"("p_guild_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_streaks"("p_guild_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inferno_round"("version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inferno_round"("version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inferno_round"("version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_min_client_version"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_min_client_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_min_client_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_min_client_version"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_submission_stats"("p_submission_ids" bigint[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_submission_stats"("p_submission_ids" bigint[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_submission_stats"("p_submission_ids" bigint[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_longest_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_longest_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_longest_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_streak_by_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_streak_by_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_streak_by_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_never_played"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_never_played"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_never_played"() TO "service_role";



GRANT ALL ON FUNCTION "public"."init_game"() TO "anon";
GRANT ALL ON FUNCTION "public"."init_game"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."init_game"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of_guild"("p_guild_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of_guild"("p_guild_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of_guild"("p_guild_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pick_daily_enemy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_user_daily"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_daily_rotation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."shares_guild_with"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."shares_guild_with"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_guild_with"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_cybergrind_run"("start_wave" integer, "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."start_cybergrind_run"("start_wave" integer, "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_cybergrind_run"("start_wave" integer, "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_cybergrind_guess"("guess_id" bigint, "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_cybergrind_guess"("guess_id" bigint, "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_cybergrind_guess"("guess_id" bigint, "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_daily_guess"("guess_id" bigint, "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_daily_guess"("guess_id" bigint, "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_daily_guess"("guess_id" bigint, "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_inferno_guess"("p_round_id" bigint, "p_guessed_level_id" bigint, "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_inferno_guess"("p_round_id" bigint, "p_guessed_level_id" bigint, "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_inferno_guess"("p_round_id" bigint, "p_guessed_level_id" bigint, "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_dispatch_submissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_poll_submissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_stats_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_stats_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_stats_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inferno_stats_caches"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inferno_stats_caches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inferno_stats_caches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wipe_user_data"("p_user_id" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."current_daily_choice" TO "anon";
GRANT ALL ON TABLE "public"."current_daily_choice" TO "authenticated";
GRANT ALL ON TABLE "public"."current_daily_choice" TO "service_role";



GRANT ALL ON TABLE "public"."cybergrind_guesses" TO "anon";
GRANT ALL ON TABLE "public"."cybergrind_guesses" TO "authenticated";
GRANT ALL ON TABLE "public"."cybergrind_guesses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cybergrind_guesses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cybergrind_guesses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cybergrind_guesses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cybergrind_records" TO "anon";
GRANT ALL ON TABLE "public"."cybergrind_records" TO "authenticated";
GRANT ALL ON TABLE "public"."cybergrind_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."cybergrind_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."cybergrind_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."cybergrind_leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."cybergrind_rounds" TO "anon";
GRANT ALL ON TABLE "public"."cybergrind_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."cybergrind_rounds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cybergrind_rounds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cybergrind_rounds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cybergrind_rounds_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cybergrind_runs" TO "anon";
GRANT ALL ON TABLE "public"."cybergrind_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cybergrind_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cybergrind_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cybergrind_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cybergrind_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_choices" TO "anon";
GRANT ALL ON TABLE "public"."daily_choices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_choices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_choices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_choices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_choices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_notification_channels" TO "anon";
GRANT ALL ON TABLE "public"."daily_notification_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_notification_channels" TO "service_role";



GRANT ALL ON TABLE "public"."daily_stats_cache" TO "anon";
GRANT ALL ON TABLE "public"."daily_stats_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_stats_cache" TO "service_role";



GRANT ALL ON TABLE "public"."debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guess_colors" TO "anon";
GRANT ALL ON TABLE "public"."guess_colors" TO "authenticated";
GRANT ALL ON TABLE "public"."guess_colors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guess_colors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guess_colors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guess_colors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guilds" TO "anon";
GRANT ALL ON TABLE "public"."guilds" TO "authenticated";
GRANT ALL ON TABLE "public"."guilds" TO "service_role";



GRANT ALL ON TABLE "public"."image_submissions" TO "anon";
GRANT ALL ON TABLE "public"."image_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."image_submissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."image_submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."image_submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."image_submissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_daily_rounds" TO "anon";
GRANT ALL ON TABLE "public"."inferno_daily_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_daily_rounds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inferno_daily_rounds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inferno_daily_rounds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inferno_daily_rounds_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_daily_sets" TO "anon";
GRANT ALL ON TABLE "public"."inferno_daily_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_daily_sets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inferno_daily_sets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inferno_daily_sets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inferno_daily_sets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_daily_stats_cache" TO "anon";
GRANT ALL ON TABLE "public"."inferno_daily_stats_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_daily_stats_cache" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_guesses" TO "anon";
GRANT ALL ON TABLE "public"."inferno_guesses" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_guesses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inferno_guesses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inferno_guesses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inferno_guesses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_results" TO "anon";
GRANT ALL ON TABLE "public"."inferno_results" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_results" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inferno_results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inferno_results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inferno_results_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_round_views" TO "anon";
GRANT ALL ON TABLE "public"."inferno_round_views" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_round_views" TO "service_role";



GRANT ALL ON TABLE "public"."inferno_user_stats_cache" TO "anon";
GRANT ALL ON TABLE "public"."inferno_user_stats_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."inferno_user_stats_cache" TO "service_role";



GRANT ALL ON TABLE "public"."level_enemies" TO "anon";
GRANT ALL ON TABLE "public"."level_enemies" TO "authenticated";
GRANT ALL ON TABLE "public"."level_enemies" TO "service_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."read_messages" TO "anon";
GRANT ALL ON TABLE "public"."read_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."read_messages" TO "service_role";



GRANT ALL ON TABLE "public"."rejected_threads" TO "anon";
GRANT ALL ON TABLE "public"."rejected_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."rejected_threads" TO "service_role";



GRANT ALL ON TABLE "public"."streak_cache" TO "anon";
GRANT ALL ON TABLE "public"."streak_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."streak_cache" TO "service_role";



GRANT ALL ON TABLE "public"."submission_forums" TO "anon";
GRANT ALL ON TABLE "public"."submission_forums" TO "authenticated";
GRANT ALL ON TABLE "public"."submission_forums" TO "service_role";



GRANT ALL ON TABLE "public"."submitter_profiles" TO "anon";
GRANT ALL ON TABLE "public"."submitter_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."submitter_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."supporters" TO "anon";
GRANT ALL ON TABLE "public"."supporters" TO "authenticated";
GRANT ALL ON TABLE "public"."supporters" TO "service_role";



GRANT ALL ON TABLE "public"."ultrakill_enemies" TO "anon";
GRANT ALL ON TABLE "public"."ultrakill_enemies" TO "authenticated";
GRANT ALL ON TABLE "public"."ultrakill_enemies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ultrakill_enemies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ultrakill_enemies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ultrakill_enemies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_guesses" TO "anon";
GRANT ALL ON TABLE "public"."user_guesses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_guesses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_guesses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_guesses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_guesses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_guilds" TO "anon";
GRANT ALL ON TABLE "public"."user_guilds" TO "authenticated";
GRANT ALL ON TABLE "public"."user_guilds" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_wins" TO "anon";
GRANT ALL ON TABLE "public"."user_wins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_wins" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_wins_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_wins_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_wins_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
