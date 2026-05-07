import { sequelize } from './src/config/db.js';

async function updateSequence() {
    try {
        console.log('🔄 Actualizando secuencia de Ventas a 10001...');
        
        // PostgreSQL command to update the sequence
        // The sequence name is usually TableName_IdField_seq in Sequelize/Postgres
        // Looking at ventas.model.js: field is 'IdVenta'
        // Table name is 'Ventas'
        const sequenceName = '"Ventas_IdVenta_seq"';
        
        await sequelize.query(`SELECT setval(${sequenceName}, 10000, true);`);
        
        console.log('✅ Secuencia actualizada correctamente. La próxima venta será la #10001.');
    } catch (error) {
        console.error('❌ Error actualizando la secuencia:', error.message);
        console.log('Intentando con nombre de secuencia alternativo...');
        try {
            await sequelize.query(`SELECT setval('ventas_id_seq', 10000, true);`);
            console.log('✅ Secuencia actualizada correctamente (fallback).');
        } catch (err2) {
            console.error('❌ Falló también el fallback:', err2.message);
        }
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

updateSequence();
