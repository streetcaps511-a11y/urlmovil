/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/productos.routes.js
import express from 'express';
const router = express.Router();
import productoController from '../controllers/productos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

// 1. LECTURA (PÚBLICO)
router.get('/', productoController.getAllProductos);
router.get('/por-categoria/:nombre', productoController.getProductosByCategoriaNombre);
router.get('/:id', productoController.getProductoById);

router.use(verifyToken);

// 2. ESCRITURA (PROTEGIDO)
router.post('/', checkPermission('crear_productos'), productoController.createProducto);
router.put('/:id', checkPermission('editar_productos'), productoController.updateProducto);
router.put('/:id/oferta', checkPermission('editar_productos'), productoController.toggleOferta);
router.delete('/:id', checkPermission('eliminar_productos'), productoController.deleteProducto);

export default router;