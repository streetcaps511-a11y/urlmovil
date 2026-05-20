// src/scripts/buscarUsuario.js
import { sequelize } from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const buscarUsuario = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Preguntar email al usuario
    rl.question('📧 Ingresa el email del usuario a buscar (o Enter para ver todos): ', async (emailInput) => {
      
      let query;
      let replacements = {};

      if (emailInput && emailInput.trim() !== '') {
        query = `
          SELECT 
            u."IdUsuario",
            u."Nombre",
            u."Correo",
            u."Estado",
            u."IdRol",
            r."Nombre" as "Rol"
          FROM "Usuarios" u
          LEFT JOIN "Roles" r ON u."IdRol" = r."IdRol"
          WHERE u."Correo" ILIKE :email
          ORDER BY u."IdUsuario" DESC
        `;
        replacements = { email: `%${emailInput.trim()}%` };
        console.log(`\n🔍 Buscando: "${emailInput}"...\n`);
      } else {
        query = `
          SELECT 
            u."IdUsuario",
            u."Nombre",
            u."Correo",
            u."Estado",
            u."IdRol",
            r."Nombre" as "Rol"
          FROM "Usuarios" u
          LEFT JOIN "Roles" r ON u."IdRol" = r."IdRol"
          ORDER BY u."IdUsuario" DESC
        `;
        console.log('\n📋 Mostrando todos los usuarios...\n');
      }

      const [usuarios] = await sequelize.query(query, { replacements });

      if (usuarios.length === 0) {
        console.log('❌ No se encontraron usuarios');
      } else {
        console.log('📋 RESULTADOS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total: ${usuarios.length} usuario(s)\n`);

        usuarios.forEach((user, index) => {
          console.log(`👤 USUARIO #${index + 1}`);
          console.log(`   ID: ${user.IdUsuario}`);
          console.log(`   Nombre: ${user.Nombre}`);
          console.log(`   Correo: ${user.Correo}`);
          console.log(`   Rol: ${user.Rol || 'Sin rol'}`);
          console.log(`   Estado: ${user.Estado ? '✅ Activo' : '❌ Inactivo'}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        });
      }

      rl.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await sequelize.close();
    process.exit(0);
  }
};

buscarUsuario();