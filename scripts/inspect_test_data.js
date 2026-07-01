// scripts/inspect_test_data.js
import { sequelize } from '../src/config/db.js';

const PROD_PATTERNS = ['%E2E%', '%Test%', '%Prueba%', '%Editado%', '%Seguro%', 'Gorra Prueba%'];
const CLI_EMAIL = '%@test.com';
const CLI_NOMBRE = ['%E2E%', '%Test%', '%Comprador%', '%Seguro%'];
const USR_CORREO = ['%@test.com', '%comprador_e2e_%'];
const USR_NOMBRE = ['%QA%', '%E2E%', '%Comprador E2E%'];
const PROV_EMAIL = '%@test.com';
const PROV_NOMBRE = ['%E2E%', '%Editada%', '%Editado%'];
const PROV_CONTACTO = ['%E2E%', '%Editado%'];
const CAT_NOMBRE = ['%E2E%', '%Editada%', '%Prueba%'];

function orWhere(column, patterns) {
    return '(' + patterns.map(p => `${column} ILIKE '${p.replace(/'/g, "''")}'`).join(' OR ') + ')';
}

async function inspect() {
    try {
        await sequelize.authenticate();
        
        // 1. Productos
        const prodTestClause = orWhere('"Nombre"', PROD_PATTERNS);
        const [[{ count: prodTotal }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Productos"`);
        const [[{ count: prodTest }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Productos" WHERE ${prodTestClause}`);
        console.log(`Productos: Total=${prodTotal}, Test=${prodTest}, Real=${prodTotal - prodTest}`);

        // 2. Clientes
        const cliTestClause = `("Email" ILIKE '${CLI_EMAIL.replace(/'/g, "''")}' OR ${orWhere('"Nombre"', CLI_NOMBRE)})`;
        const [[{ count: cliTotal }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Clientes"`);
        const [[{ count: cliTest }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Clientes" WHERE ${cliTestClause}`);
        console.log(`Clientes: Total=${cliTotal}, Test=${cliTest}, Real=${cliTotal - cliTest}`);

        // 3. Usuarios
        const usrTestClause = `((${orWhere('"Correo"', USR_CORREO)} OR ${orWhere('"Nombre"', USR_NOMBRE)}) AND "Correo" NOT ILIKE '%duvann1991%' AND "Correo" NOT ILIKE '%streetcaps%')`;
        const [[{ count: usrTotal }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Usuarios"`);
        const [[{ count: usrTest }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Usuarios" WHERE ${usrTestClause}`);
        console.log(`Usuarios: Total=${usrTotal}, Test=${usrTest}, Real=${usrTotal - usrTest}`);

        // 4. Proveedores
        const provTestClause = `("Email" ILIKE '${PROV_EMAIL.replace(/'/g, "''")}' OR ${orWhere('"Nombre"', PROV_NOMBRE)} OR ${orWhere('"Contacto"', PROV_CONTACTO)})`;
        const [[{ count: provTotal }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Proveedores"`);
        const [[{ count: provTest }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Proveedores" WHERE ${provTestClause}`);
        console.log(`Proveedores: Total=${provTotal}, Test=${provTest}, Real=${provTotal - provTest}`);

        // 5. Categorias
        const catTestClause = orWhere('"Nombre"', CAT_NOMBRE);
        const [[{ count: catTotal }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Categorias"`);
        const [[{ count: catTest }]] = await sequelize.query(`SELECT COUNT(*) as count FROM "Categorias" WHERE ${catTestClause}`);
        console.log(`Categorias: Total=${catTotal}, Test=${catTest}, Real=${catTotal - catTest}`);

        // Let's print some examples of "Real" products to see if they look real
        const [realProds] = await sequelize.query(`SELECT "IdProducto", "Nombre", "PrecioVenta" FROM "Productos" WHERE NOT (${prodTestClause}) LIMIT 20`);
        console.log('\n--- SAMPLE REAL PRODUCTS ---');
        console.log(JSON.stringify(realProds, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspect();
