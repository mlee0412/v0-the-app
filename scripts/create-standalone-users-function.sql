-- Function to create a standalone users table without foreign key constraints
CREATE OR REPLACE FUNCTION create_standalone_users_table() RETURNS void AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'standalone_users'
  ) THEN
    -- Create the standalone_users table
    CREATE TABLE public.standalone_users (
      id UUID PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      role_id UUID,
      pin_code VARCHAR(10),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Add a comment to the table
    COMMENT ON TABLE public.standalone_users IS 'Standalone users table without foreign key constraints';
    
    -- Create indexes
    CREATE INDEX standalone_users_username_idx ON public.standalone_users (username);
    CREATE INDEX standalone_users_role_idx ON public.standalone_users (role);
    
    -- Add a foreign key to roles table if it exists
    IF EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'roles'
    ) THEN
      ALTER TABLE public.standalone_users 
      ADD CONSTRAINT standalone_users_role_id_fkey 
      FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;
    
    RAISE NOTICE 'Successfully created standalone_users table';
  ELSE
    RAISE NOTICE 'standalone_users table already exists';
  END IF;
END;
$$ LANGUAGE plpgsql;
