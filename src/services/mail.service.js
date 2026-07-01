/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

// src/services/mail.service.js
import * as Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// 🚀 CONFIGURACIÓN DE BREVO
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'duvann1991@gmail.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Gorras Medellin';

/**
 * Enviar el correo de recuperación de contraseña
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del usuario para el saludo
 * @param {string} resetLink - El enlace único para cambiar la clave
 */
export const sendForgotPasswordEmail = async (email, nombre, resetLink) => {
  try {
    // Validar que Brevo esté configurado
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendForgotPasswordEmailNodmailer(email, nombre, resetLink);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Recuperar tu contraseña - Gorras Medellin 👒";
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    // 🎨 DISEÑO DEL CORREO (HTML Premium)
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">¡Hola, ${nombre}! 👋</h2>
        <p style="color: #666; font-size: 16px; text-align: center;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Gorras Medellin</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
            RESTABLECER CONTRASEÑA
          </a>
        </div>
        <p style="color: #999; font-size: 14px; text-align: center;">
          Este enlace expirará en 15 minutos por tu seguridad. Si no solicitaste este cambio, simplemente ignora este correo.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
        <p style="color: #ccc; font-size: 12px; text-align: center;">
          &copy; 2024 Gorras Medellin. Todos los derechos reservados.
        </p>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo:', brevoError.message);
    console.log('🔄 Intentando enviar con Gmail (fallback)...');
    return await sendForgotPasswordEmailNodmailer(email, nombre, resetLink);
  }
};

/**
 * Fallback: Enviar correo con Nodemailer (Gmail)
 */
const sendForgotPasswordEmailNodmailer = async (email, nombre, resetLink) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Recuperar tu contraseña - Gorras Medellin 👒",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">¡Hola, ${nombre}! 👋</h2>
          <p style="color: #666; font-size: 16px; text-align: center;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Gorras Medellin</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
              RESTABLECER CONTRASEÑA
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            Este enlace expirará en 15 minutos por tu seguridad. Si no solicitaste este cambio, simplemente ignora este correo.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
          <p style="color: #ccc; font-size: 12px; text-align: center;">
            &copy; 2024 Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado con éxito via Gmail (Nodmailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo via Gmail:', error.message);
    throw new Error('No se pudo enviar el correo de recuperación. Por favor, intenta más tarde.');
  }
};

/**
 * Enviar correo de PIN de verificación para registro
 * @param {string} email - Destinatario
 * @param {string} pin - Código de verificación de 6 dígitos
 */
export const sendPinEmail = async (email, pin) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #000000; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px;">GORRAS MEDELLÍN</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #333333; text-align: center; font-size: 24px; margin-bottom: 20px;">¡Verifica tu cuenta! 🧢</h2>
        <p style="color: #555555; font-size: 16px; text-align: center; line-height: 1.6; margin-bottom: 30px;">
          Gracias por querer unirte a la mejor tienda de gorras. Para completar tu registro y asegurar tu cuenta, por favor ingresa el siguiente código de verificación:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f4f4f4; color: #000000; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 32px; letter-spacing: 5px; border: 2px dashed #cccccc;">
            ${pin}
          </span>
        </div>
        <p style="color: #888888; font-size: 14px; text-align: center; margin-top: 30px;">
          Este código es válido por 15 minutos. Si no solicitaste este registro, puedes ignorar este mensaje.
        </p>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
          &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: '"Gorras Medellin" <' + process.env.SMTP_USER + '>',
    to: email,
    subject: 'Tu código de verificación - Gorras Medellin 🧢',
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Correo de PIN enviado con éxito a:', email);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de PIN vía Nodemailer:', error);
    throw new Error('No se pudo enviar el correo de verificación');
  }
};

/**
 * Enviar correo de estado de devolución (Aprobada o Rechazada)
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del cliente
 * @param {object} returnDetails - Datos de la devolución
 */
export const sendReturnStatusEmail = async (email, nombre, returnDetails) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendReturnStatusEmailNodemailer(email, nombre, returnDetails);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const devNum = returnDetails.noDevolucion || (1000 + returnDetails.id);
    const estado = returnDetails.idEstado === 'Completada' ? 'APROBADA' : 'RECHAZADA';

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Actualización de tu Devolución DEV-${devNum} (${estado}) - Gorras Medellín 🔄`;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Actualización de tu Devolución! 🔄</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${nombre}</strong>, tu solicitud de cambio/devolución con número <strong>DEV-${devNum}</strong> ha sido procesada.
          </p>
          
          ${returnDetails.idEstado === 'Completada' ? `
            <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: APROBADA ✅</span>
              <span style="color: #202124; font-size: 14px;">Tu solicitud ha sido aprobada con éxito. El cambio de producto ha sido registrado en nuestro sistema y está listo.</span>
            </div>
          ` : `
            <div style="background-color: #fce8e6; border-left: 6px solid #c5221f; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #c5221f; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: RECHAZADA ❌</span>
              <span style="color: #202124; font-size: 14px;">Tu solicitud de cambio ha sido rechazada por el administrador.</span>
              ${returnDetails.observacion ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Motivo:</strong> ${returnDetails.observacion}</p>` : ''}
            </div>
          `}
          
          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Solicitud:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Producto Original:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoOriginal || 'N/A'} ${returnDetails.talla ? `(Talla: ${returnDetails.talla})` : ''}</td>
            </tr>
            ${returnDetails.productoCambio ? `
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Producto de Cambio:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoCambio}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Cantidad:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.cantidad || 1}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Valor de Referencia:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(returnDetails.valor || 0).toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Motivo del Cliente:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333; font-style: italic;">"${returnDetails.motivo || 'No especificado'}"</td>
            </tr>
          </table>
          
          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
            Si tienes alguna duda sobre tu proceso de cambio, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo de devolución enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo en devolución:', brevoError.message);
    console.log('🔄 Intentando enviar devolución con Gmail (fallback)...');
    return await sendReturnStatusEmailNodemailer(email, nombre, returnDetails);
  }
};

/**
 * Fallback: Enviar correo de devolución con Nodemailer (Gmail)
 */
const sendReturnStatusEmailNodemailer = async (email, nombre, returnDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const devNum = returnDetails.noDevolucion || (1000 + returnDetails.id);
    const estado = returnDetails.idEstado === 'Completada' ? 'APROBADA' : 'RECHAZADA';

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Actualización de tu Devolución DEV-${devNum} (${estado}) - Gorras Medellín 🔄`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Actualización de tu Devolución! 🔄</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hola <strong>${nombre}</strong>, tu solicitud de cambio/devolución con número <strong>DEV-${devNum}</strong> ha sido procesada.
            </p>
            
            ${returnDetails.idEstado === 'Completada' ? `
              <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: APROBADA ✅</span>
                <span style="color: #202124; font-size: 14px;">Tu solicitud ha sido aprobada con éxito. El cambio de producto ha sido registrado en nuestro sistema y está listo.</span>
              </div>
            ` : `
              <div style="background-color: #fce8e6; border-left: 6px solid #c5221f; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #c5221f; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: RECHAZADA ❌</span>
                <span style="color: #202124; font-size: 14px;">Tu solicitud de cambio ha sido rechazada por el administrador.</span>
                ${returnDetails.observacion ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Motivo:</strong> ${returnDetails.observacion}</p>` : ''}
              </div>
            `}
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Solicitud:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Producto Original:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoOriginal || 'N/A'} ${returnDetails.talla ? `(Talla: ${returnDetails.talla})` : ''}</td>
              </tr>
              ${returnDetails.productoCambio ? `
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Producto de Cambio:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoCambio}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Cantidad:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.cantidad || 1}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Valor de Referencia:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(returnDetails.valor || 0).toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Motivo del Cliente:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-style: italic;">"${returnDetails.motivo || 'No especificado'}"</td>
              </tr>
            </table>
            
            <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
              Si tienes alguna duda sobre tu proceso de cambio, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de devolución enviado con éxito via Gmail (Nodemailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de devolución vía Gmail:', error.message);
    throw error;
  }
};

/**
 * Enviar correo de estado de pedido/venta (Aprobado, Rechazado o Anulado)
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del cliente
 * @param {object} saleDetails - Datos de la venta/pedido
 */
export const sendSaleStatusEmail = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendSaleStatusEmailNodemailer(email, nombre, saleDetails);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);
    const lowerStatus = String(saleDetails.idEstado || '').toLowerCase();
    let displayStatus = 'PENDIENTE';
    if (lowerStatus.includes('completad') || lowerStatus.includes('aproba')) displayStatus = 'APROBADO ✅';
    else if (lowerStatus.includes('rechaz')) displayStatus = 'RECHAZADO ❌';
    else if (lowerStatus.includes('anulad')) displayStatus = 'ANULADO ❌';
    else if (lowerStatus.includes('incomplet')) displayStatus = 'PAGO INCOMPLETO ⚠️';
    else displayStatus = String(saleDetails.idEstado || '').toUpperCase();

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Actualización de tu Pedido PED-${saleNum} (${displayStatus}) - Gorras Medellín 🧢`;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Actualización de tu Pedido! 🧢</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${nombre}</strong>, tu pedido con número <strong>PED-${saleNum}</strong> ha sido actualizado.
          </p>
          
          ${lowerStatus.includes('completad') || lowerStatus.includes('aproba') ? `
            <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PAGO COMPLETADO ✅</span>
              <span style="color: #202124; font-size: 14px;">
                ${Number(saleDetails.monto2) > 0 
                  ? '¡Tu pago total ha sido completado! Hemos recibido el pago restante con éxito. Tu pedido ya está en preparación para ser despachado.' 
                  : 'Hemos confirmado tu pago correctamente. Tu pedido ya está en preparación para ser despachado.'
                }
              </span>
            </div>
          ` : lowerStatus.includes('rechaz') || lowerStatus.includes('anulad') ? `
            <div style="background-color: #fce8e6; border-left: 6px solid #c5221f; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #c5221f; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PEDIDO RECHAZADO / CANCELADO ❌</span>
              <span style="color: #202124; font-size: 14px;">Tu pedido ha sido cancelado o rechazado por el administrador.</span>
              ${saleDetails.motivoRechazo ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Motivo del rechazo:</strong> ${saleDetails.motivoRechazo}</p>` : ''}
            </div>
          ` : lowerStatus.includes('incomplet') ? `
            <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PAGO INCOMPLETO ⚠️</span>
              <span style="color: #202124; font-size: 14px;">Hemos registrado un pago parcial para tu pedido. Para procesar y enviar tu compra, por favor completa el saldo total pendiente.</span>
              <div style="margin-top: 12px; font-size: 13px; color: #333; line-height: 1.5;">
                <p style="margin: 3px 0;"><strong>Total Pedido:</strong> $${Number(saleDetails.total || 0).toLocaleString('es-CO')}</p>
                <p style="margin: 3px 0;"><strong>Monto Recibido:</strong> $${Number(saleDetails.montoPagado || 0).toLocaleString('es-CO')}</p>
                <p style="margin: 3px 0; color: #b06000; font-weight: bold;"><strong>Saldo Pendiente:</strong> $${Number(Math.max(0, (saleDetails.total || 0) - (saleDetails.montoPagado || 0))).toLocaleString('es-CO')}</p>
              </div>
            </div>
          ` : `
            <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: ${String(saleDetails.idEstado || '').toUpperCase()} ⚠️</span>
              <span style="color: #202124; font-size: 14px;">Tu pedido tiene una nueva actualización: ${saleDetails.idEstado}.</span>
              ${saleDetails.motivoRechazo ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Nota:</strong> ${saleDetails.motivoRechazo}</p>` : ''}
            </div>
          `}
          
          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Entrega:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
            </tr>
            ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Dirección de Envío:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Método de Pago:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.metodoPago || 'N/A'}</td>
            </tr>
          </table>

          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 20px;">Resumen del Pedido:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
            <thead>
              <tr style="border-bottom: 1px solid #eeeeee; color: #666;">
                <th style="text-align: left; padding: 8px 0; font-weight: normal;">Producto</th>
                <th style="text-align: center; padding: 8px 0; font-weight: normal;">Cant.</th>
                <th style="text-align: right; padding: 8px 0; font-weight: normal;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(saleDetails.detalles || []).map(d => {
                const prodName = d.nombreProducto || d.producto?.nombre || 'Producto';
                const qty = d.cantidad || 1;
                const price = d.precio || 0;
                const subtotal = d.subtotal || (price * qty);
                return `
                  <tr style="border-bottom: 1px dashed #f0f0f0;">
                    <td style="padding: 10px 0; color: #333;">
                      ${prodName}
                      ${d.talla ? `<span style="font-size: 11px; color: #888; display: block;">Talla: ${d.talla}</span>` : ''}
                    </td>
                    <td style="padding: 10px 0; text-align: center; color: #555;">${qty}</td>
                    <td style="padding: 10px 0; text-align: right; color: #333;">$${Number(subtotal).toLocaleString('es-CO')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 0 0; font-weight: bold; font-size: 16px; color: #333;">Total del Pedido:</td>
                <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #000;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
            Si tienes alguna duda sobre tu compra, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo de venta enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo en venta:', brevoError.message);
    console.log('🔄 Intentando enviar venta con Gmail (fallback)...');
    return await sendSaleStatusEmailNodemailer(email, nombre, saleDetails);
  }
};

/**
 * Fallback: Enviar correo de venta con Nodemailer (Gmail)
 */
const sendSaleStatusEmailNodemailer = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);
    const lowerStatus = String(saleDetails.idEstado || '').toLowerCase();
    let displayStatus = 'PENDIENTE';
    if (lowerStatus.includes('completad') || lowerStatus.includes('aproba')) displayStatus = 'APROBADO ✅';
    else if (lowerStatus.includes('rechaz')) displayStatus = 'RECHAZADO ❌';
    else if (lowerStatus.includes('anulad')) displayStatus = 'ANULADO ❌';
    else if (lowerStatus.includes('incomplet')) displayStatus = 'PAGO INCOMPLETO ⚠️';
    else displayStatus = String(saleDetails.idEstado || '').toUpperCase();

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Actualización de tu Pedido PED-${saleNum} (${displayStatus}) - Gorras Medellín 🧢`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Actualización de tu Pedido! 🧢</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hola <strong>${nombre}</strong>, tu pedido con número <strong>PED-${saleNum}</strong> ha sido actualizado.
            </p>
            
            ${lowerStatus.includes('completad') || lowerStatus.includes('aproba') ? `
              <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PAGO COMPLETADO ✅</span>
                <span style="color: #202124; font-size: 14px;">
                  ${Number(saleDetails.monto2) > 0 
                    ? '¡Tu pago total ha sido completado! Hemos recibido el pago restante con éxito. Tu pedido ya está en preparación para ser despachado.' 
                    : 'Hemos confirmado tu pago correctamente. Tu pedido ya está en preparación para ser despachado.'
                  }
                </span>
              </div>
            ` : lowerStatus.includes('rechaz') || lowerStatus.includes('anulad') ? `
              <div style="background-color: #fce8e6; border-left: 6px solid #c5221f; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #c5221f; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PEDIDO RECHAZADO / CANCELADO ❌</span>
                <span style="color: #202124; font-size: 14px;">Tu pedido ha sido cancelado o rechazado por el administrador.</span>
                ${saleDetails.motivoRechazo ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Motivo del rechazo:</strong> ${saleDetails.motivoRechazo}</p>` : ''}
              </div>
            ` : lowerStatus.includes('incomplet') ? `
              <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PAGO INCOMPLETO ⚠️</span>
                <span style="color: #202124; font-size: 14px;">Hemos registrado un pago parcial para tu pedido. Para procesar y enviar tu compra, por favor completa el saldo total pendiente.</span>
                <div style="margin-top: 12px; font-size: 13px; color: #333; line-height: 1.5;">
                  <p style="margin: 3px 0;"><strong>Total Pedido:</strong> $${Number(saleDetails.total || 0).toLocaleString('es-CO')}</p>
                  <p style="margin: 3px 0;"><strong>Monto Recibido:</strong> $${Number(saleDetails.montoPagado || 0).toLocaleString('es-CO')}</p>
                  <p style="margin: 3px 0; color: #b06000; font-weight: bold;"><strong>Saldo Pendiente:</strong> $${Number(Math.max(0, (saleDetails.total || 0) - (saleDetails.montoPagado || 0))).toLocaleString('es-CO')}</p>
                </div>
              </div>
            ` : `
              <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: ${String(saleDetails.idEstado || '').toUpperCase()} ⚠️</span>
                <span style="color: #202124; font-size: 14px;">Tu pedido tiene una nueva actualización: ${saleDetails.idEstado}.</span>
                ${saleDetails.motivoRechazo ? `<p style="margin: 10px 0 0; font-size: 14px; color: #5f6368;"><strong>Nota:</strong> ${saleDetails.motivoRechazo}</p>` : ''}
              </div>
            `}
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Entrega:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
              </tr>
              ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Dirección de Envío:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Método de Pago:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.metodoPago || 'N/A'}</td>
              </tr>
            </table>

            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 20px;">Resumen del Pedido:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #eeeeee; color: #666;">
                  <th style="text-align: left; padding: 8px 0; font-weight: normal;">Producto</th>
                  <th style="text-align: center; padding: 8px 0; font-weight: normal;">Cant.</th>
                  <th style="text-align: right; padding: 8px 0; font-weight: normal;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(saleDetails.detalles || []).map(d => {
                  const prodName = d.nombreProducto || d.producto?.nombre || 'Producto';
                  const qty = d.cantidad || 1;
                  const price = d.precio || 0;
                  const subtotal = d.subtotal || (price * qty);
                  return `
                    <tr style="border-bottom: 1px dashed #f0f0f0;">
                      <td style="padding: 10px 0; color: #333;">
                        ${prodName}
                        ${d.talla ? `<span style="font-size: 11px; color: #888; display: block;">Talla: ${d.talla}</span>` : ''}
                      </td>
                      <td style="padding: 10px 0; text-align: center; color: #555;">${qty}</td>
                      <td style="padding: 10px 0; text-align: right; color: #333;">$${Number(subtotal).toLocaleString('es-CO')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 15px 0 0; font-weight: bold; font-size: 16px; color: #333;">Total del Pedido:</td>
                  <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #000;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
                </tr>
              </tfoot>
            </table>
            
            <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
              Si tienes alguna duda sobre tu compra, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de venta enviado con éxito via Gmail (Nodemailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de venta vía Gmail:', error.message);
    throw error;
  }
};

/**
 * Enviar correo de pedido enviado (Shipping status is Enviado)
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del cliente
 * @param {object} saleDetails - Datos de la venta/pedido
 */
export const sendSaleShippingEmail = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendSaleShippingEmailNodemailer(email, nombre, saleDetails);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `¡Tu pedido PED-${saleNum} ha sido enviado! 🚚 - Gorras Medellín`;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Tu pedido está en camino! 🚚</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${nombre}</strong>, excelentes noticias: tu pedido con número <strong>PED-${saleNum}</strong> ya ha sido enviado y se encuentra en tránsito.
          </p>
          
          <div style="background-color: #e8f0fe; border-left: 6px solid #1a73e8; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <span style="color: #1a73e8; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PEDIDO ENVIADO 🚚</span>
            <span style="color: #202124; font-size: 14px;">Hemos despachado tu paquete. Muy pronto llegará a su destino.</span>
          </div>
          
          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles del Envío:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
            </tr>
            ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Dirección de Envío:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Método de Pago:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.metodoPago || 'N/A'}</td>
            </tr>
          </table>

          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 20px;">Resumen del Pedido:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
            <thead>
              <tr style="border-bottom: 1px solid #eeeeee; color: #666;">
                <th style="text-align: left; padding: 8px 0; font-weight: normal;">Producto</th>
                <th style="text-align: center; padding: 8px 0; font-weight: normal;">Cant.</th>
                <th style="text-align: right; padding: 8px 0; font-weight: normal;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(saleDetails.detalles || []).map(d => {
                const prodName = d.nombreProducto || d.producto?.nombre || 'Producto';
                const qty = d.cantidad || 1;
                const price = d.precio || 0;
                const subtotal = d.subtotal || (price * qty);
                return `
                  <tr style="border-bottom: 1px dashed #f0f0f0;">
                    <td style="padding: 10px 0; color: #333;">
                      ${prodName}
                      ${d.talla ? `<span style="font-size: 11px; color: #888; display: block;">Talla: ${d.talla}</span>` : ''}
                    </td>
                    <td style="padding: 10px 0; text-align: center; color: #555;">${qty}</td>
                    <td style="padding: 10px 0; text-align: right; color: #333;">$${Number(subtotal).toLocaleString('es-CO')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 0 0; font-weight: bold; font-size: 16px; color: #333;">Total del Pedido:</td>
                <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #000;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
            Si tienes alguna duda sobre tu envío, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo de envío enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo en correo de envío:', brevoError.message);
    console.log('🔄 Intentando enviar correo de envío con Gmail (fallback)...');
    return await sendSaleShippingEmailNodemailer(email, nombre, saleDetails);
  }
};

/**
 * Fallback: Enviar correo de envío con Nodemailer (Gmail)
 */
const sendSaleShippingEmailNodemailer = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `¡Tu pedido PED-${saleNum} ha sido enviado! 🚚 - Gorras Medellín`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Tu pedido está en camino! 🚚</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hola <strong>${nombre}</strong>, excelentes noticias: tu pedido con número <strong>PED-${saleNum}</strong> ya ha sido enviado y se encuentra en tránsito.
            </p>
            
            <div style="background-color: #e8f0fe; border-left: 6px solid #1a73e8; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #1a73e8; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">PEDIDO ENVIADO 🚚</span>
              <span style="color: #202124; font-size: 14px;">Hemos despachado tu paquete. Muy pronto llegará a su destino.</span>
            </div>
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles del Envío:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
              </tr>
              ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Dirección de Envío:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Método de Pago:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.metodoPago || 'N/A'}</td>
              </tr>
            </table>

            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 20px;">Resumen del Pedido:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #eeeeee; color: #666;">
                  <th style="text-align: left; padding: 8px 0; font-weight: normal;">Producto</th>
                  <th style="text-align: center; padding: 8px 0; font-weight: normal;">Cant.</th>
                  <th style="text-align: right; padding: 8px 0; font-weight: normal;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(saleDetails.detalles || []).map(d => {
                  const prodName = d.nombreProducto || d.producto?.nombre || 'Producto';
                  const qty = d.cantidad || 1;
                  const price = d.precio || 0;
                  const subtotal = d.subtotal || (price * qty);
                  return `
                    <tr style="border-bottom: 1px dashed #f0f0f0;">
                      <td style="padding: 10px 0; color: #333;">
                        ${prodName}
                        ${d.talla ? `<span style="font-size: 11px; color: #888; display: block;">Talla: ${d.talla}</span>` : ''}
                      </td>
                      <td style="padding: 10px 0; text-align: center; color: #555;">${qty}</td>
                      <td style="padding: 10px 0; text-align: right; color: #333;">$${Number(subtotal).toLocaleString('es-CO')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 15px 0 0; font-weight: bold; font-size: 16px; color: #333;">Total del Pedido:</td>
                  <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #000;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
                </tr>
              </tfoot>
            </table>
            
            <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
              Si tienes alguna duda sobre tu envío, puedes contactarnos respondiendo a este correo o por WhatsApp al +57 300 6158180.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de envío enviado con éxito via Gmail (Nodemailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de envío vía Gmail:', error.message);
    throw error;
  }
};

/**
 * Enviar correo de pedido entregado (Shipping status is Entregado)
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del cliente
 * @param {object} saleDetails - Datos de la venta/pedido
 */
export const sendSaleDeliveryEmail = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendSaleDeliveryEmailNodemailer(email, nombre, saleDetails);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `¡Tu pedido PED-${saleNum} ha sido entregado! 🎉 - Gorras Medellín`;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Pedido Entregado! 🎉</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${nombre}</strong>, confirmamos que tu pedido con número <strong>PED-${saleNum}</strong> ha sido marcado como entregado con éxito. ¡Esperamos que disfrutes de tu compra!
          </p>
          
          <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ENTREGA CONFIRMADA 📦</span>
            <span style="color: #202124; font-size: 14px;">El paquete ha sido entregado correctamente en la dirección registrada.</span>
          </div>
          
          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Resumen del Envío:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
            </tr>
            ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Dirección de Entrega:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Total Pagado:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
            </tr>
          </table>

          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
            Si tienes algún comentario, queja o necesitas realizar un cambio o devolución, puedes comunicarte con nosotros respondiendo a este correo o por WhatsApp al +57 300 6158180.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo de entrega enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo en correo de entrega:', brevoError.message);
    console.log('🔄 Intentando enviar correo de entrega con Gmail (fallback)...');
    return await sendSaleDeliveryEmailNodemailer(email, nombre, saleDetails);
  }
};

/**
 * Fallback: Enviar correo de pedido entregado con Nodemailer (Gmail)
 */
const sendSaleDeliveryEmailNodemailer = async (email, nombre, saleDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const saleNum = saleDetails.noVenta || (1000 + saleDetails.id);

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `¡Tu pedido PED-${saleNum} ha sido entregado! 🎉 - Gorras Medellín`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Pedido Entregado! 🎉</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hola <strong>${nombre}</strong>, confirmamos que tu pedido con número <strong>PED-${saleNum}</strong> ha sido marcado como entregado con éxito. ¡Esperamos que disfrutes de tu compra!
            </p>
            
            <div style="background-color: #e6f4ea; border-left: 6px solid #137333; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #137333; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ENTREGA CONFIRMADA 📦</span>
              <span style="color: #202124; font-size: 14px;">El paquete ha sido entregado correctamente en la dirección registrada.</span>
            </div>
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Resumen del Envío:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Tipo de Entrega:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.tipoEntrega === 'recoger' ? '🏪 Recogida en local' : '🚚 Envío a domicilio'}</td>
              </tr>
              ${saleDetails.tipoEntrega !== 'recoger' && saleDetails.direccionEnvio ? `
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Dirección de Entrega:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${saleDetails.direccionEnvio}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Total Pagado:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(saleDetails.total || 0).toLocaleString('es-CO')}</td>
              </tr>
            </table>

            <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
              Si tienes algún comentario, queja o necesitas realizar un cambio o devolución, puedes comunicarte con nosotros respondiendo a este correo o por WhatsApp al +57 300 6158180.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de entrega enviado con éxito via Gmail (Nodemailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de entrega vía Gmail:', error.message);
    throw error;
  }
};

/**
 * Enviar correo de confirmación de solicitud de devolución recibida
 * @param {string} email - Destinatario
 * @param {string} nombre - Nombre del cliente
 * @param {object} returnDetails - Datos de la devolución
 */
export const sendReturnCreationEmail = async (email, nombre, returnDetails) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ [BREVO] API KEY no configurada, usando fallback con Gmail');
      return await sendReturnCreationEmailNodemailer(email, nombre, returnDetails);
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const devNum = returnDetails.noDevolucion || (1000 + returnDetails.id);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Hemos recibido tu solicitud de devolución DEV-${devNum} 🔄 - Gorras Medellín`;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email, "name": nombre }];
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Solicitud de Cambio/Devolución Recibida! 🔄</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hola <strong>${nombre}</strong>, confirmamos que hemos recibido tu solicitud de cambio o devolución bajo el número de radicado <strong>DEV-${devNum}</strong>.
          </p>
          
          <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: EN REVISIÓN ⌛</span>
            <span style="color: #202124; font-size: 14px;">Nuestro equipo revisará los detalles y las evidencias enviadas. Te notificaremos una vez sea aprobada o rechazada.</span>
          </div>
          
          <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Solicitud:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Producto Original:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoOriginal || 'N/A'} ${returnDetails.talla ? `(Talla: ${returnDetails.talla})` : ''}</td>
            </tr>
            ${returnDetails.productoCambio ? `
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Producto de Cambio solicitado:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoCambio}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Cantidad:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.cantidad || 1}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Valor de Referencia:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(returnDetails.valor || 0).toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Motivo:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #333; font-style: italic;">"${returnDetails.motivo || 'No especificado'}"</td>
            </tr>
          </table>
          
          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
            Si necesitas agregar más detalles, por favor contáctanos por WhatsApp al +57 300 6158180 indicando tu número de devolución DEV-${devNum}.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo de solicitud de devolución enviado con éxito via Brevo:', data.messageId || 'OK');
    return true;
  } catch (brevoError) {
    console.error('⚠️ Error con Brevo en solicitud de devolución:', brevoError.message);
    console.log('🔄 Intentando enviar correo de solicitud de devolución con Gmail (fallback)...');
    return await sendReturnCreationEmailNodemailer(email, nombre, returnDetails);
  }
};

/**
 * Fallback: Enviar correo de solicitud de devolución con Nodemailer (Gmail)
 */
const sendReturnCreationEmailNodemailer = async (email, nombre, returnDetails) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP no está configurado (faltan variables de entorno SMTP_USER y SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const devNum = returnDetails.noDevolucion || (1000 + returnDetails.id);

    const mailOptions = {
      from: `"${SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Hemos recibido tu solicitud de devolución DEV-${devNum} 🔄 - Gorras Medellín`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">GORRAS MEDELLÍN</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; font-size: 22px; margin-bottom: 20px;">¡Solicitud de Cambio/Devolución Recibida! 🔄</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Hola <strong>${nombre}</strong>, confirmamos que hemos recibido tu solicitud de cambio o devolución bajo el número de radicado <strong>DEV-${devNum}</strong>.
            </p>
            
            <div style="background-color: #fff4e5; border-left: 6px solid #b06000; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
              <span style="color: #b06000; font-weight: bold; font-size: 16px; display: block; margin-bottom: 5px;">ESTADO: EN REVISIÓN ⌛</span>
              <span style="color: #202124; font-size: 14px;">Nuestro equipo revisará los detalles y las evidencias enviadas. Te notificaremos una vez sea aprobada o rechazada.</span>
            </div>
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; margin-top: 30px;">Detalles de la Solicitud:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Producto Original:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoOriginal || 'N/A'} ${returnDetails.talla ? `(Talla: ${returnDetails.talla})` : ''}</td>
              </tr>
              ${returnDetails.productoCambio ? `
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Producto de Cambio solicitado:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.productoCambio}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Cantidad:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333;">${returnDetails.cantidad || 1}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Valor de Referencia:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-weight: bold;">$${Number(returnDetails.valor || 0).toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;"><strong>Motivo:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-style: italic;">"${returnDetails.motivo || 'No especificado'}"</td>
              </tr>
            </table>
            
            <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 35px; line-height: 1.5;">
              Si tienes algún comentario, queja o necesitas realizar un cambio o devolución, puedes comunicarte con nosotros respondiendo a este correo o por WhatsApp al +57 300 6158180.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Gorras Medellin. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de solicitud de devolución enviado con éxito via Gmail (Nodemailer):', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de solicitud de devolución vía Gmail:', error.message);
    throw error;
  }
};


