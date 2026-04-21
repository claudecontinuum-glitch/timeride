import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kjablgvjkzqiltysudzs.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYWJsZ3Zqa3pxaWx0eXN1ZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTA0NzgsImV4cCI6MjA5MjMyNjQ3OH0.OejkZbrTU1b8-R1rx8QG3ru0qyNeYqynizWBy6-OFH0"

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
