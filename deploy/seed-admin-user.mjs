import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yiaykxjwvwibotildtpo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ecUDK7NsmMOTJO6itBoLcg_PQpHWpOG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  console.log("Creating Admin account...");

  const phone = "7700000000";
  const password = "admin123";
  const email = `${phone}@batrading.com`;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: "مدير المتجر العام / Admin",
          phone: phone,
          city: "أربيل",
        },
      },
    });

    if (error && !error.message.includes("already registered")) {
      console.error("Error creating admin:", error.message);
      return;
    }

    console.log("✓ Admin user registered in Auth:", email);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

createAdmin();
