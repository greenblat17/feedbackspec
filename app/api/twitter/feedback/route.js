import { NextResponse } from 'next/server';
import { createClient } from '../../../../libs/supabase/server.js';
import { withAuthAPI } from '../../../../libs/auth-utils.js';

async function handler(request) {
  const user = request.user;
  const supabase = createClient();

  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const ascending = searchParams.get('ascending') === 'true';

    console.log(`Fetching Twitter feedback for user ${user.id}, sorting by ${sortBy}`);

    const { data: feedback, error } = await supabase
      .from('raw_feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .order(sortBy, { ascending });

    if (error) {
      console.error('Error fetching Twitter feedback:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data: feedback || [] });
  } catch (error) {
    console.error('[API Twitter Feedback Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Twitter feedback', message: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAuthAPI(handler);
