/* === CONTROLADOR DE BACKEND ===
Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente,
ejecuta las consultas a la base de datos protegiendo contra inyección SQL,
y devuelve las respuestas en formato JSON. */
// controllers/productos.controller.js
import { Op } from 'sequelize';
import Producto from '../models/productos.model.js';
import Categoria from '../models/categorias.model.js';
import { sequelize } from '../config/db.js';
import { validateProducto, sanitizeProducto } from '../utils/validationUtils.js';
import cloudinary from '../config/cloudinary.config.js';

const uploadBase64ToCloudinary = async (base64String, prefix = 'producto') => {
  if (!base64String || typeof base64String !== 'string') return null;
  if (base64String.startsWith('http')) return base64String;
  
  if (base64String.startsWith('data:image/')) {
    try {
      const result = await cloudinary.uploader.upload(base64String, {
        folder: 'productos',
        resource_type: 'auto',
        public_id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        overwrite: false,
        type: 'upload'
      });
      return result.secure_url;
    } catch (error) {
      console.error('❌ Error subiendo imagen de producto a Cloudinary:', error);
      return null;
    }
  }
  return null;
};

const productoController = {
  /**
   * Obtener todos los productos con filtros y paginación
   * @route GET /api/productos
   */
  getAllProductos: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        categoriaId,
        oferta,
        inventario,
        todos = false,
        id,
        compact = false
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};
      const isTodos = todos === 'true' || todos === true;

      if (id) {
        whereClause.id = id;
      }

      if (!isTodos) {
        if (search) {
          whereClause[Op.or] = [
            { nombre: { [Op.iLike]: `%${search}%` } },
            { descripcion: { [Op.iLike]: `%${search}%` } }
          ];
        }

        if (categoriaId) {
          whereClause.idCategoria = categoriaId;
        }

        if (oferta !== undefined) {
          whereClause.enOfertaVenta = oferta === 'true';
        }

        if (inventario !== undefined) {
          whereClause.enInventario = inventario === 'true';
        }
      }

      const queryOptions = {
        where: whereClause,
        include: [
          {
            model: Categoria,
            as: 'categoriaData',
            attributes: ['id', 'nombre', 'estado'],
            where: !isTodos ? { estado: { [Op.ne]: false } } : undefined,
            required: !isTodos
          }
        ],
        order: [['id', 'DESC']]
      };

      if (!isTodos) {
        queryOptions.limit = parseInt(limit);
        queryOptions.offset = parseInt(offset);
        whereClause.isActive = { [Op.ne]: false };
      }

      const { count, rows } = await Producto.findAndCountAll(queryOptions);

      // 🚀 MAPEO INTELIGENTE: Diferenciar entre LISTA (Lite) y ADMIN (Full)
      const mappedProducts = rows.map(p => {
        const pPlain = p.get({ plain: true });

        let currentStock = 0;
        if (Array.isArray(pPlain.tallasStock)) {
          currentStock = pPlain.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
        } else if (pPlain.stock) {
          currentStock = Number(pPlain.stock);
        }

        const isCompact = compact === 'true' || compact === true;
        if (isCompact) {
          const imgs = Array.isArray(pPlain.imagenes) ? pPlain.imagenes.filter(Boolean) : [];
          return {
            id: pPlain.id,
            nombre: pPlain.nombre,
            imagen: imgs[0] || 'https://placehold.co/800x800?text=Sin+Imagen'
          };
        }

        // 🚀 VISTA TIENDA: Solo campos esenciales (payload mínimo consistente)
        if (!isTodos) {
          const imgs = Array.isArray(pPlain.imagenes) ? pPlain.imagenes.filter(Boolean) : [];
          // Si es una petición con término de búsqueda, devolvemos solo id, nombre, categoría, precio, stock e imágenes
          if (search) {
            return {
              id: pPlain.id,
              nombre: pPlain.nombre,
              categoria: pPlain.categoriaData?.nombre || pPlain.categoria || 'General',
              precio: Number(pPlain.precioVenta) || 0,
              imagen: imgs[0] || 'https://placehold.co/800x800?text=Sin+Imagen',
              imagenes: imgs,
              stock: currentStock
            };
          }

          const minimalProduct = {
            id: pPlain.id,
            nombre: pPlain.nombre,
            categoria: pPlain.categoriaData?.nombre || pPlain.categoria || 'General',
            precio: Number(pPlain.precioVenta) || 0,
            imagen: imgs[0] || 'https://placehold.co/800x800?text=Sin+Imagen',
            imagenes: imgs,
            stock: currentStock,
            destacado: !!pPlain.destacado,
            sales: Number(pPlain.sales || 0),
            isActive: pPlain.isActive !== false
          };
          if (pPlain.enOfertaVenta) {
            minimalProduct.enOferta = true;
            minimalProduct.precioOferta = Number(pPlain.precioOferta);
          }
          return minimalProduct;
        }

        // VISTA FULL PARA EL ADMIN
        return {
          ...pPlain,
          id_producto: pPlain.id,
          talla: pPlain.talla || (pPlain.tallasStock?.[0]?.talla || ''),
          precio: pPlain.precioVenta,
          precioVenta: pPlain.precioVenta,
          precioCompra: pPlain.precioCompra,
          precio_venta: pPlain.precioVenta,
          precio_compra: pPlain.precioCompra,
          enOferta: pPlain.enOfertaVenta,
          stock: currentStock
        };
      });

      if (!isTodos && search) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(JSON.stringify(mappedProducts, null, 2));
      }

      const totalPages = Math.ceil(count / limit);

      const isCompact = compact === 'true' || compact === true;
      if (isCompact) {
        return res.status(200).json(mappedProducts);
      }

      res.status(200).json({
        success: true,
        status: 'success',
        data: {
          products: mappedProducts,
          count
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('❌ Error en getAllProductos:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Obtener productos por nombre de categoría
   */
  getProductosByCategoriaNombre: async (req, res) => {
    try {
      const { nombre } = req.params;
      const matchingCat = await Categoria.findOne({
        where: { nombre: { [Op.iLike]: nombre } },
        attributes: ['id']
      });

      const orConditions = [{ categoria: { [Op.iLike]: nombre } }];
      if (matchingCat) orConditions.push({ idCategoria: matchingCat.id });

      const rows = await Producto.findAll({
        where: { isActive: { [Op.ne]: false }, [Op.or]: orConditions },
        include: [{ model: Categoria, as: 'categoriaData', attributes: ['id', 'nombre', 'estado'] }],
        order: [['id', 'DESC']]
      });

      const products = rows.map(p => {
        const pPlain = p.get({ plain: true });
        let stock = pPlain.stock || 0;
        if (Array.isArray(pPlain.tallasStock)) {
          stock = pPlain.tallasStock.reduce((s, t) => s + (Number(t.cantidad) || 0), 0);
        }
        return {
          id: pPlain.id,
          nombre: pPlain.nombre,
          categoria: pPlain.categoriaData?.nombre || pPlain.categoria || 'General',
          descripcion: pPlain.descripcion || '',
          precio: pPlain.precioVenta,
          precioOferta: pPlain.enOfertaVenta ? pPlain.precioOferta : null,
          enOferta: pPlain.enOfertaVenta || false,
          precioMayorista6: pPlain.precioMayorista6 || 0,
          precioMayorista80: pPlain.precioMayorista80 || 0,
          stock,
          tallasStock: pPlain.tallasStock || [],
          colores: pPlain.colores || [],
          imagenes: Array.isArray(pPlain.imagenes) ? pPlain.imagenes.filter(Boolean) : [],
          destacado: false,
          salesCount: pPlain.sales || 0,
          isActive: true
        };
      });

      res.status(200).json({ success: true, data: { products, count: products.length } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Obtener un producto por ID
   */
  getProductoById: async (req, res) => {
    try {
      const { id } = req.params;
      const p = await Producto.findByPk(id, {
        include: [{ model: Categoria, as: 'categoriaData', attributes: ['id', 'nombre'] }]
      });

      if (!p) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      const pPlain = p.get({ plain: true });

      // 🚀 MAPEO ULTRA-MINIMALISTA
      const rawDetail = {
        id: pPlain.id,
        nombre: pPlain.nombre,
        descripcion: pPlain.descripcion || " ",
        categoria: pPlain.categoria || pPlain.categoriaData?.nombre,
        precio: Number(pPlain.precioVenta || 0),
        precioOferta: Number(pPlain.precioOferta || 0),
        enOferta: !!pPlain.enOfertaVenta,
        precioMayorista6: Number(pPlain.precioMayorista6 || 0),
        precioMayorista80: Number(pPlain.precioMayorista80 || 0),
        tallasStock: pPlain.tallasStock || [],
        colores: pPlain.colores || [],
        imagenes: pPlain.imagenes || [],
        destacado: false,
        salesCount: pPlain.sales || 0,
        isActive: true
      };

      // 🚀 FILTRO INTELIGENTE
      const isAdmin = req.query.todos === 'true' || req.query.admin === 'true';

      if (isAdmin) {
        return res.status(200).json({ success: true, data: rawDetail });
      }

      const cleanDetail = {};
      Object.keys(rawDetail).forEach(key => {
        const val = rawDetail[key];
        if (val !== false && val !== 0 && val !== " " && val !== null && val !== undefined) {
          if (Array.isArray(val) && val.length === 0) return;
          cleanDetail[key] = val;
        }
      });

      cleanDetail.id = rawDetail.id;
      cleanDetail.nombre = rawDetail.nombre;
      if (rawDetail.tallasStock) cleanDetail.tallasStock = rawDetail.tallasStock;

      res.status(200).json({
        success: true,
        data: cleanDetail
      });
    } catch (error) {
      console.error('❌ Error en getProductoById:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Crear un nuevo producto
   * @route POST /api/productos
   */
  createProducto: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      // 📸 SUBIR IMÁGENES A CLOUDINARY SI SON BASE64
      if (Array.isArray(req.body.imagenes)) {
        const uploadedImgs = [];
        for (const img of req.body.imagenes) {
          if (img) {
            const uploadedUrl = await uploadBase64ToCloudinary(img, 'producto');
            if (uploadedUrl) {
              uploadedImgs.push(uploadedUrl);
            }
          }
        }
        req.body.imagenes = uploadedImgs;
      }

      console.log('📥 req.body recibido:', JSON.stringify(req.body, null, 2));

      const validationErrors = await validateProducto(req.body);
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      const sanitizedData = sanitizeProducto(req.body);

      // 🚀 SINCRONIZACIÓN DE DATOS
      if (req.body.idCategoria) {
        sanitizedData.idCategoria = req.body.idCategoria;
        const catInfo = await Categoria.findByPk(req.body.idCategoria);
        if (catInfo) {
          sanitizedData.categoria = catInfo.nombre || catInfo.Nombre;
        }
      }

      if (req.body.enInventario !== undefined) sanitizedData.enInventario = req.body.enInventario;
      if (req.body.isActive !== undefined) sanitizedData.isActive = req.body.isActive;

      // 🚀 CALCULAR STOCK TOTAL DESDE TALLASSTOCK
      if (Array.isArray(req.body.tallasStock)) {
        const totalStock = req.body.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
        sanitizedData.stock = totalStock;
      }

      console.log('🧹 sanitizedData FINAL a insertar:', JSON.stringify(sanitizedData, null, 2));

      const nuevoProducto = await Producto.create(sanitizedData, { transaction });
      await transaction.commit();

      res.status(201).json({
        success: true,
        data: nuevoProducto,
        message: 'Producto registrado exitosamente'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en createProducto:', error.message);
      console.error('❌ Tipo de error:', error.constructor.name);
      if (error.original) {
        console.error('❌ Error original PostgreSQL:', {
          message: error.original.message,
          detail: error.original.detail,
          constraint: error.original.constraint,
          column: error.original.column,
          table: error.original.table,
          code: error.original.code,
        });
      }
      if (error.errors) {
        console.error('❌ Errores de validación Sequelize:', error.errors.map(e => ({ field: e.path, msg: e.message })));
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Actualizar un producto
   * @route PUT /api/productos/:id
   */
  updateProducto: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      // 📸 SUBIR IMÁGENES A CLOUDINARY SI SON BASE64
      if (Array.isArray(req.body.imagenes)) {
        const uploadedImgs = [];
        for (const img of req.body.imagenes) {
          if (img) {
            const uploadedUrl = await uploadBase64ToCloudinary(img, 'producto');
            if (uploadedUrl) {
              uploadedImgs.push(uploadedUrl);
            }
          }
        }
        req.body.imagenes = uploadedImgs;
      }

      const { id } = req.params;
      const producto = await Producto.findByPk(id);

      if (!producto) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      const validationErrors = await validateProducto(req.body, id);
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      const sanitizedData = sanitizeProducto(req.body);

      // 🚀 SINCRONIZACIÓN DE CATEGORÍA
      if (req.body.idCategoria) {
        sanitizedData.idCategoria = req.body.idCategoria;
        const catInfo = await Categoria.findByPk(req.body.idCategoria);
        if (catInfo) {
          sanitizedData.categoria = catInfo.nombre || catInfo.Nombre;
        }
      }

      if (req.body.enInventario !== undefined) sanitizedData.enInventario = req.body.enInventario;
      if (req.body.isActive !== undefined) sanitizedData.isActive = req.body.isActive;

      // 🚀 RECALCULAR STOCK TOTAL
      if (Array.isArray(req.body.tallasStock)) {
        const totalStock = req.body.tallasStock.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
        sanitizedData.stock = totalStock;
      }

      await producto.update(sanitizedData, { transaction });
      await transaction.commit();

      res.status(200).json({
        success: true,
        data: producto,
        message: 'Producto actualizado exitosamente'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en updateProducto:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Cambiar estado de oferta de un producto
   * @route PATCH /api/productos/:id/oferta
   */
  toggleOferta: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { enOfertaVenta, precioOferta, porcentajeDescuento } = req.body;

      const producto = await Producto.findByPk(id);
      if (!producto) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      const updateData = { enOfertaVenta };
      if (enOfertaVenta) {
        updateData.precioOferta = precioOferta;
        updateData.porcentajeDescuento = porcentajeDescuento;
      } else {
        updateData.precioOferta = 0;
        updateData.porcentajeDescuento = null;
      }

      await producto.update(updateData, { transaction });
      await transaction.commit();

      res.status(200).json({
        success: true,
        data: producto,
        message: enOfertaVenta ? 'Oferta activada' : 'Oferta desactivada'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en toggleOferta:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Eliminar un producto
   * @route DELETE /api/productos/:id
   */
  deleteProducto: async (req, res) => {
    const { id } = req.params;
    const transaction = await sequelize.transaction();

    try {
      const producto = await Producto.findByPk(id, { transaction });

      if (!producto) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      // 🚀 BORRADO TOTALMENTE LIBRE
      const tallasVacias = (producto.tallasStock || []).map(t => ({ ...t, cantidad: 0 }));

      await producto.update({
        stock: 0,
        tallasStock: tallasVacias,
        isActive: false,
        enInventario: false
      }, { transaction });

      await producto.destroy({ force: true, transaction });
      await transaction.commit();

      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente de la base de datos'
      });
    } catch (error) {
      if (transaction) await transaction.rollback();

      console.error('❌ Error detallado en deleteProducto:', error);

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Error de integridad: Este producto está siendo referenciado por otros registros.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno de base de datos al intentar eliminar el producto'
      });
    }
  }
};

export default productoController;