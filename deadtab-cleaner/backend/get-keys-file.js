require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function getLostKeys() {
  const { data, error } = await supabase.from('users').select('email, api_key').order('created_at', { ascending: false }).limit(3);
  if (data) {
    fs.writeFileSync('output.txt', data.map(d => `${d.email} => ${d.api_key}`).join('\n'));
    console.log('Saved to output.txt');
  }
}

getLostKeys();
