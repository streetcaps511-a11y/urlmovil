// scratch/fix_clientes_departamento.js
import fs from 'fs';
import path from 'path';

const sqlPath = 'c:/Users/CRISTIAN/OneDrive/Desktop/pruebasjenkis/backend/database_schema.sql';
let content = fs.readFileSync(sqlPath, 'utf8');

// We want to replace matching client insert statements.
// To handle the potential huge avatar value, we can use regex replacement on a line-by-line basis.
const lines = content.split('\n');
let fixedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('INSERT INTO "Clientes"') && line.includes('"Departamento"')) {
    console.log(`Found matching line at line ${i + 1}`);
    
    // Replace the columns list:
    // From: ("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Departamento", "Ciudad", "Direccion", "Avatar")
    // To: ("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Ciudad", "Direccion", "Avatar")
    const oldColumns = '("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Departamento", "Ciudad", "Direccion", "Avatar")';
    const newColumns = '("IdCliente", "TipoDocumento", "Documento", "Nombre", "Telefono", "Email", "Estado", "Ciudad", "Direccion", "Avatar")';
    
    if (line.includes(oldColumns)) {
      // Now parse the VALUES (...) part to remove the 8th value (1-based: 1=IdCliente, ..., 8=Departamento)
      // Since parsing full SQL values with potential quotes and commas is tricky, let's do a state-machine parser for the VALUES list.
      const valuesStartIdx = line.indexOf('VALUES (');
      if (valuesStartIdx !== -1) {
        const prefix = line.substring(0, valuesStartIdx + 'VALUES ('.length);
        const suffix = line.substring(prefix.length);
        
        // Parse suffix to find the comma-separated values inside the parentheses
        let values = [];
        let currentVal = '';
        let inQuotes = false;
        let quoteChar = '';
        let escape = false;
        let parenDepth = 0;
        let idx = 0;
        
        while (idx < suffix.length) {
          const char = suffix[idx];
          if (escape) {
            currentVal += char;
            escape = false;
          } else if (char === '\\') {
            currentVal += char;
            escape = true;
          } else if (inQuotes) {
            currentVal += char;
            if (char === quoteChar) {
              // check if it's double quote inside SQL (i.e. '' in SQL)
              if (quoteChar === "'" && suffix[idx + 1] === "'") {
                currentVal += "'";
                idx++; // skip next quote
              } else {
                inQuotes = false;
              }
            }
          } else {
            if (char === "'" || char === '"') {
              inQuotes = true;
              quoteChar = char;
              currentVal += char;
            } else if (char === '(') {
              parenDepth++;
              currentVal += char;
            } else if (char === ')') {
              if (parenDepth > 0) {
                parenDepth--;
                currentVal += char;
              } else {
                // End of values list
                values.push(currentVal.trim());
                break;
              }
            } else if (char === ',' && parenDepth === 0) {
              values.push(currentVal.trim());
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          idx++;
        }
        
        const remainingSuffix = suffix.substring(idx);
        
        console.log(`Parsed ${values.length} values for line ${i + 1}`);
        if (values.length === 11) {
          // Remove 8th value (index 7)
          const removedVal = values.splice(7, 1);
          console.log(`Removed 8th value: ${removedVal}`);
          
          const newValuesPart = values.join(', ');
          const newPrefix = prefix.replace(oldColumns, newColumns);
          const newLine = newPrefix + newValuesPart + remainingSuffix;
          
          lines[i] = newLine;
          fixedCount++;
        } else {
          console.error(`Error: Line ${i + 1} has ${values.length} values instead of 11!`);
        }
      }
    }
  }
}

if (fixedCount > 0) {
  fs.writeFileSync(sqlPath, lines.join('\n'));
  console.log(`Successfully fixed ${fixedCount} lines in database_schema.sql!`);
} else {
  console.log('No lines needed fixing.');
}
