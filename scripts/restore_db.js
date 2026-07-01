// scripts/restore_db.js
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function restore() {
  try {
    console.log('⏳ Leyendo database_schema.sql...');
    const sqlPath = path.join(__dirname, '../database_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔌 Conectando a la base de datos...');
    const client = await pool.connect();

    try {
      console.log('🚀 Ejecutando script de restauración (DROP, CREATE, INSERT)...');
      await client.query(sql);
      console.log('✅ Base de datos restaurada con éxito desde database_schema.sql!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
  } finally {
    await pool.end();
  }
}

restore();
