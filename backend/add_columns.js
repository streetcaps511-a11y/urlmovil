import { sequelize } from './src/config/db.js';

async function addColumns() {
    try {
        console.log('🔄 Agregando columnas NoVenta...');
        
        // Add NoVenta to DetalleVentas
        try {
            await sequelize.query('ALTER TABLE "DetalleVentas" ADD COLUMN "NoVenta" VARCHAR(100);');
            console.log('✅ Columna NoVenta agregada a DetalleVentas.');
        } catch (err) {
            console.log('⚠️ DetalleVentas NoVenta ya existe o error:', err.message);
        }

        // Add NoVenta to Devoluciones
        try {
            await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN "NoVenta" VARCHAR(100);');
            console.log('✅ Columna NoVenta agregada a Devoluciones.');
        } catch (err) {
            console.log('⚠️ Devoluciones NoVenta ya existe o error:', err.message);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

addColumns();
