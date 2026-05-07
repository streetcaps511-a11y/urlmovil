import { sequelize } from './src/config/db.js';

async function updateSequences() {
    try {
        console.log('🔄 Actualizando secuencias a 10001...');
        
        // Ventas
        await sequelize.query("SELECT setval('\"Ventas_IdVenta_seq\"', 10000, true);");
        console.log('✅ Secuencia de Ventas actualizada.');

        // Devoluciones
        await sequelize.query("SELECT setval('\"Devoluciones_IdDevolucion_seq\"', 10000, true);");
        console.log('✅ Secuencia de Devoluciones actualizada.');

        // Compras
        await sequelize.query("SELECT setval('\"Compras_IdCompra_seq\"', 10000, true);");
        console.log('✅ Secuencia de Compras actualizada.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

updateSequences();
