// scripts/count_inserts.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../database_schema.sql');
const content = fs.readFileSync(schemaPath, 'utf8');

const tables = [
    'Roles', 'Categorias', 'Clientes', 'Colores', 'Productos',
    'Compras', 'Estado', 'Permisos', 'Imagenes', 'CompraDetalles',
    'Ventas', 'DetalleVentas', 'Usuarios', 'DetallePermisos',
    'Devoluciones', 'Tallas', 'Proveedores'
];

console.log('--- INSERT STATEMENTS IN database_schema.sql ---');
for (const table of tables) {
    const regex = new RegExp(`INSERT INTO "${table}"`, 'g');
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;
    console.log(`${table}: ${count} inserts`);
}
