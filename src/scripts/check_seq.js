import { sequelize } from '../config/db.js';

async function checkSeq() {
    try {
        const [r] = await sequelize.query(`SELECT nextval(pg_get_serial_sequence('"Compras"', 'IdCompra')) as next`);
        console.log('🔮 El siguiente ID de Compra será:', r[0].next);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSeq();
