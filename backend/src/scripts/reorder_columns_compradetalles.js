import { sequelize } from '../config/db.js';

async function reorderColumns() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🔄 Iniciando reorganización de columnas en CompraDetalles...');

        // 1. Crear tabla temporal con el nuevo orden de columnas y los datos actuales
        await sequelize.query(`
            CREATE TABLE "CompraDetalles_New" (
                "IdDetalle" SERIAL PRIMARY KEY,
                "IdCompra" INTEGER NOT NULL REFERENCES "Compras"("IdCompra") ON DELETE CASCADE,
                "IdProducto" INTEGER,
                "Nfactura" VARCHAR(100),
                "IdTalla" INTEGER,
                "NombreProducto" VARCHAR(255) NOT NULL,
                "Talla" VARCHAR(255),
                "Cantidad" INTEGER DEFAULT 1,
                "PrecioCompra" DECIMAL(10, 2) NOT NULL DEFAULT 0,
                "PrecioVenta" DECIMAL(10, 2) DEFAULT 0,
                "PrecioMayorista6" DECIMAL(10, 2) DEFAULT 0,
                "PrecioMayorista80" DECIMAL(10, 2) DEFAULT 0,
                "Subtotal" DECIMAL(10, 2) DEFAULT 0,
                "Variantes" JSONB DEFAULT '[]'::jsonb
            )
        `, { transaction });

        // 2. Copiar los datos de la tabla vieja a la nueva (mapeando columnas)
        await sequelize.query(`
            INSERT INTO "CompraDetalles_New" (
                "IdDetalle", "IdCompra", "IdProducto", "Nfactura", "IdTalla", 
                "NombreProducto", "Talla", "Cantidad", "PrecioCompra", 
                "PrecioVenta", "PrecioMayorista6", "PrecioMayorista80", 
                "Subtotal", "Variantes"
            )
            SELECT 
                "IdDetalle", "IdCompra", "IdProducto", "Nfactura", "IdTalla", 
                "NombreProducto", "Talla", "Cantidad", "PrecioCompra", 
                "PrecioVenta", "PrecioMayorista6", "PrecioMayorista80", 
                "Subtotal", "Variantes"
            FROM "CompraDetalles"
        `, { transaction });

        // 3. Borrar la tabla vieja y renombrar la nueva
        // Primero hay que borrar la vieja, pero puede tener dependencias (aunque usualmente CompraDetalles es una hoja)
        await sequelize.query('DROP TABLE "CompraDetalles" CASCADE', { transaction });
        await sequelize.query('ALTER TABLE "CompraDetalles_New" RENAME TO "CompraDetalles"', { transaction });

        // 4. Ajustar la secuencia del SERIAL para que no falle en los próximos inserts
        await sequelize.query(`
            SELECT setval(pg_get_serial_sequence('"CompraDetalles"', 'IdDetalle'), coalesce(max("IdDetalle"), 0) + 1, false) FROM "CompraDetalles"
        `, { transaction });

        await transaction.commit();
        console.log('🚀 Reorganización completada con éxito. Ahora las columnas se ven en orden en pgAdmin.');
        process.exit(0);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error en la reorganización:', error.message);
        process.exit(1);
    }
}

reorderColumns();
