
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'artisan', 'admin', 'super_admin');

-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  state TEXT,
  lga TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Artisan details table
CREATE TABLE public.artisan_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_trade TEXT NOT NULL,
  years_experience INTEGER DEFAULT 0,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  is_public BOOLEAN DEFAULT false,
  bio TEXT,
  nin TEXT,
  date_of_birth DATE,
  government_id_type TEXT,
  government_id_front_url TEXT,
  government_id_back_url TEXT,
  current_address_house TEXT,
  current_address_street TEXT,
  current_address_lga TEXT,
  current_address_state TEXT,
  current_address_landmark TEXT,
  previous_address_house TEXT,
  previous_address_street TEXT,
  previous_address_lga TEXT,
  previous_address_state TEXT,
  previous_address_landmark TEXT,
  proof_of_address_url TEXT,
  selfie_url TEXT,
  selfie_match_score REAL,
  rejection_note TEXT,
  job_photos TEXT[] DEFAULT '{}',
  work_photo_url TEXT,
  portrait_url TEXT,
  reference1_name TEXT,
  reference1_phone TEXT,
  reference1_location TEXT,
  reference1_job_type TEXT,
  reference2_name TEXT,
  reference2_phone TEXT,
  reference2_location TEXT,
  reference2_job_type TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artisan_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artisans can view own profile" ON public.artisan_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Artisans can insert own profile" ON public.artisan_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Artisans can update own profile" ON public.artisan_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public artisan profiles visible to all" ON public.artisan_profiles FOR SELECT USING (is_public = true AND verification_status = 'approved');

-- Admin can view all profiles
CREATE POLICY "Admins can view all artisan profiles" ON public.artisan_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update artisan profiles" ON public.artisan_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Insert role from metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );

  -- If artisan, create artisan profile
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'artisan' THEN
    INSERT INTO public.artisan_profiles (user_id, primary_trade)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'primary_trade', 'General'));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_artisan_profiles_updated_at BEFORE UPDATE ON public.artisan_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
