
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rffdkgoxpuzekqfhhpqz.supabase.co';
// Using the public key provided. 
// Note: In a production React app, this is safe to expose as long as RLS policies are set up in the database.
const supabaseKey = 'sb_publishable_yOKEccqHMc9uJffXC9JFnw_lPh22B6g'; 

export const supabase = createClient(supabaseUrl, supabaseKey);
