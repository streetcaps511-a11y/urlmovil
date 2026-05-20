// scripts/truncate_all.js
import { sequelize } from '../src/config/db.js';

// Importar modelos
import Categoria from '../src/models/categorias.model.js';
import Producto from '../src/models/productos.model.js';
import Proveedor from '../src/models/proveedores.model.js';
import Compra from '../src/models/compras.model.js';
import Cliente from '../src/models/clientes.model.js';
import Venta from '../src/models/ventas.model.js';
import Devolucion from '../src/models/devoluciones.model.js';
import Usuario from '../src/models/usuarios.model.js';
import Talla from '../src/models/tallas.model.js';
import Estado from '../src/models/estado.model.js';
import DetalleVenta from '../src/models/detalleVentas.model.js';
import DetalleCompra from '../src/models/detalleCompras.model.js';
import Rol from '../src/models/roles.model.js';

async function truncateAll() {
    try {
        console.log('🔄 Iniciando limpieza de base de datos...');
        
        // ⚠️ El orden importa por las llaves foráneas, o se puede usar CASCADE directamente en SQL
        // Usaremos Sequelize para asegurar que todo se limpie correctamente
        
        await sequelize.authenticate();
        console.log('✅ Conectado a la BD.');

        // Desactivar temporalmente el chequeo de llaves foráneas para poder limpiar en bloque
        await sequelize.query('SET session_replication_role = "replica";');

        // Truncar tablas y reiniciar IDs
        const tables = [
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

        for (const table of tables) {
            try {
                console.log(`🧹 Limpiando tabla: ${table}...`);
                await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
            } catch (err) {
                console.log(`⚠️ Error al limpiar ${table} (ignorando): ${err.message}`);
            }
        }

        // Reactivar chequeo de llaves foráneas
        await sequelize.query('SET session_replication_role = "origin";');

        console.log('🚀 ¡BASE DE DATOS COMPLETAMENTE LIMPIA Y REINICIADA!');
        console.log('✨ Ahora todos los IDs empezarán desde el 1.');
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR FATAL:', error);
        process.exit(1);
    }
}

truncateAll();
