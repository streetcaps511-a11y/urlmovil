/* === RUTAS DE BACKEND === 
   Define las URLs expuestas de la API para este módulo. 
   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */

// routes/auth.routes.js
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';  // ✅ verifyToken

const router = Router();

// Root route for auth to avoid 404
router.get('/', (req, res) => {
  res.json({
    module: 'Autenticación',
    status: 'Active',
    endpoints: [
      '/registro',
      '/login',
      '/verify',
      '/register',
      '/change-password',
      '/forgot-password',
      '/reset-password',
      '/sync-password'
    ]
  });
});

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.post('/logout', verifyToken, authController.logout);
router.get('/verify', verifyToken, authController.verify);  // ✅ verifyToken
router.post('/register', authController.register);  // ✅ verifyToken removido, es público
router.put('/change-password', verifyToken, authController.changePassword);  // ✅ verifyToken
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/sync-password', authController.syncPassword);

export default router;