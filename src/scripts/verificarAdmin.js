// src/scripts/verificarAdmin.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raíz
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const verificarAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Obtener variables del .env
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || 'Administrador Principal';

    // Verificar que las variables existen (SIN mostrar la contraseña)
    console.log('📋 VARIABLES DE ENTORNO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 SEED_ADMIN_EMAIL: ${email || '❌ No definido'}`);
    console.log(`🔑 SEED_ADMIN_PASSWORD: ${password ? '✅ Definida (oculta por seguridad)' : '❌ No definida'}`);
    console.log(`👤 SEED_ADMIN_NAME: ${name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!email || !password) {
      console.log('❌ Error: Faltan variables en .env');
      console.log('💡 Crea un archivo .env en la raíz del proyecto con:');
      console.log('   SEED_ADMIN_EMAIL=tu_email@ejemplo.com');
      console.log('   SEED_ADMIN_PASSWORD=tu_contraseña_segura');
      return;
    }

    // 1. Verificar si existe el rol Administrador
    const [rol] = await sequelize.query(`
      SELECT "IdRol", "Nombre", "Estado" 
      FROM "Roles" 
      WHERE "Nombre" = 'Administrador'
    `);

    if (rol.length === 0) {
      console.log('❌ No se encontró el rol "Administrador"');
      console.log('💡 Ejecuta primero: npm run seed');
      return;
    }

    console.log('📋 ROL ADMINISTRADOR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎭 IdRol: ${rol[0].IdRol}`);
    console.log(`📛 Nombre: ${rol[0].Nombre}`);
    console.log(`✅ Estado: ${rol[0].Estado}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2. Verificar si existe el usuario con el email del .env
    const [usuarios] = await sequelize.query(`
      SELECT 
        u."IdUsuario",
        u."Nombre",
        u."Correo",
        u."Estado",
        u."IdRol",
        r."Nombre" as "Rol",
        u."Clave"
      FROM "Usuarios" u
      LEFT JOIN "Roles" r ON u."IdRol" = r."IdRol"
      WHERE u."Correo" = :email
    `, {
      replacements: { email: email.toLowerCase() }
    });

    if (usuarios.length === 0) {
      console.log(`❌ No se encontró el usuario con email: ${email}`);
      console.log('💡 Ejecuta el seed para crearlo: npm run seed');
      return;
    }

    const admin = usuarios[0];
    
    console.log('📋 USUARIO ENCONTRADO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 ID: ${admin.IdUsuario}`);
    console.log(`📧 Correo: ${admin.Correo}`);
    console.log(`👤 Nombre: ${admin.Nombre}`);
    console.log(`🎭 Rol: ${admin.Rol}`);
    console.log(`✅ Estado: ${admin.Estado}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. Verificar la contraseña (SIN mostrar la contraseña en texto plano)
    console.log('🔐 VERIFICANDO CONTRASEÑA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password ? '******** (oculta)' : '❌ No disponible'}`);
    
    const isValid = await bcrypt.compare(password, admin.Clave);

    if (isValid) {
      console.log('\n✅ VERIFICACIÓN EXITOSA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 La contraseña es CORRECTA');
      console.log('\n📝 El usuario puede iniciar sesión con:');
      console.log(`   Email: ${email}`);
      console.log('   Password: [La configurada en .env]');
      
      // Verificar si el rol coincide
      if (admin.IdRol === rol[0].IdRol) {
        console.log('\n✅ El usuario tiene el rol correcto (Administrador)');
      } else {
        console.log('\n⚠️ El usuario NO tiene el rol Administrador');
        console.log(`   Rol actual: ${admin.Rol}`);
        console.log(`   Rol esperado: Administrador`);
      }
      
    } else {
      console.log('\n❌ VERIFICACIÓN FALLIDA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔴 La contraseña NO coincide');
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. Verifica la contraseña en tu archivo .env');
      console.log('2. Ejecuta el seed para recrear el admin:');
      console.log('   npm run seed');
      console.log('3. O actualiza la contraseña con:');
      console.log('   node src/scripts/actualizarAdminPassword.js');
    }

    // 4. Verificar permisos del rol (opcional)
    const [permisos] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM "DetallePermisos" dp
      WHERE dp."IdRol" = :idRol
    `, {
      replacements: { idRol: rol[0].IdRol }
    });

    console.log(`\n📋 PERMISOS DEL ROL: ${permisos[0].total} permisos asignados`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

verificarAdmin();