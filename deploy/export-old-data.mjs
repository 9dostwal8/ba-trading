import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const OLD_URL = "https://jrkwxgdclonsyzdutgjs.supabase.co";
const OLD_KEY = "sb_publishable_dC__KcQB925FI763A2g26g_kbctxmC2";

const supabase = createClient(OLD_URL, OLD_KEY);

function formatVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return v;
  if (Array.isArray(v) || typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function dumpTable(table, rows) {
  if (!rows || rows.length === 0) return `-- No rows in ${table}\n\n`;
  const cols = Object.keys(rows[0]);
  let sql = `-- ${table.toUpperCase()} (${rows.length} rows)\n`;
  sql += `DELETE FROM public.${table};\n`;
  sql += `INSERT INTO public.${table} (${cols.map((c) => `"${c}"`).join(", ")})\nVALUES\n`;
  const valRows = rows.map((r) => {
    return `  (${cols.map((c) => formatVal(r[c])).join(", ")})`;
  });
  sql += valRows.join(",\n") + ";\n\n";
  return sql;
}

async function exportAll() {
  console.log("Fetching all data from original database...");
  const tables = [
    "categories",
    "brand_cards",
    "products",
    "banners",
    "offers",
    "offer_products",
    "flash_deals",
    "bundles",
    "product_tiers",
    "clearance_rules",
    "home_sections",
    "store_settings",
  ];

  let fullSql = "-- ==========================================================\n";
  fullSql += "-- EXACT 1:1 BACKUP DUMP FROM ORIGINAL DATABASE\n";
  fullSql += "-- ==========================================================\n\n";

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select("*");
      if (error) {
        console.error(`Error on ${t}:`, error.message);
        continue;
      }
      console.log(`Fetched ${data?.length ?? 0} rows from ${t}`);
      fullSql += dumpTable(t, data ?? []);
    } catch (e) {
      console.error(`Failed ${t}:`, e.message);
    }
  }

  fs.writeFileSync("deploy/full-original-data.sql", fullSql);
  console.log("Saved full backup to deploy/full-original-data.sql!");
}

exportAll();
