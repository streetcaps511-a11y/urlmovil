// scripts/fix_jsonb_timestamps.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, '../database_schema.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');

// Replace '"YYYY-MM-DDTHH:mm:ss.sssZ"'::jsonb with 'YYYY-MM-DDTHH:mm:ss.sssZ'
const regex = /'\"([^\"]+)\"'::jsonb/g;
const matches = sql.match(regex);
console.log(`Found ${matches ? matches.length : 0} jsonb timestamp casts to fix.`);

sql = sql.replace(regex, "'$1'");

fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('✅ database_schema.sql updated with standard timestamp formatting!');
