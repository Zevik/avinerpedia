
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    console.log('Checking categories table...');
    const { data, error } = await supabase.from('categories').select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total categories found: ${data.length}`);

    const main = data.filter(c => c.type === 'main');
    console.log(`Main categories: ${main.length}`);

    const sub = data.filter(c => c.type === 'sub');
    console.log(`Sub categories: ${sub.length}`);

    console.log('\n--- Sample Main Categories ---');
    main.slice(0, 20).forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
}

check();
