# Alcance de la demo «Spa Demo»

Esta demo reproduce, de forma simulada, el comportamiento de un sistema de reservas con seña y panel de administración para un spa.
Describe **capacidades**; no afirma nada sobre el estado de producción de ningún sistema real.

## Qué es real y qué se simula

| Elemento | En la demo | Cómo se simula |
|---|---|---|
| Disponibilidad de horarios | Se calcula con reglas reales de agenda | Agenda ficticia generada por código, relativa a hoy |
| Reserva con horario retenido | Se reproduce con cuenta regresiva real | Temporizador local; «modo rápido» de 60 segundos para probarlo |
| Pago de la seña | **Simulado** | Pantalla propia y genérica con botones de resultado; no hay pasarela, tarjeta ni cobro |
| Confirmación del turno | Se reproduce la regla: se confirma solo cuando el pago se aprueba a tiempo | Mismo mecanismo local |
| Estados de un turno | Se reproducen y no se pueden saltar transiciones | Módulo propio |
| Devolución de la seña | **Solo se registra la decisión** | La demo nunca devuelve nada: lo aclara en pantalla |
| Mails de confirmación | **Simulados** | Se mostrarán en una bandeja de la demo; nunca se envía nada |
| Panel de administración | Se reproduce el comportamiento | Datos de ejemplo en este navegador |
| Datos | **Ficticios** | Generados por código |
| Guardado | Local | `localStorage` del navegador de cada visitante |

## Qué se construye y en qué orden

- **B1 y B2 (hechas):** estructura, identidad, marco de la demo y lógica interna (agenda, estados, reservas, almacenamiento) con pruebas.
- **V1:** recorrido completo de la clienta hasta la confirmación, y en el panel Inicio y Turnos con la reserva confirmada con seña y la cancelación.
- **Después:** mover turnos y «Mi turno» (cambiar y cancelar), bandeja de mails simulada, Clientes, Agenda y Caja.

## Qué la demo NO incluye ni afirma

- Aprobación manual de reservas web: una reserva con seña aprobada se confirma sola.
- Precios por servicio ni duración distinta por servicio: los turnos duran todos lo mismo y hay una única seña general, de monto de ejemplo.
- Avisos por mensajería, reembolsos automáticos, recordatorios previos, estadísticas avanzadas, varias profesionales o sucursales.
- Facturación electrónica, detección de color con IA, exportaciones y sincronización con calendarios externos.
- Inicio de sesión real: el modo administradora entra con un botón, sin usuario ni contraseña.

## Datos y marca

- Marca «Spa Demo» ficticia, con paleta y logo propios.
- Sin fotografías en la primera versión (gradientes e ilustraciones propias).
- Ningún dato, texto, imagen o credencial proviene de un negocio real.
