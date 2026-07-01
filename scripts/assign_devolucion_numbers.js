#!/usr/bin/env node
/**
 * Script para asignar números de devolución (noDevolucion) a las antiguas devoluciones
 * Corre: node scripts/assign_devolucion_numbers.js
 */

import { sequelize, Devolucion } from '../src/models/index.js';

async function assignDevolucionNumbers() {
  try {
    console.log('📋 Iniciando asignación de números de devolución...\n');

    // Obtener todas las devoluciones sin número
    const devoluciones = await Devolucion.findAll({
      where: { noDevolucion: null },
      order: [['id', 'ASC']],
      raw: false
    });

    if (devoluciones.length === 0) {
      console.log('✅ No hay devoluciones sin número. ¡Todo está al día!');
      return;
    }

    console.log(`🔄 Encontradas ${devoluciones.length} devoluciones sin número\n`);

    let updated = 0;
    for (const dev of devoluciones) {
      // Asignar número: 1000 + id
      dev.noDevolucion = 1000 + dev.id;
      await dev.save();
      console.log(`✓ DEV-${dev.noDevolucion} (ID: ${dev.id}) - ${dev.nombreCliente || 'Sin nombre'}`);
      updated++;
    }

    console.log(`\n✅ Asignación completada: ${updated} devoluciones actualizadas`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

assignDevolucionNumbers();
