'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton() {
  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.reload();
  }
  return (
    <button
      onClick={signOut}
      className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
    >
      Sign out
    </button>
  );
}
