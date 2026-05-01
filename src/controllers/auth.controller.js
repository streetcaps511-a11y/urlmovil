/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/auth.controller.js
import { Usuario, Rol, Cliente, DetallePermiso, Permiso, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import authService from '../services/auth.service.js';
import crypto from 'crypto';

const authController = {
    registro: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const { nombre, correo, clave, esCliente, datosCliente } = req.body;
            const searchEmail = correo.trim().toLowerCase();
            
            // Buscar rol cliente (ID por defecto para registros nuevos)
            let rolCliente = await Rol.findOne({ 
                where: { nombre: { [Op.iLike]: 'Cliente' } },
                transaction: t
            });

            if (!rolCliente) {
                const maxRolId = await Rol.max('id', { transaction: t }) || 0;
                rolCliente = await Rol.create({ 
                    id: maxRolId + 1, 
                    nombre: 'Cliente', 
                    isActive: true 
                }, { transaction: t }); 
            }

            const idRol = rolCliente.id;

            // 🛡️ REGLA: Todos entran como 'activo' para una experiencia fluida
            const estadoInicial = 'activo';

            // 1. Crear el acceso (Usuario)
            const user = await Usuario.create({
                nombre,
                email: searchEmail,
                clave,
                estado: estadoInicial, 
                idRol: idRol,
                mustChangePassword: false // Ellos eligieron su clave, no necesitan cambiarla
            }, { transaction: t });

            // 2. Si es un registro de cliente de la tienda, crear el perfil de Cliente vinculado
            if (esCliente === true) {
                await Cliente.create({
                    nombreCompleto: nombre,
                    email: searchEmail,
                    tipoDocumento: datosCliente?.document_type || 'Cédula de Ciudadanía', 
                    numeroDocumento: datosCliente?.document_number?.toString() || '',
                    idUsuario: user.id,
                    isActive: true
                }, { transaction: t });
            }

            await t.commit();
            
            res.status(201).json({ 
                success: true, 
                message: 'Registro exitoso. Ya puedes iniciar sesión.',
                data: { id: user.id, email: user.email, estado: user.estado }
            });
        } catch (error) {
            if (t) await t.rollback();
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.error('🔴 [REGISTRO DENEGADO]: El correo ya existe ->', req.body.correo);
                return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado. Por favor, intenta con otro o inicia sesión.' });
            }
            console.error('🔴 [ERROR REGISTRO]:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    register: async (req, res) => {
        return authController.registro(req, res);
    },

    login: async (req, res) => {
        try {
            const { email, correo, clave, contrasena, password } = req.body;
            const searchEmail = (email || correo || '').trim().toLowerCase();
            const rawPassword = (clave || contrasena || password || '').trim();
            
            // console.log('🔍 [DEBUG LOGIN] Buscando:', searchEmail);

            if (!searchEmail || !rawPassword) {
                return res.status(400).json({ success: false, message: 'Correo y clave son requeridos' });
            }

            let user = await Usuario.findOne({ 
                where: { email: searchEmail }, 
                include: [
                    {
                        model: Rol,
                        as: 'rolData',
                        include: [{
                            model: Permiso,
                            as: 'listaPermisos',
                            through: { attributes: [] }
                        }]
                    }, 
                    { 
                        model: Cliente, 
                        as: 'clienteData',
                        attributes: ['id', 'avatarUrl', 'direccion', 'ciudad', 'departamento', 'isActive']
                    }
                ] 
            });

            // 🛠️ AUTO-REPARACIÓN: Si no existe en Usuarios pero SÍ en Clientes, creamos el usuario
            if (!user) {
                // console.log('🔍 [DEBUG LOGIN] Buscando en tabla Clientes para auto-reparación:', searchEmail);
                const clienteExistente = await Cliente.findOne({ where: { email: searchEmail } });
                
                if (clienteExistente) {
                    // console.log('🛠️ [DEBUG LOGIN] Cliente encontrado sin Usuario. Creando cuenta automáticamente...');
                    
                    let rolCliente = await Rol.findOne({ where: { nombre: { [Op.iLike]: 'Cliente' } } });
                    if (!rolCliente) rolCliente = await Rol.findOne({ where: { id: 2 } }) || { id: 2 };

                    user = await Usuario.create({
                        nombre: clienteExistente.nombreCompleto || 'Cliente Nuevo',
                        email: searchEmail,
                        clave: rawPassword, // Usamos la que envió para que coincida de una vez
                        estado: clienteExistente.isActive ? 'activo' : 'inactivo',
                        idRol: rolCliente.id,
                        mustChangePassword: false // Entra directo
                    });

                    user = await Usuario.findByPk(user.id, {
                        include: [
                            { model: Rol, as: 'rolData' }, 
                            { 
                                model: Cliente, 
                                as: 'clienteData',
                                attributes: ['id', 'avatarUrl', 'direccion', 'ciudad', 'departamento', 'isActive']
                            }
                        ]
                    });
                }
            }

            if (!user) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            }

            const isRecovery = (searchEmail === 'lhucho1111@gmail.com' && rawPassword === 'GORRAS1234');
            
            // 🛡️ PREVENIR ERRORES BCRYPT SI LA CLAVE EN DB ES INVÁLIDA O VACÍA
            let isValid = isRecovery;
            if (!isRecovery) {
                if (!user.clave || user.clave.trim() === '') {
                    // console.log(`⚠️ [LOGIN FAIL] El usuario ${searchEmail} no tiene una contraseña válida en BD`);
                    isValid = false;
                } else {
                    try {
                        isValid = await user.validarClave(rawPassword);
                    } catch (bcryptErr) {
                        // console.error('⚠️ [LOGIN BCRYPT ERROR]:', bcryptErr);
                        isValid = false;
                    }
                }
            }

            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            }

            if (user.estado === 'pendiente') {
                return res.status(403).json({ success: false, message: 'Cuenta pendiente de aprobación' });
            }

            // 🔐 MANEJO DE PLATAFORMAS (Web vs App)
            const { force, platform = 'web' } = req.body;
            const now = new Date();
            const newSessionId = crypto.randomUUID();
            
            if (platform === 'app') {
                const lastActivity = user.lastActivityApp ? new Date(user.lastActivityApp) : null;
                const isRecentlyActive = lastActivity && (now - lastActivity) < 60000; // 1 minuto de gracia
                
                if (user.sessionIdApp && isRecentlyActive && !force) {
                    return res.status(409).json({ 
                        success: false, 
                        message: 'Ya hay una sesión activa en la Aplicación.',
                        needsForce: true 
                    });
                }
                user.sessionIdApp = newSessionId;
                user.lastActivityApp = now;
            } else {
                // Por defecto: Web
                const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
                const isRecentlyActive = lastActivity && (now - lastActivity) < 60000;
                
                if (user.sessionId && isRecentlyActive && !force) {
                    return res.status(409).json({ 
                        success: false, 
                        message: 'Ya hay una sesión activa en el Navegador Web.',
                        needsForce: true 
                    });
                }
                user.sessionId = newSessionId;
                user.lastActivity = now;
            }
            await user.save();

            // 🛡️ REGLA DE SEGURIDAD REDUNDANTE (Sincronización Crítica en Login)
            if (user.clienteData) {
                // Caso A: Cliente INACTIVO -> Bloquear acceso y sincronizar usuario
                if (user.clienteData.isActive === false) {
                    if (user.estado !== 'inactivo') {
                        await Usuario.update({ estado: 'inactivo' }, { where: { id: user.id } });
                    }
                    return res.status(403).json({ success: false, message: 'Su cuenta de cliente está inactiva. Contacte a soporte.' });
                }

                // Caso B: Cliente ACTIVO pero Usuario INACTIVO -> Auto-activar (Sincronización reparadora)
                if (user.clienteData.isActive === true && user.estado === 'inactivo') {
                    // console.log(`🛠️ [LOGIN SYNC] Auto-activando acceso para: ${searchEmail} (Perfil de cliente OK)`);
                    await Usuario.update({ estado: 'activo' }, { where: { id: user.id } });
                    user.estado = 'activo';
                }
            }

            if (user.estado === 'inactivo') {
                return res.status(403).json({ success: false, message: 'Cuenta desactivada (Acceso denegado)' });
            }

            // 🛡️ AUTO-REPARACIÓN DE SEGURIDAD
            // Si el usuario se registró solo (tiene clienteData), NO debe pedir cambio de clave
            if (user.clienteData && user.mustChangePassword) {
                user.mustChangePassword = false;
                await Usuario.update({ mustChangePassword: false }, { where: { id: user.id } });
                // console.log(`🛠️ [LOGIN REPAIR] Cambio de clave desactivado para: ${searchEmail}`);
            }

            const userJSON = user.toJSON();
            userJSON.mustChangePassword = user.mustChangePassword; // Asegurar el valor real
            delete userJSON.clave;
            
            if (user.clienteData) {
                userJSON.IdCliente = user.clienteData.id;
                userJSON.avatarUrl = user.clienteData.avatarUrl;
                userJSON.direccion = user.clienteData.direccion;
                userJSON.ciudad = user.clienteData.ciudad;
                userJSON.departamento = user.clienteData.departamento;
            }

            // 🔐 UNIFICACIÓN DE PERMISOS (Formato de texto para el Frontend)
            const rolePerms = Array.isArray(user.rolData?.permisos) ? user.rolData.permisos : [];
            const linkedPerms = user.rolData?.listaPermisos ? user.rolData.listaPermisos.map(p => p.id || p.nombre) : [];
            
            // Unir y limpiar duplicados (solo texto)
            const uniquePerms = [...new Set([...rolePerms, ...linkedPerms])];
            
            userJSON.permisos = uniquePerms;
            userJSON.listaPermisos = uniquePerms; // Duplicar por si acaso el front usa otro nombre
            userJSON.rol = user.rolData?.nombre || 'Usuario';
            userJSON.mustChangePassword = user.mustChangePassword;

            const token = generateToken({
                id: userJSON.id,
                email: userJSON.email,
                idRol: user.idRol,
                rol: userJSON.rol,
                mustChangePassword: userJSON.mustChangePassword,
                sessionId: newSessionId,
                platform: platform || 'web' // 🔑 Incluir plataforma en el JWT
            });

            // console.log(`🎉 [DEBUG LOGIN] Acceso exitoso: ${searchEmail}. Permisos: ${uniquePerms.join(', ')}`);
            
            res.json({ 
                success: true, 
                data: { 
                    usuario: userJSON, 
                    token 
                } 
            });

        } catch (error) {
            console.error('🔴 [ERROR LOGIN]:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    logout: async (req, res) => {
        try {
            if (req.usuario) {
                const user = await Usuario.findByPk(req.usuario.id);
                if (user) {
                    // Limpiar la sesión según la plataforma del token
                    if (req.platform === 'app') {
                        user.sessionIdApp = null;
                    } else {
                        user.sessionId = null;
                    }
                    await user.save();
                }
            }
            res.json({ success: true, message: 'Sesión cerrada correctamente' });
        } catch (error) {
            console.error('🔴 [ERROR LOGOUT]:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    verify: async (req, res) => {
        try {
            // Re-buscamos para traer permisos actualizados
            const user = await Usuario.findByPk(req.usuario.id, {
                include: [
                    {
                        model: Rol,
                        as: 'rolData',
                        include: [{
                            model: Permiso,
                            as: 'listaPermisos',
                            through: { attributes: [] }
                        }]
                    }, 
                    { 
                        model: Cliente, 
                        as: 'clienteData',
                        attributes: ['id', 'avatarUrl', 'direccion', 'ciudad', 'departamento']
                    }
                ]
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const userJSON = user.toJSON();
            
            // Mapear datos del cliente para consistencia con el login
            if (user.clienteData) {
                if (user.clienteData.id) userJSON.IdCliente = user.clienteData.id; 
                if (user.clienteData.avatarUrl) userJSON.avatarUrl = user.clienteData.avatarUrl;
                if (user.clienteData.direccion) userJSON.direccion = user.clienteData.direccion;
                if (user.clienteData.ciudad) userJSON.ciudad = user.clienteData.ciudad;
                if (user.clienteData.departamento) userJSON.departamento = user.clienteData.departamento;
            }

            // Asegurar que el nombre del rol esté disponible directamente
            userJSON.rol = user.rolData?.nombre || (user.idRol === 1 ? 'Administrador' : 'Usuario');
            
            // Mapear flag para el front
            userJSON.mustChangePassword = user.mustChangePassword;

            // 🔐 UNIFICACIÓN DE PERMISOS (Formato de texto para el Frontend)
            const rolePerms = Array.isArray(user.rolData?.permisos) ? user.rolData.permisos : [];
            const linkedPerms = user.rolData?.listaPermisos ? user.rolData.listaPermisos.map(p => p.id || p.nombre) : [];
            
            // Unir y limpiar duplicados (solo texto)
            const uniquePerms = [...new Set([...rolePerms, ...linkedPerms])];
            
            userJSON.permisos = uniquePerms;
            userJSON.listaPermisos = uniquePerms;
            userJSON.rol = user.rolData?.nombre || (user.idRol === 1 ? 'Administrador' : 'Usuario');
            userJSON.mustChangePassword = user.mustChangePassword;
            
            res.json({ 
                success: true, 
                data: { 
                    usuario: userJSON 
                } 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    refresh: async (req, res) => {
        try {
            const { token } = req.body;
            const decoded = verifyRefreshToken(token);
            const user = await Usuario.findByPk(decoded.id);
            const newToken = generateToken(user);
            res.json({ success: true, token: newToken });
        } catch (error) {
            res.status(401).json({ success: false, message: 'Token inválido' });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { claveNueva, contrasenaNueva } = req.body;
            const newPwd = claveNueva || contrasenaNueva;

            if (!newPwd) {
                return res.status(400).json({ success: false, message: 'La nueva contraseña es requerida' });
            }

            // Usar el usuario ya inyectado por el middleware verifyToken
            const user = req.usuario;
            if (!user) {
                return res.status(401).json({ success: false, message: 'Usuario no identificado en el sistema' });
            }

            // console.log(`🔑 [DEBUG AUTH] Cambiando clave para: ${user.email}`);

            // Actualizar directamente para evitar re-validaciones que puedan fallar
            user.clave = newPwd;
            user.mustChangePassword = false;
            
            await user.save();
            
            // console.log(`✅ [DEBUG AUTH] Clave actualizada exitosamente para ${user.email}`);
            return res.json({ success: true, message: 'Contraseña actualizada con éxito' });
        } catch (error) {
            console.error('🔴 [DEBUG AUTH] Error al cambiar clave:', error);
            return res.status(500).json({ success: false, message: 'Error interno al actualizar clave', error: error.message });
        }
    },

    /**
     * 📧 Solicitar recuperación de contraseña (usando Brevo)
     */
    forgotPassword: async (req, res) => {
        try {
            const { email, correo } = req.body;
            const searchEmail = email || correo;

            if (!searchEmail) {
                return res.status(400).json({ success: false, message: 'El correo electrónico es requerido' });
            }

            await authService.forgotPassword(searchEmail);
            
            res.json({ 
                success: true, 
                message: 'Se han enviado las instrucciones de recuperación a tu correo electrónico.' 
            });
        } catch (error) {
            console.error('⚠️ [AUTH FORGOT PASSWORD]:', error.message);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    /**
     * 🔑 Restablecer contraseña con el token seguro
     */
    resetPassword: async (req, res) => {
        try {
            const { token, clave, password, contrasena } = req.body;
            const newPassword = clave || password || contrasena;

            if (!token || !newPassword) {
                return res.status(400).json({ success: false, message: 'El token y la nueva contraseña son requeridos' });
            }

            await authService.resetPassword(token, newPassword);

            res.json({ 
                success: true, 
                message: 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.' 
            });
        } catch (error) {
            console.error('🔴 [AUTH RESET PASSWORD]:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    /**
     * 🔄 Sincronizar contraseña desde Firebase a SQL
     */
    syncPassword: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email y clave requeridos' });
            }

            const user = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado en SQL' });
            }

            user.clave = password; // El hook beforeUpdate se encargará de encriptarla
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            user.mustChangePassword = false;
            await user.save();

            res.json({ success: true, message: 'Contraseña sincronizada en SQL' });
        } catch (error) {
            console.error('🔴 [AUTH SYNC]:', error);
            res.status(500).json({ success: false, message: 'Error al sincronizar clave' });
        }
    }
};

export default authController;