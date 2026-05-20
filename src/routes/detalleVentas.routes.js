/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/detalleVentas.routes.js
import express from 'express';
const router = express.Router();
import detalleVentaController from '../controllers/detalleVentas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Ventas
 * Base URL: /api/detalleventas
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA
// ============================================
router.get('/', checkPermission('ver_ventas'), detalleVentaController.getAll);
router.get('/venta/:ventaId', checkPermission('ver_ventas'), detalleVentaController.getByVenta);
router.get('/venta/:ventaId/resumen', checkPermission('ver_ventas'), detalleVentaController.getResumenByVenta);
router.get('/:id', checkPermission('ver_ventas'), detalleVentaController.getById);

// ============================================
// RUTAS PARA DEVOLUCIONES
// ============================================
router.patch('/:id/devolver', checkPermission('anular_ventas'), detalleVentaController.marcarDevuelto);

// ============================================
// RUTAS DE ADMINISTRACIÓN (solo para casos especiales)
// ============================================
router.post('/', checkPermission('crear_ventas'), detalleVentaController.create);
router.put('/:id', checkPermission('editar_ventas'), detalleVentaController.update);
router.delete('/:id', checkPermission('eliminar_ventas'), detalleVentaController.delete);

export default router;