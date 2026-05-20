// scripts/truncate_safe.js
import { sequelize } from '../src/config/db.js';

async function truncateSafe() {
    try {
        console.log('🔄 Iniciando limpieza segura...');
        await sequelize.authenticate();
        
        // Truncamos las tablas en grupos empezando por las que TIENEN llaves foráneas primero
        // Usamos RESTART IDENTITY para que los contadores vuelvan a 1.
        
        const tablesToTruncate = [
            'DetalleDevoluciones',
            'Devoluciones',
            'DetalleVentas',
            'Ventas',
            'DetalleCompras',
            'Compras',
            'Productos_Tallas',
            'Tallas',
            'Productos',
            'Categorias',
            'Clientes',
            'Proveedores',
            'Usuarios',
            'Roles',
            'Estados'
        ];

        // Ejecutamos una por una con CASCADE para que limpie dependencias automáticamente si existen
        for (const table of tablesToTruncate) {
            try {
                console.log(`🧹 Vaciando ${table}...`);
                await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
            } catch (err) {
                console.warn(`⚠️ Omitiendo ${table} (No existe o error menor): ${err.message}`);
            }
        }

        console.log('🚀 ¡TODO LISTO! La base de datos está totalmente vacía.');
        console.log('✨ Los nuevos registros empezarán desde el ID número 1.');
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR DURANTE LA LIMPIEZA:', error);
        process.exit(1);
    }
}

truncateSafe();
