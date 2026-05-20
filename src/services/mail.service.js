/* === SERVICIO API === 
   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. 
   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */

// src/services/mail.service.js
import * as Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';

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

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Correo enviado con éxito via Brevo:', data.body);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo vía Brevo:', error);
    throw new Error('No se pudo enviar el correo de recuperación');
  }
};
