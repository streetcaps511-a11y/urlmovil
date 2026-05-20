/**
 * Script para migrar evidencias de devoluciones antiguas a Cloudinary
 * Solo migrará devoluciones que ya estén registradas en la BD
 * y que no tengan enlaces de Cloudinary
 */

import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';
import Devolucion from '../models/devoluciones.model.js';
import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../public/uploads/devoluciones');

/**
 * Verifica si una URL es de Cloudinary
 */
const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

/**
 * Sube una imagen a Cloudinary
 */
const uploadToCloudinary = async (filePath, publicId) => {
  try {
    console.log(`  ⏳ Subiendo ${path.basename(filePath)} a Cloudinary...`);
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'devoluciones',
      resource_type: 'auto',
      public_id: publicId,
    });
    console.log(`  ✅ Subido correctamente: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`  ❌ Error al subir: ${error.message}`);
    return null;
  }
};

/**
 * Encuentra el archivo local de una evidencia por nombre
 */
const findLocalFile = (fileName) => {
  if (!fileName) return null;

  const filePath = path.join(uploadsDir, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
};

/**
 * Extrae el nombre del archivo de una ruta local
 */
const extractFileName = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;

  // Si ya es una URL de Cloudinary, retorna null
  if (isCloudinaryUrl(filePath)) return null;

  // Si es una ruta local, extrae el nombre del archivo
  const match = filePath.match(/(?:devoluciones[\/\\])?([^\/\\]+)$/);
  return match ? match[1] : null;
};

/**
 * Migra las devoluciones
 */
const migrarDevoluciones = async () => {
  try {
    console.log('🔍 Iniciando búsqueda de devoluciones sin migrar...\n');

    // Obtener todas las devoluciones de la BD
    const devoluciones = await Devolucion.findAll({
      attributes: ['id', 'evidencia', 'evidencia2'],
      raw: true,
    });

    console.log(`📊 Total de devoluciones en BD: ${devoluciones.length}`);

    let totalMigradas = 0;
    let errores = 0;

    for (const dev of devoluciones) {
      let actualizado = false;
      const updates = {};

      // Verificar evidencia 1
      if (dev.evidencia && !isCloudinaryUrl(dev.evidencia)) {
        const fileName = extractFileName(dev.evidencia);
        console.log(`\n📌 Devolución #${dev.id} - Evidencia 1`);

        if (fileName) {
          const localPath = findLocalFile(fileName);
          if (localPath) {
            console.log(`  📁 Archivo encontrado: ${fileName}`);
            const url = await uploadToCloudinary(
              localPath,
              `evidencia-old-${dev.id}-1`
            );
            if (url) {
              updates.evidencia = url;
              actualizado = true;
            } else {
              errores++;
            }
          } else {
            console.log(`  ⚠️  Archivo no encontrado localmente: ${fileName}`);
            errores++;
          }
        } else {
          console.log(`  ⚠️  No se pudo extraer nombre del archivo`);
        }
      }

      // Verificar evidencia 2
      if (dev.evidencia2 && !isCloudinaryUrl(dev.evidencia2)) {
        const fileName = extractFileName(dev.evidencia2);
        console.log(`\n📌 Devolución #${dev.id} - Evidencia 2`);

        if (fileName) {
          const localPath = findLocalFile(fileName);
          if (localPath) {
            console.log(`  📁 Archivo encontrado: ${fileName}`);
            const url = await uploadToCloudinary(
              localPath,
              `evidencia-old-${dev.id}-2`
            );
            if (url) {
              updates.evidencia2 = url;
              actualizado = true;
            } else {
              errores++;
            }
          } else {
            console.log(`  ⚠️  Archivo no encontrado localmente: ${fileName}`);
            errores++;
          }
        } else {
          console.log(`  ⚠️  No se pudo extraer nombre del archivo`);
        }
      }

      // Actualizar la BD si hay cambios
      if (actualizado && Object.keys(updates).length > 0) {
        try {
          await Devolucion.update(updates, {
            where: { id: dev.id }
          });
          console.log(`  ✨ Devolución #${dev.id} actualizada en BD`);
          totalMigradas++;
        } catch (error) {
          console.error(`  ❌ Error al actualizar BD para #${dev.id}: ${error.message}`);
          errores++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 REPORTE FINAL');
    console.log('='.repeat(60));
    console.log(`✅ Devoluciones migradas: ${totalMigradas}`);
    console.log(`❌ Errores encontrados: ${errores}`);
    console.log(`⏭️  Devoluciones sin cambios: ${devoluciones.length - totalMigradas}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
};

// Ejecutar
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    await migrarDevoluciones();
    console.log('\n✨ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
})();
