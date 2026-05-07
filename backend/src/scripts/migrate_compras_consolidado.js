import { sequelize } from '../config/db.js';

async function migrateData() {
    const transaction = await sequelize.transaction();
    try {
        console.log('📦 Iniciando migración de datos antiguos a formato consolidado...');

        // 1. Obtener todos los detalles que no tienen el campo Variantes lleno
        const [detalles] = await sequelize.query(`
            SELECT * FROM "CompraDetalles" 
            WHERE "Variantes" IS NULL OR "Variantes" = '[]'::jsonb
        `);

        if (detalles.length === 0) {
            console.log('✅ No hay datos antiguos para migrar.');
            await transaction.rollback();
            process.exit(0);
        }

        console.log(`🔍 Encontrados ${detalles.length} registros antiguos. Agrupando...`);

        // 2. Agrupar por IdCompra y NombreProducto
        const grupos = detalles.reduce((acc, d) => {
            const key = `${d.IdCompra}_${d.NombreProducto}`;
            if (!acc[key]) {
                acc[key] = {
                    IdCompra: d.IdCompra,
                    IdProducto: d.IdProducto,
                    NombreProducto: d.NombreProducto,
                    PrecioCompra: d.PrecioCompra,
                    PrecioVenta: d.PrecioVenta,
                    PrecioMayorista6: d.PrecioMayorista6,
                    PrecioMayorista80: d.PrecioMayorista80,
                    Nfactura: d.Nfactura,
                    variantes: []
                };
            }
            acc[key].variantes.push({ talla: d.Talla, cantidad: d.Cantidad });
            return acc;
        }, {});

        console.log(`🔄 Consolidando en ${Object.keys(grupos).length} filas nuevas...`);

        // 3. Eliminar los registros antiguos (ya los tenemos en memoria)
        const idsAEliminar = detalles.map(d => d.IdDetalle);
        await sequelize.query(`
            DELETE FROM "CompraDetalles" WHERE "IdDetalle" IN (${idsAEliminar.join(',')})
        `, { transaction });

        // 4. Insertar los registros consolidados
        for (const key in grupos) {
            const g = grupos[key];
            const totalCant = g.variantes.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0);
            const subtotal = totalCant * parseFloat(g.PrecioCompra);
            const resumenTallas = g.variantes.map(v => `${v.talla}(${v.cantidad})`).join(', ');

            await sequelize.query(`
                INSERT INTO "CompraDetalles" 
                ("IdCompra", "IdProducto", "NombreProducto", "Talla", "Cantidad", "PrecioCompra", "PrecioVenta", "PrecioMayorista6", "PrecioMayorista80", "Subtotal", "Nfactura", "Variantes")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    g.IdCompra, g.IdProducto, g.NombreProducto, resumenTallas, totalCant, 
                    g.PrecioCompra, g.PrecioVenta, g.PrecioMayorista6, g.PrecioMayorista80, 
                    subtotal, g.Nfactura, JSON.stringify(g.variantes)
                ],
                transaction
            });
        }

        await transaction.commit();
        console.log('🚀 Migración completada con éxito. Los datos antiguos ahora están consolidados.');
        process.exit(0);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

migrateData();
