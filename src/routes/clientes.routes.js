/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/clientes.routes.js
import express from 'express';
const router = express.Router();
import clienteController from '../controllers/clientes.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

// Rutas públicas (sin autenticación)
router.get('/publicos', clienteController.getClientesActivos);

// Rutas protegidas
router.use(verifyToken);

// Rutas para el propio cliente
router.get('/mi/perfil', clienteController.getMiPerfil);
router.put('/mi/perfil', clienteController.updateMiPerfil);

// Rutas de consulta (Accesibles por ventas o devoluciones también debido a dependencias)
const readPerms = ['ver_clientes', 'ver_ventas', 'ver_devoluciones'];
router.get('/', checkPermission(readPerms), clienteController.getAllClientes);
router.get('/activos', checkPermission(readPerms), clienteController.getClientesActivos);
router.get('/estadisticas', checkPermission('ver_clientes'), clienteController.getEstadisticas);
router.get('/ciudad/:ciudad', checkPermission(readPerms), clienteController.getClientesByCiudad);
router.get('/documento/:tipo/:numero', checkPermission(readPerms), clienteController.getClienteByDocumento);
router.get('/:id', checkPermission(readPerms), clienteController.getClienteById);

// Rutas de administración
router.post('/', checkPermission('crear_clientes'), clienteController.createCliente);
router.put('/:id', checkPermission('editar_clientes'), clienteController.updateCliente);
router.patch('/:id/estado', checkPermission('activar_clientes'), clienteController.toggleClienteStatus);
router.patch('/:id/saldo', checkPermission('editar_clientes'), clienteController.updateSaldo);
router.delete('/:id', checkPermission('eliminar_clientes'), clienteController.deleteCliente);

export default router;