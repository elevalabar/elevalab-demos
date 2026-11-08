# Reglas de negocio reproducidas en «Spa Demo»

Cada regla indica su origen:
- **Reproducida:** comportamiento del tipo de sistema que la demo imita.
- **Decisión de la demo:** elección propia para la simulación, donde la regla original no está confirmada o no hace falta.

Los valores numéricos son de ejemplo.

## Agenda y disponibilidad

| Regla | Valor en la demo | Origen |
|---|---|---|
| Un horario se ofrece solo si lo permiten agenda, bloqueos, ventana, anticipación y turnos existentes | — | Reproducida |
| Si algo falla o no cuadra, no se ofrece nada | — | Reproducida |
| Todos los turnos duran lo mismo | 60 minutos | Reproducida |
| Un turno entra solo si termina antes del cierre del tramo | — | Reproducida |
| Hasta dos tramos por día y fechas bloqueadas | Martes a viernes 10–13 y 15–19, sábado 10–14; domingo y lunes cerrado; una fecha bloqueada de ejemplo | Reproducida (horarios de ejemplo) |
| Ventana de reservas | Hasta hoy + 60 días | Reproducida |
| Anticipación mínima | 2 horas | Reproducida (valor de ejemplo) |
| Todo se calcula en hora de Buenos Aires | UTC-3 fijo | Decisión de la demo |

## Servicios

| Regla | Valor en la demo | Origen |
|---|---|---|
| Se puede elegir un servicio por grupo; elegir otro del mismo grupo reemplaza al anterior | Grupos «Manos» y «Pies» | Reproducida |
| Los servicios no llevan precio | Sin precios | Reproducida |
| Agrupación exacta de los servicios | Dos grupos | Decisión de la demo |

## Estados de un turno

`reservada`, `confirmado`, `vencida`, `en_revision`, `cancelado`. «Finalizado» no se guarda: se deduce cuando un turno confirmado ya pasó.

| Desde | Puede pasar a |
|---|---|
| reservada | confirmado, vencida, en_revision, cancelado |
| confirmado | cancelado, en_revision |
| en_revision | confirmado, cancelado |
| vencida | confirmado, en_revision (si el pago llega tarde) |
| cancelado | nada: es terminal, nunca se revive ni se borra |

Origen: **Reproducida.** Que un turno «en revisión» siga ocupando el horario es una **decisión de la demo**.

## Reserva, retención y seña

| Regla | Valor en la demo | Origen |
|---|---|---|
| Al reservar, el horario queda retenido mientras se paga | 15 minutos (60 segundos en modo rápido) | Reproducida |
| Solo cuando se agota el contador la reserva pasa a `vencida` y el horario se libera | — | Reproducida |
| Un pago no completado no cambia el estado: el horario sigue retenido hasta vencer | — | Reproducida |
| El turno se confirma solo si el pago se aprueba a tiempo y por el monto de la seña | — | Reproducida |
| Si el pago llega tarde: se confirma si el horario sigue libre; si no, pasa a revisión con el motivo | — | Reproducida |
| Seña única y general | Monto de ejemplo | Reproducida |
| La clienta puede cambiar el turno hasta cierto plazo sin perder la seña | 24 horas | Reproducida (se muestra desde la versión 1.1) |
| Si cancela la clienta, la seña no se devuelve | — | Reproducida |
| Si cancela la administradora, elige devolver la seña o quedarse con ella; la devolución real no es automática | — | Reproducida |
| En la demo, «devolver» solo registra la decisión y lo aclara en pantalla | — | Decisión de la demo |

## Pendiente de confirmar (la demo no lo simula)

- Duración distinta por servicio.
- Qué ocurre con un cambio de turno fuera del plazo.
- Si las reservas todavía retenidas se muestran en el panel de administración. En la demo no se muestran.
- Si «Pedicura» forma un grupo propio o integra el grupo «Pies».
