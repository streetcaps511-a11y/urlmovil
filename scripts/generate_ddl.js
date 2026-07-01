import fs from 'fs';
import path from 'path';
import db from '../src/models/index.js';

const { sequelize } = db;

async function run() {
  const models = Object.keys(db).filter(k => k !== 'sequelize');
  
  let ddl = `-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📦 SCRIPT DE BASE DE DATOS - GORRASCAPS
-- Generado automáticamente desde los modelos de Sequelize
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 🗑️ LIMPIEZA DE TABLAS EXISTENTES
`;

  // Sort tables so dependent tables are dropped or CASCADE handles them
  const tableNames = [];
  for (const modelName of models) {
    const Model = db[modelName];
    if (Model && Model.tableName && !tableNames.includes(Model.tableName)) {
      tableNames.push(Model.tableName);
    }
  }

  // Drop tables
  for (const tableName of tableNames) {
    ddl += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
  }
  ddl += `\n-- 🛠️ CREACIÓN DE ESTRUCTURAS (TABLAS)\n\n`;

  // Map Sequelize types to standard PostgreSQL types
  const mapType = (type, autoIncrement) => {
    const typeStr = type.toString().toUpperCase();
    if (typeStr.startsWith('INTEGER')) {
      return autoIncrement ? 'SERIAL' : 'INTEGER';
    }
    if (typeStr.startsWith('BIGINT')) {
      return 'BIGINT';
    }
    if (typeStr.startsWith('DECIMAL') || typeStr.startsWith('NUMERIC')) {
      // Keep precision if defined
      return typeStr;
    }
    if (typeStr.startsWith('BOOLEAN')) {
      return 'BOOLEAN';
    }
    if (typeStr.startsWith('TEXT')) {
      return 'TEXT';
    }
    if (typeStr.startsWith('DATEONLY')) {
      return 'DATE';
    }
    if (typeStr.startsWith('DATE') || typeStr.startsWith('TIMESTAMP')) {
      return 'TIMESTAMP WITH TIME ZONE';
    }
    if (typeStr.startsWith('JSON') || typeStr.startsWith('JSONB')) {
      return 'JSON';
    }
    if (typeStr.startsWith('VARCHAR') || typeStr.startsWith('STRING')) {
      // Find length
      const match = typeStr.match(/\((\d+)\)/);
      if (match) {
        return `CHARACTER VARYING(${match[1]})`;
      }
      return 'CHARACTER VARYING(255)';
    }
    return typeStr;
  };

  // Generate CREATE TABLE for each model
  for (const modelName of models) {
    const Model = db[modelName];
    if (!Model || !Model.tableName) continue;

    ddl += `CREATE TABLE "${Model.tableName}" (\n`;
    const fieldLines = [];
    const pkeys = [];

    for (const [attrName, attr] of Object.entries(Model.rawAttributes)) {
      const columnName = attr.field || attrName;
      const pgType = mapType(attr.type, attr.autoIncrement);
      
      let colDef = `  "${columnName}" ${pgType}`;
      
      if (attr.allowNull === false) {
        colDef += ' NOT NULL';
      }

      if (attr.defaultValue !== undefined && typeof attr.defaultValue !== 'function') {
        if (typeof attr.defaultValue === 'boolean') {
          colDef += ` DEFAULT ${attr.defaultValue}`;
        } else if (typeof attr.defaultValue === 'number') {
          colDef += ` DEFAULT ${attr.defaultValue}`;
        } else if (typeof attr.defaultValue === 'string') {
          colDef += ` DEFAULT '${attr.defaultValue}'`;
        } else if (attr.defaultValue.toString().includes('NOW')) {
          colDef += ' DEFAULT CURRENT_TIMESTAMP';
        }
      }

      fieldLines.push(colDef);

      if (attr.primaryKey) {
        pkeys.push(columnName);
      }
    }

    if (pkeys.length > 0) {
      fieldLines.push(`  CONSTRAINT "${Model.tableName}_pkey" PRIMARY KEY ("${pkeys.join('", "')}")`);
    }

    ddl += fieldLines.join(',\n');
    ddl += `\n);\n\n`;
  }

  ddl += `-- 🔗 RELACIONES (CLAVES FORÁNEAS)\n`;

  // Generate foreign keys based on references in rawAttributes
  const addedFks = new Set();
  for (const modelName of models) {
    const Model = db[modelName];
    if (!Model || !Model.tableName) continue;

    for (const [attrName, attr] of Object.entries(Model.rawAttributes)) {
      if (attr.references) {
        const columnName = attr.field || attrName;
        // The model can be a string or a model object
        let targetTable = attr.references.model.tableName || attr.references.model;
        if (typeof targetTable === 'object' && targetTable.tableName) {
          targetTable = targetTable.tableName;
        }
        const targetKey = attr.references.key;
        const fkName = `${Model.tableName}_${columnName}_fkey`;

        if (!addedFks.has(fkName)) {
          ddl += `ALTER TABLE "${Model.tableName}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${columnName}") REFERENCES "${targetTable}"("${targetKey}") ON DELETE SET NULL ON UPDATE CASCADE;\n`;
          addedFks.add(fkName);
        }
      }
    }
  }

  // Seed data
  ddl += `\n-- 🌱 DATOS DE CONFIGURACIÓN Y SEMILLA\n\n`;
  
  // Read existing seeds from database_schema.sql to preserve them
  try {
    const oldSchema = fs.readFileSync('database_schema.sql', 'utf8');
    const seedStart = oldSchema.indexOf('-- 🌱 DATOS DE CONFIGURACIÓN Y SEMILLA');
    if (seedStart !== -1) {
      const seedContent = oldSchema.substring(seedStart + '-- 🌱 DATOS DE CONFIGURACIÓN Y SEMILLA'.length);
      // Clean up the seed content from any columns that we dropped/renamed:
      // 1. Clientes doesn't have "Departamento" anymore, so remove it from INSERT INTO "Clientes"
      let cleanSeed = seedContent.replace(
        /INSERT INTO "Clientes" \("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Departamento", "Ciudad", "Direccion", "Avatar"\) VALUES \((45|36|1), '([^']+)', '([^']+)', '([^']+)', '([^']*)', '([^']+)', (true|false), '([^']*)', '([^']+)', '([^']+)', ([^\)]+)\) ON CONFLICT DO NOTHING;/g,
        (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11) => {
          return `INSERT INTO "Clientes" ("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Ciudad", "Direccion", "Avatar") VALUES (${p1}, '${p2}', '${p3}', '${p4}', '${p5}', '${p6}', ${p7}, '${p9}', '${p10}', ${p11}) ON CONFLICT DO NOTHING;`;
        }
      );

      // 2. Usuarios doesn't have "Apellido" anymore, so remove it from INSERT INTO "Usuarios"
      // Wait, let's verify if the Usuarios table seed had "Apellido".
      // Yes, "con rol" on line 360, "Jh" on line 373.
      // Let's replace the INSERT INTO "Usuarios" to drop the "Apellido" column and its value.
      cleanSeed = cleanSeed.replace(
        /INSERT INTO "Usuarios" \("IdUsuario", "Nombre", "Correo", "Clave", "IdRol", "Estado", "MustChangePassword", "TipoDocumento", "NumeroDocumento", "Telefono", "ResetPasswordToken", "ResetPasswordExpires", "Apellido", "SessionId", "LastActivity", "SessionIdApp", "LastActivityApp"\) VALUES \(([^,]+), '([^']+)', '([^']+)', '([^']+)', ([^,]+), '([^']+)', (true|false), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^\)]+)\) ON CONFLICT DO NOTHING;/g,
        (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17) => {
          return `INSERT INTO "Usuarios" ("IdUsuario", "Nombre", "Correo", "Clave", "IdRol", "Estado", "MustChangePassword", "TipoDocumento", "NumeroDocumento", "Telefono", "ResetPasswordToken", "ResetPasswordExpires", "SessionId", "LastActivity", "SessionIdApp", "LastActivityApp") VALUES (${p1}, '${p2}', '${p3}', '${p4}', ${p5}, '${p6}', ${p7}, ${p8}, ${p9}, ${p10}, ${p11}, ${p12}, ${p14}, ${p15}, ${p16}, ${p17}) ON CONFLICT DO NOTHING;`;
        }
      );

      // 3. Devoluciones doesn't have "MismoModelo" (uppercase M) in model, so remove duplicate column in sql creation and seeds
      // We will make sure the table creation has only lowercase "mismoModelo" from attributes.
      // 4. Products doesn't have "Destacado" anymore in the model, so clean it from seeds
      cleanSeed = cleanSeed.replace(/"Destacado", "Sales"/g, '"Sales"');
      cleanSeed = cleanSeed.replace(/, (true|false), 0, (true|false),/g, ', 0, $2,');

      ddl += cleanSeed.trim() + '\n';
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar el archivo original database_schema.sql para semillas:', err.message);
  }

  fs.writeFileSync('database_schema.sql', ddl);
  console.log('✅ Clean database schema successfully written to database_schema.sql');
  process.exit(0);
}

run();
