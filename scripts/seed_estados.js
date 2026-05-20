
import { Estado } from '../src/models/index.js';
import { sequelize } from '../src/config/db.js';

const ESTADOS_ESPECIFICOS = [
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA',
  'ACTIVO',
  'INACTIVO'
];

async function seedEstados() {
  try {
    for (const nombre of ESTADOS_ESPECIFICOS) {
      await Estado.findOrCreate({
        where: { nombre },
        defaults: { isActive: true }
      });
      console.log(`📑 Estado "${nombre}" registrado`);
    }
    console.log('🎉 Estados registrados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedEstados();
