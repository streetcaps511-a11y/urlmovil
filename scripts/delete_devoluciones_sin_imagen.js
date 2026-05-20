#!/usr/bin/env node
/**
 * Script: Borrar Devoluciones Sin Imagen
 * Elimina todas las devoluciones que NO tienen evidencia (imágenes)
 * 
 * Uso: node backend/scripts/delete_devoluciones_sin_imagen.js
 */

import { Devolucion, sequelize } from '../src/models/index.js';
import { Op } from 'sequelize';

const deleteDevolucionesSinImagen = async () => {
  try {
    console.log('🔍 Buscando devoluciones sin imagen...\n');

    // Buscar devoluciones donde AMBAS evidencias estén vacías/nulas
    const devolucionesABorrar = await Devolucion.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { evidencia: { [Op.is]: null } },
              { evidencia: '' }
            ]
          },
          {
            [Op.or]: [
              { evidencia2: { [Op.is]: null } },
              { evidencia2: '' }
            ]
          }
        ]
      },
      attributes: ['id', 'nombreCliente', 'productoOriginal', 'fecha', 'idEstado']
    });

    if (devolucionesABorrar.length === 0) {
      console.log('✅ No hay devoluciones sin imagen para borrar.');
      process.exit(0);
    }

    console.log(`📋 Se encontraron ${devolucionesABorrar.length} devoluciones sin imagen:\n`);
    
    devolucionesABorrar.forEach((dev, index) => {
      console.log(
        `${index + 1}. ID: ${dev.id} | Cliente: ${dev.nombreCliente} | Producto: ${dev.productoOriginal} | Estado: ${dev.idEstado}`
      );
    });

    console.log(`\n⚠️  Se procederá a ELIMINAR estas ${devolucionesABorrar.length} devoluciones.\n`);

    // Confirmar eliminación
    const confirmacion = await new Promise((resolve) => {
      process.stdout.write('¿Confirmas la eliminación? (SÍ/NO): ');
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toUpperCase());
      });
    });

    if (confirmacion !== 'SÍ' && confirmacion !== 'SI') {
      console.log('\n❌ Operación cancelada.');
      process.exit(0);
    }

    // Eliminar devoluciones
    const resultado = await Devolucion.destroy({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { evidencia: { [Op.is]: null } },
              { evidencia: '' }
            ]
          },
          {
            [Op.or]: [
              { evidencia2: { [Op.is]: null } },
              { evidencia2: '' }
            ]
          }
        ]
      }
    });

    console.log(`\n✅ Se eliminaron exitosamente ${resultado} devoluciones sin imagen.`);
    console.log('✨ Proceso completado.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la eliminación:', error.message);
    process.exit(1);
  }
};

// Ejecutar script
deleteDevolucionesSinImagen();

// Manejar CTRL+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Operación cancelada por el usuario.');
  process.exit(0);
});
