/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

import crypto from 'crypto';
import Usuario from '../models/usuarios.model.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { sendForgotPasswordEmail } from './mail.service.js';
import { Op } from 'sequelize';

/**
 * Servicio de Autenticación
 * Lógica de negocio para autenticación
 */
const authService = {
    /**
     * Autenticar usuario
     * @param {string} email 
     * @param {string} clave 
     * @returns {Promise<Usuario|null>}
     */
    async authenticate(email, clave) {
        // En tu modelo el campo se llama 'email' pero el campo en la tabla es 'Correo'
        // El modelo de Sequelize mapea automáticamente si está bien configurado
        const usuario = await Usuario.findOne({
            where: { email: email.toLowerCase().trim() }
        });

        if (!usuario || !usuario.estado) {
            return null;
        }

        const valida = await comparePassword(clave, usuario.clave);
        if (!valida) {
            return null;
        }

        return usuario;
    },

    /**
     * Generar token JWT
     * @param {Usuario} usuario 
     * @returns {string}
     */
    generateToken(usuario) {
        return generateToken({
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            estado: usuario.estado,
            rolId: usuario.idRol
        });
    },

    /**
     * Verificar token
     * @param {string} token 
     * @returns {object}
     */
    verifyToken(token) {
        return verifyToken(token);
    },

    /**
     * Cambiar contraseña
     * @param {number} usuarioId 
     * @param {string} claveActual 
     * @param {string} claveNueva 
     * @returns {Promise<boolean>}
     */
    async changePassword(usuarioId, claveActual, claveNueva) {
        const usuario = await Usuario.findByPk(usuarioId);
        
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        const valida = await comparePassword(claveActual, usuario.clave);
        if (!valida) {
            throw new Error('Contraseña actual incorrecta');
        }

        const hashedPassword = await hashPassword(claveNueva);
        usuario.clave = hashedPassword;
        usuario.mustChangePassword = false;
        await usuario.save();
        
        return true;
    },

    /**
     * Registrar usuario
     * @param {object} userData 
     * @returns {Promise<Usuario>}
     */
    async register(userData) {
        const usuario = await Usuario.create({
            ...userData,
            email: userData.email.toLowerCase().trim(),
            estado: userData.estado || 'pendiente'
        });
        
        return usuario;
    },

    /**
     * Solicitar recuperación de contraseña
     * @param {string} email 
     */
    async forgotPassword(email) {
        try {
            const searchEmail = email.toLowerCase().trim();
            console.log(`🔍 [FORGOT PASSWORD] Buscando usuario con email: ${searchEmail}`);
            
            let usuario = await Usuario.findOne({ where: { email: searchEmail } });
            
            // 🛠️ AUTO-REPARACIÓN: Si no existe en Usuarios, buscamos si existe en la tabla de Clientes
            if (!usuario) {
                console.log(`ℹ️ [FORGOT PASSWORD] Usuario no encontrado en Usuarios, buscando en Clientes...`);
                const { Cliente, Rol } = await import('../models/index.js');
                const cliente = await Cliente.findOne({ where: { email: searchEmail } });
                
                if (cliente) {
                    console.log(`✅ [FORGOT PASSWORD] Cliente encontrado: ${cliente.nombreCompleto}, creando usuario...`);
                    // Si existe como cliente, le creamos su acceso automáticamente
                    let rolCliente = await Rol.findOne({ where: { nombre: 'Cliente' } });
                    if (!rolCliente) {
                        throw new Error('Rol Cliente no encontrado en la base de datos');
                    }
                    
                    const tempPassword = crypto.randomBytes(8).toString('hex');
                    usuario = await Usuario.create({
                        nombre: cliente.nombreCompleto,
                        email: searchEmail,
                        clave: tempPassword, // Clave temporal aleatoria
                        estado: 'activo',
                        idRol: rolCliente.id,
                        mustChangePassword: true
                    });
                    console.log(`✅ [FORGOT PASSWORD] Usuario creado automáticamente: ${usuario.id}`);
                } else {
                    console.log(`❌ [FORGOT PASSWORD] No existe en Usuarios ni en Clientes`);
                }
            }

            if (!usuario) {
                throw new Error('No existe una cuenta registrada con este correo electrónico. Por favor, regístrate primero.');
            }

            // Generar token único de 20 caracteres
            const token = crypto.randomBytes(20).toString('hex');
            
            // El token expira en 15 minutos
            usuario.resetPasswordToken = token;
            usuario.resetPasswordExpires = Date.now() + 900000; 
            console.log(`🔑 [FORGOT PASSWORD] Token generado para ${usuario.email}, expira en 15 minutos`);
            
            await usuario.save();
            console.log(`✅ [FORGOT PASSWORD] Token guardado en la base de datos`);

            // Enlace para el frontend (usando variable de entorno)
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            // Enviar el correo electrónico
            console.log(`📧 [FORGOT PASSWORD] Enviando correo a ${usuario.email}...`);
            await sendForgotPasswordEmail(usuario.email, usuario.nombre, resetLink);
            console.log(`✅ [FORGOT PASSWORD] Correo enviado exitosamente`);
            
            return true;
        } catch (error) {
            console.error(`❌ [FORGOT PASSWORD ERROR]:`, error.message);
            throw error;
        }
    },

    /**
     * Restablecer la contraseña con el token
     * @param {string} token 
     * @param {string} newPassword 
     */
    async resetPassword(token, newPassword) {
        const usuario = await Usuario.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() } // Que no haya vencido
            }
        });

        if (!usuario) throw new Error('El enlace de recuperación es inválido o ha expirado');

        // Actualizar contraseña (el modelo la encriptará automáticamente gracias al hook beforeUpdate)
        usuario.clave = newPassword;
        usuario.resetPasswordToken = null;
        usuario.resetPasswordExpires = null;
        usuario.mustChangePassword = false;
        
        await usuario.save();
        return true;
    }
};

export default authService;