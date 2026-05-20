/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/usuarios.routes.js
import express from 'express';
const router = express.Router();
import usuarioController from '../controllers/usuarios.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Usuarios
 * Base URL: /api/usuarios
 */

// ============================================
// RUTAS DE PERFIL PERSONAL (acceso propio)
// ============================================
router.get('/perfil', verifyToken, usuarioController.getMiPerfil);
router.put('/perfil', verifyToken, usuarioController.updateMiPerfil);
router.post('/perfil/desactivar', verifyToken, usuarioController.desactivarMiCuenta);
router.delete('/perfil/eliminar-permanente', verifyToken, usuarioController.eliminarMiCuenta);
router.post('/perfil/cambiar-clave', verifyToken, usuarioController.cambiarMiClave);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver usuarios)
// ============================================
router.get('/', checkPermission('ver_usuarios'), usuarioController.getAllUsuarios);
router.get('/activos', checkPermission('ver_usuarios'), usuarioController.getUsuariosActivos);
router.get('/pendientes', checkPermission('ver_usuarios'), usuarioController.getUsuariosPendientes);
router.get('/estadisticas', checkPermission('ver_usuarios'), usuarioController.getEstadisticas);
router.get('/buscar', checkPermission('ver_usuarios'), usuarioController.buscarUsuarios);
router.get('/:id', checkPermission('ver_usuarios'), usuarioController.getUsuarioById);

// ============================================
// RUTAS DE ADMINISTRACIÓN (crear, editar)
// ============================================
router.post('/', checkPermission('crear_usuarios'), usuarioController.createUsuario);
router.put('/:id', checkPermission('editar_usuarios'), usuarioController.updateUsuario);
router.patch('/:id', checkPermission('editar_usuarios'), usuarioController.patchUsuario);

// ============================================
// RUTAS DE APROBACIÓN Y ESTADO
// ============================================
router.post('/:id/aprobar', checkPermission('aprobar_usuarios'), usuarioController.aprobarUsuario);
router.post('/:id/rechazar', checkPermission('aprobar_usuarios'), usuarioController.rechazarUsuario);
router.patch('/:id/estado', checkPermission('activar_usuarios'), usuarioController.toggleUsuarioStatus);

// ============================================
// RUTAS DE SEGURIDAD (contraseñas)
// ============================================
router.post('/:id/cambiar-clave', checkPermission('editar_usuarios'), usuarioController.cambiarClave);
router.post('/:id/resetear-clave', checkPermission('editar_usuarios'), usuarioController.resetearClave);

// ============================================
// RUTAS DE ASIGNACIÓN DE ROLES
// ============================================
router.post('/:id/asignar-rol', checkPermission('editar_usuarios'), usuarioController.asignarRol);
router.delete('/:id/rol', checkPermission('editar_usuarios'), usuarioController.quitarRol);

// ============================================
// ELIMINACIÓN DE USUARIOS
// ============================================
router.delete('/:id', checkPermission('eliminar_usuarios'), usuarioController.deleteUsuario);

export default router;