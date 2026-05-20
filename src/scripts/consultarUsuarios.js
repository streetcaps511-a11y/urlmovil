// src/scripts/consultarUsuarios.js
import { sequelize } from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raíz
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const consultarUsuarios = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // PRIMERO: Verificar qué columnas existen en la tabla Usuarios
    const [columnas] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Usuarios'
    `);
    
    console.log('📋 COLUMNAS DISPONIBLES EN TABLA USUARIOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    columnas.forEach(col => console.log(`   - ${col.column_name}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Consultar todos los usuarios SIN usar CreadoEn si no existe
    const [usuarios] = await sequelize.query(`
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
    `);

    if (usuarios.length === 0) {
      console.log('📭 No hay usuarios registrados');
      return;
    }

    console.log('📋 LISTA DE USUARIOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${usuarios.length} usuarios\n`);

    usuarios.forEach((user, index) => {
      console.log(`👤 USUARIO #${index + 1}`);
      console.log(`   ID: ${user.IdUsuario}`);
      console.log(`   Nombre: ${user.Nombre}`);
      console.log(`   Correo: ${user.Correo}`);
      console.log(`   Rol: ${user.Rol || 'Sin rol'} (ID: ${user.IdRol || 'N/A'})`);
      console.log(`   Estado: ${user.Estado ? '✅ Activo' : '❌ Inactivo'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

consultarUsuarios();