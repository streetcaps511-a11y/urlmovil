/* === CONTROLADOR DE BACKEND ===
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente,
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL,
   y devuelve las respuestas en formato JSON. */

// controllers/devoluciones.controller.js
import { Op } from "sequelize";
import {
  Devolucion,
  Producto,
  Venta,
  DetalleVenta,
  Cliente,
  Estado,
  sequelize,
} from "../models/index.js";
import cloudinary from "../config/cloudinary.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendReturnStatusEmail, sendReturnCreationEmail } from "../services/mail.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper para disminuir stock del producto de cambio
 */
const decreaseProductStock = async (devolucion, transaction) => {
  if (devolucion.pedidoCompleto) {
    console.log(`📉 Reduciendo stock para Devolución de Pedido Completo de la venta #${devolucion.idVenta}`);
    const detalles = await DetalleVenta.findAll({
      where: { idVenta: devolucion.idVenta },
      transaction,
    });
    for (const d of detalles) {
      const prod = await Producto.findByPk(d.idProducto, { transaction });
      if (prod) {
        const reduceQty = parseInt(d.cantidad) || 1;
        const targetTalla = d.talla ? d.talla.toString().trim().toUpperCase() : "U";
        let tallasData = Array.isArray(prod.tallasStock) ? [...prod.tallasStock] : [];
        let updated = false;
        tallasData = tallasData.map((t) => {
          const tName = t.talla || t.Nombre || t.nombre || "";
          const tCompare = String(tName).trim().toUpperCase();
          if (tCompare === targetTalla) {
            t.cantidad = Math.max(0, (parseInt(t.cantidad) || 0) - reduceQty);
            updated = true;
          }
          return t;
        });
        if (updated) {
          prod.tallasStock = tallasData;
          prod.changed("tallasStock", true);
          prod.stock = tallasData.reduce((acc, t) => acc + (parseInt(t.cantidad) || 0), 0);
          await prod.save({ transaction });
          console.log(`📉 Stock de ${prod.nombre} disminuido (talla ${targetTalla}) en ${reduceQty}`);
        }
      }
    }
    return true;
  }

  let targetId = devolucion.idProductoCambio;

  // Si no hay ID, intentar por nombre
  if (!targetId && devolucion.productoCambio) {
    const found = await Producto.findOne({
      where: { nombre: { [Op.iLike]: devolucion.productoCambio } },
      transaction,
    });
    if (found) targetId = found.id;
  }

  if (!targetId) {
    console.warn(
      `⚠️ No se pudo encontrar el ID del producto de cambio para la devolución #${devolucion.id}`,
    );
    return false;
  }

  const prodC = await Producto.findByPk(targetId, { transaction });
  if (!prodC) return false;

  const reduceQty = parseInt(devolucion.cantidad) || 1;
  const targetTalla = devolucion.talla
    ? devolucion.talla.toString().trim().toUpperCase()
    : "U";

  let tallasData = Array.isArray(prodC.tallasStock)
    ? [...prodC.tallasStock]
    : [];
  let updated = false;

  tallasData = tallasData.map((t) => {
    const tName = t.talla || t.Nombre || t.nombre || "";
    const tCompare = String(tName).trim().toUpperCase();
    if (tCompare === targetTalla) {
      t.cantidad = Math.max(0, (parseInt(t.cantidad) || 0) - reduceQty);
      updated = true;
    }
    return t;
  });

  if (updated) {
    prodC.tallasStock = tallasData;
    prodC.changed("tallasStock", true);
    prodC.stock = tallasData.reduce(
      (acc, t) => acc + (parseInt(t.cantidad) || 0),
      0,
    );
    await prodC.save({ transaction });
    console.log(
      `📉 Stock de ${prodC.nombre} disminuido (talla ${targetTalla})`,
    );
    return true;
  }

  console.warn(`⚠️ Talla ${targetTalla} no encontrada para ${prodC.nombre}`);
  return false;
};

/**
 * Helper para aumentar/restaurar stock del producto de cambio
 */
const restoreProductStock = async (devolucion, transaction) => {
  if (devolucion.pedidoCompleto) {
    console.log(`📈 Restaurando stock para Devolución de Pedido Completo de la venta #${devolucion.idVenta}`);
    const detalles = await DetalleVenta.findAll({
      where: { idVenta: devolucion.idVenta },
      transaction,
    });
    for (const d of detalles) {
      const prod = await Producto.findByPk(d.idProducto, { transaction });
      if (prod) {
        const addQty = parseInt(d.cantidad) || 1;
        const targetTalla = d.talla ? d.talla.toString().trim().toUpperCase() : "U";
        let tallasData = Array.isArray(prod.tallasStock) ? [...prod.tallasStock] : [];
        let updated = false;
        tallasData = tallasData.map((t) => {
          const tName = t.talla || t.Nombre || t.nombre || "";
          const tCompare = String(tName).trim().toUpperCase();
          if (tCompare === targetTalla) {
            t.cantidad = (parseInt(t.cantidad) || 0) + addQty;
            updated = true;
          }
          return t;
        });
        if (updated) {
          prod.tallasStock = tallasData;
          prod.changed("tallasStock", true);
          prod.stock = tallasData.reduce((acc, t) => acc + (parseInt(t.cantidad) || 0), 0);
          await prod.save({ transaction });
          console.log(`📈 Stock de ${prod.nombre} restaurado (talla ${targetTalla}) en ${addQty}`);
        }
      }
    }
    return true;
  }

  let targetId = devolucion.idProductoCambio;

  if (!targetId && devolucion.productoCambio) {
    const found = await Producto.findOne({
      where: { nombre: { [Op.iLike]: devolucion.productoCambio } },
      transaction,
    });
    if (found) targetId = found.id;
  }

  if (!targetId) return false;

  const prodC = await Producto.findByPk(targetId, { transaction });
  if (!prodC) return false;

  const addQty = parseInt(devolucion.cantidad) || 1;
  const targetTalla = devolucion.talla
    ? devolucion.talla.toString().trim().toUpperCase()
    : "U";

  let tallasData = Array.isArray(prodC.tallasStock)
    ? [...prodC.tallasStock]
    : [];
  let updated = false;

  tallasData = tallasData.map((t) => {
    const tName = t.talla || t.Nombre || t.nombre || "";
    const tCompare = String(tName).trim().toUpperCase();
    if (tCompare === targetTalla) {
      t.cantidad = (parseInt(t.cantidad) || 0) + addQty;
      updated = true;
    }
    return t;
  });

  if (updated) {
    prodC.tallasStock = tallasData;
    prodC.changed("tallasStock", true);
    prodC.stock = tallasData.reduce(
      (acc, t) => acc + (parseInt(t.cantidad) || 0),
      0,
    );
    await prodC.save({ transaction });
    console.log(
      `📈 Stock de ${prodC.nombre} restaurado (talla ${targetTalla})`,
    );
    return true;
  }

  return false;
};


const devolucionController = {
  getEstadisticas: async (req, res) => {
    try {
      const total = await Devolucion.count();
      res.json({ success: true, data: { total, pendientes: 0 } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllDevoluciones: async (req, res) => {
    try {
      const { page = 1, limit = 1000 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Devolucion.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["fecha", "DESC"]],
        include: [
          {
            model: Venta,
            as: "ventaOriginal",
            include: [
              {
                model: Cliente,
                as: "clienteData",
                attributes: ["id", "nombreCompleto", "numeroDocumento"],
              },
              {
                model: DetalleVenta,
                as: "detalles",
                include: [
                  {
                    model: Producto,
                    as: "producto",
                    attributes: ["id", "nombre", "imagenes"]
                  }
                ]
              }
            ],
          },
          {
            model: Producto,
            as: "productoInfo",
            attributes: ["id", "nombre"],
            required: false,
            paranoid: false,
          },
        ],
      });

      // Asignar noDevolucion = 1000 + id si no existe
      const rowsConNumero = rows.map(row => {
        const rowData = row.toJSON();
        if (!rowData.noDevolucion) {
          rowData.noDevolucion = 1000 + rowData.id;
        }
        return rowData;
      });

      res.json({
        success: true,
        data: rowsConNumero,
        pagination: {
          totalItems: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("❌ Error en getAllDevoluciones:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getDevolucionById: async (req, res) => {
    try {
      const data = await Devolucion.findByPk(req.params.id, {
        include: [
          { model: Producto, as: "productoInfo", paranoid: false },
          {
            model: Venta,
            as: "ventaOriginal",
            include: [
              {
                model: Cliente,
                as: "clienteData",
                attributes: ["id", "nombreCompleto", "numeroDocumento"],
              },
              {
                model: DetalleVenta,
                as: "detalles",
                include: [
                  {
                    model: Producto,
                    as: "producto",
                    attributes: ["id", "nombre", "imagenes"]
                  }
                ]
              }
            ],
          }
        ],
      });
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "No encontrada" });

      const dataJSON = data.toJSON();
      if (!dataJSON.noDevolucion) {
        dataJSON.noDevolucion = 1000 + dataJSON.id;
      }

      res.json({ success: true, data: dataJSON });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getDevolucionesByVenta: async (req, res) => {
    try {
      const data = await Devolucion.findAll({
        where: { idVenta: req.params.ventaId },
      });
      const dataWithNumbers = data.map(dev => {
        const devJSON = dev.toJSON();
        if (!devJSON.noDevolucion) {
          devJSON.noDevolucion = 1000 + devJSON.id;
        }
        return devJSON;
      });
      res.json({ success: true, data: dataWithNumbers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getDevolucionesByProducto: async (req, res) => {
    try {
      const data = await Devolucion.findAll({
        where: { idProducto: req.params.productoId },
      });
      const dataWithNumbers = data.map(dev => {
        const devJSON = dev.toJSON();
        if (!devJSON.noDevolucion) {
          devJSON.noDevolucion = 1000 + devJSON.id;
        }
        return devJSON;
      });
      res.json({ success: true, data: dataWithNumbers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createDevolucion: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      let {
        idCliente,
        idProductoOriginal,
        idProductoCambio,
        idVenta,
        cantidad,
        motivo,
        observacion,
        precioUnitario,
        talla,
        evidencia,
        evidencia2,
        mismoModelo,
        pedidoCompleto,
        idLote,
        items, // <--- Array de items para devolución múltiple
      } = req.body;

      // Logging detallado de entrada
      console.log("\n" + "=".repeat(60));
      console.log("[DEVOLUCION] Iniciando creacion de devolucion");
      console.log("=".repeat(60));
      console.log("[ENTRADA] IDs recibidos:");
      console.log(`  - idVenta: ${idVenta} (tipo: ${typeof idVenta})`);
      console.log(`  - cantidad: ${cantidad}`);
      console.log(`  - evidencia presente: ${!!evidencia}`);
      console.log(`  - tiene items array: ${!!items && Array.isArray(items)}`);

      const userRolId = Number(req.usuario?.idRol || req.usuario?.IdRol || 0);
      const rolName = String(
        req.rol?.nombre || req.rol?.Nombre || "",
      ).toLowerCase();
      const isAdmin = rolName.includes("admin") || userRolId === 1;

      // Si no viene idCliente, intentar obtenerlo del usuario autenticado
      if (!idCliente && req.usuario?.clienteData) {
        idCliente = req.usuario.clienteData.id;
      }

      // 🛠️ VALIDACIÓN DE ID DE VENTA
      const idVentaNum = Number(idVenta);
      if (!idVenta || isNaN(idVentaNum) || idVentaNum <= 0) {
        console.error(`❌ ERROR: idVenta inválido. Valor: ${idVenta}`);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `idVenta inválido. Se recibió: "${idVenta}" (tipo: ${typeof idVenta}). Debe ser un número > 0.`,
        });
      }

      const isPedidoCompleto = pedidoCompleto === true || pedidoCompleto === "true";

      // Validar que la evidencia fotográfica esté presente
      if (!evidencia) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "La evidencia fotográfica es obligatoria."
        });
      }

      // Construir la lista de items a procesar
      let itemsList = [];
      if (isPedidoCompleto) {
        itemsList = [{
          idProductoOriginal: null,
          idProductoCambio: null,
          mismoModelo: true,
          cantidad: parseInt(cantidad) || 1,
          precioUnitario: parseFloat(precioUnitario) || 0,
          talla: null
        }];
      } else if (items && Array.isArray(items) && items.length > 0) {
        itemsList = items.map(item => ({
          idProductoOriginal: item.idProductoOriginal,
          idProductoCambio: item.idProductoCambio,
          mismoModelo: item.mismoModelo === true || item.mismoModelo === "true",
          cantidad: parseInt(item.cantidad) || 1,
          precioUnitario: parseFloat(item.precioUnitario) || 0,
          talla: item.talla || null
        }));
      } else {
        itemsList = [{
          idProductoOriginal,
          idProductoCambio,
          mismoModelo: mismoModelo === true || mismoModelo === "true" || false,
          cantidad: parseInt(cantidad) || 1,
          precioUnitario: parseFloat(precioUnitario) || 0,
          talla: talla || null
        }];
      }

      // 🛠️ VALIDACIONES DE ID Y LÍMITES DE CANTIDAD
      if (isPedidoCompleto) {
        const existing = await Devolucion.findOne({
          where: {
            idVenta: idVentaNum,
            pedidoCompleto: true,
          },
          transaction,
        });
        if (existing) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Ya existe una solicitud de devolución completa para este pedido",
          });
        }
      } else {
        // Agrupar cantidades por producto original
        const requestedTally = {};
        for (const item of itemsList) {
          const origId = Number(item.idProductoOriginal);
          if (!item.idProductoOriginal || isNaN(origId) || origId <= 0) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `idProductoOriginal inválido. Se recibió: "${item.idProductoOriginal}". Debe ser un número > 0.`,
            });
          }
          requestedTally[origId] = (requestedTally[origId] || 0) + Number(item.cantidad || 1);
        }

        // Verificar el límite de cantidad comprada vs devuelta
        for (const [origIdStr, reqQty] of Object.entries(requestedTally)) {
          const origId = Number(origIdStr);
          const detail = await DetalleVenta.findOne({
            where: { idVenta: idVentaNum, idProducto: origId },
            transaction
          });
          if (!detail) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `El producto con ID ${origId} no pertenece al pedido PED-${1000 + idVentaNum}.`
            });
          }

          const purchasedQty = parseInt(detail.cantidad) || 0;

          // Obtener cantidad ya devuelta en solicitudes no rechazadas
          const existingReturns = await Devolucion.findAll({
            where: {
              idVenta: idVentaNum,
              idProducto: origId,
              idEstado: { [Op.notIn]: ["Rechazada", "Rechazado", "3"] }
            },
            transaction
          });
          const alreadyReturnedQty = existingReturns.reduce((sum, r) => sum + (parseInt(r.cantidad) || 0), 0);

          if (alreadyReturnedQty + reqQty > purchasedQty) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `No puedes solicitar el cambio de más unidades de las disponibles. Compradas: ${purchasedQty}, en cambio previo: ${alreadyReturnedQty}, solicitando ahora: ${reqQty}.`
            });
          }
        }
      }

      // 📸 MANEJO DE EVIDENCIA CON CLOUDINARY
      const saveEvidenceToCloudinary = async (base64, prefix) => {
        if (!base64) {
          console.log(`⚠️ ${prefix} está vacío o null, skipping...`);
          return null;
        }

        let base64String = String(base64).trim();
        if (typeof base64String !== "string" || base64String.length === 0) {
          console.warn(`⚠️ ${prefix} no es un string válido o está vacío`);
          return null;
        }

        if (!base64String.startsWith("data:image/")) {
          console.warn(
            `⚠️ ${prefix} no tiene el prefijo correcto. Prefijo encontrado: ${base64String.substring(0, 30)}`,
          );
          return null;
        }

        if (!base64String.includes(",")) {
          console.error(
            `❌ ${prefix} no tiene el formato correcto (falta coma separadora)`,
          );
          return null;
        }

        try {
          const result = await cloudinary.uploader.upload(base64String, {
            folder: "devoluciones",
            resource_type: "auto",
            public_id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            overwrite: false,
            type: "upload",
          });

          return result.secure_url;
        } catch (err) {
          console.error(`❌ Error subiendo ${prefix} a Cloudinary:`, err.message);
          return null;
        }
      };

      const evidenciaUrl = await saveEvidenceToCloudinary(evidencia, "evidencia");
      const evidencia2Url = await saveEvidenceToCloudinary(evidencia2, "evidencia2");

      const createdRecords = [];

      // Guardar cada registro
      for (const item of itemsList) {
        let extra = {
          idEstado: isAdmin ? "Completada" : "Pendiente",
          idProducto: isPedidoCompleto ? null : Number(item.idProductoOriginal),
          idProductoCambio: isPedidoCompleto ? null : (item.idProductoCambio ? Number(item.idProductoCambio) : null),
          idVenta: idVentaNum,
          cantidad: parseInt(item.cantidad) || 1,
          valor: parseFloat(item.precioUnitario) || 0,
          talla: isPedidoCompleto ? null : (item.talla || null),
          motivo: motivo || null,
          observacion: observacion || null,
          mismoModelo: item.mismoModelo,
          pedidoCompleto: isPedidoCompleto,
          noVenta: idVenta || null,
          idLote: idLote || null,
        };

        // Buscar info del cliente
        if (idCliente) {
          const cli = await Cliente.findByPk(idCliente, { transaction });
          if (cli) {
            extra.tipoDocumento = cli.tipoDocumento || "CC";
            extra.numeroDocumento = cli.numeroDocumento || cli.Documento || null;
            extra.nombreCliente = cli.nombreCompleto || cli.Nombre || null;
          }
        }

        if (isPedidoCompleto) {
          extra.productoOriginal = "Pedido Completo";
          extra.productoCambio = "Pedido Completo";
        } else {
          if (item.idProductoOriginal) {
            const prod = await Producto.findByPk(item.idProductoOriginal, { transaction });
            if (prod) {
              extra.productoOriginal = (prod.Nombre || prod.nombre || "").substring(0, 255);
              if (!item.precioUnitario) extra.valor = prod.Precio || prod.precio || 0;
            }
          }

          if (item.idProductoCambio) {
            const prodC = await Producto.findByPk(item.idProductoCambio, { transaction });
            if (prodC) {
              extra.productoCambio = (prodC.Nombre || prodC.nombre || "").substring(0, 255);
            }
          }
        }

        const nueva = await Devolucion.create(
          {
            ...extra,
            evidencia: evidenciaUrl || null,
            evidencia2: evidencia2Url || null,
          },
          { transaction }
        );

        nueva.noDevolucion = 1000 + nueva.id;
        await nueva.save({ transaction });

        // Si es Admin, descontar stock de cambio inmediatamente
        if (isAdmin && (nueva.idProductoCambio || nueva.productoCambio)) {
          await decreaseProductStock(nueva, transaction);
        }

        createdRecords.push(nueva);
      }

      await transaction.commit();

      // Enviar correo de notificación (de creación o aprobación inmediata si es admin)
      try {
        const firstRecord = createdRecords[0];
        if (firstRecord) {
          // Buscar email del cliente desde la venta original
          const ventaFull = await Venta.findByPk(firstRecord.idVenta, {
            include: [{ model: Cliente, as: 'clienteData' }]
          });
          const email = ventaFull?.clienteData?.email;
          if (email) {
            const clienteName = firstRecord.nombreCliente || ventaFull.clienteData?.nombreCompleto || 'Cliente';
            if (firstRecord.idEstado === 'Completada') {
              // Si es admin y se aprobó de inmediato
              sendReturnStatusEmail(email, clienteName, firstRecord.toJSON())
                .then(() => console.log(`📧 Notificación de devolución DEV-${firstRecord.noDevolucion || firstRecord.id} (Aprobación inmediata) enviada a ${email}`))
                .catch((err) => console.error("⚠️ Error enviando correo de devolución inmediata:", err.message));
            } else {
              // Si se creó y queda Pendiente
              sendReturnCreationEmail(email, clienteName, firstRecord.toJSON())
                .then(() => console.log(`📧 Correo de solicitud de devolución recibida DEV-${firstRecord.noDevolucion || firstRecord.id} enviado a ${email}`))
                .catch((err) => console.error("⚠️ Error enviando correo de creación de devolución:", err.message));
            }
          }
        }
      } catch (mailErr) {
        console.error("⚠️ Error intentando procesar envío de correos en createDevolucion:", mailErr.message);
      }

      res.status(201).json({ success: true, data: createdRecords[0], allCreated: createdRecords });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("❌ Error en createDevolucion:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateDevolucion: async (req, res) => {
    const { id } = req.params;
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const dev = await Devolucion.findByPk(id, {
        include: [
          {
            model: Venta,
            as: "ventaOriginal",
            include: [
              {
                model: Cliente,
                as: "clienteData",
              }
            ]
          }
        ],
        transaction
      });
      if (!dev) {
        if (transaction) await transaction.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Devolución no encontrada" });
      }

      let targetStatus = req.body.estado || req.body.Estado || "";
      if (typeof targetStatus === "object")
        targetStatus = targetStatus.nombre || targetStatus.Nombre || "";

      const rawStatus = String(targetStatus).toUpperCase();
      let newStatus = "Pendiente";
      if (rawStatus.includes("APROB") || rawStatus.includes("COMPLET"))
        newStatus = "Completada";
      else if (rawStatus.includes("RECHAZ")) newStatus = "Rechazada";

      if (newStatus === "Completada" && dev.idEstado !== "Completada") {
        await decreaseProductStock(dev, transaction);
      } else if (newStatus === "Rechazada" && dev.idEstado === "Completada") {
        await restoreProductStock(dev, transaction);
      }

      await dev.update(
        {
          idEstado: newStatus,
          observacion:
            req.body.motivoRechazo || req.body.observacion || dev.observacion,
        },
        { transaction },
      );

      await transaction.commit();

      // Enviar correo de notificación de manera segura
      const clienteName = dev.nombreCliente || dev.ventaOriginal?.clienteData?.nombreCompleto || 'Cliente';
      const email = dev.ventaOriginal?.clienteData?.email;
      if (email) {
        sendReturnStatusEmail(email, clienteName, dev.toJSON())
          .then(() => console.log(`📧 Notificación de devolución DEV-${dev.noDevolucion || dev.id} enviada a ${email}`))
          .catch((err) => console.error("⚠️ Error enviando correo de devolución:", err.message));
      }

      res.json({
        success: true,
        message: dev.noVenta
          ? "Solicitud actualizada correctamente"
          : "Actualizado correctamente",
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteDevolucion: async (req, res) => {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      const dev = await Devolucion.findByPk(req.params.id, { transaction });
      if (!dev) {
        if (transaction) await transaction.rollback();
        return res.status(404).json({ success: false, message: "Devolución no encontrada" });
      }

      // Si la devolución estaba completada, restaurar el stock del producto de cambio antes de borrar
      if (dev.idEstado === "Completada") {
        await restoreProductStock(dev, transaction);
      }

      await dev.destroy({ transaction });
      await transaction.commit();
      res.json({ success: true, message: "Eliminada" });
    } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(400).json({ success: false, message: error.message });
    }
  },

  toggleDevolucionStatus: async (req, res) => {
    try {
      const dev = await Devolucion.findByPk(req.params.id);
      if (dev) {
        await dev.update({ isActive: !dev.isActive });
        res.json({ success: true, message: "Estado cambiado" });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getMisDevoluciones: async (req, res) => {
    try {
      const cliente = await Cliente.findOne({
        where: { email: req.usuario.email },
      });
      if (!cliente)
        return res
          .status(404)
          .json({ success: false, message: "Cliente no encontrado" });

      const ventas = await Venta.findAll({
        where: { idCliente: cliente.id },
        attributes: ["id"],
      });
      const ventaIds = ventas.map((v) => v.id);

      if (ventaIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const data = await Devolucion.findAll({
        where: { idVenta: { [Op.in]: ventaIds } },
        include: [
          {
            model: Venta,
            as: "ventaOriginal",
            attributes: ["id"],
            include: [
              {
                model: DetalleVenta,
                as: "detalles",
                attributes: ["idProducto", "talla", "cantidad"],
              },
            ],
          },
          {
            model: Producto,
            as: "productoInfo",
            attributes: ["id", "nombre", "imagenes"],
            paranoid: false,
          },
        ],
        order: [["fecha", "DESC"]],
      });
      
      const dataWithNumbers = data.map(dev => {
        const devJSON = dev.toJSON();
        if (!devJSON.noDevolucion) {
          devJSON.noDevolucion = 1000 + devJSON.id;
        }
        return devJSON;
      });
      
      res.json({ success: true, data: dataWithNumbers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default devolucionController;
