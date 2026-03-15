import { createClient } from '@supabase/supabase-js'
//ts-api/lib/supabase.ts
// is this file needed or can we just put this in the service file? I guess it makes sense to have a single place for the client config
export const supabase = createClient(
 process.env.SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_KEY!
)