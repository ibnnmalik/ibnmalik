-- ============================================================
-- Ibn Malik Grocery Store — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (extends auth.users, adds role + contact info)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  governorate text,
  address text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up (Google or email)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  name_ar text not null,
  name_en text not null,
  short_description_ar text,
  short_description_en text,
  description_ar text,
  description_en text,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price >= 0),
  stock int not null default 0,
  weight_options jsonb default '[]'::jsonb,   -- e.g. [{"label_ar":"500 جم","label_en":"500g","price_diff":0}]
  image_url text,
  gallery jsonb default '[]'::jsonb,          -- array of image URLs
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);

-- ------------------------------------------------------------
-- DISCOUNTS (site-wide, category, or single-product)
-- ------------------------------------------------------------
create table if not exists public.discounts (
  id uuid primary key default uuid_generate_v4(),
  code text unique,                                    -- optional coupon code, null = automatic discount
  label_ar text,
  label_en text,
  type text not null check (type in ('percentage','fixed')),
  value numeric(10,2) not null check (value > 0),
  applies_to text not null default 'all' check (applies_to in ('all','category','product')),
  target_id uuid,                                       -- category_id or product_id depending on applies_to
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null default to_char(now(),'YYMMDD') || substr(replace(uuid_generate_v4()::text,'-',''),1,6),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  governorate text not null,
  address text not null,
  notes text,
  items jsonb not null,          -- snapshot: [{product_id,name_ar,name_en,qty,unit_price,weight_label}]
  subtotal numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',
  status text not null default 'pending'
    check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.categories enable row level security;
alter table public.products  enable row level security;
alter table public.discounts enable row level security;
alter table public.orders    enable row level security;
alter table public.reviews   enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ---- profiles ----
create policy "profiles: read own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ---- categories (public read, admin write) ----
create policy "categories: public read" on public.categories
  for select using (true);
create policy "categories: admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- products (public read active items, admin full) ----
create policy "products: public read active" on public.products
  for select using (status = 'active' or public.is_admin());
create policy "products: admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- discounts (public read active ones, admin write) ----
create policy "discounts: public read active" on public.discounts
  for select using (active = true or public.is_admin());
create policy "discounts: admin write" on public.discounts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- orders (anyone can create, owner/admin can read, admin can update) ----
create policy "orders: anyone can insert" on public.orders
  for insert with check (true);
create policy "orders: owner or admin can read" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "orders: admin can update" on public.orders
  for update using (public.is_admin());

-- ---- reviews (public read approved, owner insert, admin moderate) ----
create policy "reviews: public read approved" on public.reviews
  for select using (status = 'approved' or public.is_admin());
create policy "reviews: anyone can insert" on public.reviews
  for insert with check (true);
create policy "reviews: admin can moderate" on public.reviews
  for update using (public.is_admin());
create policy "reviews: admin can delete" on public.reviews
  for delete using (public.is_admin());

-- ============================================================
-- MAKE YOUR FIRST ADMIN (run manually after you sign up once)
-- ============================================================
-- update public.profiles set role = 'admin' where id =
--   (select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com');

-- ============================================================
-- SEED DATA (safe to delete / edit)
-- ============================================================
insert into public.categories (slug, name_ar, name_en, sort_order) values
  ('honey','عسل','Honey',1),
  ('peanut-butter','زبدة الفول السوداني','Peanut Butter',2),
  ('tahini','طحينة','Tahini',3),
  ('oats','شوفان','Oats',4)
on conflict (slug) do nothing;
