
import { sequelize, Estado } from '../src/models/index.js';

async function checkStates() {
    try {
        const states = await Estado.findAll();
        console.log('--- ESTADOS EN LA BASE DE DATOS ---');
        states.forEach(s => {
            console.log(`ID: ${s.id || s.IdEstado}, Nombre: ${s.nombre || s.Nombre}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error querying states:', error);
        process.exit(1);
    }
}

checkStates();
