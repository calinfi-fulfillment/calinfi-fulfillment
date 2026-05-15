create type public.inventory_location_type as enum ('factory', 'sfc_warehouse', 'regional_3pl', 'internal', 'partner');
create type public.inventory_batch_status as enum (
  'planned',
  'in_production',
  'produced',
  'in_transit',
  'received',
  'quarantined',
  'closed'
);
create type public.inventory_reservation_status as enum ('planned', 'reserved', 'released', 'consumed', 'voided');

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type public.inventory_location_type not null,
  country_code text check (country_code is null or length(country_code) = 2),
  provider text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  sku text not null,
  batch_code text not null unique,
  status public.inventory_batch_status not null default 'planned',
  planned_quantity integer not null default 0 check (planned_quantity >= 0),
  produced_quantity integer not null default 0 check (produced_quantity >= 0),
  received_quantity integer not null default 0 check (received_quantity >= 0),
  on_hand_quantity integer not null default 0 check (on_hand_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  in_transit_quantity integer not null default 0 check (in_transit_quantity >= 0),
  safety_stock_quantity integer not null default 0 check (safety_stock_quantity >= 0),
  expected_ready_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_batches_reserved_not_exceed_on_hand check (reserved_quantity <= on_hand_quantity),
  constraint inventory_batches_damaged_not_exceed_on_hand check (damaged_quantity <= on_hand_quantity)
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  order_line_id uuid references public.order_lines(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  inventory_batch_id uuid references public.inventory_batches(id) on delete restrict,
  source_order_key text,
  source_line_key text,
  sku text not null,
  reserved_quantity integer not null check (reserved_quantity > 0),
  status public.inventory_reservation_status not null default 'planned',
  source text not null default 'fulfillment_stock_feed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index inventory_reservations_active_line_idx
  on public.inventory_reservations(order_line_id)
  where status in ('planned', 'reserved');

create index inventory_batches_product_id_idx on public.inventory_batches(product_id);
create index inventory_batches_sku_idx on public.inventory_batches(sku);
create index inventory_batches_status_idx on public.inventory_batches(status);
create index inventory_reservations_order_id_idx on public.inventory_reservations(order_id);
create index inventory_reservations_product_id_idx on public.inventory_reservations(product_id);
create index inventory_reservations_sku_idx on public.inventory_reservations(sku);

create trigger inventory_locations_set_updated_at
before update on public.inventory_locations
for each row execute function public.set_updated_at();

create trigger inventory_batches_set_updated_at
before update on public.inventory_batches
for each row execute function public.set_updated_at();

create trigger inventory_reservations_set_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

alter table public.inventory_locations enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_reservations enable row level security;

create policy inventory_locations_deny_client_access
  on public.inventory_locations for all to anon, authenticated using (false) with check (false);

create policy inventory_batches_deny_client_access
  on public.inventory_batches for all to anon, authenticated using (false) with check (false);

create policy inventory_reservations_deny_client_access
  on public.inventory_reservations for all to anon, authenticated using (false) with check (false);

create view public.fulfillment_stock_feed
with (security_invoker = true)
as
select
  p.id as product_id,
  p.sku,
  p.title,
  coalesce(sum(b.produced_quantity), 0)::integer as produced_quantity,
  coalesce(sum(b.received_quantity), 0)::integer as received_quantity,
  coalesce(sum(b.on_hand_quantity), 0)::integer as on_hand_quantity,
  coalesce(sum(b.reserved_quantity), 0)::integer as reserved_quantity,
  coalesce(sum(b.damaged_quantity), 0)::integer as damaged_quantity,
  coalesce(sum(b.in_transit_quantity), 0)::integer as in_transit_quantity,
  coalesce(sum(b.safety_stock_quantity), 0)::integer as safety_stock_quantity,
  greatest(
    coalesce(sum(b.on_hand_quantity), 0)
      - coalesce(sum(b.reserved_quantity), 0)
      - coalesce(sum(b.damaged_quantity), 0)
      - coalesce(sum(b.safety_stock_quantity), 0),
    0
  )::integer as available_quantity,
  timezone('utc', now()) as generated_at
from public.products p
left join public.inventory_batches b on b.product_id = p.id
group by p.id, p.sku, p.title;
