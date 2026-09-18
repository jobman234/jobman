DROP POLICY IF EXISTS "Admins can update artisan profiles" ON public.artisan_profiles;
CREATE POLICY "Admins can update artisan profiles" ON public.artisan_profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can view all artisan profiles" ON public.artisan_profiles;
CREATE POLICY "Admins can view all artisan profiles" ON public.artisan_profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));