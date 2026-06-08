-- 015_correction_log.sql

CREATE TABLE IF NOT EXISTS public.correction_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid REFERENCES public.voters(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.correction_log ENABLE ROW LEVEL SECURITY;

-- Admins and Super Admins can insert and select
CREATE POLICY "Admins can insert correction logs" 
  ON public.correction_log 
  FOR INSERT 
  WITH CHECK (public.get_user_role() IN ('admin', 'super-admin'));

CREATE POLICY "Admins can view correction logs" 
  ON public.correction_log 
  FOR SELECT 
  USING (public.get_user_role() IN ('admin', 'super-admin'));
