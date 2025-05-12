-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default roles if they don't exist
INSERT INTO roles (name, description)
VALUES 
  ('admin', 'Administrator - Full system access'),
  ('viewer', 'Viewer - Read-only access')
ON CONFLICT (name) DO NOTHING;
