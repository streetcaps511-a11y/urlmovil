import { sequelize } from './src/config/db.js';

async function check() {
    try {
        const [results] = await sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Compras';
        `);
        console.log('Columns in Compras:');
        results.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
