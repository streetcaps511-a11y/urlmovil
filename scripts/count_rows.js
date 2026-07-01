// scripts/count_rows.js
import { sequelize } from '../src/config/db.js';

async function countRows() {
    try {
        await sequelize.authenticate();
        const tables = [
            'Roles', 'Categorias', 'Clientes', 'Colores', 'Productos',
            'Compras', 'Estado', 'Permisos', 'Imagenes', 'CompraDetalles',
            'Ventas', 'DetalleVentas', 'Usuarios', 'DetallePermisos',
            'Devoluciones', 'Tallas', 'Proveedores'
        ];

        console.log('--- TABLE ROW COUNTS ---');
        for (const table of tables) {
            const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
            console.log(`${table}: ${count} rows`);
        }

        console.log('\n--- SAMPLE PRODUCTS ---');
        const [products] = await sequelize.query(`SELECT "IdProducto", "Nombre", "PrecioVenta" FROM "Productos" LIMIT 10`);
        console.log(JSON.stringify(products, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

countRows();
