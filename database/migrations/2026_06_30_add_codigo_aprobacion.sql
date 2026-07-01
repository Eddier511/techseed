SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'solicitudes'
    AND COLUMN_NAME = 'codigo_aprobacion'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE solicitudes ADD COLUMN codigo_aprobacion VARCHAR(6) NULL AFTER codigo_publico',
  'SELECT ''La columna codigo_aprobacion ya existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE solicitudes
SET codigo_aprobacion = UPPER(RIGHT(CONCAT('000000', CONV(id + 1000000, 10, 36)), 6))
WHERE estado = 'Aprobado'
  AND (codigo_aprobacion IS NULL OR codigo_aprobacion = '');

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'solicitudes'
    AND INDEX_NAME = 'uq_solicitudes_codigo_aprobacion'
);

SET @sql = IF(
  @index_exists = 0,
  'ALTER TABLE solicitudes ADD UNIQUE KEY uq_solicitudes_codigo_aprobacion (codigo_aprobacion)',
  'SELECT ''El indice uq_solicitudes_codigo_aprobacion ya existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
