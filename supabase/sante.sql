-- Forge : données Apple Santé envoyées chaque jour par un raccourci iPhone.

-- Une ligne par utilisateur et par jour.
create table if not exists public.health_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  steps integer,
  active_kcal integer,
  resting_hr numeric,
  hrv numeric,
  sleep_min integer,
  weight numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.health_daily enable row level security;
drop policy if exists "lecture de sa sante" on public.health_daily;
create policy "lecture de sa sante" on public.health_daily for select using (auth.uid() = user_id);
drop policy if exists "suppression de sa sante" on public.health_daily;
create policy "suppression de sa sante" on public.health_daily for delete using (auth.uid() = user_id);

-- Code personnel collé dans le raccourci : il identifie le compte sans mot de passe.
create table if not exists public.health_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.health_tokens enable row level security;
-- Aucune règle d'accès direct : la table n'est lisible qu'à travers les fonctions ci-dessous.

-- Crée (ou remplace) le code personnel de l'utilisateur connecté.
create or replace function public.create_health_token()
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  delete from health_tokens where user_id = auth.uid();
  insert into health_tokens (user_id) values (auth.uid()) returning token into t;
  return t;
end $$;
revoke all on function public.create_health_token() from public, anon;
grant execute on function public.create_health_token() to authenticated;

-- Extrait un nombre d'un texte venant de l'iPhone : « 8 432 pas », « 72,5 kg », « 58 bpm ».
create or replace function public.forge_num(t text)
returns numeric language sql immutable as $$
  select nullif(replace(substring(regexp_replace(coalesce(t, ''), '[[:space:]  ]', '', 'g') from '[0-9]+(?:[.,][0-9]+)?'), ',', '.'), '')::numeric
$$;

-- Point d'entrée du raccourci. Les valeurs vides sont ignorées (on garde celles déjà reçues).
create or replace function public.import_health(
  p_token text,
  p_steps text default null,
  p_active_kcal text default null,
  p_resting_hr text default null,
  p_hrv text default null,
  p_sleep text default null,
  p_weight text default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  s numeric := forge_num(p_sleep);
  w numeric := forge_num(p_weight);
begin
  select user_id into uid from health_tokens where token::text = lower(trim(p_token));
  if uid is null then return 'Code Forge inconnu : recopie le code affiché dans Forge.'; end if;
  -- Le sommeil peut arriver en secondes, en minutes ou en heures selon le raccourci.
  s := case when s is null or s = 0 then null when s > 1440 then round(s / 60) when s > 24 then round(s) else round(s * 60) end;
  if w is not null and (w < 30 or w > 300) then w := null; end if;
  insert into health_daily as h (user_id, day, steps, active_kcal, resting_hr, hrv, sleep_min, weight)
  values (uid, (now() at time zone 'UTC')::date, round(forge_num(p_steps)), round(forge_num(p_active_kcal)),
          nullif(forge_num(p_resting_hr), 0), nullif(forge_num(p_hrv), 0), s, w)
  on conflict (user_id, day) do update set
    steps = coalesce(excluded.steps, h.steps),
    active_kcal = coalesce(excluded.active_kcal, h.active_kcal),
    resting_hr = coalesce(excluded.resting_hr, h.resting_hr),
    hrv = coalesce(excluded.hrv, h.hrv),
    sleep_min = coalesce(excluded.sleep_min, h.sleep_min),
    weight = coalesce(excluded.weight, h.weight),
    updated_at = now();
  return 'OK';
end $$;
revoke all on function public.import_health(text, text, text, text, text, text, text) from public;
grant execute on function public.import_health(text, text, text, text, text, text, text) to anon, authenticated;
