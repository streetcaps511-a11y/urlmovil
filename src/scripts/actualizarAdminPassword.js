// src/scripts/actualizarAdminPassword.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const actualizarAdminPassword = async () => {
  try {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      console.log('❌ Error: Faltan variables en .env');
      return;
    }

    await sequelize.authenticate();
    console.log('✅ Conectado a BD');

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Actualizar la contraseña
    const [result] = await sequelize.query(`
      UPDATE "Usuarios" 
      SET "Clave" = :password 
      WHERE "Correo" = :email
      RETURNING "IdUsuario", "Correo", "Nombre"
    `, {
      replacements: { 
        email: email.toLowerCase(),
        password: hashedPassword 
      }
    });

    if (result.length > 0) {
      console.log('\n✅ CONTRASEÑA ACTUALIZADA EXITOSAMENTE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Usuario: ${result[0].Correo}`);
      console.log(`👤 Nombre: ${result[0].Nombre}`);
      console.log('🔑 Contraseña: [Actualizada correctamente]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Verificar que funciona (sin mostrar la contraseña)
      const isValid = await bcrypt.compare(password, hashedPassword);
      console.log(`\n🔐 Verificación: ${isValid ? '✅ Correcta' : '❌ Error'}`);
    } else {
      console.log(`❌ Usuario no encontrado con email: ${email}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

actualizarAdminPassword();