-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
CREATE TRIGGER update_push_subscription_timestamp
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_push_subscription_timestamp();

-- RLS policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own subscriptions
CREATE POLICY read_own_subscriptions ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own subscriptions
CREATE POLICY insert_own_subscriptions ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscriptions
CREATE POLICY update_own_subscriptions ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own subscriptions
CREATE POLICY delete_own_subscriptions ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role to manage all subscriptions
CREATE POLICY service_role_manage_subscriptions ON push_subscriptions
  USING (auth.jwt() ->> 'role' = 'service_role');
