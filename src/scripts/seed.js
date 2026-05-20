// src/scripts/seed.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // ============================================
    // 🔹 1. CREAR ROL "Administrador"
    // ============================================
    const [existingRol] = await sequelize.query(
      `SELECT "IdRol" FROM "Roles" WHERE "Nombre" = 'Administrador' LIMIT 1`
    );

    let idRolAdmin;
    if (existingRol.length > 0) {
      idRolAdmin = existingRol[0].IdRol;
      console.log(`✅ Rol "Administrador" ya existe con IdRol = ${idRolAdmin}`);
    } else {
      const [newRol] = await sequelize.query(`
        INSERT INTO "Roles" ("Nombre", "Estado")
        VALUES ('Administrador', true)
        RETURNING "IdRol";
      `);
      idRolAdmin = newRol[0].IdRol;
      console.log(`✅ Rol "Administrador" creado con IdRol = ${idRolAdmin}`);
    }

    // ============================================
    // 🔹 2. CREAR TODOS LOS PERMISOS (con las 4 columnas requeridas)
    // ============================================
    const permisosSistema = [
      { nombre: 'dashboard', modulo: 'dashboard', accion: 'read' },
      { nombre: 'categorias', modulo: 'productos', accion: 'crud' },
      { nombre: 'productos', modulo: 'productos', accion: 'crud' },
      { nombre: 'proveedores', modulo: 'compras', accion: 'crud' },
      { nombre: 'compras', modulo: 'compras', accion: 'crud' },
      { nombre: 'detalleCompras', modulo: 'compras', accion: 'read' },
      { nombre: 'clientes', modulo: 'ventas', accion: 'crud' },
      { nombre: 'ventas', modulo: 'ventas', accion: 'crud' },
      { nombre: 'detalleVentas', modulo: 'ventas', accion: 'read' },
      { nombre: 'devoluciones', modulo: 'ventas', accion: 'crud' },
      { nombre: 'usuarios', modulo: 'configuracion', accion: 'crud' },
      { nombre: 'roles', modulo: 'configuracion', accion: 'crud' },
      { nombre: 'permisos', modulo: 'configuracion', accion: 'crud' },
      { nombre: 'detallePermisos', modulo: 'configuracion', accion: 'read' },
      { nombre: 'estados', modulo: 'configuracion', accion: 'crud' },
      { nombre: 'tallas', modulo: 'productos', accion: 'crud' },
      { nombre: 'imagenes', modulo: 'productos', accion: 'crud' },
      { nombre: 'auth', modulo: 'auth', accion: 'all' }
    ];

    const permisosIds = [];
    for (const permiso of permisosSistema) {
      // Verificar si ya existe
      const [existingPermiso] = await sequelize.query(
        `SELECT "IdPermiso" FROM "Permisos" WHERE "Nombre" = :nombre LIMIT 1`,
        { replacements: { nombre: permiso.nombre } }
      );

      let idPermiso;
      if (existingPermiso.length > 0) {
        idPermiso = existingPermiso[0].IdPermiso;
        console.log(`✅ Permiso "${permiso.nombre}" ya existe`);
      } else {
        // Generar ID único para el permiso
        idPermiso = `perm_${permiso.nombre.toLowerCase().replace(/\s/g, '_')}`;
        
        await sequelize.query(`
          INSERT INTO "Permisos" ("IdPermiso", "Nombre", "Modulo", "Accion")
          VALUES (:idPermiso, :nombre, :modulo, :accion)
        `, {
          replacements: {
            idPermiso,
            nombre: permiso.nombre,
            modulo: permiso.modulo,
            accion: permiso.accion
          }
        });
        console.log(`✅ Permiso "${permiso.nombre}" creado`);
      }
      permisosIds.push(idPermiso);
    }

    // ============================================
    // 🔹 3. ASIGNAR PERMISOS AL ROL ADMIN
    // ============================================
    for (const idPermiso of permisosIds) {
      // Verificar si ya está asignado
      const [existing] = await sequelize.query(
        `SELECT "IdDetalle" FROM "DetallePermisos" WHERE "IdRol" = :idRol AND "IdPermiso" = :idPermiso LIMIT 1`,
        { replacements: { idRol: idRolAdmin, idPermiso } }
      );

      if (existing.length === 0) {
        await sequelize.query(`
          INSERT INTO "DetallePermisos" ("IdRol", "IdPermiso")
          VALUES (:idRol, :idPermiso)
        `, {
          replacements: { idRol: idRolAdmin, idPermiso }
        });
        console.log(`✅ Permiso "${idPermiso}" asignado al rol Administrador`);
      }
    }

    // ============================================
    // 🔹 4. CREAR USUARIO ADMIN
    // ============================================
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || 'Administrador Principal';

    if (!email || !password) {
      throw new Error('⚠️ Faltan variables SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en .env');
    }

    const [existingUser] = await sequelize.query(
      `SELECT "IdUsuario" FROM "Usuarios" WHERE "Correo" = :email LIMIT 1`,
      { replacements: { email: email.toLowerCase() } }
    );

    if (existingUser.length > 0) {
      console.log('⚠️ El usuario admin ya existe');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await sequelize.query(`
        INSERT INTO "Usuarios" ("Nombre", "Correo", "Clave", "Estado", "IdRol")
        VALUES (:name, :email, :clave, :estado, :idRol)
      `, {
        replacements: {
          name,
          email: email.toLowerCase(),
          clave: hashedPassword,
          estado: true,  // Boolean, no string
          idRol: idRolAdmin
        }
      });
      console.log('✅ Usuario admin creado exitosamente');
    }

    console.log('\n🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Login: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Rol: Administrador (IdRol = ${idRolAdmin})`);
    console.log(`🔐 Permisos: ${permisosSistema.length} (TODOS)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

seedDatabase();