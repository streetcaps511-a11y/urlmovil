// src/scripts/fix_db_columns.js
import { sequelize } from '../config/db.js';

async function fixDatabase() {
    try {
        console.log('🔍 Iniciando cirugía de base de datos...');
        
        // 1. Añadir ResetPasswordToken si no existe
        await sequelize.query(`
            ALTER TABLE "Usuarios" 
            ADD COLUMN IF NOT EXISTS "ResetPasswordToken" VARCHAR(255);
        `);
        console.log('✅ Columna ResetPasswordToken preparada.');

        // 2. Añadir ResetPasswordExpires si no existe
        await sequelize.query(`
            ALTER TABLE "Usuarios" 
            ADD COLUMN IF NOT EXISTS "ResetPasswordExpires" TIMESTAMP WITH TIME ZONE;
        `);
        console.log('✅ Columna ResetPasswordExpires preparada.');

        console.log('🚀 ¡Base de datos actualizada con éxito! Ya puedes registrarte.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando la base de datos:', error);
        process.exit(1);
    }
}

fixDatabase();
