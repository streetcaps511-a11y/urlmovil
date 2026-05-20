import { sequelize } from '../config/db.js';

async function renumberPurchases() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🔄 Iniciando renumeración secuencial de compras...');

        // 1. Obtener todas las compras ordenadas por ID actual
        const [compras] = await sequelize.query('SELECT "IdCompra" FROM "Compras" ORDER BY "IdCompra" ASC');

        if (compras.length === 0) {
            console.log('✅ No hay compras para renumerar.');
            await transaction.rollback();
            process.exit(0);
        }

        // 2. Eliminar temporalmente la restricción de clave foránea
        await sequelize.query('ALTER TABLE "CompraDetalles" DROP CONSTRAINT IF EXISTS "CompraDetalles_IdCompra_fkey";', { transaction });

        for (let i = 0; i < compras.length; i++) {
            const oldId = compras[i].IdCompra;
            const newId = i + 1;

            if (oldId === newId) continue;

            console.log(`🔹 Cambiando ID ${oldId} -> ${newId}`);

            // Actualizar la compra
            await sequelize.query('UPDATE "Compras" SET "IdCompra" = ? WHERE "IdCompra" = ?', {
                replacements: [newId, oldId],
                transaction
            });

            // Actualizar detalles
            await sequelize.query('UPDATE "CompraDetalles" SET "IdCompra" = ? WHERE "IdCompra" = ?', {
                replacements: [newId, oldId],
                transaction
            });
        }

        // 3. Recrear la restricción de clave foránea
        await sequelize.query(`
            ALTER TABLE "CompraDetalles" 
            ADD CONSTRAINT "CompraDetalles_IdCompra_fkey" 
            FOREIGN KEY ("IdCompra") REFERENCES "Compras"("IdCompra") 
            ON DELETE CASCADE;
        `, { transaction });

        // 3. Reiniciar la secuencia al siguiente valor
        await sequelize.query(`
            SELECT setval(pg_get_serial_sequence('"Compras"', 'IdCompra'), coalesce(max("IdCompra"), 0) + 1, false) FROM "Compras";
        `);

        await transaction.commit();
        console.log('🚀 Renumeración completada con éxito. Las compras ahora van de 1, 2, 3...');
        process.exit(0);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error en la renumeración:', error.message);
        process.exit(1);
    }
}

renumberPurchases();
