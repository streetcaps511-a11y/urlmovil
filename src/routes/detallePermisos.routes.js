/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/detallePermisos.routes.js
import express from 'express';
const router = express.Router();
import detallePermisoController from '../controllers/detallePermisos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Permisos (Asignación de permisos a roles)
 * Base URL: /api/detallepermisos
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA
// ============================================
router.get('/', checkPermission('ver_roles'), detallePermisoController.getAll);
router.get('/rol/:rolId', checkPermission('ver_roles'), detallePermisoController.getByRol);
router.get('/rol/:rolId/disponibles', checkPermission('ver_roles'), detallePermisoController.getPermisosDisponibles);
router.get('/verificar', checkPermission('ver_roles'), detallePermisoController.verificar);

// ============================================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMIN)
// ============================================
router.post('/asignar', checkPermission('asignar_permisos'), detallePermisoController.asignar);
router.post('/asignar-multiple', checkPermission('asignar_permisos'), detallePermisoController.asignarMultiple);
router.post('/quitar-multiple', checkPermission('asignar_permisos'), detallePermisoController.quitarMultiple);
router.put('/rol/:rolId/sincronizar', checkPermission('asignar_permisos'), detallePermisoController.sincronizar);
router.delete('/:id', checkPermission('asignar_permisos'), detallePermisoController.remove);

export default router;