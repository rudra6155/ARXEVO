import { supabase } from "./supabase";

export async function signInWithGoogle() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: siteUrl + '/auth/callback',
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.user ?? null;
}

export async function saveCard(profileData: any) {
  const user = await getUser();
  if (!user) throw new Error("User not authenticated");

  // Upsert profile first
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email
  });

  const { data, error } = await supabase
    .from('cards')
    .insert([
      {
        user_id: user.id,
        archetype: profileData.archetype,
        secondary_archetype: profileData.secondary_archetype || null,
        origin_story: profileData.origin_story,
        traits: profileData.traits,
        confidence: profileData.confidence || 0,
      }
    ]);
  
  if (error) throw error;
  return data;
}

export async function getUserCards() {
  const user = await getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function saveToWaitlist(email: string, archetype: string) {
  const { data, error, count } = await supabase
    .from('waitlist')
    .insert([
      { email, archetype }
    ])
    .select('*'); // Supabase returns the inserted row

  if (error) {
    if (error.code === '23505') { // Unique violation for Postgres
      throw new Error("Email already registered.");
    }
    throw error;
  }

  // To get exact waitlist position efficiently, we can count total rows.
  const countResponse = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true });
  
  return { data, position: countResponse.count || 1 };
}
