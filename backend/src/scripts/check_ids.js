import { sequelize } from '../config/db.js';

async function check() {
    try {
        const [r] = await sequelize.query('SELECT "IdCompra" FROM "Compras" ORDER BY "IdCompra" ASC');
        console.log('📊 IDs actuales en Compras:', r.map(row => row.IdCompra).join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
