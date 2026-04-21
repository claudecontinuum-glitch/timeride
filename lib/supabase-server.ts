import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kjablgvjkzqiltysudzs.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYWJsZ3Zqa3pxaWx0eXN1ZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTA0NzgsImV4cCI6MjA5MjMyNjQ3OH0.OejkZbrTU1b8-R1rx8QG3ru0qyNeYqynizWBy6-OFH0"

export async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component — cookies solo se pueden escribir desde middleware
        }
      },
    },
  })
}
