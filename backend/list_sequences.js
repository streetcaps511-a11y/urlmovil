import { sequelize } from './src/config/db.js';

async function listSequences() {
    try {
        const [results] = await sequelize.query(`
            SELECT relname FROM pg_class WHERE relkind = 'S';
        `);
        console.log('Sequences found:', results.map(r => r.relname));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

listSequences();
