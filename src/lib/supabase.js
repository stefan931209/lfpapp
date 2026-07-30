import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kmlrdekctqdcqyxgyhsb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w7EYj2tL273dK5KyofZEcw_H_pD99mK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/*
Schema deja creată în Supabase (SQL editor), cu RLS activat:

- profiles (id, full_name, rating, is_provisional, matches_played, created_at)
- matches (id, created_by, club_name, match_date, match_time, duration_minutes,
           min_level, max_level, status, created_at)
- ready_to_play (id, user_id, available_from, available_until, created_at)
- match_results (id, match_id, team_a_score, team_b_score,
                 confirmed_by_team_a, confirmed_by_team_b, created_at)
- player_votes (id, match_id, voter_id, rated_player_id, vote, created_at)
*/
