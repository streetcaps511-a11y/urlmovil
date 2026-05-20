const fs = require('fs');
const path = require('path');

// Comentarios a insertar segun la ruta o archivo
const COMMENT_RULES = [
  {
    pattern: /hooks[\\\/].*\.jsx?$/,
    comment: "/* === HOOK DE LÓGICA === \n   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. \n   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. \n   Recibe eventos de la UI y se comunica con los Servicios API. */\n"
  },
  {
    pattern: /services[\\\/].*\.jsx?$/,
    comment: "/* === SERVICIO API === \n   Este archivo se encarga exclusivamente de la comunicación HTTP (GET, POST, PUT, DELETE) con el Backend. \n   Toma los datos del Hook y realiza peticiones usando fetch o axios, y maneja posibles errores de red. */\n"
  },
  {
    pattern: /controllers[\\\/].*\.jsx?$/,
    comment: "/* === CONTROLADOR DE BACKEND === \n   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, \n   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, \n   y devuelve las respuestas en formato JSON. */\n"
  },
  {
    pattern: /routes[\\\/].*\.jsx?$/,
    comment: "/* === RUTAS DE BACKEND === \n   Define las URLs expuestas de la API para este módulo. \n   Aplica los middlewares de protección (como la validación de tokens JWT) antes de ceder el control al Controlador. */\n"
  },
  {
    pattern: /pages[\\\/].*\.jsx?$/,
    comment: "/* === PÁGINA PRINCIPAL === \n   Este componente es la interfaz visual principal de la ruta. \n   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */\n"
  },
  {
    pattern: /components[\\\/].*\.jsx?$/,
    comment: "/* === COMPONENTE REUTILIZABLE === \n   Pieza modular de interfaz (como Tarjetas, Modales o Botones). \n   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */\n"
  }
];

function addCommentsRecursively(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addCommentsRecursively(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      // Find matching rule
      let matchedRule = null;
      for (const rule of COMMENT_RULES) {
        if (rule.pattern.test(fullPath)) {
          matchedRule = rule;
          break;
        }
      }

      if (matchedRule) {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Evitar doble comentario
        if (!content.includes(matchedRule.comment.trim().split('\n')[0])) {
          fs.writeFileSync(fullPath, matchedRule.comment + "\n" + content, 'utf8');
          console.log(`Comentado: ${fullPath}`);
        }
      }
    }
  }
}

// Ejecutar para frontend y backend
const directories = [
  path.join(__dirname, 'frontend', 'src'),
  path.join(__dirname, 'backend', 'src')
];

for (const dir of directories) {
  addCommentsRecursively(dir);
}

console.log('✅ Finalizado. Se han agregado comentarios explicativos a los archivos.');
