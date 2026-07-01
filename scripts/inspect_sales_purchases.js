// scripts/inspect_sales_purchases.js
import { sequelize } from '../src/config/db.js';

async function inspect() {
    try {
        await sequelize.authenticate();

        console.log('--- SAMPLE VENTAS ---');
        const [ventas] = await sequelize.query(`
            SELECT v."IdVenta", v."Total", v."MetodoPago", v."NoVenta", c."Nombre" as "ClienteNombre"
            FROM "Ventas" v
            LEFT JOIN "Clientes" c ON v."IdCliente" = c."IdCliente"
            LIMIT 15
        `);
        console.log(JSON.stringify(ventas, null, 2));

        console.log('\n--- SAMPLE DETALLE VENTAS ---');
        const [detalles] = await sequelize.query(`
            SELECT "IdDetalleVenta", "IdVenta", "NombreProducto", "Cantidad", "Precio", "Subtotal"
            FROM "DetalleVentas"
            LIMIT 15
        `);
        console.log(JSON.stringify(detalles, null, 2));

        console.log('\n--- SAMPLE COMPRAS ---');
        const [compras] = await sequelize.query(`
            SELECT c."IdCompra", c."Total", c."Nfactura", p."Nombre" as "ProveedorNombre"
            FROM "Compras" c
            LEFT JOIN "Proveedores" p ON c."IdProveedor" = p."IdProveedor"
            LIMIT 15
        `);
        console.log(JSON.stringify(compras, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspect();
