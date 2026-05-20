#!/usr/bin/env node
/**
 * Script: Actualizar NoDevolucion a numeración secuencial simple
 * Convierte 10001, 10002... a 1, 2, 3...
 */

import { Devolucion, sequelize } from '../src/models/index.js';
import { Op } from 'sequelize';

const updateDevolucionNumbers = async () => {
  try {
    console.log('🔄 Actualizando números de devolución...\n');

    // Obtener todas las devoluciones ordenadas por ID
    const devoluciones = await Devolucion.findAll({
      order: [['id', 'ASC']],
      attributes: ['id', 'noDevolucion']
    });

    if (devoluciones.length === 0) {
      console.log('✅ No hay devoluciones para actualizar.');
      process.exit(0);
    }

    console.log(`📋 Se actualizarán ${devoluciones.length} devoluciones:\n`);

    // Actualizar con números secuenciales
    let count = 0;
    for (let i = 0; i < devoluciones.length; i++) {
      const dev = devoluciones[i];
      const newNumber = i + 1;
      
      await Devolucion.update(
        { noDevolucion: newNumber },
        { where: { id: dev.id } }
      );
      
      console.log(`  ✓ ID ${dev.id} -> NoDevolucion: ${newNumber}`);
      count++;
    }

    console.log(`\n✅ Se actualizaron exitosamente ${count} devoluciones.`);
    console.log('✨ Los números ahora son: 1, 2, 3, ... en lugar de 10001, 10002...\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    process.exit(1);
  }
};

updateDevolucionNumbers();

process.on('SIGINT', () => {
  console.log('\n\n❌ Operación cancelada por el usuario.');
  process.exit(0);
});
