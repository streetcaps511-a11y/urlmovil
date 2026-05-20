/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/tallas.routes.js
import express from 'express';
const router = express.Router();
import tallaController from '../controllers/tallas.controller.js';

/**
 * Rutas para el módulo de Tallas - VERSIÓN SIMPLE (sin protección)
 * Base URL: /api/tallas
 */

// ============================================
// TODAS LAS RUTAS SON PÚBLICAS PARA PRUEBAS
// ============================================

// Obtener todas las tallas
router.get('/', tallaController.getAll);

// Obtener tallas activas
router.get('/activas', tallaController.getActivas);

// Obtener talla por ID
router.get('/:id', tallaController.getById);

// Crear nueva talla
router.post('/', tallaController.create);

// Actualizar talla
router.put('/:id', tallaController.update);

// Cambiar estado (activar/desactivar)
router.patch('/:id/estado', tallaController.toggleStatus);

// Eliminar (desactivar) talla
router.delete('/:id', tallaController.delete);

export default router;