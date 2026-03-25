require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function getLostKeys() {
  const { data, error } = await supabase.from('users').select('email, api_key').order('created_at', { ascending: false }).limit(5);
  if (error) console.error(error);
  else console.log('Recent Users/Keys:', data);
}

getLostKeys();
