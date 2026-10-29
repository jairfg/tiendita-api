# Fase 1 del backend: identidad, multi-tenancy y acceso

> Especificación técnica, estado y roadmap. Actualizada el 29 de octubre de 2026. El alcance funcional vive en [`producto.md`](./producto.md).

## 1. Objetivo y alcance

Construir la base para productos, ventas, gastos y fiados:

- registro público del dueño y su negocio;
- creación atómica de tenant, dueño, sucursal principal y sesión;
- disponibilidad de subdominio y consulta pública de marca;
- login, refresh rotativo, logout y `/me`;
- recuperación de contraseña y correos transaccionales;
- aislamiento estricto entre negocios;
- suspensión manual desde el REPL de NestJS.

No incluye frontend, módulos comerciales, roles, cajeros, planes, múltiples
sucursales visibles ni panel de superadministración.

## 2. Forma de trabajo

- Trabajar en español y en modo guiado: explicar, entregar comandos o
  fragmentos y revisar lo escrito por Jair.
- No modificar código salvo petición explícita en ese turno.
- Avanzar en checkpoints: implementar, formatear, probar, revisar, commit y
  push.
- Usar Rails solo como analogía; implementar con módulos, DI, servicios y
  repositorios idiomáticos de NestJS.
- No usar `BaseEntity`, callbacks ocultos de negocio ni repositorios TypeORM en
  controladores.
- Rama activa: `development`; flujo futuro: `feature/* -> development -> main`.
- Nunca versionar `.env`.

## 3. Decisiones cerradas

- Registro de dueño y negocio en una petición y una transacción.
- Tenant inicial `ACTIVE`, sin plan, suscripción ni trial.
- Acceso inmediato; la bienvenida no bloquea ni revierte el registro.
- Solo dueños en esta fase; no existen roles, permisos o invitaciones.
- Suspensión/reactivación desde REPL, sin endpoint administrativo.
- Subdominio público, obligatorio y único; nunca determina autorización.
- `primaryColor` opcional y una única `Sucursal principal`.
- JWT de acceso por 15 minutos y refresh opaco por 30 días.
- Refresh rotativo, hasheado y enviado en cookie `HttpOnly`.
- Contraseñas con Argon2id y UUID generados por el servidor.
- Fechas `timestamptz`, base `snake_case` y JSON `camelCase`.
- Solo migraciones: `synchronize: false` y `migrationsRun: false`.

## 4. Estado actual

Completado:

- Docker Compose con PostgreSQL 17 (`5435`) y Redis 7.4 (`6380`).
- Configuración Zod, bootstrap HTTP, CORS, cookies, Helmet y shutdown hooks.
- Logger nativo estructurado y NestJS Observe.
- TypeORM, datasource CLI, estrategia `snake_case` y scripts de migración.
- Runtime sin sincronización ni instalación automática de extensiones.
- Migración controlada de `pgcrypto`.
- Entidades, migraciones y constraints de `Tenant`, `Location` y `User`.
- Verificación real de una sola location principal, constraints de `users` y
  ausencia de drift.

Siguiente checkpoint: `AuthSession`; después, `PasswordResetToken`, una entidad
por vez.

## 5. Entidades y migraciones

Flujo obligatorio por entidad:

1. Definir enums y entidad sin `BaseEntity`.
2. Nombrar PK, FK, checks e índices de forma estable.
3. Formatear, probar, ejecutar lint y build.
4. Generar una sola migración y revisar `up()` y `down()`.
5. Ejecutarla, inspeccionar con `psql` y probar constraints con `ROLLBACK`.
6. Comprobar drift, ejecutar suite completa, commit y push.

```bash
npm run db:migration:generate -- src/database/migrations/Nombre
npm run db:migration:show
npm run db:migration:run
npm run db:migration:generate -- src/database/migrations/SchemaCheck --check
npm test && npm run test:e2e && npm run lint && npm run build
git diff --check
```

No usar `schema:sync`, migraciones automáticas al arrancar ni eliminar
`pgcrypto` al revertir una tabla. Producción ejecuta migraciones una vez por
release.

## 6. Modelo de datos

Los valores cerrados usan enums TypeScript y columnas `varchar` con `CHECK`, no
enums nativos de PostgreSQL.

### `tenants` — implementado

- `id uuid`; `name varchar(120)`; `subdomain varchar(63)` único.
- `business_type varchar(32)`: `GROCERY_STORE`, `BAKERY`, `RETAIL_STORE` u
  `OTHER`.
- `country char(2) = PE`; `currency char(3) = PEN`;
  `timezone varchar(64) = America/Lima`.
- `primary_color varchar(7)` nullable, formato `#RRGGBB`.
- `status varchar(16)`: `ACTIVE` o `SUSPENDED`; `paid_until date` nullable.
- `created_at` y `updated_at` como `timestamptz`.

### `locations` — implementado

- `id uuid`; `tenant_id uuid` con FK `RESTRICT` e índice.
- `name varchar(120)` no vacío; `is_main = false`; `is_active = true`.
- `created_at` y `updated_at` como `timestamptz`.
- Índice único parcial: máximo un `is_main = true` por tenant.

### `users` — implementado

- `id uuid`; `tenant_id uuid` con FK `RESTRICT` e índice.
- `first_name varchar(80)` y `last_name varchar(120)`, no vacíos.
- `email varchar(254)` único global; la aplicación lo guarda con `trim` y
  minúsculas, y un `CHECK` exige `email = lower(btrim(email))`.
- `password_hash text` con `select: false`.
- `status varchar(16)`: `ACTIVE` o `DISABLED`.
- `last_login_at` nullable; `created_at` y `updated_at` como `timestamptz`.

### `auth_sessions` — siguiente

- `id uuid`; `user_id uuid` con FK `CASCADE`.
- `token_family_id uuid` indexado; `refresh_token_hash char(64)` único y
  `select: false`.
- `expires_at`; `last_used_at` y `revoked_at` nullable.
- `replaced_by_session_id` con FK autorreferenciada nullable.
- `ip_address inet` y `user_agent text` nullable.
- `created_at` y `updated_at` como `timestamptz`.

La FK autorreferenciada debe conservar el historial de rotaciones.

### `password_reset_tokens`

- `id uuid`; `user_id uuid` con FK `CASCADE`.
- `token_hash char(64)` único y `select: false`.
- `expires_at`; `used_at` nullable; `created_at`, todos `timestamptz`.

## 7. Subdominio, marca y registro

El subdominio se normaliza con `trim` y minúsculas. Tiene de 3 a 63 caracteres,
empieza y termina con letra minúscula o número, y solo acepta ASCII minúsculo,
números y guiones internos.

Se reservan, entre otros: `www`, `api`, `app`, `admin`, `mail`, `dev`, `test`,
`support`, `docs`, `assets`, `cdn` y `static`. PostgreSQL conserva la autoridad
final mediante check e índice único.

```http
GET  /api/v1/auth/subdomains/:subdomain/availability
GET  /api/v1/auth/tenants/:subdomain/branding
POST /api/v1/auth/registrations
```

- Disponibilidad distingue `INVALID`, `RESERVED` y `TAKEN`.
- Branding expone solo `name` y `primaryColor`; un suspendido conserva ambos.
- Registro recibe `firstName`, `lastName`, `email`, `password`, y para tenant:
  `name`, `subdomain`, `businessType`, `country`, `primaryColor?`.
- El backend asigna `PEN`, `America/Lima` y `Sucursal principal`.
- La transacción crea tenant, dueño, location principal y sesión.
- Tras el commit devuelve acceso y encola bienvenida.
- Carreras de email y subdominio se traducen por nombre de constraint.

## 8. Autenticación y recuperación

Las contraseñas permiten de 10 a 128 caracteres sin reglas artificiales. Los
parámetros Argon2id son centralizados y se medirán antes del despliegue.

Access token:

- JWT HS256, secreto de al menos 32 bytes, duración de 15 minutos.
- Bearer con `sub`, `tenantId`, `locationId`, `sessionId`, `tenantStatus`, `jti`,
  `iss`, `aud`, `iat` y `exp`; sin roles.

Refresh token:

- 32 bytes aleatorios Base64URL; duración de 30 días.
- Solo se guarda SHA-256.
- Cookie `refresh_token`, host-only, `HttpOnly`, `SameSite=Lax`,
  `Path=/api/v1/auth`, `Secure` en producción y sin `Domain`.
- Cada uso bloquea la sesión, revoca la fila anterior, crea la siguiente y
  enlaza `replaced_by_session_id` dentro de una transacción.
- Reutilizar un token rotado revoca su familia; refresh concurrentes no pueden
  producir dos ramas válidas.

Login normaliza email, verifica Argon2id y comprueba usuario y tenant. Un
subdominio opcional solo valida contexto. Credenciales incorrectas producen una
respuesta genérica. Login y refresh rechazan suspendidos; un access token previo
puede vivir hasta 15 minutos. Logout es idempotente.

Recuperación:

- `forgot` responde igual exista o no el email.
- Token aleatorio de 32 bytes Base64URL; solo se guarda SHA-256.
- Expira en 30 minutos, se consume una vez y uno nuevo invalida los anteriores.
- Reset revoca todas las sesiones.
- No usa JWT porque requiere consumo único y revocación en base.

## 9. Multi-tenancy y módulos

`nestjs-cls` conserva `{ tenantId, locationId, userId }`, pero no filtra
TypeORM. La frontera es:

```text
Controller -> Application Service -> Repository propio -> TypeORM
```

- Un repositorio tenant-aware obtiene `tenantId` del contexto y siempre filtra.
- La ausencia de contexto falla; nunca genera una consulta global.
- Registro, login, refresh, reset y plataforma usan repositorios unscoped
  separados y nombrados explícitamente.
- No existe un parámetro opcional para saltar el tenant.
- Transacciones entre módulos usan `@nestjs-cls/transactional` y su adaptador.

Módulos: `TenantsModule` registra Tenant/Location; `UsersModule`, User;
`AuthModule`, AuthSession/PasswordResetToken. `autoLoadEntities` solo descubre
entidades registradas mediante `forFeature()`.

## 10. HTTP, errores y seguridad

```text
POST /api/v1/auth/registrations
GET  /api/v1/auth/subdomains/:subdomain/availability
GET  /api/v1/auth/tenants/:subdomain/branding
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

- Registro `201`; login/refresh/reset `200`; logout `204`; forgot `202`.
- `/me` devuelve DTO de user, tenant y location.
- Access token viaja en JSON; refresh nunca sale de la cookie.
- Refresh/logout no aceptan token en body.
- Controladores devuelven DTOs, nunca entidades TypeORM.

Error uniforme:

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "No se pudo iniciar sesión",
  "details": null
}
```

Códigos: `VALIDATION_ERROR`, `EMAIL_ALREADY_REGISTERED`, `INVALID_SUBDOMAIN`,
`SUBDOMAIN_RESERVED`, `SUBDOMAIN_ALREADY_TAKEN`, `INVALID_CREDENTIALS`,
`INVALID_OR_EXPIRED_TOKEN`, `SESSION_REVOKED`, `TENANT_NOT_FOUND`,
`TENANT_SUSPENDED` y `USER_DISABLED`.

Validación usa `400`; autenticación, `401`; suspensión, `403`; no encontrado,
`404`; conflicto único, `409`. Validation details es una lista
`{ field, code, message }`.

Seguridad global:

- prefijo `/api/v1`; ValidationPipe estricto; Helmet; CORS explícito;
- endpoints con cookie son `POST` y validan origen;
- solo confiar en IP de proxies configurados;
- nunca exponer contraseñas, hashes, authorization, cookies o tokens.

Rate limits iniciales: registro 5/h, login 10/min, recuperación 5/h,
disponibilidad 30/min y API 300/5 min. Producción usa Redis.

## 11. Correo, logging y Observe

Correo:

- Nodemailer + SendGrid SMTP, Handlebars, BullMQ y Redis.
- Fake en pruebas HTTP; plantillas de bienvenida y recuperación.
- Jobs después del commit, ID estable, tres intentos y backoff exponencial.
- Un fallo nunca revierte tenant, usuario o token.
- Asuntos no productivos llevan `[DEV]`.
- Sin transactional outbox: fallos al encolar se registran en logs y Observe.

Pendiente externo: API key restringida y remitente/dominio verificado.

Decisión de logging aceptada el 28 de octubre de 2026:

- `Logger` y `ConsoleLogger` de NestJS.
- Desarrollo legible; producción, un JSON por línea.
- `LOG_LEVEL` define nivel y `OBSERVE_FORWARD_LOGS` el reenvío.
- Observe agrega `traceId` y redacta telemetría.
- Nunca registrar credenciales, cookies, authorization o tokens.
- `TracerService` sirve para atributos de trazas y errores gestionados, no como
  logger.

NestJS 12 ya ofrece logs estructurados y Observe integra su logger directamente.
Pino añadiría configuración y propagación manual de contexto; se reevaluará si
se requieren transportes propios, redacción de stdout o volumen muy alto.

Usar `log`, `warn`, `error`, `fatal` y `debug` de forma consistente y no
registrar la misma excepción en cada capa. Para incidentes de producción,
consultar Observe mediante MCP o **Copy agent prompt** desde su dashboard.

## 12. Dependencias y configuración

Producción:

```text
@nestjs/config zod @nestjs/typeorm typeorm pg @nestjs/swagger
nestjs-cls @nestjs-cls/transactional @nestjs-cls/transactional-adapter-typeorm
@nestjs/passport passport passport-jwt @nestjs/jwt argon2
class-validator class-transformer cookie-parser helmet @nestjs/throttler
nodemailer handlebars @nestjs/bullmq bullmq
```

Pruebas/tipos: `@testcontainers/postgresql`, `@types/pg`,
`@types/passport-jwt`, `@types/cookie-parser` y `@types/nodemailer`.

Instalar por bloque y comprobar compatibilidad con NestJS 12 y TypeORM 1.1. No
usar `passport-local`: login será explícito; Passport validará JWT.

Variables pendientes: JWT, TTL refresh, URL reset, SMTP/SendGrid, Redis, CORS y
cookies. Se validan al arrancar y se documentan sin secretos en `.env.example`.

## 13. Orden restante

1. User, AuthSession y PasswordResetToken, cada uno con su migración.
2. Módulos y tests de migración con PostgreSQL/Testcontainers.
3. CLS, repositorios scoped/unscoped y transacciones.
4. Errores globales, traducción de constraints, DTOs y Swagger.
5. JWT, cookies, rate limits, disponibilidad y branding.
6. Registro atómico.
7. Login, refresh, logout y `/me`.
8. BullMQ, SendGrid y bienvenida.
9. Recuperación de contraseña.
10. REPL para suspensión/reactivación.
11. CI, README y revisión de seguridad.

## 14. Pruebas, CI y cierre

Usar PostgreSQL real con Testcontainers; SQLite no reproduce `inet`, regex,
índices parciales, `timestamptz` ni concurrencia.

Cobertura mínima:

- registro y rollback total; carreras de email/subdominio;
- validación de subdominio y branding mínimo;
- login, suspensión y usuario deshabilitado;
- refresh rotativo, concurrente y reutilizado; logout idempotente;
- recuperación sin enumeración, expiración, uso único y revocación de sesiones;
- aislamiento entre dos tenants y fallo sin contexto;
- location principal única y migraciones desde base vacía;
- ausencia de secretos y `SchemaCheck` sin drift.

CI ejecuta `npm ci`, formato, lint, unit, e2e/integración, build, migraciones y
drift check.

La fase termina cuando existen los cinco modelos, todos los endpoints funcionan,
el registro es atómico, el aislamiento y concurrencia están probados, el correo
es asíncrono, el REPL suspende/reactiva, no se filtran secretos y CI pasa.
`development` queda lista para PR hacia `main`.

Pendientes externos: SendGrid, dominios finales para CORS/cookies y medición de
Argon2id en despliegue.
