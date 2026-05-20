/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/compras.routes.js
import express from 'express';
const router = express.Router();
import compraController from '../controllers/compras.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Módulo de Compras
 */

// 1. JWT Global
router.use(verifyToken);

// 2. Rutas Específicas
router.get('/estadisticas', checkPermission('ver_compras'), compraController.getEstadisticas);
router.get('/proveedor/:proveedorId', checkPermission('ver_compras'), compraController.getComprasByProveedor);

// 3. CRUD Estándar
router.get('/', checkPermission('ver_compras'), compraController.getAllCompras);
router.get('/:id', checkPermission('ver_compras'), compraController.getCompraById);
router.get('/:id/reporte', checkPermission('ver_compras'), compraController.generarReporte);

router.post('/', checkPermission('crear_compras'), compraController.createCompra);
router.patch('/:id/status', checkPermission('crear_compras'), compraController.updateStatus);
router.post('/:id/anular', checkPermission('anular_compras'), compraController.anularCompra);
router.delete('/:id', checkPermission('anular_compras'), compraController.anularCompra);

export default router;