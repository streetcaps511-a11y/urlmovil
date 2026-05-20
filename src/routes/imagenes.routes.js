/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/imagenes.routes.js
import express from 'express';
const router = express.Router();
import imagenController from '../controllers/imagenes.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Imágenes
 * Base URL: /api/imagenes
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
router.get('/producto/:productoId', imagenController.getByProducto);
router.get('/producto/:productoId/principal', imagenController.getPrincipalByProducto);
router.get('/:id', imagenController.getById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA AVANZADA
// ============================================
router.get('/', checkPermission('ver_productos'), imagenController.getAll);
router.get('/estadisticas', checkPermission('ver_productos'), imagenController.getEstadisticas);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.post('/', checkPermission('editar_productos'), imagenController.create);
router.post('/multiples', checkPermission('editar_productos'), imagenController.createMultiple);
router.put('/:id', checkPermission('editar_productos'), imagenController.update);
router.patch('/:id/principal', checkPermission('editar_productos'), imagenController.setPrincipal);
router.post('/eliminar-multiples', checkPermission('eliminar_productos'), imagenController.deleteMultiple);
router.delete('/:id', checkPermission('eliminar_productos'), imagenController.delete);

export default router;