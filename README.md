# Inventario Patrimonial

Aplicación web React/Vite con un backend Express que guarda los datos en Turso (SQLite/libSQL).

## Base de datos

- `acceso`: credenciales de los administradores.
- `codigos_acceso`: fuente oficial de códigos y estado operativo.
- `administracion`: institución y datos del encargado asociados al código.
- `inventario_<codigo>`: bienes patrimoniales exclusivos de cada institución. El nombre se genera a partir del código normalizado; por ejemplo, `SENATI` usa `inventario_senati`.
- `inventario_sesiones` e `inventario_detalles`: sesiones de toma física y bienes escaneados.

Al registrar un código desde el panel de administración, el backend crea su tabla de inventario y guarda el código y la ficha administrativa. Al editar el código, renombra la tabla junto con sus datos. Al eliminarlo, se borran el registro, la ficha administrativa y su tabla de inventario; los bienes de esa tabla no se pueden recuperar después.

La aplicación conserva las rutas `/api/registro-colegios` como alias para compatibilidad con versiones del frontend ya desplegadas, pero la fuente de verdad es `codigos_acceso`. Si existe una tabla antigua `registro_colegios`, al iniciar se copian sus registros a las tablas actuales y luego se archiva con un nombre `registro_colegios_legacy_*`; no se vuelve a importar ni se consulta para autenticar.

## Configuración

El backend necesita estas variables de entorno:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `PORT` (opcional; por defecto `3001`)

El frontend puede definir `VITE_BACKEND_URL` para apuntar al backend desplegado. En desarrollo, iniciar el backend con `npm run server` y el frontend con `npm run dev`.

## Comandos

- `npm run dev`: iniciar Vite en desarrollo.
- `npm run server`: iniciar el backend Express.
- `npm run build`: compilar el frontend.
- `npm run lint`: ejecutar Oxlint.
