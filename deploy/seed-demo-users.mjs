import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yiaykxjwvwibotildtpo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ecUDK7NsmMOTJO6itBoLcg_PQpHWpOG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const demoAccounts = [
  { phone: "7700000001", password: "dentist123", name: "د. بەهزاد کاکە", city: "أربيل" },
  { phone: "7710000001", password: "vendor123", name: "GC Iraq (Vendor)", city: "بغداد" },
  { phone: "7710000002", password: "vendor123", name: "Tokuyama Center (Vendor)", city: "السليمانية" },
  { phone: "7710000003", password: "vendor123", name: "Bisco Supply (Vendor)", city: "أربيل" },
  { phone: "7710000004", password: "vendor123", name: "3M Dental Hub (Vendor)", city: "بغداد" },
  { phone: "7710000005", password: "vendor123", name: "Orodeka Depot (Vendor)", city: "دهوك" },
];

async function seedAccounts() {
  console.log("Creating demo accounts in your Supabase project...");

  for (const acc of demoAccounts) {
    const email = `${acc.phone}@batrading.com`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: acc.password,
        options: {
          data: {
            full_name: acc.name,
            phone: acc.phone,
            city: acc.city,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          console.log(`✓ Account ${acc.phone} is already registered!`);
        } else {
          console.error(`Error on ${acc.phone}:`, error.message);
        }
      } else {
        console.log(`✓ Successfully created account: ${acc.name} (${acc.phone})`);
      }
    } catch (e) {
      console.error(`Failed ${acc.phone}:`, e.message);
    }
  }

  console.log("All demo accounts are ready!");
}

seedAccounts();
