// scripts/restore_db_clean.js
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const sqlPath = path.join(__dirname, '../database_schema.sql');
let content = fs.readFileSync(sqlPath, 'utf8');

console.log('✏️ Aplicando correcciones al esquema de base de datos...');

// Helper to parse columns and values of an INSERT statement
function parseInsert(statementStr, table) {
  const colStart = `INSERT INTO "${table}" (`.length;
  const colEnd = statementStr.indexOf(')');
  if (colEnd === -1) return null;
  const cols = statementStr.substring(colStart, colEnd).split(',').map(c => c.trim().replace(/"/g, ''));
  
  const valuesKeyword = 'VALUES (';
  const valStart = statementStr.indexOf(valuesKeyword, colEnd);
  if (valStart === -1) return null;
  
  let valContentStart = valStart + valuesKeyword.length;
  let values = [];
  let currentVal = '';
  let inQuotes = false;
  let quoteChar = '';
  let escape = false;
  let parenDepth = 0;
  let idx = valContentStart;
  
  while (idx < statementStr.length) {
    const char = statementStr[idx];
    if (escape) {
      currentVal += char;
      escape = false;
    } else if (char === '\\') {
      currentVal += char;
      escape = true;
    } else if (inQuotes) {
      currentVal += char;
      if (char === quoteChar) {
        if (quoteChar === "'" && statementStr[idx + 1] === "'") {
          currentVal += "'";
          idx++;
        } else {
          inQuotes = false;
        }
      }
    } else {
      if (char === "'" || char === '"') {
        inQuotes = true;
        quoteChar = char;
        currentVal += char;
      } else if (char === '(') {
        parenDepth++;
        currentVal += char;
      } else if (char === ')') {
        if (parenDepth > 0) {
          parenDepth--;
          currentVal += char;
        } else {
          values.push(currentVal.trim());
          break;
        }
      } else if (char === ',' && parenDepth === 0) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    idx++;
  }
  
  return { cols, values, endIdx: idx + 1 };
}

// 0. Corregir castings inválidos ::jsonb de fechas/timestamps
content = content.replace(/'\"([^\"]+)\"'::jsonb/g, "'$1'");

// 1. Agregar UNIQUE a Usuarios.Correo
content = content.replace(
  `"Correo" CHARACTER VARYING(100) NOT NULL,`,
  `"Correo" CHARACTER VARYING(100) NOT NULL UNIQUE,`
);

// 2. Comentar Devoluciones_IdEstado_fkey (incompatible por tipos: VARCHAR vs SERIAL/INTEGER)
content = content.replace(
  `ALTER TABLE "Devoluciones" ADD CONSTRAINT "Devoluciones_IdEstado_fkey" FOREIGN KEY ("IdEstado") REFERENCES "Estado"("IdEstado") ON DELETE SET NULL ON UPDATE CASCADE;`,
  `-- ALTER TABLE "Devoluciones" ADD CONSTRAINT "Devoluciones_IdEstado_fkey" FOREIGN KEY ("IdEstado") REFERENCES "Estado"("IdEstado") ON DELETE SET NULL ON UPDATE CASCADE;`
);

// 3. Comentar setval de Permisos (la tabla no usa llaves numéricas/serial, sino varchar)
content = content.replace(
  `SELECT setval(pg_get_serial_sequence('\"Permisos\"', 'IdPermiso'), COALESCE((SELECT MAX(\"IdPermiso\") FROM \"Permisos\"), 1), true) FROM (SELECT 1) AS dummy_subquery WHERE pg_get_serial_sequence('\"Permisos\"', 'IdPermiso') IS NOT NULL;`,
  `-- SELECT setval(pg_get_serial_sequence('\"Permisos\"', 'IdPermiso'), COALESCE((SELECT MAX(\"IdPermiso\") FROM \"Permisos\"), 1), true) FROM (SELECT 1) AS dummy_subquery WHERE pg_get_serial_sequence('\"Permisos\"', 'IdPermiso') IS NOT NULL;`
);

// 4. Corregir insert de Tallas (remover IdProducto que no existe en el modelo/tabla)
content = content.replace(
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "IdProducto", "Estado") VALUES (1, '7', 0, 1, true) ON CONFLICT DO NOTHING;`,
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "Estado") VALUES (1, '7', 0, true) ON CONFLICT DO NOTHING;`
);
content = content.replace(
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "IdProducto", "Estado") VALUES (2, '7 1/4', 0, 1, true) ON CONFLICT DO NOTHING;`,
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "Estado") VALUES (2, '7 1/4', 0, true) ON CONFLICT DO NOTHING;`
);
content = content.replace(
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "IdProducto", "Estado") VALUES (3, '7 1/8', 0, 1, true) ON CONFLICT DO NOTHING;`,
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "Estado") VALUES (3, '7 1/8', 0, true) ON CONFLICT DO NOTHING;`
);
content = content.replace(
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "IdProducto", "Estado") VALUES (4, 'AJUSTABLE', 0, 1, true) ON CONFLICT DO NOTHING;`,
  `INSERT INTO "Tallas" ("IdTalla", "Nombre", "Cantidad", "Estado") VALUES (4, 'AJUSTABLE', 0, true) ON CONFLICT DO NOTHING;`
);

// Scan all Usuarios inserts to find existing emails
const existingEmails = new Set();
let pos = 0;
while (pos < content.length) {
  const match = content.indexOf('INSERT INTO "Usuarios" (', pos);
  if (match === -1) break;
  
  const stmtEnd = content.indexOf('ON CONFLICT DO NOTHING;', match);
  if (stmtEnd === -1) {
    pos = match + 1;
    continue;
  }
  
  const stmtStr = content.substring(match, stmtEnd + 'ON CONFLICT DO NOTHING;'.length);
  const parsed = parseInsert(stmtStr, 'Usuarios');
  if (parsed) {
    const emailIndex = parsed.cols.indexOf('Correo');
    if (emailIndex !== -1) {
      let email = parsed.values[emailIndex];
      if (email.startsWith("'") && email.endsWith("'")) {
        email = email.substring(1, email.length - 1);
      }
      existingEmails.add(email.toLowerCase());
    }
  }
  pos = stmtEnd + 1;
}

// 5. Limpieza de columnas obsoletas (Departamento en Clientes, IdProductoRef en Productos)
// Y conversión de arrays Postgres a formato JSON válido en columnas JSON
// Y generación de usuarios faltantes en base a los emails de clientes
let newContent = '';
let i = 0;
let stats = { Clientes: 0, Productos: 0, RolesJSON: 0, ProductosJSON: 0 };
let userInsertsToAdd = '\n-- 🌱 USUARIOS DE CLIENTES FALTANTES\n';
let nextUserId = 200; // start with a safe high ID

while (i < content.length) {
  const matchClientes = content.startsWith('INSERT INTO "Clientes" (', i);
  const matchProductos = content.startsWith('INSERT INTO "Productos" (', i);
  const matchRoles = content.startsWith('INSERT INTO "Roles" (', i);
  
  if (matchClientes || matchProductos || matchRoles) {
    const table = matchClientes ? 'Clientes' : (matchProductos ? 'Productos' : 'Roles');
    
    // Find the end of statement
    const stmtEnd = content.indexOf('ON CONFLICT DO NOTHING;', i);
    if (stmtEnd === -1) {
      newContent += content[i];
      i++;
      continue;
    }
    
    const statementStr = content.substring(i, stmtEnd + 'ON CONFLICT DO NOTHING;'.length);
    const parsed = parseInsert(statementStr, table);
    if (!parsed) {
      newContent += content[i];
      i++;
      continue;
    }
    
    const cols = parsed.cols;
    const values = parsed.values;
    
    // Check if we need to remove Departamento (Clientes) or IdProductoRef (Productos)
    if (table === 'Clientes') {
      const colIndex = cols.indexOf('Departamento');
      if (colIndex !== -1) {
        cols.splice(colIndex, 1);
        values.splice(colIndex, 1);
        stats.Clientes++;
      }
      
      // Self-healing: Check if client email exists in Usuarios table
      const emailIndex = cols.indexOf('Email');
      const nameIndex = cols.indexOf('Nombre');
      const docIndex = cols.indexOf('Documento');
      const typeDocIndex = cols.indexOf('TipoDocumento');
      const telIndex = cols.indexOf('Telefono');
      
      if (emailIndex !== -1) {
        let email = values[emailIndex];
        if (email.startsWith("'") && email.endsWith("'")) {
          email = email.substring(1, email.length - 1);
        }
        
        if (!existingEmails.has(email.toLowerCase())) {
          let name = nameIndex !== -1 ? values[nameIndex] : "'Manuel'";
          let doc = docIndex !== -1 ? values[docIndex] : "'125465'";
          let typeDoc = typeDocIndex !== -1 ? values[typeDocIndex] : "'Cédula de Ciudadanía'";
          let tel = telIndex !== -1 ? values[telIndex] : "''";
          
          console.log(`👤 Generando usuario semilla para email faltante: ${email}`);
          userInsertsToAdd += `INSERT INTO "Usuarios" ("IdUsuario", "Nombre", "Correo", "Clave", "IdRol", "Estado", "MustChangePassword", "TipoDocumento", "NumeroDocumento", "Telefono") VALUES (${nextUserId++}, ${name}, '${email}', '$2a$10$MYjaM5w.IqJtxbdF46O3pOzG0KKQp/25rWRxWeeJ8Up1g1Wd.7FzC', 2, 'activo', false, ${typeDoc}, ${doc}, ${tel}) ON CONFLICT DO NOTHING;\n`;
          
          existingEmails.add(email.toLowerCase());
        }
      }
    } else if (table === 'Productos') {
      const colIndex = cols.indexOf('IdProductoRef');
      if (colIndex !== -1) {
        cols.splice(colIndex, 1);
        values.splice(colIndex, 1);
        stats.Productos++;
      }
    }
    
    // Check if we need to fix JSON format in Roles.Permisos, Productos.TallasStock, Colores, Imagenes
    const jsonCols = table === 'Roles' ? ['Permisos'] : (table === 'Productos' ? ['TallasStock', 'Colores', 'Imagenes'] : []);
    for (let cIdx = 0; cIdx < cols.length; cIdx++) {
      const colName = cols[cIdx];
      if (jsonCols.includes(colName)) {
        let val = values[cIdx];
        if (val.startsWith("'") && val.endsWith("'")) {
          let raw = val.substring(1, val.length - 1);
          if (raw.startsWith('{') && raw.endsWith('}')) {
            raw = '[' + raw.substring(1, raw.length - 1) + ']';
            raw = raw.replace(/\\"/g, '"');
            values[cIdx] = "'" + raw + "'";
            if (table === 'Roles') stats.RolesJSON++;
            if (table === 'Productos') stats.ProductosJSON++;
          }
        }
      }
    }
    
    // Reconstruct the statement
    const newColStr = cols.map(c => `"${c}"`).join(', ');
    const newValuesStr = values.join(', ');
    
    const statement = `INSERT INTO "${table}" (${newColStr}) VALUES (${newValuesStr}) ON CONFLICT DO NOTHING;`;
    
    newContent += statement;
    i = stmtEnd + 'ON CONFLICT DO NOTHING;'.length;
  } else {
    newContent += content[i];
    i++;
  }
}

// Insert userInsertsToAdd before Clientes inserts
const clientsHeaderIdx = newContent.indexOf('-- Tabla: Clientes');
if (clientsHeaderIdx !== -1) {
  newContent = newContent.substring(0, clientsHeaderIdx) + userInsertsToAdd + '\n' + newContent.substring(clientsHeaderIdx);
}

// Write the fully corrected schema file back to disk
fs.writeFileSync(sqlPath, newContent);
console.log('💾 Archivo database_schema.sql guardado con las correcciones.');
console.log(`- Clientes (Departamento removido): ${stats.Clientes}`);
console.log(`- Productos (IdProductoRef removido): ${stats.Productos}`);
console.log(`- Roles (JSON arreglado): ${stats.RolesJSON}`);
console.log(`- Productos (JSON arreglados): ${stats.ProductosJSON}`);

// Connect and run DB restore
console.log('🔌 Conectando a PostgreSQL (Aiven)...');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function restore() {
  try {
    const client = await pool.connect();
    try {
      console.log('🚀 Restaurando base de datos (DROP, CREATE, INSERT)...');
      await client.query(newContent);
      console.log('✅ Base de datos restaurada exitosamente!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error durante la ejecución del script:', error);
  } finally {
    await pool.end();
  }
}

restore();
