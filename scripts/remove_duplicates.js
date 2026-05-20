// scripts/remove_duplicates.js
import { sequelize } from '../src/config/db.js';

async function removeDuplicates() {
    try {
        console.log('🔄 Iniciando purga de tablas duplicadas...');
        await sequelize.authenticate();
        
        // Tablas que ya confirmamos que son BASURA (Viejas)
        const tablesToDelete = [
            'DetalleCompra',
            'DetalleCompras'
        ];

        for (const table of tablesToDelete) {
            console.log(`🗑️ Eliminando tabla basura: ${table}...`);
            await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        }

        console.log('✨ ¡LIMPIEZA COMPLETADA! Tu base de datos ahora solo tiene lo necesario.');
        console.log('🔍 Tabla oficial para detalles de compras: "CompraDetalles"');
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR FATAL DURANTE LA PURGA:', error);
        process.exit(1);
    }
}

removeDuplicates();
