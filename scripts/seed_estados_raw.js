
import { sequelize } from '../src/config/db.js';

const ESTADOS_ESPECIFICOS = [
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA',
  'ACTIVO',
  'INACTIVO'
];

async function seed() {
  try {
    for (const n of ESTADOS_ESPECIFICOS) {
      await sequelize.query('INSERT INTO "Estado" ("Nombre", "Estado") VALUES (?, true) ON CONFLICT ON CONSTRAINT "Estado_Nombre_key" DO NOTHING', {
        replacements: [n]
      });
      console.log(`📑 Estado "${n}" asegurado`);
    }
    console.log('🎉 Seed Estados completado');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error seeding estados:', e);
    process.exit(1);
  }
}
seed();
