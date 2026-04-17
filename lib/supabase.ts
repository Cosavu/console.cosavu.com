import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mock mode if variables are missing
export const IS_MOCK_MODE = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export async function createApiKey(
  userName: string,
  email: string,
  enterpriseId: string = "default"
) {
  const keyString = `csvu_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  if (IS_MOCK_MODE) {
    console.log('🧪 MOCK: Creating API key:', { userName, email, keyString });
    return { api_key: keyString, error: null };
  }

  try {
    const { data, error } = await supabase.from('api_keys').insert({
      key_string: keyString,
      user_name: userName,
      email: email,
      enterprise_id: enterpriseId
    }).select().single();

    return { api_key: keyString, data, error };
  } catch (err: any) {
    return { error: err };
  }
}

export async function getApiKeys(enterpriseId: string = "default") {
  if (IS_MOCK_MODE) {
    return { data: [], error: null };
  }
  return await supabase
    .from('api_keys')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('created_at', { ascending: false });
}

export async function getUserProfile(userId: string) {
  if (IS_MOCK_MODE) {
    return { data: null, error: null };
  }
  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}
