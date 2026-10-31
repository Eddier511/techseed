# Proyecto TCU

## Instalación

Usar Node 24.22.2 LTS (ver `.nvmrc`) y npm 11. Instalar desde la raíz:
`npm ci`, `npm run build`, `npm start`. Desarrollo: `npm run dev` y el backend
por separado; configurar VITE_API_URL si usa otro origen.

Copiar `backend/.env.example` a `backend/.env`. Generar JWT_SECRET con
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
Configurar MySQL y aplicar las migraciones con una cuenta administrativa.
El esquema inicial debe proporcionarlo el responsable de la base existente;
este repositorio contiene migraciones, no un dump inicial completo.

## Acceso temporal

`MOCK_AUTH_ENABLED=true` mantiene el login de prueba con código visible.
Usarlo únicamente con datos de prueba. Microsoft Entra sigue pendiente.
No habilitarlo en el despliegue con usuarios reales.

## Seguridad y despliegue

El `.env` se conserva localmente pero debe retirarse del índice Git. Rotar las
credenciales DB/JWT que hayan estado publicadas: quitarlas de Git no las revoca.
No publicar `.env`, ni usar variables VITE_ para secretos. Configurar CORS_ORIGINS
con los orígenes autorizados separados por coma. DB_SSL=true valida TLS de MySQL.
Detrás de proxy, configurar confianza sólo para el proxy real antes de usar límites
por IP; nunca confiar indiscriminadamente en X-Forwarded-For.
Sin OPENAI_API_KEY la aplicación arranca y la IA responde 503.
Aplicar TLS y supervisión/reinicio desde el hosting. No continuar tras excepciones
no controladas. La instalación ejecuta `postinstall` para compilar el frontend automáticamente.
Si se instala con `--ignore-scripts`, ejecutar `npm run build` por separado.

`npm test`, `npm run lint`, `npm run build` y `npm audit` verifican cambios.
El JWT y su sesión expiran en ocho horas absolutas. El cierre revoca la sesión
en MySQL; también caduca tras 60 minutos sin peticiones. El rol y el estado
activo se verifican por petición. Aplicar la migración auth_sessions antes de arrancar.
