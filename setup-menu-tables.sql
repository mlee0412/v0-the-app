-- Create menu_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  popularity INTEGER DEFAULT 5,
  pairings TEXT[],
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS sales_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT NOT NULL,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  revenue NUMERIC(10,2) NOT NULL,
  time_of_day TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
