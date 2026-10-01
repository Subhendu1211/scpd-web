import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const initSqlPath = path.resolve(__dirname, "../infra/db/init.sql");

console.log("Reading init.sql check for BOM...");
let content = fs.readFileSync(initSqlPath, "utf-8");

if (content.charCodeAt(0) === 0xfeff) {
  console.log("⚠️ BOM removed from init.sql");
  content = content.slice(1);
  fs.writeFileSync(initSqlPath, content, "utf-8");
} else {
  console.log("✅ No BOM found.");
}
