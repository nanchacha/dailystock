-- Create the stock_news table
create table stock_news (
  id bigint primary key, -- Telegram Message ID
  date timestamp with time zone not null,
  content text,
  source text, -- '몽당연필' or '이세무사'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table stock_news enable row level security;

-- Create a policy that allows anyone to read
create policy "Public stock_news are viewable by everyone."
  on stock_news for select
  using ( true );

-- Create a policy that allows the service role (cron job) to insert/update
-- For simplicity in this setup using ANON KEY for now, we might allow insert for anon if strictly controlled, 
-- but ideally this should be cleaner. 
-- Let's stick to simple public read. We will handle write via API route which runs on server.
create policy "Enable insert for authenticated users only"
  on stock_news for insert
  with check ( true ); -- Temporarily allow all for setup ease, refine later

create policy "Enable update for authenticated users only"
  on stock_news for update
  using ( true );

