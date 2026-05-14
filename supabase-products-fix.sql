-- Run this in the Supabase SQL editor for the same project used by .env.
-- It repairs product persistence, vendor-owned edits/deletes, the missing
-- vendor_name column error, the products_vendor_id_fkey error, and persisted
-- buyer/vendor orders.

alter table public.vendors enable row level security;

drop policy if exists "Public read vendors" on public.vendors;
drop policy if exists "Vendors insert own profile" on public.vendors;
drop policy if exists "Vendors update own profile" on public.vendors;

create policy "Public read vendors"
on public.vendors
for select
using (true);

create policy "Vendors insert own profile"
on public.vendors
for insert
to authenticated
with check (id = auth.uid()::text);

create policy "Vendors update own profile"
on public.vendors
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

-- Backfill vendor profiles for existing vendor accounts. Without this,
-- products.vendor_id cannot reference public.vendors(id), so inserts fail with
-- products_vendor_id_fkey.
insert into public.vendors (
  id,
  name,
  category,
  rating,
  image,
  description,
  reputation,
  delivery_time
)
select
  u.id::text,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Campus Vendor'),
  'others',
  0,
  '',
  'Campus vendor',
  'New',
  '10-15 mins'
from auth.users u
where coalesce(u.raw_user_meta_data->>'role', '') = 'vendor'
on conflict (id) do update
set name = excluded.name;

alter table public.products
add column if not exists vendor_name text not null default 'Unknown Vendor';

alter table public.products enable row level security;

drop policy if exists "Public read products" on public.products;
drop policy if exists "Vendors manage products" on public.products;
drop policy if exists "Vendor Product Row Access" on public.products;
drop policy if exists "Products Access Policies" on public.products;
drop policy if exists "Product Row-Level Security" on public.products;
drop policy if exists "Public product read & vendo..." on public.products;

create policy "Public read products"
on public.products
for select
using (true);

create policy "Vendors insert own products"
on public.products
for insert
to authenticated
with check (vendor_id::text = auth.uid()::text);

create policy "Vendors update own products"
on public.products
for update
to authenticated
using (vendor_id::text = auth.uid()::text)
with check (vendor_id::text = auth.uid()::text);

create policy "Vendors delete own products"
on public.products
for delete
to authenticated
using (vendor_id::text = auth.uid()::text);

alter table public.orders
add column if not exists created_at timestamptz not null default now(),
add column if not exists status text not null default 'completed',
add column if not exists delivery_method text not null default 'pickup',
add column if not exists address text;

alter table public.order_items
add column if not exists image text;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Buyers insert own orders" on public.orders;
drop policy if exists "Buyers read own orders" on public.orders;
drop policy if exists "Vendors read product orders" on public.orders;
drop policy if exists "Buyers insert own order items" on public.order_items;
drop policy if exists "Buyers read own order items" on public.order_items;
drop policy if exists "Vendors read own product order items" on public.order_items;

create policy "Buyers insert own orders"
on public.orders
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

create policy "Buyers read own orders"
on public.orders
for select
to authenticated
using (user_id::text = auth.uid()::text);

create policy "Vendors read product orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = orders.id
      and p.vendor_id::text = auth.uid()::text
  )
);

create policy "Buyers insert own order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id::text = auth.uid()::text
  )
);

create policy "Buyers read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id::text = auth.uid()::text
  )
);

create policy "Vendors read own product order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = order_items.product_id
      and p.vendor_id::text = auth.uid()::text
  )
);

-- Force Supabase/PostgREST to notice the new column immediately.
notify pgrst, 'reload schema';
