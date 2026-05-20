/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/roles.routes.js
import express from 'express';
const router = express.Router();
import rolController from '../controllers/roles.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Roles
 * Base URL: /api/roles
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver roles)
// ============================================
router.get('/activos', checkPermission('ver_roles'), rolController.getRolesActivos);
router.get('/', checkPermission('ver_roles'), rolController.getAllRoles);
router.get('/:id', checkPermission('ver_roles'), rolController.getRolById);
router.get('/:id/permisos', checkPermission('ver_roles'), rolController.getPermisosByRol);

// ============================================
// RUTAS DE ADMINISTRACIÓN (gestionar roles)
// ============================================
router.post('/', checkPermission('crear_roles'), rolController.createRol);
router.put('/:id', checkPermission('editar_roles'), rolController.updateRol);
router.patch('/:id', checkPermission('editar_roles'), rolController.patchRol);
router.patch('/:id/estado', checkPermission('activar_roles'), rolController.toggleRolStatus);

// ============================================
// RUTAS DE ASIGNACIÓN DE PERMISOS
// ============================================
router.post('/:id/permisos', checkPermission('asignar_permisos'), rolController.asignarPermisos);
router.post('/:id/permisos/agregar', checkPermission('asignar_permisos'), rolController.agregarPermiso);
router.delete('/:id/permisos/:permisoId', checkPermission('asignar_permisos'), rolController.quitarPermiso);

// ============================================
// ELIMINACIÓN DE ROLES
// ============================================
router.delete('/:id', checkPermission('eliminar_roles'), rolController.deleteRol);

export default router;