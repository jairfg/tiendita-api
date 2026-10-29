# Roadmap de implementación de la fase 1

> Documento de traspaso para continuar la implementación de la fase 1 sin
> redescubrir decisiones ni repetir trabajo.
>
> Estado al 29 de octubre de 2026.

## 1. Documentos que deben leerse primero

Antes de modificar código, leer completamente:

1. [`AGENTS.md`](../AGENTS.md): reglas de NestJS Observe.
2. [`docs/producto.md`](./producto.md): alcance y reglas generales del producto.
3. [`docs/fase-1-base.md`](./fase-1-base.md): diseño funcional y técnico
   aprobado para esta fase.
4. [`docs/decisiones/001-logger-nativo-y-observe.md`](./decisiones/001-logger-nativo-y-observe.md):
   decisión de logging.

Este roadmap indica **cómo continuar**. Si entra en conflicto con el diseño de
`fase-1-base.md`, detenerse y resolver la diferencia antes de implementar.

## 2. Forma de trabajo acordada con Jair

- Trabajar en español.
- El flujo normal es **guiado**: explicar la decisión, entregar comandos y
  fragmentos exactos, esperar a que Jair los escriba y revisar el resultado.
- No crear ni modificar código por Jair salvo que lo solicite explícitamente en
  ese turno.
- Avanzar en checkpoints pequeños: implementar, formatear, probar, revisar diff,
  hacer commit y push.
- Usar analogías con Rails solo para explicar conceptos. La implementación debe
  ser idiomática de NestJS: módulos, inyección de dependencias, repositorios y
  servicios; no intentar reproducir Active Record.
- No exponer repositorios de TypeORM directamente a controladores.
- No extender entidades desde `BaseEntity` de TypeORM.
- No introducir callbacks ocultos de entidad para flujos de negocio.
- Antes de una operación destructiva, un cambio de alcance o una publicación
  externa, confirmar la intención.

## 3. Repositorio y flujo Git

- Repositorio público: <https://github.com/jairfg/tiendita-api>
- Remoto: `origin` mediante SSH.
- Rama estable: `main`.
- Rama activa de integración: `development`.
- Flujo acordado: `feature/* -> development -> main`.
- Mientras no se creen ramas feature, continuar los commits de esta fase en
  `development`.
- Al completar la fase, abrir un pull request de `development` hacia `main`.
- `.env` está ignorado y nunca debe agregarse al repositorio.

Comandos habituales:

```bash
git status --short --branch
git add <archivos-explícitos>
git commit -m "tipo: descripción"
git push
```

## 4. Estado actual

### Terminado y publicado

- Docker Compose con PostgreSQL 17 y Redis 7.4.
  - PostgreSQL local: `127.0.0.1:5435`.
  - Redis local: `127.0.0.1:6380`.
- Configuración global con `@nestjs/config` y Zod.
- Validación de entorno, CORS y credenciales de Observe.
- Bootstrap HTTP:
  - prefijo `/api/v1`;
  - `ValidationPipe` global;
  - Helmet;
  - `cookie-parser`;
  - CORS con orígenes explícitos y credenciales;
  - shutdown hooks.
- Logger nativo de NestJS 12:
  - texto legible en desarrollo;
  - JSON en producción;
  - nivel configurable;
  - logs enviados y correlacionados con NestJS Observe cuando corresponde;
  - redacción configurada.
- TypeORM 1.1 y `@nestjs/typeorm` 12:
  - conexión real desde `DatabaseModule`;
  - estrategia propia y probada de `snake_case`;
  - `synchronize: false` y `migrationsRun: false`;
  - `installExtensions: false`;
  - `pgcrypto` controlado por migración;
  - `DataSource` separado para la CLI;
  - scripts para crear, generar, listar, ejecutar y revertir migraciones;
  - CLI verificada tanto desde TypeScript como desde JavaScript compilado.
- Entidad `Tenant`, enums y migración `CreateTenantsTable`:
  - migración aplicada localmente;
  - constraints inspeccionados en PostgreSQL;
  - inserción válida y rechazo de subdominio inválido comprobados;
  - sin drift entre entidad y esquema;
  - commit publicado: `443bfb1 feat: add tenant persistence`.

### `Location` terminada y versionada

Archivos:

```text
src/tenants/entities/location.entity.ts
src/database/migrations/1793287429881-CreateLocationsTable.ts
```

Se comprobó:

- tabla `locations` creada localmente;
- FK `FK_locations_tenant` con `ON DELETE RESTRICT`;
- índice `IDX_locations_tenant_id`;
- índice único parcial `UQ_locations_main_per_tenant` con
  `WHERE is_main = true`;
- check `CHK_locations_name_not_blank`;
- una sucursal principal y varias secundarias válidas dentro de una transacción;
- rechazo de una segunda principal por
  `UQ_locations_main_per_tenant`;
- `SchemaCheck` sin diferencias entre entidad y base;
- tests, e2e, lint y build correctos;
- commit local: `887b230 feat: add location persistence`.

Solo falta publicar los commits locales con `git push` a `development`.

El tab del archivo antiguo
`src/tenants/entities/1793227884874-tenant.entity.ts.ts` puede seguir abierto en
el editor, pero el archivo ya no existe en disco y no debe recrearse.

## 5. Flujo obligatorio por entidad y migración

Jair prefiere implementar y aprender una entidad a la vez. Para cada entidad:

1. Definir enums o constantes de dominio.
2. Crear la entidad TypeORM sin extender `BaseEntity`.
3. Usar nombres estables para PK, FK, checks e índices.
4. Formatear, ejecutar tests, lint y build.
5. Generar **una migración para esa entidad**.
6. Leer manualmente todo `up()` y `down()`.
7. No ejecutar una migración con SQL dudoso o sin revisar.
8. Ejecutar la migración localmente.
9. Inspeccionar la tabla mediante `psql`.
10. Probar constraints dentro de una transacción que termine en `ROLLBACK`.
11. Comprobar que entidad y base no tengan drift.
12. Ejecutar suite completa.
13. Commit y push de entidad + migración.

Comandos:

```bash
npm run db:migration:generate -- \
  src/database/migrations/NombreDeMigracion

npm run db:migration:show
npm run db:migration:run

npm run db:migration:generate -- \
  src/database/migrations/SchemaCheck \
  --check

npm test
npm run test:e2e
npm run lint
npm run build
git diff --check
```

Reglas:

- Nunca usar `synchronize: true`.
- Nunca usar `migrationsRun: true`.
- No ejecutar migraciones automáticamente al arrancar cada instancia de la API.
- Las migraciones de producción se ejecutan como paso único del release.
- No usar `schema:sync`.
- No borrar `pgcrypto` en el `down()` de una tabla: puede ser compartido.
- Los cambios de datos complejos se escriben como migraciones manuales.

## 6. Entidades pendientes

Implementar en este orden, cada una con su propia migración revisada y probada.

### 6.1 `User`

Ruta sugerida:

```text
src/users/entities/user.entity.ts
src/users/user.enums.ts
```

Requisitos:

- UUID con PK estable.
- `tenant_id` obligatorio y FK con `RESTRICT`.
- Índice por `tenant_id`.
- `first_name varchar(80)` no vacío.
- `last_name varchar(120)` no vacío.
- `email varchar(254)` normalizado.
- `password_hash text`, nunca serializado ni seleccionado accidentalmente.
- `status varchar(16)` con `ACTIVE` o `DISABLED` y check estable.
- `last_login_at timestamptz`, nullable.
- `created_at` y `updated_at` como `timestamptz`.
- Unicidad global por `lower(email)` mediante índice funcional estable.

TypeORM no expresa todos los índices funcionales de PostgreSQL de forma segura.
El índice `lower(email)` debe revisarse o escribirse manualmente en la migración.
Verificar en TypeORM 1.1 cómo marcar el índice como
`synchronize: false` para evitar drift futuro.

Pruebas mínimas:

- email normalizado válido;
- mayúsculas/minúsculas no permiten duplicados;
- tenant inexistente falla por FK;
- estado inválido falla por check;
- hash de contraseña no aparece en serialización ni logs.

### 6.2 `AuthSession`

Ruta sugerida:

```text
src/auth/entities/auth-session.entity.ts
```

Requisitos:

- UUID y PK estable.
- `user_id` obligatorio, FK a `users` con `ON DELETE CASCADE`.
- `token_family_id uuid` e índice para revocar familias.
- `refresh_token_hash char(64)` con unicidad estable y `select: false`.
- `expires_at timestamptz`.
- `last_used_at` y `revoked_at` nullable.
- `replaced_by_session_id` nullable y FK autorreferenciada.
- `ip_address inet` nullable.
- `user_agent text` nullable.
- `created_at` y `updated_at` como `timestamptz`.
- Índices para usuario, familia y consultas de sesiones activas.

Definir con cuidado el `ON DELETE` de la FK autorreferenciada. Revisar que una
rotación o revocación no borre historial accidentalmente.

### 6.3 `PasswordResetToken`

Ruta sugerida:

```text
src/auth/entities/password-reset-token.entity.ts
```

Requisitos:

- UUID y PK estable.
- `user_id` obligatorio, FK a `users` con `ON DELETE CASCADE`.
- `token_hash char(64)` único y `select: false`.
- `expires_at timestamptz`.
- `used_at timestamptz`, nullable.
- `created_at timestamptz`.
- Índice por usuario y por expiración si las consultas reales lo requieren.

Pruebas mínimas:

- token hash duplicado rechazado;
- usuario inexistente rechazado;
- borrado de usuario elimina sesiones y tokens auxiliares;
- token usado o vencido no puede consumirse.

## 7. Registrar entidades en módulos Nest

`autoLoadEntities` solo carga entidades registradas mediante `forFeature()`.
Cuando las entidades existan:

- `TenantsModule`: registrar `Tenant` y `Location`.
- `UsersModule`: registrar `User`.
- `AuthModule`: registrar `AuthSession` y `PasswordResetToken`.
- Importar los módulos desde `AppModule`.
- No exportar repositorios de TypeORM indiscriminadamente.
- Exportar servicios o repositorios propios con una interfaz limitada.

Mantener relaciones unidireccionales salvo que una consulta real justifique la
relación inversa. No agregar colecciones gigantes a `Tenant` o `User` solo por
comodidad.

## 8. Pruebas de base de datos con Testcontainers

Incorporar antes de implementar flujos sensibles:

```text
@testcontainers/postgresql
@types/pg
```

Crear un helper de integración que:

1. Levante PostgreSQL real.
2. Ejecute todas las migraciones desde cero.
3. Exponga un `DataSource` aislado por suite.
4. Destruya el contenedor al terminar.

Automatizar lo que ahora se comprobó manualmente:

- checks de tenant;
- unicidad de subdominio;
- una sola `Location` principal;
- FKs y estrategias de borrado;
- unicidad case-insensitive del email;
- rollback de transacciones;
- migraciones `up` desde una base vacía.

No reemplazar PostgreSQL por SQLite: no reproduce `inet`, índices parciales,
regex, `timestamptz` ni las mismas reglas de concurrencia.

## 9. Contexto multi-tenant y transacciones

Instalar las versiones compatibles actuales de:

```text
nestjs-cls
@nestjs-cls/transactional
@nestjs-cls/transactional-adapter-typeorm
```

Implementar:

```ts
type RequestContext = {
  tenantId: string;
  locationId: string;
  userId: string;
};
```

Reglas:

- `nestjs-cls` conserva contexto; no filtra TypeORM automáticamente.
- Los repositorios tenant-aware obtienen `tenantId` del contexto.
- Toda consulta/escritura tenant-aware incluye el tenant.
- Una operación tenant-aware sin contexto debe fallar de forma explícita.
- Registro, login, refresh, recuperación y operaciones de plataforma usan
  repositorios **unscoped** separados y nombrados como tales.
- No crear un repositorio genérico con un parámetro opcional para omitir tenant.
- Las transacciones que cruzan módulos se propagan con el adaptador de TypeORM.

Crear repositorios propios como frontera:

```text
Controller -> Application Service -> Repository propio -> TypeORM
```

Pruebas obligatorias:

- dos tenants con datos equivalentes no pueden leer ni modificar datos ajenos;
- una consulta sin tenant no se convierte en una consulta global;
- el rollback cruza correctamente módulos y repositorios.

## 10. Infraestructura HTTP todavía pendiente

Aunque el bootstrap base existe, faltan:

1. Filtro global de excepciones con forma estable:

   ```json
   {
     "code": "INVALID_CREDENTIALS",
     "message": "No se pudo iniciar sesión",
     "details": null
   }
   ```

2. Traducción de errores de PostgreSQL por nombre de constraint.
3. Errores de validación como lista `{ field, code, message }`.
4. Serialización de respuestas mediante DTOs explícitos.
5. Garantía de que hashes, tokens y contraseñas no salen de entidades.
6. Swagger con contratos y respuestas documentadas.
7. Rate limiting general y específico por endpoint.
8. Configuración explícita de proxies confiables antes de usar IP del cliente.

No devolver directamente entidades de TypeORM desde controladores.

## 11. Configuración y dependencias pendientes

Agregar variables validadas y documentadas en `.env.example` para:

- JWT: secreto de al menos 32 bytes, issuer, audience y TTL.
- Refresh token: TTL y configuración de cookie.
- URL de recuperación.
- SMTP/SendGrid: host, puerto, usuario/API key, remitente y TLS.
- Redis/BullMQ.
- Entorno o prefijo de asuntos `[DEV]`.

Instalar solo cuando se implemente cada bloque:

```text
@nestjs/passport
passport
passport-jwt
@nestjs/jwt
argon2
@nestjs/swagger
nestjs-cls
@nestjs-cls/transactional
@nestjs-cls/transactional-adapter-typeorm
nodemailer
handlebars
@nestjs/bullmq
bullmq
@nestjs/throttler
```

Desarrollo/pruebas:

```text
@types/passport
@types/passport-jwt
@types/nodemailer
@types/pg
@testcontainers/postgresql
```

Verificar documentación oficial y compatibilidad con NestJS 12 y TypeORM 1.1
antes de instalar; no copiar tutoriales orientados a Nest antiguo o TypeORM 0.3.

## 12. Servicios de dominio y repositorios

Implementar primero utilidades puras y testeables:

- normalización de email;
- normalización de subdominio;
- validación de subdominios reservados;
- hashing y verificación Argon2id;
- generación de tokens opacos con `node:crypto`;
- hash SHA-256 de refresh y reset tokens;
- opciones de cookie centralizadas;
- construcción de payloads JWT.

Repositorios mínimos:

- `TenantsRepository`: operaciones tenant-aware.
- `UnscopedTenantsRepository`: registro, branding, disponibilidad y REPL.
- `UsersRepository`: tenant-aware.
- `UnscopedUsersRepository`: login y recuperación por email global.
- `LocationsRepository` y variante explícita para registro.
- `AuthSessionsRepository` con operaciones de bloqueo y familia.
- `PasswordResetTokensRepository`.

Los servicios de aplicación no deben depender de `Repository<Entity>` crudo.

## 13. Implementar endpoints en este orden

### 13.1 Disponibilidad y branding

```http
GET /api/v1/auth/subdomains/:subdomain/availability
GET /api/v1/auth/tenants/:subdomain/branding
```

- Compartir la misma normalización y validación del registro.
- Distinguir `INVALID`, `RESERVED` y `TAKEN`.
- Branding expone solo `name` y `primaryColor`.
- Un tenant suspendido sigue ocupando su subdominio.

### 13.2 Registro atómico

```http
POST /api/v1/auth/registrations
```

Una sola transacción crea:

1. tenant `ACTIVE`;
2. usuario dueño `ACTIVE`;
3. `Sucursal principal` con `isMain: true`;
4. sesión con hash del refresh token.

Después del commit:

- emitir JWT;
- establecer cookie host-only `refresh_token`;
- encolar bienvenida como mejor esfuerzo.

Traducir carreras de email y subdominio por nombre de constraint, no mediante
mensajes frágiles del driver.

### 13.3 Login

```http
POST /api/v1/auth/login
```

- Normalizar email.
- Respuesta genérica para credenciales inválidas.
- Verificar Argon2id.
- Comprobar usuario y tenant activos.
- Subdominio opcional solo como comprobación de contexto.
- Crear sesión y cookie de refresh.
- Actualizar `last_login_at`.

### 13.4 Refresh rotativo

```http
POST /api/v1/auth/refresh
```

- Leer solo cookie `HttpOnly`.
- Hash SHA-256 para localizar sesión.
- Bloquear fila actual dentro de transacción.
- Revocar fila anterior, crear siguiente y enlazar
  `replaced_by_session_id`.
- Reutilización de token revoca toda la familia.
- Dos refresh concurrentes no pueden producir dos ramas válidas.

### 13.5 Logout y `/me`

```http
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

- Logout idempotente, siempre elimina cookie y responde `204`.
- `/me` devuelve DTO explícito con user, tenant y location.

### 13.6 Recuperación de contraseña

```http
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

- Forgot responde igual exista o no el correo.
- Token aleatorio de 32 bytes, Base64URL, hash SHA-256.
- Expira en 30 minutos y solo puede usarse una vez.
- Reset revoca todas las sesiones del usuario.
- No usar JWT para recuperación.

## 14. JWT, cookies y seguridad

- Access token HS256, 15 minutos.
- Secreto de al menos 32 bytes validado al arrancar.
- Claims: `sub`, `tenantId`, `locationId`, `sessionId`, `tenantStatus`, `jti`,
  `iss`, `aud`, `iat`, `exp`.
- No incluir roles en esta fase.
- Refresh opaco de 32 bytes, 30 días.
- Cookie:
  - `HttpOnly`;
  - `SameSite=Lax`;
  - `Secure` en producción;
  - `Path=/api/v1/auth`;
  - sin `Domain`;
  - `Max-Age` de 30 días.
- Los endpoints de cookie son `POST` y validan el origen permitido.
- No registrar cabeceras de autorización, cookies, contraseñas ni tokens.

## 15. Correo y BullMQ

Implementar una abstracción de correo con:

- Nodemailer;
- SendGrid SMTP en desarrollo y producción;
- Handlebars para plantillas;
- fake en pruebas HTTP;
- BullMQ con Redis para envío asíncrono.

Jobs iniciales:

- bienvenida;
- recuperación de contraseña.

Configuración de jobs:

- identificador estable;
- tres intentos;
- backoff exponencial;
- encolar solo después del commit;
- un fallo de correo nunca revierte tenant, usuario o token.

Pendiente externo de Jair:

- crear API key restringida de SendGrid para este proyecto;
- verificar remitente o dominio;
- definir dominios finales de frontend y API.

## 16. Suspensión mediante REPL

No crear panel de superadmin ni endpoint administrativo.

Agregar un REPL de NestJS y un comando/script documentado para obtener el
repositorio unscoped de tenants y cambiar:

```text
ACTIVE <-> SUSPENDED
```

La suspensión debe:

- impedir login y refresh;
- conservar todos los datos;
- permitir que un access token previo viva como máximo sus 15 minutos;
- permitir reactivación sin reconstruir sesiones o datos.

## 17. Rate limiting

Aplicar inicialmente:

- registro: 5 por hora;
- login: 10 por minuto;
- recuperación: 5 por hora;
- disponibilidad de subdominio: 30 por minuto;
- API general: 300 cada 5 minutos.

En producción usar Redis. Combinar IP con identificador normalizado cuando
corresponda. Solo confiar en IP reenviada por proxies configurados
explícitamente.

## 18. Matriz de pruebas para cerrar la fase

### Registro

- crea tenant, dueño, location principal y sesión;
- rollback total si falla cualquier paso;
- responde acceso inmediato aunque falle el correo;
- carreras concurrentes de email y subdominio terminan en `409` estable.

### Subdominio y branding

- normalización compartida;
- formatos inválidos y reservados;
- unicidad concurrente;
- branding no expone campos internos.

### Login y sesión

- credenciales correctas e incorrectas;
- tenant suspendido y usuario deshabilitado;
- refresh rotativo;
- refresh concurrente;
- reutilización revoca familia;
- logout idempotente;
- claims JWT y expiración.

### Recuperación

- no enumera emails;
- token vencido, usado e inválido;
- un solo uso;
- nueva solicitud invalida tokens anteriores utilizables;
- reset revoca sesiones.

### Multi-tenancy

- dos tenants no pueden cruzar lecturas ni escrituras;
- un tenant no puede elegir otro tenant desde body, query, cookie o subdominio;
- falta de contexto produce error y nunca consulta globalmente.

### Seguridad y observabilidad

- no aparecen secretos en respuestas, logs, trazas ni errores;
- constraints se traducen a códigos estables;
- CORS, cookies y orígenes;
- rate limits;
- Observe correlaciona logs, errores y trazas.

### Migraciones

- todas las migraciones se ejecutan desde una base vacía;
- `SchemaCheck --check` no encuentra drift;
- la versión compilada del `DataSource` ejecuta migraciones;
- no existe `synchronize: true` en ningún entorno.

## 19. CI y cierre

Agregar GitHub Actions para ejecutar en cada pull request:

1. instalación reproducible con `npm ci`;
2. formato/check;
3. lint;
4. unit tests;
5. tests e2e e integración con PostgreSQL/Redis;
6. build;
7. migraciones desde base vacía;
8. schema drift check.

Antes del PR final:

- actualizar README con setup, variables, Docker, migraciones y tests;
- actualizar `.env.example` sin secretos;
- verificar que `git ls-files .env` no devuelva nada;
- ejecutar suite completa;
- revisar historial y diffs;
- push de `development`;
- abrir PR hacia `main`;
- no fusionar si faltan criterios de aceptación.

## 20. Definición de terminado

La fase 1 termina solo cuando:

- los cinco modelos y sus migraciones están aplicados y probados;
- registro, disponibilidad, branding, login, refresh, logout, `/me` y
  recuperación funcionan;
- tenant, user, sesión y location se crean atómicamente;
- el aislamiento multi-tenant tiene pruebas reales;
- refresh y recuperación resisten concurrencia y reutilización;
- correo asíncrono funciona con fake en pruebas;
- suspensión funciona desde REPL;
- errores y respuestas respetan sus contratos;
- no se filtran secretos;
- migraciones, tests, lint, build y CI pasan;
- `development` está lista para PR hacia `main`.

No forman parte de esta fase: roles, cajeros, planes, suscripciones, frontend,
productos, ventas, gastos, fiados, sincronización offline ni panel de
superadmin.
