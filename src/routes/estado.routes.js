/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/estado.routes.js
import express from 'express';
const router = express.Router();
import estadoController from '../controllers/estado.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Estados (Catálogo)
 * Base URL: /api/estados
 */

// ============================================
// RUTAS PÚBLICAS (solo consulta)
// ============================================
router.get('/', estadoController.getAll);
router.get('/tipo/:tipo', estadoController.getByTipo);
router.get('/:id', estadoController.getById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.post('/', checkPermission('crear_estados'), estadoController.create);
router.put('/:id', checkPermission('editar_estados'), estadoController.update);
router.patch('/:id', checkPermission('editar_estados'), estadoController.patch);
router.patch('/:id/estado', checkPermission('activar_estados'), estadoController.toggleStatus);
router.delete('/:id', checkPermission('eliminar_estados'), estadoController.delete);

export default router;