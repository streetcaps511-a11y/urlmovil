/**
 * ⏱️ CONFIGURACIÓN CENTRALIZADA DE TIEMPOS
 * 
 * IMPORTANTE: Estos valores DEBEN SER IDÉNTICOS a los de:
 * frontend/src/shared/config/timersConfig.js
 * 
 * El objetivo es mantener sincronizados:
 * 1. El tiempo de auto-cambio de status (Enviado → Entregado)
 * 2. El tiempo de expiración para solicitar devoluciones
 */

// ⏱️ TIEMPO DE AUTO-ENTREGA Y EXPIRACIÓN DE DEVOLUCIONES (en milisegundos)
// 2 minutos para pruebas (desarrollo)
// En producción: cambiar a 10 * 24 * 60 * 60 * 1000 (10 días)
const DELIVERY_TO_RETURN_EXPIRY_TIME_MS = 2 * 60 * 1000;

/**
 * GUÍA DE USO Y CAMBIO:
 * 
 * FLUJO DEL SISTEMA:
 * 1. Usuario recibe un pedido (Status = "Entregado")
 * 2. Pasado DELIVERY_TO_RETURN_EXPIRY_TIME_MS:
 *    - Backend: checkAutoDeliveries() marca automáticamente como entregado
 *    - Frontend: isReturnExpired() retorna true y desabilita botones
 * 
 * ⚠️ SINCRONIZACIÓN CRÍTICA:
 * - Backend: backend/src/controllers/ventas.controller.js línea ~24
 * - Frontend: frontend/src/shared/config/timersConfig.js
 * - Ambos DEBEN tener el MISMO valor
 * 
 * 📋 PASOS PARA CAMBIAR A PRODUCCIÓN (10 DÍAS):
 * 1. backend/src/config/timersConfig.js → 10 * 24 * 60 * 60 * 1000
 * 2. backend/src/controllers/ventas.controller.js línea ~24 → mismo valor
 * 3. frontend/src/shared/config/timersConfig.js → 10 * 24 * 60 * 60 * 1000
 * 4. Hacer push a ambos repositorios (frontend y backend)
 * 5. Redeploy en producción
 */

module.exports = {
  DELIVERY_TO_RETURN_EXPIRY_TIME_MS
};
