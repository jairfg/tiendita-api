# Producto: sistema de ventas para pequeños negocios

> Documento funcional. Última actualización: 29 de octubre de 2026.
>
> **Estado:** la base del backend está en construcción. La primera versión será
> una aplicación web responsive y mobile-first.

## 1. Visión

Un sistema de ventas en la nube para pequeños negocios peruanos que todavía
controlan sus ventas, gastos y fiados en un cuaderno o no los registran.

Debe permitir que el dueño sepa, sin conocimientos contables:

- cuánto vendió y gastó hoy;
- cuánto recibió en efectivo, Yape, Plin o tarjeta;
- cuánto efectivo debería tener en caja;
- quién le debe y cuánto;
- qué productos vende con mayor frecuencia.

## 2. Cliente objetivo

Bodegas, tiendas y panaderías pequeñas donde el dueño atiende la caja, trabaja
en un solo local y puede tener uno o dos ayudantes. Usa principalmente el
celular, dispone de poco tiempo para configurar sistemas y abandonará cualquier
solución más lenta que su cuaderno.

El primer piloto será una panadería familiar. Usará el producto gratuitamente a
cambio de probarlo en operaciones reales y dar feedback frecuente.

## 3. Primera versión: web responsive

- Funcionará en el navegador del celular, tablet o computadora.
- La experiencia principal se diseñará para pantallas táctiles pequeñas.
- Se adaptará a escritorio sin mantener dos aplicaciones.
- No se desarrollará inicialmente una aplicación móvil nativa.
- Requerirá conexión para confirmar operaciones.
- Ante una caída de red conservará los datos ingresados y permitirá reintentar
  sin duplicarlos.
- PWA, instalación y trabajo offline se evaluarán después de validar el uso
  diario de la versión conectada.
- Se reutilizarán componentes de Lebenix cuando resulten aplicables.

## 4. Principios

1. **Útil en diez minutos:** permite vender sin cargar primero todo el catálogo.
2. **Venta rápida:** una operación frecuente debe tomar unos tres toques o cinco
   segundos.
3. **Mobile-first real:** controles cómodos desde el celular, no un escritorio
   reducido.
4. **Simple primero:** solo se muestra lo necesario para la tarea actual.
5. **Datos del negocio:** el dueño puede exportarlos cuando quiera.
6. **Acompañamiento cercano:** onboarding asistido y soporte por WhatsApp.
7. **Sin sobreconstruir:** las funciones nuevas necesitan validación real.

## 5. Modelo de negocio

- Los primeros negocios participan en un piloto gratuito.
- Se comunica desde el inicio su duración, precio estimado y posible precio de
  fundador.
- Después del piloto, el cobro inicial será manual por transferencia.
- No habrá tarjetas, planes ni cobros recurrentes automáticos al inicio.
- Eso se evaluará cuando existan al menos dos o tres negocios pagando.
- Un negocio puede suspenderse manualmente sin eliminar sus datos.

## 6. Usuarios y acceso

El propietario de la plataforma puede consultar negocios, suspenderlos o
reactivarlos, registrar hasta cuándo pagaron, ayudar con productos y revisar
actividad básica para soporte. Estas tareas se resolverán con herramientas
internas; la primera versión no necesita un panel de superadministración.

Dentro del negocio existirán:

- **Dueño:** administra el negocio y consulta toda su información.
- **Cajero:** registra la operación diaria con acceso limitado.

El piloto comienza solo con el dueño. Después de validar los permisos, la
versión 1 permitirá invitar y desactivar cajeros; cada invitado definirá su
contraseña antes de ingresar.

## 7. Alcance de la versión 1

### 7.1 Registro y negocio

- Registro público del dueño y su negocio en dos pasos visuales.
- Datos del negocio: nombre, giro, país, subdominio y color principal.
- Acceso inmediato al terminar, sin aprobación manual.
- Creación automática de una `Sucursal principal`, oculta en la interfaz.
- Inicio y cierre de sesión, recuperación de contraseña y bienvenida por correo.
- Un fallo del correo no bloquea una cuenta creada correctamente.
- Un negocio suspendido no puede iniciar ni renovar sesión, pero conserva sus
  datos.

### 7.2 Productos y ventas

- Producto con nombre, precio, categoría, unidad y código de barras opcional.
- Favoritos y búsqueda por nombre o código.
- Venta por unidad, cantidad decimal o monto.
- Venta libre por monto sin crear un producto.
- Pantalla rápida con favoritos, búsqueda y teclado numérico.
- Pagos en efectivo, Yape, Plin o tarjeta, con cálculo de vuelto.
- Numeración interna única.
- Cliente opcional, salvo cuando exista una deuda.
- Cada línea conserva nombre, precio e impuestos usados al vender.
- Una venta se anula y queda en el historial; nunca se elimina.
- Preparación básica para tratamientos del IGV, sin control de stock.

### 7.3 Gastos, clientes y fiados

- Gasto con concepto, monto, medio de pago y categoría opcional.
- Cliente con nombre, teléfono y documento opcional.
- Una venta completa o parcial puede quedar como fiado.
- Abonos parciales con su medio de pago.
- Saldo por cliente y listado de deudas.
- Recordatorio mediante enlace de WhatsApp con mensaje preparado.
- No se integrará inicialmente la API de WhatsApp.
- Gastos y abonos se corrigen mediante anulaciones visibles.

### 7.4 Resumen y exportación

- Ventas por medio de pago, gastos y efectivo esperado.
- Montos fiados y cobrados.
- Resultado aproximado: ventas menos gastos.
- Productos más vendidos y consulta de días anteriores.
- Exportación a Excel de ventas, gastos, fiados y productos.

El resultado no se llamará ganancia contable mientras no se registren costos de
productos. La exportación debe ser comprensible y servir como respaldo.

## 8. Reglas fundamentales

- Un negocio nunca puede acceder a información de otro.
- Cada negocio empieza activo y con una sola sucursal principal.
- Suspender bloquea el acceso; reactivar devuelve el acceso a los mismos datos.
- Ventas, gastos y abonos confirmados no desaparecen del historial.
- Los importes conservan precisión monetaria y los precios incluyen IGV cuando
  corresponda.
- Cambiar un producto no modifica ventas anteriores.
- Un reintento por fallo de red no duplica una operación.
- Productos y clientes pertenecen al negocio; las operaciones, a la sucursal.
- Los correos son auxiliares y no deshacen operaciones exitosas.

## 9. Después de la versión 1

Se priorizará con evidencia del piloto:

- PWA instalable, trabajo offline y sincronización;
- inventario, costos, margen y arqueo de caja;
- compras, proveedores y varias sucursales;
- comprobantes electrónicos, consulta de DNI y RUC;
- tickets e integración mediante la API de WhatsApp;
- suscripciones y cobros automáticos;
- ecommerce y módulos por rubro, como producción para panaderías;
- roles avanzados y permisos personalizables.

Nada de lo anterior forma parte de la primera versión. Tampoco se construirá una
aplicación móvil nativa ni un sistema de contabilidad formal.

## 10. Validación del piloto

La panadería usará el producto al menos dos semanas antes de ofrecerlo a otros
negocios. Durante las primeras cuatro semanas se evaluará si:

- registra ventas al menos cinco de cada siete días;
- una venta frecuente toma unos cinco segundos o menos;
- lo registrado se aproxima al efectivo real del día;
- deja de usar el cuaderno para controlar fiados;
- el negocio lo usa por iniciativa propia;
- la información diaria resulta más útil que el cuaderno.

También se observarán dudas, pasos lentos y funciones solicitadas después de
usar el flujo básico.

## 11. Privacidad y confianza

- Habrá términos de uso y política de privacidad antes del primer usuario
  externo al piloto familiar.
- Nombres, teléfonos y deudas se tratarán conforme a la Ley peruana 29733.
- Solo usuarios autorizados del negocio podrán acceder a esos datos.
- Los datos podrán exportarse y nunca se usarán para beneficiar a otro negocio.

## 12. Decisiones pendientes

- Nombre comercial definitivo.
- Precio y duración exacta del periodo gratuito.
- Permisos concretos del cajero.
- Momento en que el modo offline se vuelve prioritario.
- Alcance del onboarding y de la importación inicial de productos.
- Criterio para justificar un panel de superadministración.
