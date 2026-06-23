-- =========================================================
-- True Cost Revealer — Supabase Schema
-- Run this entire file in the Supabase SQL editor
-- =========================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =========================================================
-- eSpring configuration (singleton row)
-- =========================================================
create table if not exists espring_config (
  id uuid primary key default gen_random_uuid(),
  unit_price numeric(10,2) not null default 1299.00,
  annual_filter_cost numeric(10,2) not null default 149.00,
  uv_lamp_cost numeric(10,2) not null default 79.00,
  -- UV-C LED in the current eSpring is rated for the lifetime of the unit (~10 years),
  -- so this is set to the system lifespan. Combined with the usage-based calc engine,
  -- this means UV cost is effectively $0 within the 10-year projection horizon.
  uv_lamp_frequency_years int not null default 10,
  filter_capacity_litres int not null default 5000,
  system_lifespan_years int not null default 10,
  warranty_years int not null default 3,
  bottled_water_inflation_rate numeric(5,4) not null default 0.03,
  espring_inflation_rate numeric(5,4) not null default 0.02,
  cta_text text not null default 'Ready to stop paying for water? Let''s talk.',
  -- Floating/sticky conversion CTA on the live results page (text only; the
  -- dollar figure is computed). Not used in any PDF.
  floating_cta_label text not null default 'Every day you wait costs more',
  floating_cta_button text not null default 'Stop the bleed →',
  logo_url text,
  -- Consultant / sales-rep contact details surfaced by the closing CTA block
  consultant_name text,
  consultant_phone text,
  consultant_email text,
  booking_url text,
  warranty_text text,
  -- Annual return rate used by the Wealth Building section (Rule of 72 doublings).
  -- Default 8% reflects the long-run average of the S&P 500 / TSX Composite.
  assumed_return_rate numeric(5,4) not null default 0.08,
  -- Which report sections appear in each downloadable PDF template.
  -- Three arrays of section IDs (see lib/report-sections.ts). Admin-editable.
  pdf_templates jsonb not null default '{
    "brief":    ["inputs","annual_spend","money_story","break_even","closing_cta"],
    "standard": ["inputs","annual_spend","money_lost","payment_plans","money_story","plastic_volume","microplastics","break_even","ten_year_chart","wealth_ladder","milestones","closing_cta"],
    "full":     ["inputs","annual_spend","money_lost","payment_plans","money_story","yearly_breakdown","plastic_volume","plastic_scale","microplastics","recycling_myth","convenience_weight","convenience_time","break_even","ten_year_chart","wealth_ladder","wealth_destinations","milestones","closing_cta"]
  }'::jsonb,
  -- Download tier assigned to newly-invited clients ('none'|'brief'|'standard'|'full')
  default_client_tier text not null default 'full',
  updated_at timestamptz not null default now()
);

-- If you are upgrading an EXISTING deployment, run the following to add the
-- new columns without recreating the table:
--   alter table espring_config
--     add column if not exists consultant_name text,
--     add column if not exists consultant_phone text,
--     add column if not exists consultant_email text,
--     add column if not exists booking_url text,
--     add column if not exists warranty_text text,
--     add column if not exists floating_cta_label text not null default 'Every day you wait costs more',
--     add column if not exists floating_cta_button text not null default 'Stop the bleed →',
--     add column if not exists assumed_return_rate numeric(5,4) not null default 0.08,
--     add column if not exists default_client_tier text not null default 'full',
--     add column if not exists pdf_templates jsonb not null default '{
--       "brief":["inputs","annual_spend","money_story","break_even","closing_cta"],
--       "standard":["inputs","annual_spend","money_lost","payment_plans","money_story","plastic_volume","microplastics","break_even","ten_year_chart","wealth_ladder","milestones","closing_cta"],
--       "full":["inputs","annual_spend","money_lost","payment_plans","money_story","yearly_breakdown","plastic_volume","plastic_scale","microplastics","recycling_myth","convenience_weight","convenience_time","break_even","ten_year_chart","wealth_ladder","wealth_destinations","milestones","closing_cta"]
--     }'::jsonb;

-- Seed default config row
insert into espring_config (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- =========================================================
-- PayPal financing configuration (singleton row)
-- =========================================================
create table if not exists paypal_config (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'PayPal',
  down_payment numeric(10,2) not null default 0,
  promo_apr numeric(5,4) not null default 0,
  standard_apr numeric(5,4) not null default 0.26,
  plan_6_monthly numeric(10,2) not null default 233.21,
  plan_6_interest numeric(10,2) not null default 100.27,
  plan_6_total numeric(10,2) not null default 1399.27,
  plan_12_monthly numeric(10,2) not null default 124.09,
  plan_12_interest numeric(10,2) not null default 190.14,
  plan_12_total numeric(10,2) not null default 1489.14,
  plan_24_monthly numeric(10,2) not null default 69.98,
  plan_24_interest numeric(10,2) not null default 380.60,
  plan_24_total numeric(10,2) not null default 1679.60,
  updated_at timestamptz not null default now()
);

insert into paypal_config (id) values ('00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- =========================================================
-- Clients (invite-only access)
-- =========================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  access_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count int not null default 0,
  completed_calculator boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  session_duration_days int not null default 7,
  -- Which PDF templates this client may download ('none'|'brief'|'standard'|'full')
  download_tier text not null default 'full'
);

create index if not exists idx_clients_token on clients(token);
create index if not exists idx_clients_email on clients(email);

-- Upgrading an existing deployment:
--   alter table clients add column if not exists download_tier text not null default 'full';

-- =========================================================
-- Access requests (lead capture from /request-access)
-- =========================================================
create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  converted boolean not null default false
);

create index if not exists idx_access_requests_created on access_requests(created_at desc);

-- Upgrading an existing deployment:
--   alter table access_requests add column if not exists name text;

-- =========================================================
-- Access logs
-- =========================================================
create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  completed boolean not null default false
);

create index if not exists idx_access_logs_client on access_logs(client_id);

-- =========================================================
-- Client reports (saved calculator output)
-- =========================================================
-- One row per client (latest report wins — upserted on client_id). Stores the
-- full CalculationResult plus the espring/paypal config snapshot it was computed
-- against, so the admin can regenerate the client's PDF exactly as they saw it.
-- Kept in its own table (not a column on clients) so the admin client list query
-- doesn't pull every report's JSON on each load. Each row is ~2-4 KB.
create table if not exists client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  report_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create index if not exists idx_client_reports_client on client_reports(client_id);

-- Upgrading an existing deployment: run the create table + index above, then the
-- enable-RLS and policy lines for client_reports further down in this file.

-- =========================================================
-- Row-level security
-- =========================================================
alter table espring_config enable row level security;
alter table paypal_config enable row level security;
alter table clients enable row level security;
alter table access_logs enable row level security;
alter table access_requests enable row level security;
alter table client_reports enable row level security;

-- Public can read config (needed for calculator)
create policy "Public read espring_config" on espring_config for select using (true);
create policy "Public read paypal_config" on paypal_config for select using (true);

-- Service role has full access (admin API routes use service role key)
create policy "Service role all espring_config" on espring_config using (auth.role() = 'service_role');
create policy "Service role all paypal_config" on paypal_config using (auth.role() = 'service_role');
create policy "Service role all clients" on clients using (auth.role() = 'service_role');
create policy "Service role all access_logs" on access_logs using (auth.role() = 'service_role');
create policy "Service role all access_requests" on access_requests using (auth.role() = 'service_role');
create policy "Service role all client_reports" on client_reports using (auth.role() = 'service_role');

-- =========================================================
-- Helper function to validate token and log access
-- =========================================================
create or replace function validate_token(p_token text, p_ip text default null, p_ua text default null)
returns json
language plpgsql
security definer
as $$
declare
  v_client clients%rowtype;
  v_result json;
begin
  select * into v_client
  from clients
  where token = p_token
    and access_enabled = true
    and expires_at > now();

  if not found then
    return json_build_object('valid', false, 'reason', 'Token not found, disabled, or expired');
  end if;

  -- Log access
  insert into access_logs (client_id, ip_address, user_agent)
  values (v_client.id, p_ip, p_ua);

  -- Update client stats
  update clients
  set last_accessed_at = now(),
      access_count = access_count + 1
  where id = v_client.id;

  return json_build_object(
    'valid', true,
    'client_id', v_client.id,
    'email', v_client.email
  );
end;
$$;
