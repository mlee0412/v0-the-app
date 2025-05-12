-- Recreate the trigger function to handle all required fields
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    auth_id,
    email,
    display_name,
    phone_number,
    native_language,
    ai_tone,
    role_id,
    passcode_hash
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'native_language', 'English'),
    COALESCE(NEW.raw_user_meta_data->>'ai_tone', 'neutral'),
    COALESCE(NEW.raw_user_meta_data->>'role_id', NULL),
    NULL -- passcode_hash will be set separately
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists and create it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();
  END IF;
END
$$;

-- Create RLS policy to allow service role to manage users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role policy (if it doesn't exist)
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

-- Authenticated users policy (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'authenticated_select'
  ) THEN
    CREATE POLICY authenticated_select
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
