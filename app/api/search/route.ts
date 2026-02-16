
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize client outside if keys are present, or handle inside handler
const getSupabase = () => {
    if (!supabaseUrl || !supabaseKey) {
        // Fallback for build time
        return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    return createClient(supabaseUrl, supabaseKey);
};

const supabase = getSupabase();

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    // Perform a fast search on titles only for autocomplete
    const { data, error } = await supabase
        .from('content_items')
        .select('id, title, main_category, sub_category')
        .ilike('title', `%${query}%`)
        .limit(10);

    if (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json(data);
}
