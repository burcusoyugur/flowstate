import { createClient } from "@supabase/supabase-js";

// Hata fırlatmayan, sadece varsa döndüren basit versiyon
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function supabaseServer() {
  // Eğer değişkenler boşsa uygulama patlamasın, sadece boş client dönsün
  // Hata yönetimi sayfa içinde yapılacak
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}