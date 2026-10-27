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
- Cada tenant tendrá un `primaryColor` como dato de configuración de marca.
- Cada tenant tendrá una sola `Location`: `Sucursal principal`.
- El access token será JWT y tendrá una duración aproximada de 15 minutos.
- El refresh token será opaco, rotativo, se guardará como hash y viajará en una cookie `HttpOnly`.
- Las contraseñas se guardarán con Argon2.
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
- giro: bodega, panadería, tienda u otro;
- país, inicialmente Perú;
- color principal opcional.

El contrato no recibe subdominio, moneda, zona horaria ni nombre de sucursal. Para Perú, el backend asignará:

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
    "businessType": "BAKERY",
    "country": "PE",
    "primaryColor": "#3AAE9B"
  }
}
```

El backend ejecutará:

1. Normalizar y validar el correo.
2. Crear el tenant en estado `ACTIVE`.
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

## 5. Modelo de datos inicial

### `tenants`

- `id`;
- `name`;
- `business_type`;
- `country`;
- `currency`;
- `timezone`;
- `primary_color`;
- `status`: `ACTIVE` o `SUSPENDED`;
- `paid_until`, nullable e informativo;
- columnas de auditoría.

### `locations`

- `id`;
- `tenant_id`;
- `name`;
- `is_main`;
- `is_active`;
- columnas de auditoría.

PostgreSQL tendrá un índice único parcial que permita como máximo un registro con `is_main = true` por tenant. En esta fase no existirán endpoints para crear más sucursales.

### `users`

- `id`;
- `tenant_id`;
- `first_name`;
- `last_name`;
- `email` normalizado;
- `password_hash`;
- `status`: `ACTIVE` o `DISABLED`;
- fecha del último acceso;
- columnas de auditoría.

Como el login no utiliza subdominio ni selector de negocio, el correo será único globalmente mediante un índice sobre `lower(email)`.

### Roles y permisos

No se crearán tablas, campos, guards ni decoradores de roles o permisos en esta fase. El único usuario será el dueño que creó el tenant. El modelo de Dueño y Cajero se diseñará después de validar las acciones reales que necesita cada uno.

### `auth_sessions`

- `id`;
- `user_id`;
- `token_family_id`;
- `refresh_token_hash`;
- `expires_at`;
- `last_used_at`;
- `revoked_at`;
- `replaced_by_session_id`, nullable;
- IP y user agent como información de seguridad;
- columnas de auditoría.

El refresh token se rota en cada renovación. Si se intenta reutilizar un token rotado o revocado, se revoca la familia de sesión correspondiente.

### Tokens de un solo uso

La recuperación de contraseña utilizará tokens aleatorios de alta entropía. Solo se guardará su hash SHA-256, junto con su expiración y fecha de uso.

No se usarán JWT para recuperación de contraseña: estos tokens deben poder consumirse una sola vez y revocarse desde la base de datos.

## 6. Autenticación y sesiones

### Access token

- JWT firmado por la API.
- Duración aproximada de 15 minutos.
- Se envía como bearer token.
- Contiene como mínimo `sub`, `tenantId`, `locationId`, `permissions` y el estado del tenant necesario para aplicar una suspensión sin consultar la base en cada petición.

### Refresh token

- Token opaco generado con `node:crypto`.
- Se entrega en una cookie `HttpOnly` y `Secure` en producción.
- Se guarda únicamente su hash SHA-256.
- Se rota en cada uso.
- El logout revoca la sesión y elimina la cookie.

El estado del tenant se consulta durante login y refresh. De este modo, una suspensión se aplica como máximo cuando expire el access token vigente.

## 7. Recuperación de contraseña

```http
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Reglas:

- La solicitud responde igual exista o no el correo, para no revelar cuentas registradas.
- El token será aleatorio, de un solo uso y con expiración corta.
- El correo se enviará mediante una cola.
- Al cambiar la contraseña se revocarán todas las sesiones activas del usuario.
- Un token vencido, usado o inválido devolverá un código de error estable sin revelar detalles internos.

## 8. Multi-tenancy

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
- no expone repositorios tenant-owned directamente a controladores;
- permite un contexto explícito y separado para operaciones de plataforma;
- se comprueba con tests e2e que intentan cruzar datos entre dos tenants.

Las transacciones que atraviesen módulos utilizarán `@nestjs-cls/transactional` con su adaptador de TypeORM.

## 9. Correo y trabajos en segundo plano

Se usarán:

- Nodemailer para SMTP;
- Handlebars para plantillas;
- Mailpit en desarrollo;
- BullMQ y Redis para ejecutar envíos fuera de la petición y reintentarlos.

Plantillas iniciales:

- bienvenida al dueño;
- recuperación de contraseña.

Los jobs se crean después de confirmar la transacción que origina el correo. Un fallo de SMTP no revierte un usuario, tenant o token ya creado.

## 10. Librerías

### Producción

```text
@nestjs/config
zod
@nestjs/typeorm
typeorm
pg
nestjs-cls
@nestjs-cls/transactional
@nestjs-cls/transactional-adapter-typeorm
@nestjs/passport
passport
passport-jwt
@nestjs/jwt
argon2
cookie-parser
class-validator
class-transformer
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

## 11. Endpoints de esta parte

```text
POST /api/v1/auth/registrations
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Esta fase no expone endpoints de administración de tenants. Su estado se consulta y modifica directamente desde el REPL de NestJS con el repositorio de TypeORM.

## 12. Errores estables

Todos los errores conservan la forma:

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "No se pudo iniciar sesión",
  "details": null
}
```

Códigos iniciales:

- `EMAIL_ALREADY_REGISTERED`;
- `INVALID_CREDENTIALS`;
- `INVALID_OR_EXPIRED_TOKEN`;
- `SESSION_REVOKED`;
- `TENANT_SUSPENDED`;
- `USER_DISABLED`.

## 13. Pruebas mínimas de aceptación

- El registro crea tenant, dueño, sesión y `Location` principal.
- Si falla la creación de cualquier elemento, la transacción no deja registros parciales.
- El registro devuelve acceso inmediato aunque el envío de bienvenida falle.
- Un correo duplicado no puede registrarse bajo diferencias de mayúsculas o espacios.
- Una contraseña nunca aparece en respuestas, logs ni entidades serializadas.
- Login, refresh rotativo y logout funcionan correctamente.
- Un refresh token revocado o reutilizado no genera una sesión nueva.
- La recuperación no revela si un correo existe.
- Un token de recuperación no puede utilizarse dos veces.
- Cambiar la contraseña revoca las sesiones existentes.
- Un usuario de un tenant no puede leer ni modificar datos de otro tenant.
- Solo existe una `Location` principal por tenant.
- Un tenant suspendido recibe `TENANT_SUSPENDED` después de renovar o vencer su access token.
- Un `primaryColor` inválido se rechaza y uno válido aparece en la respuesta autenticada.

Las pruebas de integración usarán PostgreSQL real con Testcontainers para comprobar transacciones, índices parciales, restricciones y aislamiento.

## 14. Fuera de alcance

- planes y suscripciones;
- pagos automáticos;
- múltiples sucursales visibles;
- roles y permisos;
- cajeros e invitaciones de usuarios;
- login social y MFA;
- sincronización de operaciones offline;
- productos, ventas, gastos y fiados;
- otros datos de configuración de marca.

## 15. Orden de implementación

1. Configuración validada y Docker Compose con PostgreSQL, Mailpit y Redis.
2. TypeORM, datasource y migraciones iniciales.
3. Entidades de tenant, usuario, `Location` y sesiones.
4. Contexto multi-tenant y transacciones propagadas.
5. Registro atómico y acceso inmediato.
6. Login, refresh rotativo, `/me` y logout.
7. Cola de correo y bienvenida.
8. Recuperación de contraseña.
9. Suspensión del tenant desde el REPL de NestJS.
10. Tests e2e de aislamiento, concurrencia y seguridad.

## 16. Pendientes de esta fase

- Elegir el proveedor SMTP de producción.
- Definir si `primary_color` conservará `null` o tendrá un valor predeterminado en la base de datos.
- Definir los tiempos exactos de expiración del refresh token y recuperación.
- Definir los orígenes y dominios finales para cerrar la configuración de CORS y cookies.

Los roles, permisos y el flujo de cajeros son decisiones posteriores y no bloquean esta fase.
