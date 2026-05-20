/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// src/routes/pedidos.routes.js
import express from 'express';
const router = express.Router();
import ventaController from '../controllers/ventas.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

/**
 * Módulo de Pedidos para Clientes (Tienda Pública)
 * Permite a los clientes autenticados realizar compras
 */

// Se requiere estar logueado para comprar, pero no se requiere permiso de 'Administrador'
router.use(verifyToken);

// Crear un pedido (usa la misma lógica de creación de venta e inventario)
router.post('/', ventaController.createVenta);

export default router;
