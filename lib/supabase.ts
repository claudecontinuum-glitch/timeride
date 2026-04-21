import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
