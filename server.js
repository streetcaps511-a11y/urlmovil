// server.js
import { connectDB } from './src/config/db.js';
import app from './src/app.js';  // ⭐ Importar app configurado
import { Color, Devolucion } from './src/models/index.js'; // ⭐ Importar modelos necesarios

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Conectar BD y cargar modelos
    await connectDB();
    console.log('✅ Base de datos conectada');

    // 🚀 AUTO-MIGRACIÓN DE ESTADOS (Solo corre una vez si es necesario)
    const { sequelize } = await import('./src/config/db.js');
    try {
        await sequelize.query('ALTER TABLE "Ventas" DROP CONSTRAINT IF EXISTS "Ventas_IdEstado_fkey"');
        await sequelize.query('ALTER TABLE "Ventas" ALTER COLUMN "IdEstado" TYPE VARCHAR(50) USING "IdEstado"::text');
        await sequelize.query("UPDATE \"Ventas\" SET \"IdEstado\" = 'Completada' WHERE \"IdEstado\" = '1'");
        await sequelize.query("UPDATE \"Ventas\" SET \"IdEstado\" = 'Pendiente' WHERE \"IdEstado\" = '2'");
        await sequelize.query("UPDATE \"Ventas\" SET \"IdEstado\" = 'Rechazada' WHERE \"IdEstado\" = '3'");
        
        // 🚀 MIGRACIÓN PARA PAGO PARCIAL Y BORRADO DE CLIENTES EN VENTAS
        try {
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Comprobante2" VARCHAR(500)');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "MontoPagado" DECIMAL(10, 2) DEFAULT 0');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Monto1" DECIMAL(10, 2) DEFAULT 0');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Monto2" DECIMAL(10, 2) DEFAULT 0');
            
            // Permitir NULL en IdCliente y añadir Nombre Historico
            await sequelize.query('ALTER TABLE "Ventas" ALTER COLUMN "IdCliente" DROP NOT NULL');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "ClienteNombreHistorico" VARCHAR(255)');

            // 🚀 MIGRACIÓN PARA COMPRAS (BORRADO DE PROVEEDORES)
            await sequelize.query('ALTER TABLE "Compras" ALTER COLUMN "IdProveedor" DROP NOT NULL');
            await sequelize.query('ALTER TABLE "Compras" ADD COLUMN IF NOT EXISTS "ProveedorNombreHistorico" VARCHAR(255)');

            // 🚀 MIGRACIÓN PARA DETALLE VENTAS (PERSISTENCIA DE NOMBRES)
            await sequelize.query('ALTER TABLE "DetalleVentas" ADD COLUMN IF NOT EXISTS "NombreProducto" VARCHAR(255)');

            // 🚀 MIGRACIÓN PARA PRODUCTOS (BORRADO LÓGICO)
            await sequelize.query('ALTER TABLE "Productos" ADD COLUMN IF NOT EXISTS "DeletedAt" TIMESTAMP WITH TIME ZONE');

        } catch (e) {
            console.warn('⚠️ No se pudieron añadir columnas extra a Ventas:', e.message);
        }

        // 🚀 MIGRACIÓN PARA DEVOLUCIONES MASIVAS (Agrupación por Lote)
        try {
            // Renombrar si existe el nombre viejo, añadir pedidoCompleto e idLote
            await sequelize.query('ALTER TABLE "Devoluciones" RENAME COLUMN "esMasiva" TO "pedidoCompleto"').catch(() => {});
            await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "pedidoCompleto" BOOLEAN DEFAULT FALSE');
            await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "idLote" VARCHAR(100) NULL');

        } catch (e) {
            console.warn('⚠️ No se pudo actualizar el esquema de Devoluciones:', e.message);
        }


        // 🚀 MIGRACIÓN PARA USUARIOS (SESSION ID)
        try {
            await sequelize.query('ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "SessionId" VARCHAR(255)');
            await sequelize.query('ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "LastActivity" TIMESTAMP WITH TIME ZONE');
            await sequelize.query('ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "SessionIdApp" VARCHAR(255)');
            await sequelize.query('ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "LastActivityApp" TIMESTAMP WITH TIME ZONE');
        } catch (e) {
            console.warn('⚠️ No se pudieron añadir columnas de sesión a Usuarios:', e.message);
        }

    } catch (e) {
        console.log('⚠️ La base de datos ya estaba sincronizada o requiere ajustes manuales.');
    }

    // 🚀 AUTO-MIGRACIÓN DE COLORES
    try {
        await Color.sync(); // Crea la tabla si no existe
        const count = await Color.count();
        if (count === 0) {
            console.log('🌱 Sembrando colores iniciales...');
            // Definir colores básicos directamente en el backend para evitar dependencia de frontend constants
            const initialColors = [
                { nombre: 'Negro', hex: '#000000' },
                { nombre: 'Blanco', hex: '#FFFFFF' },
                { nombre: 'Rojo', hex: '#EF4444' },
                { nombre: 'Azul', hex: '#3B82F6' },
                { nombre: 'Gris', hex: '#6B7280' },
                { nombre: 'Amarillo', hex: '#F5C81B' }
            ];
            await Color.bulkCreate(initialColors);
            console.log('✅ Colores sembrados correctamente');
        }
    } catch (e) {
        console.error('❌ Error sincronizando tabla de Colores:', e.message);
    }

    // 🚀 AUTO-MIGRACIÓN DE DEVOLUCIONES (Manual para evitar errores de sync)
    try {
        // Intentar agregar columnas una por una (si ya existen, fallará silenciosamente el query individual)
        try { await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "NombreCliente" VARCHAR(255)'); } catch(e){}
        try { await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "Talla" VARCHAR(20)'); } catch(e){}
        try { await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "IdProductoCambio" INTEGER'); } catch(e){}

    } catch (e) {
        console.error('❌ Error migrando tabla de Devoluciones:', e.message);
    }
    
    // 2. Escuchar en el puerto (app ya tiene todas las rutas)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
    });

    // 🛠️ MANEJO DE ERROR: Puerto ocupado
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está siendo usado por otro proceso.`);
        console.log(`💡 Intenta cerrar otros terminales o programas que usen el puerto ${PORT}.`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

// Manejo de apagado elegante para liberar conexiones a la BD
import { sequelize } from './src/models/index.js';

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Recibido ${signal}, cerrando pool de conexiones...`);
  try {
    if (sequelize) await sequelize.close();
    console.log('✅ Conexiones de base de datos liberadas.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cerrando la base de datos', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));