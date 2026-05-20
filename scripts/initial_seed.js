// scripts/initial_seed.js
import { sequelize } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
    try {
        console.log('🌱 Iniciando semilla de datos simplificada (ADMIN ONLY)...');
        await sequelize.authenticate();

        // 1. ROLES (Solo ADMIN por ahora)
        console.log('👥 Creando Rol Administrador principal...');
        await sequelize.query(`
            TRUNCATE TABLE "Roles" RESTART IDENTITY CASCADE;
            INSERT INTO "Roles" ("IdRol", "Nombre", "Estado") VALUES 
            (1, 'ADMIN', true)
            ON CONFLICT ("IdRol") DO UPDATE SET "Nombre" = EXCLUDED."Nombre";
        `);

        // 2. ESTADO
        console.log('📊 Creando Estados de Venta...');
        await sequelize.query(`
            TRUNCATE TABLE "Estado" RESTART IDENTITY CASCADE;
            INSERT INTO "Estado" ("IdEstado", "Nombre", "Estado") VALUES 
            (1, 'Completada', true),
            (2, 'Pendiente', true),
            (3, 'Rechazada', true),
            (4, 'Anulada', true)
            ON CONFLICT ("IdEstado") DO UPDATE SET "Nombre" = EXCLUDED."Nombre";
        `);

        // 3. USUARIO ADMIN
        console.log('👤 Creando/Actualizando Usuario Administrador...');
        const salt = await bcrypt.genSalt(10);
        const hashedClave = await bcrypt.hash('AdminGM2024!Secure', salt);
        
        await sequelize.query(`
            TRUNCATE TABLE "Usuarios" RESTART IDENTITY CASCADE;
            INSERT INTO "Usuarios" ("Nombre", "Correo", "Clave", "Estado", "IdRol") 
            VALUES ('Administrador StreetCaps', 'duvann1991@gmail.com', :hashedClave, 'activo', 1);
        `, {
            replacements: { hashedClave }
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 ¡SISTEMA REINICIADO (SOLO ADMIN)!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Rol: ADMIN (ID 1)');
        console.log('✅ Usuario: duvann1991@gmail.com');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR AL RESTAURAR:', error);
        process.exit(1);
    }
}

seed();
