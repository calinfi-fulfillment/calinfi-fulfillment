create extension if not exists pgcrypto;

create type public.order_status as enum (
  'selection_submitted',
  'manual_hold',
  'fulfillment_ready',
  'payment_pending',
  'locked_for_fulfillment',
  'cancelled'
);

create type public.address_status as enum ('missing', 'complete', 'needs_review');
create type public.decision_source as enum ('system_default', 'customer_selected', 'admin_override');
create type public.fulfillment_route_type as enum ('REGIONAL_3PL', 'CHINA_HK_DIRECT_DDP', 'PARTNER_MANAGED', 'MANUAL_SPECIAL');
create type public.shipping_mode as enum ('3PL_INTERNAL_LABEL', 'DIRECT_DDP_PROVIDER', 'PARTNER_MANAGED', 'MANUAL_LABEL');
create type public.decision_status as enum ('needs_selection', 'selected', 'quote_ready', 'payment_pending', 'paid_locked', 'voided');
create type public.product_readiness_status as enum ('ready', 'needs_review', 'blocked');
create type public.quote_status as enum ('ready', 'expired', 'voided', 'failed', 'accepted');
create type public.payment_event_status as enum ('accepted', 'duplicate', 'mismatch', 'ignored');
create type public.handoff_status as enum ('ready', 'exported', 'accepted', 'in_fulfillment', 'shipped', 'delivered', 'exception');
create type public.issue_severity as enum ('info', 'warning', 'blocker');
create type public.issue_status as enum ('open', 'resolved', 'voided');
create type public.line_role as enum ('reward', 'addon', 'prepaid', 'builtin');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text not null,
  readiness_status public.product_readiness_status not null default 'needs_review',
  is_builtin_main_box_item boolean not null default false,
  weight_grams integer check (weight_grams is null or weight_grams > 0),
  length_mm integer check (length_mm is null or length_mm > 0),
  width_mm integer check (width_mm is null or width_mm > 0),
  height_mm integer check (height_mm is null or height_mm > 0),
  hs_code text,
  country_of_origin text check (country_of_origin is null or length(country_of_origin) = 2),
  customs_description text,
  declared_value_cents integer check (declared_value_cents is null or declared_value_cents >= 0),
  declared_value_currency text check (declared_value_currency is null or length(declared_value_currency) = 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.backers (
  id uuid primary key default gen_random_uuid(),
  source_backer_key text not null unique,
  pm_backer_id uuid,
  backer_number text,
  display_name text,
  email text,
  locale text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  backer_id uuid not null references public.backers(id) on delete restrict,
  source_order_key text not null unique,
  pm_pledge_id uuid,
  order_number text,
  order_status public.order_status not null default 'selection_submitted',
  address_status public.address_status not null default 'missing',
  recipient_snapshot jsonb not null default '{}'::jsonb,
  order_snapshot jsonb not null default '{}'::jsonb,
  locked_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_locked_at_required check (
    order_status <> 'locked_for_fulfillment' or locked_at is not null
  )
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  source_line_key text not null,
  sku text not null,
  title text not null,
  quantity integer not null check (quantity > 0),
  line_role public.line_role not null,
  is_visible boolean not null default true,
  is_physical boolean not null default true,
  is_builtin_main_box_item boolean not null default false,
  unit_value_cents integer check (unit_value_cents is null or unit_value_cents >= 0),
  unit_value_currency text check (unit_value_currency is null or length(unit_value_currency) = 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id, source_line_key)
);

create table public.excluded_builtin_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_line_id uuid not null references public.order_lines(id) on delete cascade,
  sku text not null,
  quantity integer not null check (quantity > 0),
  exclusion_reason text not null default 'built_in_main_box_item',
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_line_id)
);

create table public.route_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  country_code text check (country_code is null or length(country_code) = 2),
  region_code text,
  route_type public.fulfillment_route_type not null,
  shipping_mode public.shipping_mode not null,
  priority integer not null default 100,
  enabled boolean not null default true,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.delivery_decisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  decision_source public.decision_source not null default 'system_default',
  route_type public.fulfillment_route_type not null,
  shipping_mode public.shipping_mode not null,
  decision_status public.decision_status not null default 'needs_selection',
  selected_quote_id uuid,
  override_reason text,
  decided_by text,
  decided_at timestamptz not null default timezone('utc', now()),
  previous_values jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id)
);

create table public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_decision_id uuid references public.delivery_decisions(id) on delete set null,
  route_type public.fulfillment_route_type not null,
  shipping_mode public.shipping_mode not null,
  provider text not null default 'local_fake',
  provider_quote_id text,
  status public.quote_status not null default 'ready',
  currency text not null check (length(currency) = 3),
  amount_cents integer not null check (amount_cents >= 0),
  buffer_cents integer not null default 0 check (buffer_cents >= 0),
  total_cents integer generated always as (amount_cents + buffer_cents) stored,
  expires_at timestamptz not null,
  quote_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.delivery_decisions
  add constraint delivery_decisions_selected_quote_fk
  foreign key (selected_quote_id) references public.shipping_quotes(id) on delete set null;

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  quote_id uuid references public.shipping_quotes(id) on delete restrict,
  source_event_key text not null unique,
  provider text not null default 'pm',
  event_type text not null,
  status public.payment_event_status not null,
  currency text not null check (length(currency) = 3),
  amount_cents integer not null check (amount_cents >= 0),
  payload_hash text not null,
  review_reason text,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.fulfillment_handoffs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  route_type public.fulfillment_route_type not null,
  shipping_mode public.shipping_mode not null,
  status public.handoff_status not null default 'ready',
  export_type text not null default 'manual',
  export_snapshot jsonb not null default '{}'::jsonb,
  exported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.handoff_status_events (
  id uuid primary key default gen_random_uuid(),
  handoff_id uuid not null references public.fulfillment_handoffs(id) on delete cascade,
  status public.handoff_status not null,
  actor_type text not null default 'system',
  actor_id text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  severity public.issue_severity not null default 'warning',
  status public.issue_status not null default 'open',
  code text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index backers_pm_backer_id_idx on public.backers(pm_backer_id);
create index orders_backer_id_idx on public.orders(backer_id);
create index orders_status_idx on public.orders(order_status);
create index order_lines_order_id_idx on public.order_lines(order_id);
create index order_lines_sku_idx on public.order_lines(sku);
create index route_rules_lookup_idx on public.route_rules(enabled, priority, country_code, region_code);
create index shipping_quotes_order_id_idx on public.shipping_quotes(order_id);
create index shipping_quotes_status_expires_idx on public.shipping_quotes(status, expires_at);
create index payment_events_order_id_idx on public.payment_events(order_id);
create index fulfillment_handoffs_order_id_idx on public.fulfillment_handoffs(order_id);
create index issues_open_idx on public.issues(status, severity);
create index audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger backers_set_updated_at
before update on public.backers
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_lines_set_updated_at
before update on public.order_lines
for each row execute function public.set_updated_at();

create trigger route_rules_set_updated_at
before update on public.route_rules
for each row execute function public.set_updated_at();

create trigger delivery_decisions_set_updated_at
before update on public.delivery_decisions
for each row execute function public.set_updated_at();

create trigger shipping_quotes_set_updated_at
before update on public.shipping_quotes
for each row execute function public.set_updated_at();

create trigger fulfillment_handoffs_set_updated_at
before update on public.fulfillment_handoffs
for each row execute function public.set_updated_at();

create trigger issues_set_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.backers enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.excluded_builtin_items enable row level security;
alter table public.route_rules enable row level security;
alter table public.delivery_decisions enable row level security;
alter table public.shipping_quotes enable row level security;
alter table public.payment_events enable row level security;
alter table public.fulfillment_handoffs enable row level security;
alter table public.handoff_status_events enable row level security;
alter table public.issues enable row level security;
alter table public.audit_log enable row level security;
