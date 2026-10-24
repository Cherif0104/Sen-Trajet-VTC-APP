create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  password_salt text not null,
  name text not null,
  phone text not null default '',
  rating double precision not null default 5,
  rating_count integer not null default 0,
  trip_count integer not null default 0,
  cancel_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  user_id text primary key references users(id),
  balance_xof integer not null default 0
);

create table if not exists drivers (
  user_id text primary key references users(id),
  category text not null,
  make text not null,
  model text not null,
  color text not null,
  plate text unique not null,
  seats integer not null,
  serene boolean not null default false,
  online boolean not null default false,
  busy boolean not null default false,
  lat double precision not null,
  lng double precision not null,
  home_lat double precision not null,
  home_lng double precision not null,
  kyc text not null default 'verified',
  bot boolean not null default false,
  acceptance double precision not null default 1
);

create table if not exists rides (
  id text primary key,
  rider_id text not null references users(id),
  driver_id text references users(id),
  exclusive_driver_id text references users(id),
  status text not null,
  category text not null,
  serene boolean not null default false,
  pickup_label text not null,
  pickup_city text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_label text not null,
  dropoff_city text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  route_json text not null,
  distance_m integer not null,
  duration_s integer not null,
  fare_xof integer not null,
  surge double precision not null,
  surge_label text,
  commission_xof integer not null,
  driver_net_xof integer not null,
  payment_method text not null,
  payment_status text not null,
  payment_ref text,
  settled boolean not null default false,
  approach_s integer not null default 30,
  trip_motion_s integer not null default 60,
  driver_start_lat double precision,
  driver_start_lng double precision,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  offer_expires_at timestamptz,
  offered_driver_id text references users(id),
  offered_json text not null default '[]',
  rider_score integer,
  driver_score integer,
  rider_comment text,
  cancelled_by text,
  cancel_reason text,
  bot boolean not null default false
);

create table if not exists carpools (
  id text primary key,
  driver_id text not null references users(id),
  origin_label text not null,
  origin_city text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_label text not null,
  dest_city text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  depart_at timestamptz not null,
  seats_total integer not null,
  seats_left integer not null,
  price_per_seat integer not null,
  notes text not null default '',
  amenities_json text not null default '[]',
  status text not null,
  serene boolean not null default false,
  distance_m integer not null,
  duration_s integer not null,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id text primary key,
  carpool_id text not null references carpools(id),
  rider_id text not null references users(id),
  seats integer not null,
  amount_xof integer not null,
  commission_xof integer not null,
  driver_net_xof integer not null,
  status text not null,
  payment_method text not null,
  payment_ref text,
  refund_xof integer not null default 0,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_one_active
  on bookings (carpool_id, rider_id)
  where status = 'confirmed';

create table if not exists transactions (
  id text primary key,
  user_id text not null references users(id),
  amount_xof integer not null,
  type text not null,
  method text,
  status text not null,
  reference text,
  affects_balance boolean not null default true,
  ride_id text references rides(id),
  booking_id text references bookings(id),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references users(id),
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rides_rider_idx on rides (rider_id, created_at desc);
create index if not exists rides_driver_idx on rides (driver_id, status);
create index if not exists rides_offer_idx on rides (offered_driver_id, status);
create index if not exists carpools_depart_idx on carpools (depart_at);
create index if not exists transactions_user_idx on transactions (user_id, created_at desc);

alter table users enable row level security;
alter table wallets enable row level security;
alter table drivers enable row level security;
alter table rides enable row level security;
alter table carpools enable row level security;
alter table bookings enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;
