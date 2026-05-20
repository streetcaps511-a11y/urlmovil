/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/dashboard.routes.js
import express from 'express';
const router = express.Router();
import dashboardController from '../controllers/dashboard.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Dashboard
 * Base URL: /api/dashboard
 * 
 * El dashboard tiene diferentes niveles de información:
 * - Básico: Para todos los usuarios autenticados
 * - Detallado: Para roles con permisos específicos
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// DASHBOARD ADMIN/EMPLEADO (requieren permisos)
// ============================================
// Estadísticas generales (requiere permiso)
router.get('/estadisticas', checkPermission('ver_dashboard'), dashboardController.getDashboardStats);
router.get('/resumen', checkPermission('ver_dashboard'), dashboardController.getResumen);

// Datos para gráficos (requiere permiso)
router.get('/graficos/ventas', checkPermission('ver_dashboard'), dashboardController.getGraficoVentas);
router.get('/graficos/productos', checkPermission('ver_dashboard'), dashboardController.getGraficoProductos);
router.get('/graficos', checkPermission('ver_dashboard'), dashboardController.getGraficos);

// ============================================
// REPORTES EJECUTIVOS (permisos más específicos)
// ============================================
router.get('/reportes/ventas-diarias', checkPermission('ver_reportes'), dashboardController.getVentasDiarias);
router.get('/reportes/productos-mas-vendidos', checkPermission('ver_reportes'), dashboardController.getProductosMasVendidos);
router.get('/reportes/clientes-frecuentes', checkPermission('ver_reportes'), dashboardController.getClientesFrecuentes);
router.get('/reportes/rentabilidad', checkPermission('ver_reportes'), dashboardController.getRentabilidad);

// ============================================
// KPI ESPECÍFICOS (para monitoreo en tiempo real)
// ============================================
router.get('/kpi/ventas-hoy', checkPermission('ver_dashboard'), dashboardController.getVentasHoy);
router.get('/kpi/productos-bajo-stock', checkPermission('ver_dashboard'), dashboardController.getProductosBajoStock);
router.get('/kpi/alertas', checkPermission('ver_dashboard'), dashboardController.getAlertas);

export default router;