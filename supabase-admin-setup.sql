-- -- ═══════════════════════════════════════════════════════════
-- --  MORGAN WALLEN SITE — SUPABASE FULL SETUP v3
-- --  Supabase Dashboard → SQL Editor → New Query → Run All
-- --  Fix: removed "IF NOT EXISTS" from CREATE POLICY (unsupported)
-- -- ═══════════════════════════════════════════════════════════


-- -- ─────────────────────────────────────────────
-- -- 1. PROFILES
-- -- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  first_name       text,
  last_name        text,
  email            text,
  zip              text,
  membership_tier  text check (membership_tier in ('standard','premium','vip')),
  membership_since timestamptz,
  is_admin         boolean default false,
  is_banned        boolean default false,
  created_at       timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Security-definer helper: checks is_admin without triggering RLS
-- (prevents infinite recursion in admin policies that query profiles)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


-- ─────────────────────────────────────────────
-- 2. ORDERS
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  item_name      text,
  item_key       text,
  item_type      text check (item_type in ('membership','product')),
  amount_usd     numeric(10,2),
  crypto_method  text check (crypto_method in ('btc','eth','usdt')),
  crypto_amount  text,
  wallet_address text,
  tx_hash        text,
  receipt_url    text,
  status         text default 'pending' check (status in ('pending','confirmed','rejected')),
  admin_note     text,
  created_at     timestamptz default now()
);


-- ─────────────────────────────────────────────
-- 3. PRODUCTS
-- ─────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text check (category in ('vinyl','cd','digital','apparel')),
  price       numeric(10,2),
  item_key    text unique,
  image_path  text,
  visible     boolean default true,
  in_stock    boolean default true,
  created_at  timestamptz default now()
);

insert into public.products (name, category, price, item_key, image_path, visible, in_stock) values
  ('I''m The Problem – Black Vinyl 3LP',      'vinyl', 49.99, 'vinyl-black',  'images/itp-blackvinyl.png',        true, true),
  ('I''m The Problem – Bone White Vinyl 3LP', 'vinyl', 59.99, 'vinyl-bone',   'images/itp-bonevinyl.png',         true, true),
  ('I''m The Problem – 2CD',                  'cd',    19.99, 'cd-itp',       'images/itp-cd.png',                true, true),
  ('One Thing At A Time',                      'cd',    14.99, 'cd-otat',      'images/cover-onethingatatime.jpg', true, true),
  ('Dangerous: The Double Album',              'cd',    14.99, 'cd-dangerous', 'images/cover-dangerous.jpg',       true, true)
on conflict (item_key) do nothing;


-- ─────────────────────────────────────────────
-- 4. MEMBERSHIP PRICES
-- ─────────────────────────────────────────────
create table if not exists public.membership_prices (
  tier          text primary key check (tier in ('standard','premium','vip')),
  price         numeric(10,2) not null,
  billing_label text default 'per month'
);

insert into public.membership_prices (tier, price, billing_label) values
  ('standard', 299.00, 'one-time'),
  ('premium',  499.00, 'per month'),
  ('vip',      699.00, 'per month')
on conflict (tier) do nothing;


-- ─────────────────────────────────────────────
-- 5. CHAT MESSAGES
-- ─────────────────────────────────────────────
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  sender_role   text check (sender_role in ('user','admin')) not null,
  message       text not null,
  read_by_admin boolean default false,
  created_at    timestamptz default now()
);

create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id, created_at);


-- ─────────────────────────────────────────────
-- 6. ANNOUNCEMENTS
-- ─────────────────────────────────────────────
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  audience   text default 'all' check (audience in ('all','standard','premium','vip')),
  created_at timestamptz default now()
);


-- ─────────────────────────────────────────────
-- 7. SITE SETTINGS
-- ─────────────────────────────────────────────
create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

insert into public.site_settings (key, value) values
  ('wallet_btc',          'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'),
  ('wallet_eth',          '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
  ('wallet_usdt',         'TJYeasTPa6gpEEfxHFGTiMqL3Bcz9m1hWA'),
  ('payment_crypto',      'true'),
  ('payment_stripe',      'false'),
  ('maintenance_mode',    'false'),
  ('allow_registrations', 'true')
on conflict (key) do nothing;


-- ─────────────────────────────────────────────
-- 8. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.orders          enable row level security;
alter table public.products        enable row level security;
alter table public.membership_prices enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.announcements   enable row level security;
alter table public.site_settings   enable row level security;


-- ─────────────────────────────────────────────
-- 9. RLS POLICIES
--    DROP first so re-running this file is safe
-- ─────────────────────────────────────────────

-- ── profiles ──
drop policy if exists "profiles_own_select"  on public.profiles;
drop policy if exists "profiles_own_update"  on public.profiles;
drop policy if exists "profiles_admin_all"   on public.profiles;

create policy "profiles_own_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- ── orders ──
drop policy if exists "orders_user_select" on public.orders;
drop policy if exists "orders_user_insert" on public.orders;
drop policy if exists "orders_admin_all"   on public.orders;

create policy "orders_user_select" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_user_insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_admin_all" on public.orders
  for all using (public.is_admin());

-- ── products ──
drop policy if exists "products_public_select" on public.products;
drop policy if exists "products_admin_all"      on public.products;

create policy "products_public_select" on public.products
  for select using (visible = true);

create policy "products_admin_all" on public.products
  for all using (public.is_admin());

-- ── membership_prices (public read so live prices show on site) ──
drop policy if exists "prices_public_select" on public.membership_prices;
drop policy if exists "prices_admin_all"     on public.membership_prices;

create policy "prices_public_select" on public.membership_prices
  for select using (true);

create policy "prices_admin_all" on public.membership_prices
  for all using (public.is_admin());

-- ── chat_messages ──
drop policy if exists "chat_user_select" on public.chat_messages;
drop policy if exists "chat_user_insert" on public.chat_messages;
drop policy if exists "chat_admin_all"   on public.chat_messages;

create policy "chat_user_select" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "chat_user_insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "chat_admin_all" on public.chat_messages
  for all using (public.is_admin());

-- ── announcements ──
drop policy if exists "ann_public_select" on public.announcements;
drop policy if exists "ann_admin_all"     on public.announcements;

create policy "ann_public_select" on public.announcements
  for select using (true);

create policy "ann_admin_all" on public.announcements
  for all using (public.is_admin());

-- ── site_settings ──
drop policy if exists "settings_public_read" on public.site_settings;
drop policy if exists "settings_admin_all"   on public.site_settings;

-- Public can read wallet addresses + payment toggles (checkout page needs these)
create policy "settings_public_read" on public.site_settings
  for select using (
    key in (
      'wallet_btc', 'wallet_eth', 'wallet_usdt',
      'payment_crypto', 'payment_stripe', 'maintenance_mode', 'allow_registrations'
    )
  );

create policy "settings_admin_all" on public.site_settings
  for all using (public.is_admin());


-- ─────────────────────────────────────────────
-- 10. ENABLE REALTIME
--     (run if not already enabled)
-- ─────────────────────────────────────────────
-- alter publication supabase_realtime add table public.chat_messages;
-- alter publication supabase_realtime add table public.orders;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;


-- ─────────────────────────────────────────────
-- CONTACT MESSAGES TABLE
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- alter table public.contact_messages enable row level security;

-- Anyone (including guests) can submit a contact message
drop policy if exists "contact_public_insert" on public.contact_messages;
create policy "contact_public_insert" on public.contact_messages
  for insert with check (true);

-- Only admins can read/manage messages
drop policy if exists "contact_admin_all" on public.contact_messages;
create policy "contact_admin_all" on public.contact_messages
  for all using (public.is_admin());