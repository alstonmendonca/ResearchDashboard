/**
 * Supabase client setup for dashboard
 */
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://spytpzjvechwydrekrgj.supabase.co',
  'sb_publishable_K0YygHw_wBjeHloHOwzr-A_HcRD733p'
);
