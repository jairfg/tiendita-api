# Producto: sistema de ventas para pequeños negocios

> Definición del producto. Última actualización: 27 de octubre de 2026.
>
> **Estado:** alcance de la versión 1 definido. Todavía no se empezó a programar.

## 1. Qué es

Un sistema de ventas (punto de venta) en la nube, multi-negocio (multi-tenant), para pequeños negocios en Perú que todavía llevan sus ventas, gastos y fiados en un cuaderno: bodegas, tiendas y panaderías pequeñas.

El proyecto tiene dos objetivos:

1. Aprender NestJS construyendo una aplicación completa, con las tecnologías y prácticas que se usan en el trabajo.
2. Tener un producto real que se pueda ofrecer y, más adelante, vender.

## 2. Cliente objetivo

- El dueño también atiende la caja; a veces tiene 1 o 2 ayudantes.
- Tiene un solo local.
- Usa el celular más que una computadora.
- Anota ventas, gastos y fiados en un cuaderno, o no anota nada.
- Cobra en efectivo, Yape y Plin.
- Tiene internet inestable.
- No tiene paciencia para configurar: si algo es más lento que el cuaderno, lo abandona.

**Primer negocio piloto:** una panadería pequeña de la familia. Lo usa gratis a cambio de dar feedback (_design partner_).

## 3. Principios de diseño

1. **Útil en los primeros 10 minutos.** Se puede vender sin haber cargado ningún producto.
2. **Registrar una venta es más rápido que no registrarla.** Máximo 3 toques o 5 segundos.
3. **Mobile-first.**
4. **Nunca deja de vender por falta de internet.**
5. **Simple primero.** Lo que no se necesita hoy no se muestra, aunque el modelo de datos se prepara cuando hacerlo es barato.

## 4. Modelo de negocio

- Piloto gratuito con los primeros negocios.
- Después, cobro directo por transferencia bancaria. No hay tarjeta, ni pagos recurrentes automáticos, ni planes, ni "plan free".
- El dueño se registra, crea su negocio y accede directamente. El negocio empieza en estado `ACTIVO`.
- En la fase base, la suspensión y reactivación se hacen desde el REPL de NestJS cambiando el estado del tenant. No requieren una interfaz de super admin.
- Las condiciones se comunican desde el primer día, por ejemplo: "gratis durante el piloto; después S/ X al mes; precio de fundador para los primeros 10 negocios".
- Los planes y suscripciones se implementan recién cuando haya 2 o 3 negocios pagando.

## 5. Roles y permisos

**Plataforma**

- **Super admin** (el dueño de la plataforma): controla el acceso de los negocios y ve su actividad.

**Dentro de cada negocio**

- **Dueño**: control total de su negocio.
- **Cajero**: vende y registra el día a día.

Regla de código: se verifican **permisos** (`sale:void`), nunca nombres de rol (`role === 'ADMIN'`). Los roles solo agrupan permisos, así que agregar roles después es configuración, no reescritura.

Este modelo no forma parte de la fase base. Primero se implementará el acceso del dueño; los roles, permisos, cajeros e invitaciones se diseñarán después de validar sus necesidades. La siguiente tabla es solo una propuesta inicial para la versión 1:

| Acción                                    | Dueño    | Cajero          |
| ----------------------------------------- | -------- | --------------- |
| Registrar ventas, incluida la venta libre | ✅       | ✅              |
| Anular ventas                             | ✅       |                 |
| Registrar gastos                          | ✅       | ✅              |
| Registrar fiados y abonos                 | ✅       | ✅              |
| Corregir deudas                           | ✅       |                 |
| Crear y editar productos y precios        | ✅       |                 |
| Ver el resumen del día                    | completo | solo sus ventas |
| Exportar a Excel                          | ✅       |                 |
| Invitar y desactivar cajeros              | ✅       |                 |

## 6. Alcance de la versión 1

### 6.1 Panel de super admin

- Ver y administrar los negocios creados mediante el registro público.
- Negocio demo con datos de ejemplo, para mostrar el sistema a posibles clientes.
- Estado del negocio: `ACTIVO` o `SUSPENDIDO`, cambiado a mano.
- Fecha "pagado hasta": solo informativa, no bloquea nada automáticamente. Los negocios se listan ordenados por esa fecha.
- Registro de pagos recibidos (opcional): fecha, monto, medio y nota.
- Actividad por negocio: última venta registrada y ventas por día.
- Importación de productos de un negocio desde CSV, para hacer el onboarding asistido.
- Plantillas de productos iniciales según el giro (bodega, panadería…). Son datos iniciales, no módulos por rubro.

**Al suspender un negocio:**

- Sus datos no se tocan.
- Los usuarios pueden presentar sus credenciales, pero login y refresh responden `403` con el código `TENANT_SUSPENDED` y no emiten tokens nuevos. El frontend muestra "Cuenta suspendida, comunícate con…".
- El estado se revisa al iniciar sesión y en cada renovación del token. Como el access token dura unos 15 minutos, la suspensión se aplica como máximo en ese tiempo, sin consultar la base de datos en cada petición.
- Al reactivar, todo vuelve tal cual.

### 6.2 Cuenta y usuarios

- Registro público del dueño en dos pasos visuales: primero su cuenta y después su negocio. Los dos pasos viven solo en el frontend; al finalizar se envía una única petición al backend.
- El segundo paso solicita el nombre, subdominio, giro, país y color principal del negocio. El subdominio es único y reserva su futura URL; el color se guarda en el tenant con formato `#RRGGBB` y personaliza la interfaz.
- El registro crea el negocio, el usuario dueño, su sesión y la sucursal principal dentro de una sola transacción. Si algo falla, no queda ninguna cuenta o negocio creado a medias.
- El negocio empieza en estado `ACTIVO` y el dueño accede directamente al sistema al terminar el registro.
- El correo de bienvenida se envía después de confirmar la transacción y un fallo del correo no revierte el registro.
- Login con email y contraseña, access token + refresh token, y logout.
- Recuperación de contraseña.
- El dueño invita por email y desactiva cajeros. El cajero invitado define su contraseña antes de entrar.

### 6.3 Locales

- Cada negocio tiene un modelo `Location`, aunque en la versión 1 solo exista un local.
- Durante el registro se crea automáticamente `Sucursal principal`, con `is_main: true` e `is_active: true`.
- La sucursal no se selecciona ni se configura en la interfaz de la versión 1: todas las operaciones usan automáticamente la principal.
- Ventas, gastos, caja, correlativos y el futuro inventario pertenecen a una sucursal. Productos, clientes y usuarios pertenecen al negocio completo.

### 6.4 Productos

- Nombre, precio, categoría, unidad de medida (unidad, kg…) y código de barras opcional.
- Favoritos, ordenados según cuánto se venden.
- Búsqueda por nombre o código.
- Venta por unidad, por peso (cantidades decimales) o por monto: con "un sol de pan", el sistema calcula la cantidad.
- Tipo de afectación del IGV, gravado por defecto (preparación para SUNAT).
- En la versión 1 no se controla stock.

### 6.5 Ventas

- Venta rápida: grilla de favoritos, búsqueda y teclado numérico.
- **Venta libre por monto**, sin producto ("varios S/5").
- Medios de pago: efectivo (con cálculo del vuelto), Yape, Plin y tarjeta.
- Numeración interna con serie y correlativo (`NV01-000123`), sin huecos ni duplicados.
- Cliente opcional; es obligatorio solo si la venta es al fiado.
- Cada línea guarda una copia de los datos al momento de vender (precio, base imponible, IGV y tipo de afectación), aunque después cambie el producto.
- **Una venta nunca se borra.** La anulación es un registro aparte que revierte sus efectos en los totales.

### 6.6 Gastos

- Salida de dinero con concepto, monto, medio de pago y categoría opcional (proveedor, servicios, otros).
- Cubre lo que el dueño paga con plata de la caja (al proveedor del pan, la luz…). Sin esto, el efectivo del día no cuadra.

### 6.7 Clientes y fiados

- Cliente con nombre y teléfono; el documento de identidad es opcional.
- Toda la venta, o una parte, puede quedar como fiado.
- Abonos parciales, cada uno con su medio de pago.
- Saldo por cliente y lista de quién debe cuánto.
- Recordatorio por WhatsApp: un enlace `wa.me` con el mensaje ya escrito, que el dueño envía desde su celular. No se usa la API de WhatsApp.

### 6.8 Resumen del día

- Cuánto se vendió, en total y por medio de pago.
- Cuánto se gastó.
- Cuánto efectivo debería haber en la caja.
- Cuánto entró por Yape, Plin y tarjeta.
- Cuánto se fió y cuánto se cobró de fiados.
- Ganancia aproximada = ventas − gastos.
- Productos más vendidos.
- Consulta de días anteriores.

### 6.9 Uso sin internet

- Se pueden registrar ventas y abonos sin conexión y se sincronizan al volver.
- El catálogo queda guardado en el dispositivo para consultarlo sin conexión.
- Preparación en la API:
  - los IDs los genera el cliente (UUID v7);
  - cada operación lleva una clave de idempotencia, para que un reintento no duplique la venta;
  - hay un endpoint de sincronización.

### 6.10 Exportación

- Ventas, gastos, fiados y productos a Excel. Da confianza: "¿y si la app desaparece?".

### 6.11 Legal

- Términos de uso y política de privacidad antes del primer usuario que no sea del piloto familiar. Se guardan datos personales de los clientes de cada negocio (nombres, teléfonos y deudas), protegidos por la Ley 29733.

## 7. Versión 2 (cuando la versión 1 se use a diario)

- Stock opcional por producto, ingresos de mercadería como movimientos del kardex y alertas de stock bajo.
- Costo por producto y margen.
- Cierre de caja con arqueo: lo esperado, lo contado y la diferencia.
- Catálogo compartido por código de barras: entre negocios solo se comparten el nombre y el código, nunca precios ni stock.
- Ticket por WhatsApp. Debe indicar que **no es un comprobante de pago**.

### Modelo de inventario

El stock no es un campo de `products`. Vive en dos tablas propias:

- **`stock_movements` (kardex):** cada entrada o salida es un registro que nunca se modifica ni se borra, y es la fuente de verdad. Cada movimiento guarda:
  - el tipo: `INITIAL`, `SALE`, `SALE_VOID`, `INGRESO` o `ADJUSTMENT` (este último con motivo: merma, conteo, vencido);
  - la cantidad con signo y el costo unitario opcional;
  - una referencia al documento que lo generó;
  - `occurred_at` (cuándo pasó en el dispositivo) y `created_at` (cuándo llegó al servidor).
- **`stock_levels` (saldo):** cantidad actual y costo promedio por producto y sucursal. Es un dato derivado que se actualiza en la misma transacción que cada movimiento, con un `INSERT … ON CONFLICT DO UPDATE` atómico, así dos ventas simultáneas nunca se pisan.

Reglas:

- **Nunca se bloquea una venta por falta de stock.** Se permite el stock negativo y se muestra una alerta. Una venta hecha sin internet ya ocurrió, y en estos negocios el stock del sistema casi nunca es exacto.
- La venta y su movimiento se registran en la misma transacción.
- Anular una venta genera movimientos inversos; el original no se toca.
- El kardex se ordena por `occurred_at`, porque las ventas offline llegan tarde y desordenadas. Por eso tampoco se guarda un "saldo después del movimiento" en cada fila.
- Un job o test verifica que la suma de los movimientos coincida con el saldo. Si no coinciden, manda el kardex y el saldo se recalcula.
- En la v2, `products` solo suma la columna `track_stock` (falsa por defecto). Ventas y productos existentes no cambian.
- Las variantes (talla, color) no se contemplan por ahora.

## 8. Fuera de alcance por ahora

| Qué                                               | Por qué                                                       | Qué se prepara desde ya                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comprobantes electrónicos SUNAT                   | Muchos de estos negocios todavía no los emiten, y es complejo | Afectación del IGV por producto, desglose de impuestos por línea, documento del cliente, serie y correlativo, anulaciones como registro aparte (más adelante, notas de crédito) |
| Planes y suscripciones                            | El cobro es manual hasta tener 2 o 3 negocios pagando         | Estado del negocio y fecha "pagado hasta"                                                                                                                                       |
| Compras y proveedores                             | No los necesita el cliente objetivo                           | En la versión 2, el stock entra con un movimiento simple de "ingreso"                                                                                                           |
| Varias sucursales                                 | El cliente objetivo tiene un solo local                       | El modelo `Location` existe desde la versión 1; cada negocio tiene una `Sucursal principal` oculta en la interfaz, a la que apuntan ventas, gastos, caja, correlativos y stock  |
| Roles avanzados (encargado, almacenero, contador) | Con 2 roles alcanza                                           | Permisos por código                                                                                                                                                             |
| Módulos por rubro (panadería, etc.)               | Primero la base general                                       | Monolito modular con fronteras claras entre módulos. El mecanismo para activar módulos por negocio se construye junto con el primer módulo de rubro                             |

## 9. Reglas técnicas transversales

- **Aislamiento entre negocios:**
  - todas las tablas llevan `tenantId`, y se aplica automáticamente en cada consulta con `nestjs-cls`;
  - hay tests e2e que comprueban que un negocio nunca ve datos de otro;
  - Row Level Security de Postgres como segunda barrera queda para después del piloto: con TypeORM y un pool de conexiones agrega bastante complejidad.
- **Dinero:** columnas `numeric` en la base de datos y `decimal.js` en el código. Nunca `float`.
- **Precios con IGV incluido**, como se cobra al público en Perú:
  - en productos gravados, la base de cada línea es total / 1.18 redondeada a 2 decimales, y el IGV es total − base;
  - en productos exonerados o inafectos, la base es el total.
- **Zona horaria:**
  - las fechas se guardan como `timestamptz`;
  - cada negocio tiene su zona horaria (`America/Lima`), y el "día" del resumen se calcula con ella, no en UTC.
- **Nada se borra:** ventas, abonos y gastos se anulan con un registro aparte.
- **Idempotencia:** toda operación que crea algo desde el POS acepta una clave de idempotencia.
- **Concurrencia:** el correlativo se asigna dentro de una transacción con bloqueo.
- **Registro atómico:** una sola transacción crea el negocio, el dueño, su sesión y la sucursal principal. El correo de bienvenida se envía solo después de confirmar la transacción.
- **Sucursal principal:** un índice único parcial de Postgres garantiza como máximo un `Location` con `is_main = true` por negocio. `is_main` es falso por defecto y se asigna explícitamente al crear la sucursal principal.
- **Color del negocio:** `primary_color` es opcional y, cuando existe, tiene el formato `#RRGGBB`. Si no existe, el frontend usa el color predeterminado del producto.
- **Permisos futuros:** cuando se implemente la autorización de Dueño y Cajero, el código comprobará permisos, no nombres de rol.
- **Copia de datos al vender:** una venta no cambia si después cambia el producto.
- **API versionada y errores uniformes:**
  - todas las rutas cuelgan de `/api/v1`;
  - los errores tienen siempre la forma `{ code, message, details }`, con códigos estables como `TENANT_SUSPENDED`, porque la app del celular depende de ellos.
- **Solo migraciones:** nunca `synchronize: true`.
- **Columnas de auditoría:** todas las tablas persistentes llevan `created_at` y, cuando pueden cambiar, `updated_at`; las operaciones de negocio guardan `created_by` cuando existe un actor autenticado. Tokens y sesiones conservan su usuario, IP y user agent en campos propios.
- **Fronteras entre módulos:**
  - un módulo nunca consulta las tablas de otro, solo usa su servicio;
  - las transacciones que cruzan módulos se comparten con `@nestjs-cls/transactional`.
- **Registro de decisiones:** cada decisión técnica importante se anota con su porqué en `docs/decisiones/` (formato ADR).

## 10. Stack técnico

| Área                                                           | Tecnología                                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework                                                      | NestJS 12 (ESM), ya configurado                                                                                        |
| Base de datos                                                  | PostgreSQL con Docker Compose                                                                                          |
| ORM                                                            | TypeORM con migraciones                                                                                                |
| Contexto por petición (tenant actual)                          | `nestjs-cls`                                                                                                           |
| Configuración                                                  | `@nestjs/config` con las variables de entorno validadas                                                                |
| Autenticación                                                  | `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`; contraseñas con argon2                                              |
| Validación                                                     | `class-validator` y `class-transformer` con `ValidationPipe` global                                                    |
| Documentación de la API                                        | `@nestjs/swagger`                                                                                                      |
| Seguridad                                                      | helmet, CORS y `@nestjs/throttler`                                                                                     |
| Logs                                                           | `Logger` y `ConsoleLogger` nativos de NestJS 12; JSON estructurado en producción                                       |
| Observabilidad                                                 | NestJS Observe, ya configurado (ver `AGENTS.md`)                                                                       |
| Dinero                                                         | `decimal.js`                                                                                                           |
| Excel                                                          | `exceljs`                                                                                                              |
| Emails (bienvenida, invitaciones y recuperación de contraseña) | Nodemailer y SendGrid SMTP en desarrollo y producción; mailer falso en pruebas                                         |
| Tests                                                          | Vitest y supertest                                                                                                     |
| Lint y formato                                                 | oxlint y Prettier, ya configurados                                                                                     |
| CI                                                             | GitHub Actions                                                                                                         |
| Colas y caché                                                  | Redis y BullMQ; se incorporan en la fase base para el envío de correos                                                 |
| Frontend                                                       | Aplicación web responsive y mobile-first, reutilizando componentes de Lebenix; evolucionará a PWA para el modo offline |

## 11. Fases de desarrollo de la versión 1

1. **Base del backend:**
   - [Diseño detallado de la fase base](./fase-1-base.md).
   - Docker Compose (Postgres y Redis), configuración, TypeORM con migraciones, Swagger, logs JSON, NestJS Observe y helmet.
   - Registro público y atómico del negocio, dueño, sesión y `Location` principal, con acceso inmediato y correo de bienvenida.
   - Multi-tenant; login, renovación de sesión, logout y recuperación de contraseña.
   - Estado `ACTIVE` o `SUSPENDED` del tenant administrado desde el REPL de NestJS; sin panel de super admin.
   - Tests de aislamiento entre negocios.
2. **Productos:** catálogo, favoritos, venta por monto y por peso, plantillas por giro e importación desde CSV.
3. **Ventas y gastos:** venta rápida, medios de pago, numeración, anulaciones, gastos, idempotencia y sincronización offline.
4. **Clientes y fiados:** deudas, abonos y recordatorio por WhatsApp.
5. **Resumen del día y exportación a Excel.**

Los términos de uso y la política de privacidad tienen que estar listos antes del primer usuario fuera del piloto familiar.

## 12. Competencia y referencias

| Producto                                                  | Qué es                                                                                                                          | Qué estudiar                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Treinta](https://apps.apple.com/pe/app/app/id1644703591) | App gratuita (con compras dentro de la app) para registrar ventas, gastos, deudas, inventario y reportes. Pasó por Y Combinator | Es lo más parecido a la versión 1: estudiar su flujo de venta y de deudas    |
| Bsale                                                     | POS, inventario, facturación electrónica y ecommerce por suscripción. Chilena, con unos 1,500 clientes en Perú en 2025          | Alcance, onboarding, planes y la documentación de su API                     |
| Siigo POS                                                 | POS con facturación electrónica                                                                                                 | Precios según la cantidad de comprobantes al mes                             |
| Alegra                                                    | Facturación y contabilidad                                                                                                      | Onboarding                                                                   |
| Loyverse                                                  | POS gratuito muy usado por negocios chicos                                                                                      | La experiencia del cajero: vender rápido con pocos toques                    |
| Odoo                                                      | ERP de código abierto                                                                                                           | Leer el código de `point_of_sale`, `stock` y `mrp` y su localización peruana |
| Nubefact                                                  | Proveedor para emitir comprobantes ante SUNAT por API                                                                           | Candidato para la integración futura con SUNAT                               |

**Diferenciación:** la cercanía, no las funcionalidades. Onboarding presencial (se cargan los productos del negocio por él), una capacitación de 15 minutos y soporte directo por WhatsApp.

**Contexto de mercado:** según un estudio de Xplora citado por Perú Retail, solo el 28% de las bodegas usa algún aplicativo, y eso incluye apps para pedir mercadería.

## 13. Validación

**Antes de programar**

- Usar Treinta como si se tuviera una bodega.
- Conversar unos 20 minutos con la dueña de la panadería piloto y con 2 o 3 bodegueros: cómo anotan hoy las ventas, los gastos y los fiados, y qué les quita más tiempo.

**Piloto**

- La panadería lo usa durante 2 semanas antes de ofrecerlo a otros negocios.
- Se considera que funciona si en 4 semanas se cumplen las tres condiciones:
  - registra ventas al menos 5 de cada 7 días;
  - lo registrado se acerca al efectivo real de cada día;
  - deja de usar el cuaderno de fiados.

## 14. Ideas para más adelante

- **Módulo de panadería:** recetas con insumos y costo real por unidad, producción diaria, merma, pedidos por encargo (con adelanto y saldo) y ventas a bodegas con precio mayorista. Si se venden productos envasados, cálculo de información nutricional y octógonos a partir de la receta.
- **SUNAT:** boletas, facturas y notas de crédito a través de un OSE/PSE, y consulta de RUC y DNI para autocompletar los datos del cliente.
- **Suscripciones:** cobro con Culqi, Niubiz, Izipay o Mercado Pago.
- **Gestión:** compras, proveedores, varias sucursales, roles avanzados y roles personalizados.
- **Canales:** tienda online sincronizada con el inventario e integración con la API de WhatsApp.

## 15. Pendientes por definir

- Precio después del piloto y condiciones del precio de fundador.
- Nombre del producto.
- Tecnología y repositorio del frontend.
- Permisos del cajero, a validar con el piloto.

## Fuentes

- [Treinta en la App Store (Perú)](https://apps.apple.com/pe/app/app/id1644703591)
- [Emprendedor: Treinta, app para micronegocios](https://emprendedor.com/treinta-crearon-aplicacion-ayudar-a-los-micronegocios/)
- [La República: Bsale busca digitalizar a 2000 pymes en Perú](https://larepublica.pe/economia/2025/09/04/bsale-busca-digitalizar-a-2000-pymes-en-peru-y-facturar-us15-millones-en-2025-hnews-136872)
- [Siigo POS Perú](https://www.siigo.com/pe/sistema-punto-de-venta-pos/)
- [Perú Retail: el 28% de las bodegas utiliza algún aplicativo](https://www.peru-retail.com/el-28-de-las-bodegas-peruanas-utiliza-algun-aplicativo-para-impulsar-sus-ventas/)
