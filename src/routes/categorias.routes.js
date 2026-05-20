/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/categorias.routes.js
import express from 'express';
const router = express.Router();
import categoriaController from '../controllers/categorias.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

// Rutas públicas
router.get('/', categoriaController.getAllCategorias);
router.get('/:id', categoriaController.getCategoriaById);
router.get('/activas', categoriaController.getCategoriasActivas);
router.get('/estadisticas', categoriaController.getEstadisticas);

// Rutas protegidas (Mutaciones y administración)
router.use(verifyToken);
router.post('/', checkPermission('crear_categorias'), categoriaController.createCategoria);
router.put('/:id', checkPermission('editar_categorias'), categoriaController.updateCategoria);
router.delete('/:id', checkPermission('eliminar_categorias'), categoriaController.deleteCategoria);
router.patch('/:id/estado', checkPermission('activar_categorias'), categoriaController.toggleCategoriaStatus);

export default router;