
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TYPE public.vehicle_type AS ENUM ('car', 'suv', 'van', 'truck');

CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type vehicle_type NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  image_path text,
  description text,
  weekly_price numeric(10,2),
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cars TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cars" ON public.cars
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert cars" ON public.cars
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update cars" ON public.cars
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete cars" ON public.cars
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cars_updated_at BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies (bucket already created)
CREATE POLICY "Anyone can read car photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-photos');
CREATE POLICY "Admins upload car photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'car-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update car photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'car-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete car photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'car-photos' AND public.has_role(auth.uid(), 'admin'));
