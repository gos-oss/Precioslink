import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ktfpuhkwbybkspgxgbbk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZnB1aGt3Ynlia3NwZ3hnYmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjk0NTksImV4cCI6MjEwMjY0NTQ1OX0.pjUf28UCbgb1PU53WCPyvvN4VJKo4DyDuzoflXPhLIY'

export const supabase = createClient(supabaseUrl, supabaseKey)
