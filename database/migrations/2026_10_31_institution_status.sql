-- Ejecutar una vez con cuenta de migración, no con usuario de aplicación.
ALTER TABLE instituciones MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'Deshabilitada';
UPDATE instituciones SET estado = CASE WHEN estado = 'Aprobada' THEN 'Habilitada' ELSE 'Deshabilitada' END WHERE estado IN ('Aprobada','Pendiente','Rechazada','') OR estado IS NULL;
