import { sequelize } from '../config/db.js';

async function fixDb() {
    try {
        console.log('🔄 Iniciando actualización de base de datos...');

        // 1. Añadir columna Nfactura a CompraDetalles si no existe
        await sequelize.query(`
            ALTER TABLE "CompraDetalles" 
            ADD COLUMN IF NOT EXISTS "Nfactura" VARCHAR(100);
        `);
        console.log('✅ Columna "Nfactura" verificada/creada en "CompraDetalles"');

        // 2. Reiniciar la secuencia de IdCompra
        // En Postgres, el nombre de la secuencia suele ser "TableName_ColumnName_seq"
        // Intentaremos reiniciarla a partir del valor más alto real, o 1 si está vacía
        await sequelize.query(`
            SELECT setval(pg_get_serial_sequence('"Compras"', 'IdCompra'), coalesce(max("IdCompra"), 0) + 1, false) FROM "Compras";
        `);
        console.log('✅ Secuencia de "IdCompra" reiniciada correctamente');

        console.log('🚀 Base de datos actualizada con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando la base de datos:', error.message);
        process.exit(1);
    }
}

fixDb();
