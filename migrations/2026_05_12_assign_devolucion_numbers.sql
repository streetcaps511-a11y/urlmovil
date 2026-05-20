-- Migración SQL para asignar números de devolución (NoDevolucion = 10000 + IdDevolucion)
-- Ejecutar en PostgreSQL
-- Actualiza todas las devoluciones que no tengan un NoDevolucion asignado

BEGIN;

-- Actualizar NoDevolucion para todas las devoluciones que sean NULL o 0
UPDATE "Devoluciones"
SET "NoDevolucion" = 10000 + "IdDevolucion"
WHERE "NoDevolucion" IS NULL 
   OR "NoDevolucion" = 0
   OR "NoDevolucion" = '';

-- Verificar que la actualización fue exitosa
SELECT COUNT(*) as total_devoluciones, 
       COUNT(CASE WHEN "NoDevolucion" > 10000 THEN 1 END) as con_numero,
       COUNT(CASE WHEN "NoDevolucion" IS NULL OR "NoDevolucion" = 0 THEN 1 END) as sin_numero
FROM "Devoluciones";

COMMIT;
