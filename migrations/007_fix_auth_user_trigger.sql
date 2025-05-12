-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger function with proper field mapping
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  role_id_val UUID;
BEGIN
  -- Try to get role_id from user metadata
  IF NEW.raw_user_meta_data->>'role_id' IS NOT NULL THEN
    role_id_val := (NEW.raw_user_meta_data->>'role_id')::UUID;
  ELSE
    -- Default to a viewer role if no role_id provided
    -- You may want to replace this UUID with your actual default role UUID
    SELECT id INTO role_id_val FROM roles WHERE name = 'viewer' LIMIT 1;
  END IF;

  -- Insert into public.users table
  INSERT INTO public.users (
    auth_id,
    email,
    display_name,
    role_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    role_id_val
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Ensure RLS is properly set up
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all
      ON public.users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
