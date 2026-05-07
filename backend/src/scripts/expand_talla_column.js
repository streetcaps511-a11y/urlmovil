import { sequelize } from '../config/db.js';

async function fixTalla() {
    try {
        await sequelize.query('ALTER TABLE "CompraDetalles" ALTER COLUMN "Talla" TYPE VARCHAR(255);');
        console.log('✅ Columna "Talla" ampliada a 255 caracteres');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixTalla();
