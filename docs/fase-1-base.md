# Fase 1 del backend: identidad, multi-tenancy y acceso

> Diseño funcional y técnico de la primera parte del producto.
> Última actualización: 27 de octubre de 2026.

## 1. Objetivo

Construir la base sobre la que vivirán los módulos de productos, ventas, gastos y fiados:

- registro público del dueño y su negocio;
- creación atómica del tenant y su sucursal principal;
- login, renovación de sesión y logout;
- recuperación de contraseña;
- correos de bienvenida y recuperación;
- aislamiento de datos entre negocios;
- suspensión manual del acceso de un tenant desde el REPL de NestJS.

Al terminar esta fase, la API podrá registrar al dueño y su negocio, crear una sesión autenticada y aislar correctamente sus datos.

## 2. Decisiones cerradas

- El registro recibirá los datos del dueño y del negocio en una sola petición HTTP.
- El registro creará el tenant, el dueño, la sucursal principal y su sesión dentro de una sola transacción.
- El negocio empezará en estado `ACTIVE`; no habrá planes, suscripciones ni periodo de prueba.
- La respuesta del registro entregará inmediatamente una sesión autenticada. El correo de bienvenida no bloqueará ni revertirá el registro.
- En esta fase todos los usuarios son dueños creados mediante el registro público. No se implementarán roles, permisos, cajeros ni invitaciones hasta definir sus reglas con claridad.
- No se expondrán endpoints de administración. El estado `ACTIVE` o `SUSPENDED` del tenant se cambiará desde el REPL de NestJS mediante su repositorio de TypeORM.
- Cada tenant tendrá un `subdomain` público, obligatorio y único, que identificará su futura URL y permitirá obtener su marca antes de iniciar sesión.
- Cada tenant tendrá un `primaryColor` como dato de configuración de marca.
- Cada tenant tendrá una sola `Location`: `Sucursal principal`.
- El access token será JWT y tendrá una duración de 15 minutos.
- El refresh token será opaco, rotativo, se guardará como hash y viajará en una cookie `HttpOnly`.
- Las contraseñas se guardarán con Argon2.
- Las claves primarias de esta fase serán UUID generados por el servidor.
- Las fechas se guardarán como `timestamptz`; la base de datos usará `snake_case` y la API expondrá JSON en `camelCase`.
- Las migraciones serán la única forma de modificar el esquema; nunca se usará `synchronize: true`.

## 3. Contrato de registro

### Datos del dueño

La petición recibe:

- nombres;
- apellidos;
- correo electrónico;
- contraseña.

### Datos del negocio

La petición recibe:

- nombre del negocio;
- subdominio;
- giro: bodega, panadería, tienda u otro;
- país, inicialmente Perú;
- color principal opcional.

El contrato no recibe moneda, zona horaria ni nombre de sucursal. Para Perú, el backend asignará:

```text
currency: PEN
timezone: America/Lima
location: Sucursal principal
```

### Endpoint

```http
POST /api/v1/auth/registrations
```

```json
{
  "user": {
    "firstName": "Jair",
    "lastName": "Flores Gamarra",
    "email": "admin@example.com",
    "password": "una contraseña segura"
  },
  "tenant": {
    "name": "Panadería Flores",
    "subdomain": "panaderia-flores",
    "businessType": "BAKERY",
    "country": "PE",
    "primaryColor": "#3AAE9B"
  }
}
```

El backend ejecutará:

1. Normalizar y validar el correo y el subdominio.
2. Crear el tenant en estado `ACTIVE`, respetando la restricción única del subdominio.
3. Crear el usuario dueño con su contraseña hasheada.
4. Crear `Sucursal principal` con `isMain: true` e `isActive: true`.
5. Crear la sesión con el hash del refresh token.
6. Confirmar la transacción.
7. Devolver el usuario, tenant, access token y cookie de refresh.
8. Encolar el correo de bienvenida después del commit.

Si falla cualquiera de los pasos incluidos en la transacción, no queda un registro parcial.

## 4. Color principal

El tenant tendrá `primary_color`, equivalente al `primary_color` usado por Lebenix:

```text
tipo: varchar(7)
formato: #RRGGBB
nullable: sí
```

Reglas:

- La API aceptará cualquier hexadecimal válido con el formato `#RRGGBB`.
- Un valor nulo significa que el tenant no tiene un color personalizado configurado.
- El formato se validará en el DTO y mediante un `CHECK` de PostgreSQL.
- Las respuestas de registro y autenticación incluirán `tenant.primaryColor`.

## 5. Subdominio

El subdominio será la identidad pública estable del negocio y reservará una dirección como `panaderia-flores.dominio.com`. En esta fase solo se implementarán el modelo y su contrato de API.

Reglas:

- será obligatorio y tendrá entre 3 y 63 caracteres;
- se normalizará con `trim` y conversión a minúsculas antes de validarlo;
- comenzará y terminará con una letra minúscula o un número;
- solo admitirá letras ASCII minúsculas, números y guiones intermedios;
- no admitirá nombres reservados como `www`, `api`, `app`, `admin`, `mail`, `dev`, `test`, `support`, `docs`, `assets`, `cdn` o `static`;
- PostgreSQL impondrá `NOT NULL`, un `CHECK` de formato y un índice único;
- la restricción única de la base de datos será la autoridad final frente a registros concurrentes.

Ejemplos válidos:

```text
bodega
bodega-central
tienda123
```

Ejemplos inválidos:

```text
-bodega
bodega-
bodega_central
Bodega Central
api
```

La disponibilidad podrá consultarse antes del registro:

```http
GET /api/v1/auth/subdomains/:subdomain/availability
```

La respuesta distinguirá entre `INVALID`, `RESERVED` y `TAKEN`. Este endpoint reutilizará exactamente la misma normalización y validación que el registro, tendrá rate limiting y no sustituirá la restricción única de PostgreSQL.

```json
{
  "subdomain": "panaderia-flores",
  "available": true,
  "reason": null
}
```

También existirá una consulta pública y mínima para obtener la marca antes de autenticar:

```http
GET /api/v1/auth/tenants/:subdomain/branding
```

Su respuesta solo expondrá `name` y `primaryColor`. Un tenant suspendido seguirá apareciendo como ocupado y podrá devolver su marca; la suspensión se aplicará al autenticar. El subdominio no se usará como autoridad de seguridad: después de autenticar, el tenant siempre se obtendrá del usuario y de su sesión.

```json
{
  "tenant": {
    "name": "Panadería Flores",
    "primaryColor": "#3AAE9B"
  }
}
```

No se implementarán dominios personalizados ni cambios de subdominio en esta fase.

## 6. Modelo de datos inicial

### `tenants`

- `id`: UUID generado por el servidor;
- `name`: `varchar(120)`;
- `subdomain`: `varchar(63)`;
- `business_type`: `varchar(32)` con valores `GROCERY_STORE`, `BAKERY`, `RETAIL_STORE` u `OTHER`;
- `country`: `char(2)`, inicialmente `PE`;
- `currency`: `char(3)`, inicialmente `PEN`;
- `timezone`: `varchar(64)`, inicialmente `America/Lima`;
- `primary_color`: `varchar(7)`, nullable;
- `status`: `varchar(16)` con valores `ACTIVE` o `SUSPENDED`;
- `paid_until`: `date`, nullable e informativo;
- `created_at` y `updated_at`: `timestamptz`.

Los valores cerrados se representarán como enums de TypeScript y columnas `varchar` protegidas mediante `CHECK` de PostgreSQL. Esto evita depender de enums nativos difíciles de modificar.

### `locations`

- `id`: UUID generado por el servidor;
- `tenant_id`: UUID con clave foránea a `tenants`;
- `name`: `varchar(120)`;
- `is_main`: booleano, `false` por defecto;
- `is_active`: booleano, `true` por defecto;
- `created_at` y `updated_at`: `timestamptz`.

PostgreSQL tendrá un índice por `tenant_id` y un índice único parcial que permita como máximo un registro con `is_main = true` por tenant. En esta fase no existirán endpoints para crear más sucursales.

### `users`

- `id`: UUID generado por el servidor;
- `tenant_id`: UUID con clave foránea a `tenants`;
- `first_name`: `varchar(80)`;
- `last_name`: `varchar(120)`;
- `email`: `varchar(254)` normalizado;
- `password_hash`: texto;
- `status`: `varchar(16)` con valores `ACTIVE` o `DISABLED`;
- `last_login_at`: `timestamptz`, nullable;
- `created_at` y `updated_at`: `timestamptz`.

El correo será único globalmente mediante un índice sobre `lower(email)`. El subdominio ofrece contexto de URL y marca, pero no permite que una misma dirección de correo represente cuentas diferentes en distintos tenants.

### Roles y permisos

No se crearán tablas, campos, guards ni decoradores de roles o permisos en esta fase. El único usuario será el dueño que creó el tenant. El modelo de Dueño y Cajero se diseñará después de validar las acciones reales que necesita cada uno.

### `auth_sessions`

- `id`: UUID generado por el servidor;
- `user_id`: UUID con clave foránea a `users`;
- `token_family_id`: UUID compartido por todas las rotaciones de una sesión;
- `refresh_token_hash`: `char(64)` único;
- `expires_at`: `timestamptz`;
- `last_used_at`: `timestamptz`, nullable;
- `revoked_at`: `timestamptz`, nullable;
- `replaced_by_session_id`: UUID nullable con clave foránea a `auth_sessions`;
- `ip_address`: `inet`, nullable;
- `user_agent`: texto, nullable;
- `created_at` y `updated_at`: `timestamptz`.

El refresh token se rota en cada renovación. Si se intenta reutilizar un token rotado o revocado, se revoca la familia de sesión correspondiente.

### `password_reset_tokens`

- `id`: UUID generado por el servidor;
- `user_id`: UUID con clave foránea a `users`;
- `token_hash`: `char(64)` único;
- `expires_at`: `timestamptz`;
- `used_at`: `timestamptz`, nullable;
- `created_at`: `timestamptz`.

La recuperación de contraseña utilizará 32 bytes aleatorios codificados como Base64URL. Solo se guardará su hash SHA-256. Al crear uno nuevo se invalidarán los tokens anteriores todavía utilizables del mismo usuario.

No se usarán JWT para recuperación de contraseña: estos tokens deben poder consumirse una sola vez y revocarse desde la base de datos.

Las claves foráneas de datos del negocio usarán `RESTRICT`; no existirán endpoints para borrar tenants, usuarios o sucursales. Las sesiones y tokens de recuperación, que son datos auxiliares del usuario, usarán `ON DELETE CASCADE`.

## 7. Autenticación y sesiones

El login central utilizará correo y contraseña. Una solicitud de login podrá enviar además el subdominio como contexto opcional; la API lo normalizará y comprobará que corresponde al tenant del usuario. Nunca confiará en él para establecer el contexto de una petición protegida.

Las contraseñas tendrán entre 10 y 128 caracteres. Se permitirán frases largas y no se impondrán reglas artificiales de mayúsculas, números o símbolos. Se usará Argon2id con parámetros centralizados y ajustables después de medirlos en el entorno de despliegue.

### Access token

- JWT firmado con HS256 y un secreto de al menos 32 bytes validado al iniciar la aplicación.
- Duración de 15 minutos.
- Se envía como bearer token.
- Contiene `sub`, `tenantId`, `locationId`, `sessionId`, `tenantStatus`, `jti`, `iss`, `aud`, `iat` y `exp`.
- No contiene roles ni permisos en esta fase.

### Refresh token

- Token opaco de 32 bytes generado con `node:crypto` y codificado como Base64URL.
- Duración de 30 días.
- Se entrega en una cookie host-only llamada `refresh_token`; no se configurará el atributo `Domain`.
- La cookie usará `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Max-Age` de 30 días y `Secure` en producción.
- Se guarda únicamente su hash SHA-256.
- Se rota en cada uso.
- El logout revoca la sesión y elimina la cookie.

La rotación se ejecutará en una transacción que bloquee la sesión actual: valida el token, revoca la fila anterior, crea la siguiente rotación y enlaza `replaced_by_session_id`. Si se reutiliza un token reemplazado o revocado, se revoca toda su familia. Las solicitudes concurrentes se cubrirán con pruebas e2e.

El estado del tenant se consulta durante login y refresh. Un tenant suspendido recibe `403 TENANT_SUSPENDED` y no obtiene tokens nuevos. Un access token emitido antes de la suspensión puede vivir como máximo sus 15 minutos; después, el refresh será rechazado. La reactivación no elimina datos ni sesiones y permite volver a autenticarse.

Al deshabilitar un usuario o cambiar su contraseña se revocarán sus refresh tokens. Los access tokens ya emitidos podrán vivir hasta 15 minutos; esta ventana se acepta para evitar una consulta de sesión en cada petición.

Los endpoints que usan la cookie solo aceptarán `POST`, validarán el origen contra la configuración de CORS y nunca confiarán en datos de tenant provenientes de la cookie o del cuerpo.

## 8. Recuperación de contraseña

```http
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Reglas:

- La solicitud responde igual exista o no el correo, para no revelar cuentas registradas.
- Como el correo es único globalmente, la recuperación no requiere un subdominio.
- El token será aleatorio, de un solo uso y expirará en 30 minutos.
- El correo se enviará mediante una cola.
- Al cambiar la contraseña se revocarán todas las sesiones activas del usuario.
- Un token vencido, usado o inválido devolverá un código de error estable sin revelar detalles internos.

## 9. Multi-tenancy

`nestjs-cls` conservará el contexto de la petición:

```ts
type RequestContext = {
  tenantId: string;
  locationId: string;
  userId: string;
};
```

El registro, login, refresh y recuperación son endpoints públicos o preautenticados y resuelven su tenant explícitamente. En los endpoints protegidos, el contexto se obtiene del usuario autenticado.

`nestjs-cls` no agrega filtros de TypeORM por sí solo. El proyecto tendrá una capa de acceso tenant-aware que:

- añade siempre `tenant_id` a las consultas y escrituras;
- rechaza operaciones sin contexto de tenant cuando la entidad lo requiere;
- no expone repositorios de TypeORM directamente a controladores ni servicios de aplicación;
- permite un contexto explícito y separado para operaciones de plataforma;
- se comprueba con tests e2e que intentan cruzar datos entre dos tenants.

Cada módulo implementará repositorios propios que obtengan `tenantId` del contexto y construyan consultas scoped. Registro, login, refresh, recuperación y operaciones de plataforma usarán repositorios separados y nombrados explícitamente como no scoped. No existirá un repositorio genérico que permita omitir accidentalmente el tenant.

```text
Controller -> Application Service -> Tenant-aware Repository -> TypeORM
```

Las transacciones que atraviesen módulos utilizarán `@nestjs-cls/transactional` con su adaptador de TypeORM.

## 10. Correo y trabajos en segundo plano

Se usarán:

- Nodemailer para SMTP;
- Handlebars para plantillas;
- SendGrid mediante SMTP en desarrollo y producción;
- BullMQ y Redis para ejecutar envíos fuera de la petición y reintentarlos.

SendGrid tendrá una API key propia para este proyecto y limitada al permiso de envío de correo; no se reutilizará la credencial de Lebenix. El remitente o dominio se verificará en SendGrid. Fuera de producción, los asuntos comenzarán con `[DEV]` para identificar claramente los mensajes de prueba.

Plantillas iniciales:

- bienvenida al dueño;
- recuperación de contraseña.

Los jobs se crean después de confirmar la transacción que origina el correo. Un fallo de SendGrid o SMTP no revierte un usuario, tenant o token ya creado.

Los jobs usarán identificadores estables, tres intentos y backoff exponencial. La fase 1 no implementará transactional outbox: si Redis no acepta el job después del commit, el error se registrará en logs y NestJS Observe. El correo de bienvenida es de mejor esfuerzo; una nueva solicitud de recuperación podrá generar y encolar otro token si el envío anterior no llegó.

## 11. Infraestructura y librerías

Antes de registrar controladores funcionales, el bootstrap global configurará:

- prefijo `/api/v1`;
- `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform`;
- filtro global de excepciones para conservar `{ code, message, details }`;
- serialización de respuestas sin contraseñas, hashes ni campos internos;
- Helmet, CORS con orígenes explícitos y `cookie-parser`;
- shutdown hooks para cerrar base de datos, Redis y jobs;
- logs estructurados con redacción de `authorization`, `cookie`, contraseñas y tokens;
- NestJS Observe sin capturar secretos ni cuerpos sensibles.

El código de la aplicación registrará eventos mediante `nestjs-pino`; no llamará directamente a la API de Observe desde controladores o servicios de negocio. Pino escribirá logs JSON en consola y NestJS Observe los centralizará y correlacionará con la petición, su traza, métricas y excepciones. Los logs podrán incluir `requestId`, `tenantId`, `userId`, `sessionId`, nombre de la operación y código de error, pero nunca credenciales ni tokens.

Se usarán los niveles de forma consistente: `info` para operaciones importantes completadas, `warn` para situaciones sospechosas o recuperables, `error` para fallos que requieren atención y `debug` para diagnóstico local. Lanzar una excepción y registrar un evento serán decisiones separadas; no se duplicará el mismo error en cada capa.

El rate limiting usará Redis en producción y claves que combinen IP con el identificador normalizado cuando corresponda. Los límites iniciales serán: registro, 5 por hora; login, 10 por minuto; recuperación, 5 por hora; disponibilidad de subdominio, 30 por minuto; y API general, 300 cada 5 minutos. La IP del cliente solo se aceptará desde proxies de confianza configurados explícitamente.

La configuración validará al iniciar, como mínimo, el entorno, puerto, conexión de PostgreSQL, conexión de Redis, secreto y metadatos de JWT, SMTP, URL para recuperación y orígenes permitidos. Habrá un datasource separado para CLI y migraciones.

### Producción

```text
@nestjs/config
zod
@nestjs/typeorm
typeorm
pg
@nestjs/swagger
nestjs-cls
@nestjs-cls/transactional
@nestjs-cls/transactional-adapter-typeorm
@nestjs/passport
passport
passport-jwt
@nestjs/jwt
argon2
cookie-parser
helmet
class-validator
class-transformer
nestjs-pino
pino-http
nodemailer
handlebars
@nestjs/bullmq
bullmq
@nestjs/throttler
```

No se usará `passport-local`: el login con email y contraseña se implementará explícitamente en `AuthService`; Passport se utilizará para validar el access token JWT y proteger endpoints.

### Desarrollo y pruebas

```text
@types/passport
@types/passport-jwt
@types/cookie-parser
@types/nodemailer
@types/pg
@testcontainers/postgresql
```

Vitest y Supertest ya están configurados.

## 12. Endpoints de esta parte

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

Contratos HTTP iniciales:

- registro: `201 Created`, devuelve usuario, tenant, sucursal, access token y establece la cookie de refresh;
- disponibilidad y branding: `200 OK`; un tenant inexistente en branding devuelve `404 Not Found`;
- login y refresh: `200 OK`, devuelven un access token y establecen la cookie rotada cuando corresponde;
- logout: `204 No Content`, revoca la sesión aunque luego siempre elimina la cookie;
- `/me`: `200 OK`, devuelve el usuario, tenant y sucursal principal autenticados;
- solicitud de recuperación: `202 Accepted` con la misma respuesta exista o no el correo;
- cambio de contraseña: `200 OK` y revocación de todas las sesiones.

Los cuerpos exitosos usarán JSON en `camelCase`. El access token viajará en el cuerpo; el refresh token nunca se incluirá en JSON.

Login recibirá `{ email, password, subdomain? }`; refresh y logout no recibirán tokens en el cuerpo. La recuperación recibirá `{ email }` y el cambio de contraseña recibirá `{ token, password, passwordConfirmation }`.

Registro y login devolverán esta forma, construida mediante DTOs de respuesta explícitos:

```json
{
  "user": {
    "id": "uuid",
    "firstName": "Jair",
    "lastName": "Flores Gamarra",
    "email": "admin@example.com",
    "status": "ACTIVE"
  },
  "tenant": {
    "id": "uuid",
    "name": "Panadería Flores",
    "subdomain": "panaderia-flores",
    "businessType": "BAKERY",
    "country": "PE",
    "currency": "PEN",
    "timezone": "America/Lima",
    "primaryColor": "#3AAE9B",
    "status": "ACTIVE"
  },
  "location": {
    "id": "uuid",
    "name": "Sucursal principal",
    "isMain": true
  },
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

Refresh devolverá solo `{ accessToken, tokenType, expiresIn }`; `/me` devolverá `{ user, tenant, location }`. Logout será idempotente: aunque la cookie no exista o la sesión ya esté revocada, eliminará la cookie y responderá `204`.

Esta fase no expone endpoints de administración de tenants. Su estado se consulta y modifica directamente desde el REPL de NestJS con el repositorio de TypeORM.

## 13. Errores estables

Todos los errores conservan la forma:

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "No se pudo iniciar sesión",
  "details": null
}
```

Códigos iniciales:

- `VALIDATION_ERROR`;
- `EMAIL_ALREADY_REGISTERED`;
- `INVALID_SUBDOMAIN`;
- `SUBDOMAIN_RESERVED`;
- `SUBDOMAIN_ALREADY_TAKEN`;
- `INVALID_CREDENTIALS`;
- `INVALID_OR_EXPIRED_TOKEN`;
- `SESSION_REVOKED`;
- `TENANT_NOT_FOUND`;
- `TENANT_SUSPENDED`;
- `USER_DISABLED`.

Los errores de validación usarán `400`; credenciales y sesiones no válidas, `401`; tenant suspendido o usuario deshabilitado, `403`; recursos públicos inexistentes, `404`; y conflictos de unicidad, `409`. Las restricciones de PostgreSQL tendrán nombres estables para traducir una carrera de correo o subdominio al código de dominio correcto.

Para `VALIDATION_ERROR`, `details` será una lista de objetos `{ field, code, message }`. Fuera de validación, `details` será `null` salvo que un contrato documente expresamente otra estructura.

## 14. Pruebas mínimas de aceptación

- El registro crea tenant, dueño, sesión y `Location` principal.
- Si falla la creación de cualquier elemento, la transacción no deja registros parciales.
- El registro devuelve acceso inmediato aunque el envío de bienvenida falle.
- Un correo duplicado no puede registrarse bajo diferencias de mayúsculas o espacios.
- El subdominio se normaliza, rechaza formatos y nombres reservados, y permanece único ante registros concurrentes.
- La disponibilidad y el registro aplican exactamente las mismas reglas al subdominio.
- La consulta pública de marca no expone campos internos del tenant.
- Una contraseña nunca aparece en respuestas, logs ni entidades serializadas.
- Login, refresh rotativo y logout funcionan correctamente.
- Dos refresh concurrentes no pueden crear dos ramas válidas de la misma sesión.
- Un refresh token revocado o reutilizado no genera una sesión nueva.
- La recuperación no revela si un correo existe.
- Un token de recuperación no puede utilizarse dos veces.
- Cambiar la contraseña revoca las sesiones existentes.
- Un usuario de un tenant no puede leer ni modificar datos de otro tenant.
- Solo existe una `Location` principal por tenant.
- Un tenant suspendido recibe `TENANT_SUSPENDED` al iniciar sesión o intentar renovar; un access token anterior deja de servir al vencer.
- Un `primaryColor` inválido se rechaza y uno válido aparece en la respuesta autenticada.
- Contraseñas, cabeceras de autorización, cookies y tokens no aparecen en logs, trazas ni errores.

Las pruebas de integración usarán PostgreSQL real con Testcontainers para comprobar transacciones, índices parciales, restricciones y aislamiento. Las pruebas de cola que necesiten verificar reintentos usarán Redis real; las pruebas HTTP que no evalúen BullMQ sustituirán el productor de correo por un fake.

## 15. Fuera de alcance

- planes y suscripciones;
- pagos automáticos;
- múltiples sucursales visibles;
- roles y permisos;
- cajeros e invitaciones de usuarios;
- login social y MFA;
- dominios personalizados y cambios de subdominio;
- sincronización de operaciones offline;
- productos, ventas, gastos y fiados;
- otros datos de configuración de marca.

## 16. Orden de implementación

1. Configuración validada y Docker Compose con PostgreSQL y Redis.
2. Bootstrap global, errores uniformes, seguridad HTTP, logs y redacción de secretos.
3. TypeORM, datasource, comandos y migraciones iniciales.
4. Entidades de tenant, usuario, `Location`, sesiones y recuperación, incluidas sus restricciones.
5. Contexto multi-tenant, repositorios scoped y transacciones propagadas.
6. Registro atómico, disponibilidad y consulta pública de marca.
7. Login, refresh rotativo, `/me` y logout.
8. Cola de correo y bienvenida.
9. Recuperación de contraseña.
10. Suspensión del tenant desde el REPL de NestJS.
11. Tests e2e de aislamiento, concurrencia y seguridad.

## 17. Pendientes de esta fase

- Crear una API key restringida y verificar el remitente o dominio de este proyecto en SendGrid.
- Definir los orígenes y dominios finales para cerrar la configuración de CORS y cookies.
- Medir Argon2id en el entorno de despliegue y ajustar sus parámetros sin cambiar el contrato de contraseñas.

Los roles, permisos y el flujo de cajeros son decisiones posteriores y no bloquean esta fase.
