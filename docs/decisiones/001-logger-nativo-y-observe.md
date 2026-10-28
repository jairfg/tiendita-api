# ADR 001: Logger nativo de NestJS con NestJS Observe

- Estado: aceptada
- Fecha: 2026-10-28

## Contexto

NestJS 12 incorporó logs JSON y parámetros estructurados en su logger nativo. NestJS Observe integra directamente este logger, agrega el `traceId` de la operación y puede enviar los logs al dashboard con redacción.

La integración con un logger externo como Pino requeriría propagar manualmente el contexto de Observe y añadiría otra capa de configuración.

## Decisión

La aplicación usará `Logger` y `ConsoleLogger` de `@nestjs/common`.

- En desarrollo se utilizará una salida legible y con colores.
- En producción se emitirá un registro JSON por línea.
- `LOG_LEVEL` determinará el nivel mínimo habilitado.
- `OBSERVE_FORWARD_LOGS` controlará el envío de logs a NestJS Observe.
- Observe aplicará redacción antes de enviar logs, errores o datos capturados.
- El código no registrará contraseñas, cookies, cabeceras de autorización ni tokens.
- `TracerService` se reservará para atributos de trazas y errores gestionados que deban aparecer en Observe, no como sustituto del logger.

## Consecuencias

La aplicación tendrá menos dependencias y correlación automática entre logs y trazas.

No dispondremos inicialmente de transportes propios ni de las opciones avanzadas de Pino. Si más adelante necesitamos redacción adicional en stdout, múltiples transportes o un volumen de logs muy alto, volveremos a evaluar un logger externo.
