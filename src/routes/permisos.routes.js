/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/permisos.routes.js
import express from 'express';
const router = express.Router();
import permisoController from '../controllers/permisos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Permisos (Catálogo de permisos)
 * Base URL: /api/permisos
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (accesibles con ver_roles)
// ============================================
router.get('/verificar', checkPermission('ver_roles'), permisoController.verificarPermiso);
router.get('/rol/:rolId', checkPermission('ver_roles'), permisoController.getPermisosByRol);
router.get('/modulo/:modulo', checkPermission('ver_roles'), permisoController.getPermisosByModulo);

// ============================================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMIN)
// ============================================
router.get('/', checkPermission('ver_permisos'), permisoController.getAllPermisos);
router.get('/:id', checkPermission('ver_permisos'), permisoController.getPermisoById);
router.post('/init', checkPermission('inicializar_permisos'), permisoController.initPermisos);
router.post('/', checkPermission('crear_permisos'), permisoController.createPermiso);
router.put('/:id', checkPermission('editar_permisos'), permisoController.updatePermiso);
router.delete('/:id', checkPermission('eliminar_permisos'), permisoController.deletePermiso);

export default router;