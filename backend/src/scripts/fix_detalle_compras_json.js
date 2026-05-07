import { sequelize } from '../config/db.js';

async function fixDb() {
    try {
        console.log('🔄 Actualizando esquema de CompraDetalles...');

        // 1. Añadir columna Variantes (JSON)
        await sequelize.query(`
            ALTER TABLE "CompraDetalles" 
            ADD COLUMN IF NOT EXISTS "Variantes" JSONB;
        `);
        console.log('✅ Columna "Variantes" (JSONB) creada en "CompraDetalles"');

        // 2. Modificar Talla y Cantidad para permitir nulos
        await sequelize.query(`
            ALTER TABLE "CompraDetalles" 
            ALTER COLUMN "Talla" DROP NOT NULL,
            ALTER COLUMN "Cantidad" DROP NOT NULL;
        `);
        console.log('✅ Columnas "Talla" y "Cantidad" ahora permiten nulos');

        console.log('🚀 Base de datos actualizada con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando la base de datos:', error.message);
        process.exit(1);
    }
}

fixDb();
