
import { Talla } from '../src/models/index.js';
import { sequelize } from '../src/config/db.js';

const TALLAS_ESPECIFICAS = [
  '7',
  '7 1/4',
  '7 1/8',
  'AJUSTABLE'
];

async function seedTallas() {
  try {
    const nombreLower = TALLAS_ESPECIFICAS.map(n => n.toUpperCase());
    
    for (const nombre of nombreLower) {
      await Talla.findOrCreate({
        where: { nombre },
        defaults: { isActive: true }
      });
      console.log(`📏 Talla "${nombre}" registrada/actualizada`);
    }
    
    console.log('🎉 Tallas registradas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedTallas();
