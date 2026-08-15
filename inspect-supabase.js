const fs = require('fs');
const path = require('path');
const envText = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  env[line.slice(0, idx)] = line.slice(idx + 1);
});
const { createClient } = require('@supabase/supabase-js');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}
const supabase = createClient(url, key);

async function inspectColumns() {
  try {
    const result = await supabase
      .from('information_schema.columns')
      .select('table_schema,table_name,column_name,data_type')
      .eq('table_name', 'posts')
      .order('ordinal_position', { ascending: true });

    console.log('TABLE COLUMNS', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('COLUMN INSPECTION ERROR', error);
  }
}

async function inspectPostTypes() {
  const candidateColumns = [
    'id',
    'user',
    'author',
    'username',
    'user_id',
    'created_by',
    'created_by_id',
    'profile_id',
    'owner',
    'owner_id',
    'creator',
    'text',
    'content',
    'body',
    'message',
    'post',
    'created_at',
    'inserted_at',
    'createdAt',
    'insertedAt',
  ];

  for (const column of candidateColumns) {
    try {
      const result = await supabase.from('posts').select(column).limit(1);
      console.log('CAN SELECT:', column, JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('CANNOT SELECT:', column, error.message || error);
    }
  }
}

(async () => {
  await inspectColumns();
  await inspectPostTypes();
})();
