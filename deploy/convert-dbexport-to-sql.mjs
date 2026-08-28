import fs from "fs";
import path from "path";

const CSV_DIR = path.resolve("dbexport/csv");
const OUTPUT_SQL = path.resolve("deploy/import-all-data.sql");

// Parse simple CSV handling quoted strings
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line) {
    const res = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === "," && !inQuote) {
        res.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    res.push(cur);
    return res;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === headers.length) {
      rows.push(vals);
    }
  }
  return { headers, rows };
}

function formatSqlValue(val, colName) {
  // Handle postgres arrays (e.g. product_ids uuid[], brands text[])
  if (colName === "product_ids" || colName === "tags" || colName === "preferred_categories" || colName === "brands") {
    if (val === "{}" || val === "[]" || val === "" || val === undefined || val === null) return "'{}'";
    if (val.startsWith("{") && val.endsWith("}")) return `'${val.replace(/'/g, "''")}'`;
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        const arr = JSON.parse(val);
        return `'${"{" + arr.join(",") + "}"}'`;
      } catch {
        return `'${val.replace(/'/g, "''")}'`;
      }
    }
    return `'${val.replace(/'/g, "''")}'`;
  }

  // Check if date or timestamp column
  const isDateCol =
    colName.endsWith("_date") ||
    colName.endsWith("_at") ||
    colName.endsWith("_since") ||
    colName === "expiry_date" ||
    colName === "stocked_since" ||
    colName === "starts_at" ||
    colName === "ends_at" ||
    colName === "created_at" ||
    colName === "updated_at";

  // Check if numeric column
  const isNumericCol =
    colName === "price" ||
    colName === "compare_price" ||
    colName === "stock" ||
    colName === "discount_value" ||
    colName === "reward_multiplier" ||
    colName === "reward_bonus_points" ||
    colName === "min_qty" ||
    colName === "sort_order" ||
    colName === "item_limit" ||
    colName === "max_banners" ||
    colName === "months_left" ||
    colName === "discount_percent" ||
    colName === "hue" ||
    colName === "chroma" ||
    colName === "radius_px" ||
    colName === "commission_value" ||
    colName === "latitude" ||
    colName === "longitude";

  // Check if reference or nullable media/link/note
  const isNullableRefCol =
    colName.endsWith("_id") ||
    colName === "cover_url" ||
    colName === "image_url" ||
    colName === "logo_url" ||
    colName === "logo_domain" ||
    colName === "link" ||
    colName === "note" ||
    colName === "notes" ||
    colName === "referred_by" ||
    colName === "parent_id";

  if (val === "" || val === undefined || val === null) {
    if (isDateCol || isNullableRefCol || isNumericCol) {
      return "NULL";
    }
    return "''";
  }

  if (val === "t" || val === "true") return "TRUE";
  if (val === "f" || val === "false") return "FALSE";

  // Check if JSON
  if (
    (val.startsWith("{") && val.endsWith("}")) ||
    (val.startsWith("[") && val.endsWith("]"))
  ) {
    if (val.startsWith("{") && val.endsWith("}")) {
      if (val.includes(":")) {
        return `'${val.replace(/'/g, "''")}'::jsonb`;
      }
      return `'${val.replace(/'/g, "''")}'`;
    }
    return `'${val.replace(/'/g, "''")}'::jsonb`;
  }

  // Check numeric
  if (!isNaN(Number(val)) && !val.startsWith("0") && val.length < 15) {
    return val;
  }

  return `'${val.replace(/'/g, "''")}'`;
}

function generateTableInsert(tableName) {
  const filePath = path.join(CSV_DIR, `${tableName}.csv`);
  if (!fs.existsSync(filePath)) return "";

  const text = fs.readFileSync(filePath, "utf8");
  const { headers, rows } = parseCSV(text);
  if (rows.length === 0) return "";

  let sql = `-- ------------------------------------------------------------\n`;
  sql += `-- Table: ${tableName} (${rows.length} rows)\n`;
  sql += `-- ------------------------------------------------------------\n`;
  sql += `DELETE FROM public.${tableName};\n`;
  sql += `INSERT INTO public.${tableName} (${headers.map((h) => `"${h}"`).join(", ")})\nVALUES\n`;

  const rowStrings = rows.map((r) => {
    return `  (${r.map((v, i) => formatSqlValue(v, headers[i])).join(", ")})`;
  });

  sql += rowStrings.join(",\n") + ";\n\n";
  return sql;
}

function buildFullSQL() {
  // Ordered by foreign key dependencies
  const tables = [
    "categories",
    "brand_cards",
    "banner_slots",
    "banners",
    "vendors",
    "catalog_items",
    "products",
    "product_tiers",
    "bundles",
    "flash_deals",
    "offers",
    "offer_products",
    "clearance_rules",
    "home_sections",
    "store_settings",
    "design_settings",
    "marketing_plans",
    "page_blocks",
    "page_documents",
    "coupons",
    "badge_fees",
    "reward_rules",
    "vendor_shipping_rates",
    "vendor_charges",
  ];

  let output = `-- =========================================================================\n`;
  output += `-- COMPLETE 1:1 RESTORATION DATA FROM DBEXPORT\n`;
  output += `-- Run this in Supabase SQL Editor to restore all 126 products, categories, banners, etc.\n`;
  output += `-- =========================================================================\n\n`;
  output += `SET session_replication_role = 'replica'; -- Disables foreign key checks during bulk import\n\n`;

  for (const t of tables) {
    output += generateTableInsert(t);
  }

  output += `SET session_replication_role = 'origin'; -- Re-enables foreign key checks\n`;

  fs.writeFileSync(OUTPUT_SQL, output, "utf8");
  console.log(`Generated ${OUTPUT_SQL} successfully!`);
}

buildFullSQL();
