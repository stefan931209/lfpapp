import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Creează un proiect gratuit pe https://supabase.com și înlocuiește valorile de mai jos
// (Project Settings -> API -> Project URL / anon public key)
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/*
Schema minimă recomandată în Supabase (SQL editor):

create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  level numeric,
  preferred_side text,       -- 'left' | 'right'
  favorite_club text,
  avatar_url text,
  created_at timestamp default now()
);

create table matches (
  id uuid default gen_random_uuid() primary key,
  club text,
  match_date date,
  match_time time,
  level numeric,
  players_needed int,
  players_joined int default 1,
  created_by uuid references auth.users,
  created_at timestamp default now()
);

create table ready_to_play (
  user_id uuid references auth.users primary key,
  active_until timestamp,
  updated_at timestamp default now()
);
*/
