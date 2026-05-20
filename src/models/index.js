// src/models/index.js
import { sequelize } from '../config/db.js';

// 🔹 Importar modelos
import Usuario from './usuarios.model.js';
import Rol from './roles.model.js';
import Categoria from './categorias.model.js';
import Producto from './productos.model.js';
import Talla from './tallas.model.js';
import Proveedor from './proveedores.model.js';
import Cliente from './clientes.model.js';
import Compra from './compras.model.js';
import DetalleCompra from './detalleCompras.model.js';
import Venta from './ventas.model.js';
import DetalleVenta from './detalleVentas.model.js';
import Devolucion from './devoluciones.model.js';
import Permiso from './permisos.model.js';
import DetallePermiso from './detallePermisos.model.js';
import Estado from './estado.model.js';
import Imagen from './imagenes.model.js';
import Color from './colores.model.js';

// ============================================
// ✅ ASOCIACIONES (STANDARDIZED TO CAMELCASE)
// ============================================

// Producto ↔ Categoría
Producto.belongsTo(Categoria, { foreignKey: 'idCategoria', as: 'categoriaData' });
Categoria.hasMany(Producto, { foreignKey: 'idCategoria', as: 'productos' });

// Producto ↔ Talla (REMOVIDO: Ahora es un array simple en Producto)
// Producto ↔ Imagen

Producto.hasMany(Imagen, { foreignKey: 'idProducto', as: 'imagenesAsociadas', onDelete: 'CASCADE' });
Imagen.belongsTo(Producto, { foreignKey: 'idProducto', as: 'producto' });

// ──────────────────────────────────────────────────────────
// ✅ Usuario ↔ Rol / Cliente
// ──────────────────────────────────────────────────────────
Usuario.belongsTo(Rol, { foreignKey: 'idRol', as: 'rolData' });
Rol.hasMany(Usuario, { foreignKey: 'idRol', as: 'usuarios' });

// Vincular Usuario con Cliente por email (nuestro enlace actual)
Usuario.hasOne(Cliente, { foreignKey: 'email', sourceKey: 'email', as: 'clienteData' });
Cliente.belongsTo(Usuario, { foreignKey: 'email', targetKey: 'email', as: 'usuarioData' });

// ──────────────────────────────────────────────────────────
// ✅ Rol ↔ Permiso (Many-to-Many)
// ──────────────────────────────────────────────────────────
Rol.belongsToMany(Permiso, { 
    through: DetallePermiso, 
    foreignKey: 'idRol', 
    otherKey: 'idPermiso', 
    as: 'listaPermisos' 
});
Permiso.belongsToMany(Rol, { 
    through: DetallePermiso, 
    foreignKey: 'idPermiso', 
    otherKey: 'idRol', 
    as: 'roles' 
});
DetallePermiso.belongsTo(Rol, { foreignKey: 'idRol', as: 'rol' });
DetallePermiso.belongsTo(Permiso, { foreignKey: 'idPermiso', as: 'permisoData' });

// ──────────────────────────────────────────────────────────
// ✅ Compra ↔ Proveedor / DetalleCompra
// ──────────────────────────────────────────────────────────
Compra.belongsTo(Proveedor, { foreignKey: 'idProveedor', as: 'proveedorData' });
Proveedor.hasMany(Compra, { foreignKey: 'idProveedor', as: 'compras' });

Compra.hasMany(DetalleCompra, { foreignKey: 'idCompra', as: 'detalles', onDelete: 'CASCADE' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'idCompra', as: 'compra' });

// DetalleCompra ↔ Producto / Talla
DetalleCompra.belongsTo(Producto, { foreignKey: 'idProducto', as: 'producto' });

// ──────────────────────────────────────────────────────────
// ✅ Venta ↔ Cliente / Estado / DetalleVenta
// ──────────────────────────────────────────────────────────
Venta.belongsTo(Cliente, { foreignKey: 'idCliente', as: 'clienteData' });
Cliente.hasMany(Venta, { foreignKey: 'idCliente', as: 'ventas' });

// Venta ya no usa FK a Estado — IdEstado ahora es un STRING con el nombre del estado
// Venta.belongsTo(Estado, { foreignKey: 'idEstado', as: 'estadoVenta' });
// Estado.hasMany(Venta, { foreignKey: 'idEstado', as: 'ventas' });

Venta.hasMany(DetalleVenta, { foreignKey: 'idVenta', as: 'detalles', onDelete: 'CASCADE' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'idVenta', as: 'venta' });

// DetalleVenta ↔ Producto / Talla
DetalleVenta.belongsTo(Producto, { foreignKey: 'idProducto', as: 'producto' });

// ──────────────────────────────────────────────────────────
// ✅ Devoluciones
// ──────────────────────────────────────────────────────────
Devolucion.belongsTo(Producto, { foreignKey: 'idProducto', as: 'productoInfo' });
Devolucion.belongsTo(Venta, { foreignKey: 'idVenta', as: 'ventaOriginal' });
Devolucion.belongsTo(Estado, { foreignKey: 'idEstado', as: 'estadoDevolucion' });

// ============================================
// ✅ EXPORTAR
// ============================================
export {
    sequelize,
    Usuario, Rol, Categoria, Producto, Talla, Proveedor, Cliente,
    Compra, DetalleCompra, Venta, DetalleVenta, Devolucion,
    Permiso, DetallePermiso, Estado, Imagen, Color
};

export default {
    sequelize,
    Usuario, Rol, Categoria, Producto, Talla, Proveedor, Cliente,
    Compra, DetalleCompra, Venta, DetalleVenta, Devolucion,
    Permiso, DetallePermiso, Estado, Imagen, Color
};