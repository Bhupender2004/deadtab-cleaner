require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testInsert() {
  console.log('Testing user insert...');
  const apiKey = `dtc_${crypto.randomBytes(24).toString('hex')}`;
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: 'test@example.com',
      api_key: apiKey,
    })
    .select()
    .single();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success, data:', data);
  }
}

testInsert();
