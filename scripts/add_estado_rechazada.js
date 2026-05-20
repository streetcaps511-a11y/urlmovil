// scripts/add_estado_rechazada.js
// Script para agregar el estado "Rechazada" a la tabla Estado si no existe
import { sequelize } from '../src/config/db.js';

async function addEstadoRechazada() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la BD');

        // Verificar si ya existe
        const [results] = await sequelize.query(
            `SELECT * FROM "Estado" WHERE "IdEstado" = 3`
        );

        if (results.length === 0) {
            await sequelize.query(`
                INSERT INTO "Estado" ("IdEstado", "Nombre", "Estado") 
                VALUES (3, 'Rechazada', true)
            `);
            console.log('✅ Estado "Rechazada" (ID 3) creado exitosamente');
        } else {
            console.log('ℹ️  Estado ID 3 ya existe:', results[0].Nombre);
        }

        // Mostrar todos los estados
        const [allEstados] = await sequelize.query(`SELECT * FROM "Estado" ORDER BY "IdEstado"`);
        console.log('\n📊 Estados actuales:');
        allEstados.forEach(e => console.log(`   ${e.IdEstado}: ${e.Nombre}`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addEstadoRechazada();
