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
        
        // 🚀 ELIMINAR RESTRICCIONES DE CLAVE FORÁNEA HACIA PRODUCTOS (BORRADO FÍSICO LIBRE)
        try {
            const [constraints] = await sequelize.query(`
              SELECT 
                tc.constraint_name, 
                tc.table_name
              FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
              WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name IN ('DetalleVentas', 'CompraDetalles', 'Devoluciones')
                AND ccu.table_name = 'Productos';
            `);
            for (const row of constraints) {
                console.log(`🔌 Auto-removiendo FK "${row.constraint_name}" de tabla "${row.table_name}"...`);
                await sequelize.query(`ALTER TABLE public."${row.table_name}" DROP CONSTRAINT "${row.constraint_name}"`);
            }
        } catch (e) {
            console.warn('⚠️ No se pudieron remover restricciones de FK de Productos:', e.message);
        }

        // 🚀 MIGRACIÓN PARA PAGO PARCIAL Y BORRADO DE CLIENTES EN VENTAS
        try {
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Comprobante2" VARCHAR(500)');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "MontoPagado" DECIMAL(10, 2) DEFAULT 0');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Monto1" DECIMAL(10, 2) DEFAULT 0');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "Monto2" DECIMAL(10, 2) DEFAULT 0');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "FechaEnvio" TIMESTAMP WITH TIME ZONE');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "FechaEntrega" TIMESTAMP WITH TIME ZONE');
            await sequelize.query('ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS "EsManual" BOOLEAN DEFAULT FALSE');
            await sequelize.query('UPDATE "Ventas" SET "EsManual" = TRUE WHERE "IdEstado" = \'Completada\'');
            
            // Permitir NULL en IdCliente y eliminar Nombre Historico
            await sequelize.query('ALTER TABLE "Ventas" ALTER COLUMN "IdCliente" DROP NOT NULL');
            await sequelize.query('ALTER TABLE "Ventas" DROP COLUMN IF EXISTS "ClienteNombreHistorico"');

            // 🚀 MIGRACIÓN PARA COMPRAS (BORRADO DE PROVEEDORES Y NUEVOS CAMPOS)
            await sequelize.query('ALTER TABLE "Compras" ALTER COLUMN "IdProveedor" DROP NOT NULL');
            await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "ProveedorNombreHistorico"');
            await sequelize.query('ALTER TABLE "Compras" ADD COLUMN IF NOT EXISTS "FechaRegistro" DATE');

            // Eliminar columna Destacado de Productos
            await sequelize.query('ALTER TABLE "Productos" DROP COLUMN IF EXISTS "Destacado"');

            // 🚀 MIGRACIÓN PARA COMPRAS (ELIMINAR Y RENOMBRAR CAMPOS)
            try {
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "TotalFactura"');
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "totalfactura"');
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "NoCompras"');
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "nocompras"');
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "NoCompra"');
                await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "nocompra"');

                // Verificar si Nfactura ya existe
                const [nfacturaCols] = await sequelize.query(`
                  SELECT column_name 
                  FROM information_schema.columns 
                  WHERE table_name = 'Compras' AND column_name = 'Nfactura';
                `);

                if (nfacturaCols.length === 0) {
                    // Nfactura no existe. Busquemos si hay alguna columna antigua para renombrar.
                    const [oldCols] = await sequelize.query(`
                      SELECT column_name 
                      FROM information_schema.columns 
                      WHERE table_name = 'Compras' AND column_name IN ('NumeroRecibo', 'numeroRecibo', 'nrecibo', 'NRecibo');
                    `);
                    
                    if (oldCols.length > 0) {
                        const oldCol = oldCols[0].column_name;
                        console.log(`🔌 Renombrando columna "${oldCol}" de la tabla Compras a "Nfactura"...`);
                        await sequelize.query(`ALTER TABLE "Compras" RENAME COLUMN "${oldCol}" TO "Nfactura"`);
                    } else {
                        await sequelize.query('ALTER TABLE "Compras" ADD COLUMN "Nfactura" VARCHAR(100)');
                    }
                } else {
                    // Nfactura ya existe. Limpiamos cualquier columna antigua que haya quedado.
                    await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "NumeroRecibo"');
                    await sequelize.query('ALTER TABLE "Compras" DROP COLUMN IF EXISTS "numeroRecibo"');
                }
            } catch (e) {
                console.warn('⚠️ No se pudieron limpiar/renombrar columnas de Compras:', e.message);
            }

            // 🚀 MIGRACIÓN PARA PROVEEDORES (REORDENAR TipoProveedor Y ELIMINAR Departamento)
            try {
                // 1. Verificar si "TipoProveedor" está en la posición incorrecta o si "Departamento" aún existe.
                const [columns] = await sequelize.query(`
                  SELECT column_name, ordinal_position 
                  FROM information_schema.columns 
                  WHERE table_name = 'Proveedores' 
                  ORDER BY ordinal_position;
                `);

                const hasDepartamento = columns.some(c => c.column_name.toLowerCase() === 'departamento');
                const tipoProvPos = columns.find(c => c.column_name === 'TipoProveedor')?.ordinal_position;
                
                // Si tiene departamento, o si TipoProveedor no está en la posición 2 (después de IdProveedor), reconstruimos la tabla
                if (hasDepartamento || (tipoProvPos && tipoProvPos !== 2)) {
                    console.log('🔄 Reconstruyendo tabla Proveedores para aplicar orden de columnas...');
                    
                    // A. Encontrar y eliminar dinámicamente claves foráneas que apunten a la tabla Proveedores
                    const [fkConstraints] = await sequelize.query(`
                      SELECT 
                        tc.constraint_name, 
                        tc.table_name
                      FROM 
                        information_schema.table_constraints AS tc 
                        JOIN information_schema.constraint_column_usage AS ccu
                          ON ccu.constraint_name = tc.constraint_name
                          AND ccu.table_schema = tc.table_schema
                      WHERE tc.constraint_type = 'FOREIGN KEY' 
                        AND ccu.table_name = 'Proveedores';
                    `);

                    for (const row of fkConstraints) {
                        console.log(`🔌 Removiendo temporalmente FK "${row.constraint_name}" de tabla "${row.table_name}"...`);
                        await sequelize.query(`ALTER TABLE public."${row.table_name}" DROP CONSTRAINT "${row.constraint_name}"`);
                    }

                    // B. Crear tabla temporal de backup
                    await sequelize.query('DROP TABLE IF EXISTS "Proveedores_backup"');
                    await sequelize.query('CREATE TABLE "Proveedores_backup" AS SELECT * FROM "Proveedores"');

                    // C. Eliminar tabla original
                    await sequelize.query('DROP TABLE IF EXISTS "Proveedores" CASCADE');

                    // D. Crear la tabla Proveedores con el orden correcto y sin Departamento
                    await sequelize.query(`
                      CREATE TABLE "Proveedores" (
                        "IdProveedor" SERIAL NOT NULL,
                        "TipoProveedor" CHARACTER VARYING(50) DEFAULT 'Persona Jurídica'::character varying,
                        "Nombre" CHARACTER VARYING(255) NOT NULL,
                        "TipoDocumento" CHARACTER VARYING(50) NOT NULL,
                        "NumeroDocumento" CHARACTER VARYING(20) NOT NULL,
                        "Telefono" CHARACTER VARYING(20),
                        "Direccion" CHARACTER VARYING(200),
                        "Email" CHARACTER VARYING(100) NOT NULL,
                        "Estado" BOOLEAN NOT NULL DEFAULT true,
                        "Ciudad" CHARACTER VARYING(100),
                        "Contacto" CHARACTER VARYING(255),
                        CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("IdProveedor")
                      );
                    `);

                    // E. Insertar datos de vuelta mapeados
                    await sequelize.query(`
                      INSERT INTO "Proveedores" ("IdProveedor", "TipoProveedor", "Nombre", "TipoDocumento", "NumeroDocumento", "Telefono", "Direccion", "Email", "Estado", "Ciudad", "Contacto")
                      SELECT "IdProveedor", "TipoProveedor", "Nombre", "TipoDocumento", "NumeroDocumento", "Telefono", "Direccion", "Email", "Estado", "Ciudad", "Contacto"
                      FROM "Proveedores_backup";
                    `);

                    // F. Eliminar tabla de backup
                    await sequelize.query('DROP TABLE IF EXISTS "Proveedores_backup"');

                    // H. Restaurar claves foráneas
                    for (const row of fkConstraints) {
                        console.log(`🔌 Restaurando FK "${row.constraint_name}" en tabla "${row.table_name}"...`);
                        if (row.table_name === 'Compras') {
                            await sequelize.query(`
                              ALTER TABLE "Compras" 
                              ADD CONSTRAINT "Compras_IdProveedor_fkey" 
                              FOREIGN KEY ("IdProveedor") REFERENCES "Proveedores"("IdProveedor") 
                              ON DELETE SET NULL ON UPDATE CASCADE;
                            `);
                        }
                    }
                    console.log('✅ Reconstrucción de la tabla Proveedores completada con éxito.');
                }
            } catch (e) {
                console.warn('⚠️ No se pudo reconstruir/reordenar la tabla Proveedores:', e.message);
            }

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
            await sequelize.query('ALTER TABLE "Devoluciones" ADD COLUMN IF NOT EXISTS "MismoModelo" BOOLEAN DEFAULT false');
            await sequelize.query('ALTER TABLE "Devoluciones" ALTER COLUMN "IdProducto" DROP NOT NULL').catch(() => {});
        } catch (e) {
            console.warn('⚠️ No se pudo actualizar el esquema de Devoluciones:', e.message);
        }

        // 🚀 MIGRACIÓN PARA TAMAÑO DE NÚMEROS EN VENTAS
        try {
            await sequelize.query('ALTER TABLE "Ventas" ALTER COLUMN "Total" TYPE numeric(15,2), ALTER COLUMN "MontoPagado" TYPE numeric(15,2), ALTER COLUMN "Monto1" TYPE numeric(15,2), ALTER COLUMN "Monto2" TYPE numeric(15,2)');
        } catch (e) {
            console.warn('⚠️ No se pudo actualizar el esquema de Ventas (tamaño numérico):', e.message);
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

        // 🚀 MIGRACIÓN PARA DESCRIPCIÓN ROL CLIENTE
        try {
            await sequelize.query('UPDATE "Roles" SET "Descripcion" = \'Acceso a la página principal\' WHERE "Nombre" = \'Cliente\'');
        } catch (e) {
            console.warn('⚠️ No se pudo actualizar descripción del rol Cliente:', e.message);
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

    // 🚀 MIGRACIONES DE SECUENCIA ELIMINADAS: El usuario prefiere conteo normal (1, 2, 3...)
    
    // 🚀 BACKGROUND JOB: Auto-actualizar estado de 'Enviado' a 'Entregado' tras 2 minutos
    setInterval(async () => {
        try {
            const { sequelize } = await import('./src/config/db.js');
            const [results] = await sequelize.query(`
                UPDATE "Ventas" 
                SET "StatusEnvio" = 'Entregado', "FechaEntrega" = NOW() 
                WHERE "StatusEnvio" = 'Enviado' 
                AND "FechaEnvio" IS NOT NULL 
                AND NOW() >= "FechaEnvio" + INTERVAL '2 minutes'
                RETURNING "IdVenta";
            `);
            if (results && results.length > 0) {
                console.log(`📦 Auto-actualizados ${results.length} pedidos de 'Enviado' a 'Entregado'`);
            }
        } catch (err) {
            console.error('⚠️ Error en job auto-actualización de envíos:', err.message);
        }
    }, 10000); // Se ejecuta cada 10 segundos para chequear

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
    error.stack = error.message;
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

// nodemon restart trigger
