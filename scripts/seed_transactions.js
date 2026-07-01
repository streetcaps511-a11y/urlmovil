// scripts/seed_transactions.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log('🔌 Conectando a la base de datos...');
  const client = await pool.connect();

  try {
    console.log('🧹 Limpiando tablas de transacciones...');
    await client.query('TRUNCATE TABLE "Devoluciones" CASCADE;');
    await client.query('TRUNCATE TABLE "DetalleVentas" CASCADE;');
    await client.query('TRUNCATE TABLE "Ventas" CASCADE;');
    await client.query('TRUNCATE TABLE "CompraDetalles" CASCADE;');
    await client.query('TRUNCATE TABLE "Compras" CASCADE;');

    console.log('🌱 Insertando compras reales...');
    
    // Compra 1
    const compra1Res = await client.query(`
      INSERT INTO "Compras" ("IdProveedor", "Nfactura", "Fecha", "Total", "MetodoPago", "Estado", "FechaRegistro")
      VALUES (9, 'FACT-2026-001', '2026-06-01 10:00:00+00', 400000.00, 'Transferencia', 'Completada', CURRENT_TIMESTAMP)
      RETURNING "IdCompra";
    `);
    const idCompra1 = compra1Res.rows[0].IdCompra;

    await client.query(`
      INSERT INTO "CompraDetalles" ("IdCompra", "IdProducto", "Nfactura", "NombreProducto", "Cantidad", "PrecioCompra", "PrecioVenta", "Subtotal")
      VALUES 
      (${idCompra1}, 61, 'FACT-2026-001', 'puma', 10, 30000.00, 40000.00, 300000.00),
      (${idCompra1}, 55, 'FACT-2026-001', 'Gorra New Era Dripping 9FORTY', 5, 20000.00, 50000.00, 100000.00);
    `);

    // Compra 2
    const compra2Res = await client.query(`
      INSERT INTO "Compras" ("IdProveedor", "Nfactura", "Fecha", "Total", "MetodoPago", "Estado", "FechaRegistro")
      VALUES (4, 'FACT-2026-002', '2026-06-15 14:30:00+00', 1200000.00, 'Efectivo', 'Completada', CURRENT_TIMESTAMP)
      RETURNING "IdCompra";
    `);
    const idCompra2 = compra2Res.rows[0].IdCompra;

    await client.query(`
      INSERT INTO "CompraDetalles" ("IdCompra", "IdProducto", "Nfactura", "NombreProducto", "Cantidad", "PrecioCompra", "PrecioVenta", "Subtotal")
      VALUES 
      (${idCompra2}, 53, 'FACT-2026-002', 'Monastery OG', 20, 60000.00, 70000.00, 1200000.00);
    `);

    console.log('🌱 Insertando ventas reales...');

    // Venta 1
    const venta1Res = await client.query(`
      INSERT INTO "Ventas" ("IdCliente", "IdEstado", "Fecha", "Total", "MetodoPago", "DireccionEnvio", "TipoEntrega", "NoVenta", "StatusEnvio", "EsManual")
      VALUES (36, 'Completada', '2026-06-20 16:15:00+00', 280000.00, 'Nequi', 'Cra 42 # 20D 07', 'Domicilio', '1001', 'Entregado', false)
      RETURNING "IdVenta";
    `);
    const idVenta1 = venta1Res.rows[0].IdVenta;

    await client.query(`
      INSERT INTO "DetalleVentas" ("IdVenta", "IdProducto", "NombreProducto", "Cantidad", "Talla", "Precio", "Subtotal", "NoVenta")
      VALUES 
      (${idVenta1}, 8, 'Gallo Salvaje', 2, '7 1/4', 80000.00, 160000.00, '1001'),
      (${idVenta1}, 52, 'BEISBOLERA PREMIUM', 3, '7', 40000.00, 120000.00, '1001');
    `);

    // Venta 2
    const venta2Res = await client.query(`
      INSERT INTO "Ventas" ("IdCliente", "IdEstado", "Fecha", "Total", "MetodoPago", "DireccionEnvio", "TipoEntrega", "NoVenta", "StatusEnvio", "EsManual")
      VALUES (1, 'Pendiente', '2026-06-25 11:00:00+00', 180000.00, 'Bancolombia', 'carrera 22, #33, 12', 'Envío Nacional', '1002', 'Por enviar', false)
      RETURNING "IdVenta";
    `);
    const idVenta2 = venta2Res.rows[0].IdVenta;

    await client.query(`
      INSERT INTO "DetalleVentas" ("IdVenta", "IdProducto", "NombreProducto", "Cantidad", "Talla", "Precio", "Subtotal", "NoVenta")
      VALUES 
      (${idVenta2}, 9, 'G CAP classic', 1, '7 1/8', 80000.00, 80000.00, '1002'),
      (${idVenta2}, 1, 'LA Dodgers y50', 1, 'AJUSTABLE', 100000.00, 100000.00, '1002');
    `);

    // Venta 3
    const venta3Res = await client.query(`
      INSERT INTO "Ventas" ("IdCliente", "IdEstado", "Fecha", "Total", "MetodoPago", "DireccionEnvio", "TipoEntrega", "NoVenta", "StatusEnvio", "EsManual")
      VALUES (45, 'Completada', '2026-06-28 09:20:00+00', 83000.00, 'Efectivo', '23 Calle 77CC 83', 'Retiro en tienda', '1003', 'Entregado', true)
      RETURNING "IdVenta";
    `);
    const idVenta3 = venta3Res.rows[0].IdVenta;

    await client.query(`
      INSERT INTO "DetalleVentas" ("IdVenta", "IdProducto", "NombreProducto", "Cantidad", "Talla", "Precio", "Subtotal", "NoVenta")
      VALUES 
      (${idVenta3}, 7, 'BULL design', 1, '7', 83000.00, 83000.00, '1003');
    `);

    console.log('🌱 Insertando devoluciones reales...');

    await client.query(`
      INSERT INTO "Devoluciones" ("IdProducto", "IdProductoCambio", "IdVenta", "IdEstado", "Cantidad", "Valor", "Fecha", "Estado", "Motivo", "Observacion", "TipoDocumento", "NumeroDocumento", "ProductoOriginal", "ProductoCambio", "NombreCliente", "Talla", "mismoModelo", "pedidoCompleto", "NoVenta", "idLote")
      VALUES 
      (8, 8, ${idVenta1}, 'Completada', 1, 80000.00, '2026-06-22 15:00:00+00', true, 'Talla incorrecta', 'Se cambia por la talla adecuada 7 1/4', 'Cédula de Ciudadanía', '125465', 'Gallo Salvaje', 'Gallo Salvaje', 'Manuel', '7 1/4', true, false, '1001', 'LOTE-001');
    `);

    console.log('🔄 Actualizando stock y TallasStock de productos de acuerdo a las transacciones...');
    const defaultTallasStock = JSON.stringify([{ talla: 'AJUSTABLE', cantidad: 15 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 15;', [defaultTallasStock]);

    const spec1 = JSON.stringify([{ talla: 'AJUSTABLE', cantidad: 209 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 209 WHERE "IdProducto" = 61;', [spec1]); // Puma (199 + 10 comp)
    
    const spec2 = JSON.stringify([{ talla: 'AJUSTABLE', cantidad: 7 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 7 WHERE "IdProducto" = 55;', [spec2]);   // New Era (2 + 5 comp)
    
    const spec3 = JSON.stringify([{ talla: '7', cantidad: 20 }, { talla: '7 1/4', cantidad: 20 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 40 WHERE "IdProducto" = 53;', [spec3]);  // Monastery (20 + 20 comp)
    
    const spec4 = JSON.stringify([{ talla: '7 1/4', cantidad: 68 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 68 WHERE "IdProducto" = 8;', [spec4]);   // Gallo Salvaje (69 - 2 vta + 1 dev)
    
    const spec5 = JSON.stringify([{ talla: '7', cantidad: 12 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 12 WHERE "IdProducto" = 52;', [spec5]);  // Beisbolera Premium (15 - 3 vta)
    
    const spec6 = JSON.stringify([{ talla: '7 1/8', cantidad: 14 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 14 WHERE "IdProducto" = 9;', [spec6]);   // G CAP (15 - 1 vta)
    
    const spec7 = JSON.stringify([{ talla: 'AJUSTABLE', cantidad: 14 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 14 WHERE "IdProducto" = 1;', [spec7]);   // LA Dodgers (15 - 1 vta)
    
    const spec8 = JSON.stringify([{ talla: '7', cantidad: 14 }]);
    await client.query('UPDATE "Productos" SET "TallasStock" = $1, "Stock" = 14 WHERE "IdProducto" = 7;', [spec8]);   // BULL design (15 - 1 vta)

    console.log('🔄 Sincronizando secuencias de base de datos...');
    await client.query(`SELECT setval(pg_get_serial_sequence('"Compras"', 'IdCompra'), COALESCE((SELECT MAX("IdCompra") FROM "Compras"), 1), true);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('"CompraDetalles"', 'IdDetalle'), COALESCE((SELECT MAX("IdDetalle") FROM "CompraDetalles"), 1), true);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('"Ventas"', 'IdVenta'), COALESCE((SELECT MAX("IdVenta") FROM "Ventas"), 1), true);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('"DetalleVentas"', 'IdDetalleVenta'), COALESCE((SELECT MAX("IdDetalleVenta") FROM "DetalleVentas"), 1), true);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('"Devoluciones"', 'IdDevolucion'), COALESCE((SELECT MAX("IdDevolucion") FROM "Devoluciones"), 1), true);`);

    console.log('✅ ¡Surgieron compras, ventas y devoluciones con datos reales y consistentes!');
  } catch (error) {
    console.error('❌ Error durante la inserción:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
