## Archivo legado

Este directorio queda congelado como archivo historico de migraciones manuales.

- No anadir nuevos scripts aqui.
- No referenciar estas rutas desde codigo runtime.
- Para cambios de esquema nuevos use `db/migrations/versions/*.py` con Alembic.

Si necesitas entender el origen de una tabla antigua, usa estos ficheros solo
como referencia y traslada cualquier cambio vivo a Alembic.
