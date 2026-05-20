/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/proveedores.routes.js
import express from 'express';
const router = express.Router();
import proveedorController from '../controllers/proveedores.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Proveedores
 * Base URL: /api/proveedores
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
router.get('/publicos', proveedorController.getProveedoresPublicos);
router.get('/:id/publico', proveedorController.getProveedorPublicoById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver proveedores)
// ============================================
router.get('/', checkPermission('ver_proveedores'), proveedorController.getAllProveedores);
router.get('/activos', checkPermission('ver_proveedores'), proveedorController.getProveedoresActivos);
router.get('/estadisticas', checkPermission('ver_proveedores'), proveedorController.getEstadisticas);
router.get('/nit/:nit', checkPermission('ver_proveedores'), proveedorController.getProveedorByNIT);
router.get('/:id', checkPermission('ver_proveedores'), proveedorController.getProveedorById);
router.get('/:id/compras', checkPermission('ver_proveedores'), proveedorController.getComprasByProveedor);
router.get('/buscar', checkPermission('ver_proveedores'), proveedorController.buscarProveedores);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.post('/', checkPermission('crear_proveedores'), proveedorController.createProveedor);
router.put('/:id', checkPermission('editar_proveedores'), proveedorController.updateProveedor);
router.patch('/:id', checkPermission('editar_proveedores'), proveedorController.patchProveedor);
router.patch('/:id/estado', checkPermission('activar_proveedores'), proveedorController.toggleProveedorStatus);
router.delete('/:id', checkPermission('eliminar_proveedores'), proveedorController.deleteProveedor);

export default router;