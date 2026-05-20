// scripts/inspect_tables.js
import { sequelize } from '../src/config/db.js';

async function inspectTables() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname != 'pg_catalog' 
            AND schemaname != 'information_schema';
        `);
        console.log('📋 Tablas detectadas en la BD (PostgreSQL):');
        console.log(JSON.stringify(results.map(r => r.tablename || r.TABLE_NAME || r.table_name), null, 2));
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

inspectTables();
