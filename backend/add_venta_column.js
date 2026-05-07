import { sequelize } from './src/config/db.js';

async function addVentaColumn() {
    try {
        await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN "NoVenta" VARCHAR(100);');
        console.log('✅ NoVenta added to Ventas');
    } catch (e) {
        console.log('⚠️', e.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

addVentaColumn();
