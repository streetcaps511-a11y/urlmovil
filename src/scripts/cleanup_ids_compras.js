import { sequelize } from '../config/db.js';

async function cleanupIds() {
    try {
        console.log('🧹 Iniciando limpieza de IDs de Compras...');
        
        // 1. Quitar FK temporalmente
        await sequelize.query('ALTER TABLE "CompraDetalles" DROP CONSTRAINT IF EXISTS "CompraDetalles_IdCompra_fkey"');
        console.log('✅ FK eliminada');

        // 2. Crear tabla temporal con el nuevo mapeo para evitar conflictos de ID
        await sequelize.query('CREATE TEMP TABLE id_mapping AS SELECT "IdCompra" as old_id, row_number() OVER (ORDER BY "IdCompra") as new_id FROM "Compras"');
        console.log('✅ Mapeo temporal creado');

        // 3. Actualizar Compras
        await sequelize.query('UPDATE "Compras" SET "IdCompra" = m.new_id FROM id_mapping m WHERE "IdCompra" = m.old_id');
        console.log('✅ Compras actualizadas');

        // 4. Actualizar Detalles
        await sequelize.query('UPDATE "CompraDetalles" SET "IdCompra" = m.new_id FROM id_mapping m WHERE "IdCompra" = m.old_id');
        console.log('✅ Detalles actualizados');

        // 5. Recrear FK
        await sequelize.query('ALTER TABLE "CompraDetalles" ADD CONSTRAINT "CompraDetalles_IdCompra_fkey" FOREIGN KEY ("IdCompra") REFERENCES "Compras"("IdCompra") ON DELETE CASCADE');
        console.log('✅ FK recreada');

        // 6. Resetear secuencia
        await sequelize.query(`SELECT setval(pg_get_serial_sequence('"Compras"', 'IdCompra'), coalesce(max("IdCompra"), 0) + 1, false) FROM "Compras"`);
        console.log('✅ Secuencia reseteada');

        console.log('🚀 PROCESO COMPLETADO EXITOSAMENTE');
        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR:', e.message);
        process.exit(1);
    }
}

cleanupIds();
