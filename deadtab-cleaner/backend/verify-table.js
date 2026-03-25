require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkTbl() {
  const { data, error } = await supabase.from('settings').select('*').limit(1);
  if (error) {
    console.error('Error fetching settings:', error);
  } else {
    console.log('Settings Row:', data);
  }
}

checkTbl();
