/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/ventas.routes.js
import express from 'express';
const router = express.Router();
import ventaController from '../controllers/ventas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Módulo de Ventas
 */

router.use(verifyToken);

// 1. ESPECÍFICAS
router.get('/mis-pedidos', ventaController.getMisVentas);
router.get('/estadisticas', checkPermission('ver_ventas'), ventaController.getEstadisticas);
router.get('/estados', checkPermission('ver_ventas'), ventaController.getEstadosVenta);
router.get('/cliente/:clienteId', checkPermission('ver_ventas'), ventaController.getVentasByCliente);
router.get('/fecha', checkPermission('ver_ventas'), ventaController.getVentasByFecha);
router.get('/rango-fechas', checkPermission('ver_ventas'), ventaController.getVentasByRangoFechas);
router.get('/producto/:productoId', checkPermission('ver_ventas'), ventaController.getVentasByProducto);

// 2. CRUD Estándar
router.get('/', checkPermission('ver_ventas'), ventaController.getAllVentas);
router.get('/:id', checkPermission('ver_ventas'), ventaController.getVentaById);
router.get('/:id/detalle', checkPermission('ver_ventas'), ventaController.getVentaConDetalle);
router.get('/:id/reporte', checkPermission('ver_ventas'), ventaController.generarReporteIndividual);

// 3. ACCIONES
router.post('/', checkPermission('crear_ventas'), ventaController.createVenta);
router.post('/completa', checkPermission('crear_ventas'), ventaController.createVentaCompleta);
router.post('/:id/anular', checkPermission('anular_ventas'), ventaController.anularVenta);
router.post('/:id/procesar-pago', checkPermission('editar_ventas'), ventaController.procesarPago);
router.patch('/:id/estado', checkPermission('editar_ventas'), ventaController.actualizarEstado);
router.patch('/:id/envio', checkPermission('editar_ventas'), ventaController.actualizarStatusEnvio);
router.patch('/:id/marcar-recibido', ventaController.marcarComoRecibido);

export default router;