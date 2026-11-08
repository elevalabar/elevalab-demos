/* Spa Demo · estados de un turno
   Máquina de estados: la demo no puede saltarse una transición que el sistema que reproduce no permite.
   «Finalizado» no es un estado guardado: se deduce cuando un turno confirmado ya pasó (estadoVisible).
   Depende de: nada. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};

  var ESTADOS = ['reservada', 'confirmado', 'vencida', 'en_revision', 'cancelado'];

  var TRANSICIONES = {
    reservada:   ['confirmado', 'vencida', 'en_revision', 'cancelado'],
    confirmado:  ['cancelado', 'en_revision'],
    en_revision: ['confirmado', 'cancelado'],
    vencida:     ['confirmado', 'en_revision'],   // el pago llegó tarde
    cancelado:   []                               // terminal: nunca se revive ni se borra
  };

  var ETIQUETAS = {
    reservada: 'Reservada', confirmado: 'Confirmado', vencida: 'Vencida',
    en_revision: 'En revisión', cancelado: 'Cancelado', finalizado: 'Finalizado'
  };

  // Error con un código estable, para poder probarlo y mostrar mensajes claros.
  function ErrorDemo(codigo, mensaje) {
    var e = new Error(mensaje || codigo);
    e.name = 'ErrorDemo';
    e.codigo = codigo;
    return e;
  }

  function puedeTransicionar(desde, hasta) {
    return Object.prototype.hasOwnProperty.call(TRANSICIONES, desde) && TRANSICIONES[desde].indexOf(hasta) !== -1;
  }

  function esTerminal(estado) {
    return Object.prototype.hasOwnProperty.call(TRANSICIONES, estado) && TRANSICIONES[estado].length === 0;
  }

  // Cambia el estado del turno (lo modifica) y deja constancia en el historial.
  function transicionar(turno, hasta, ahoraMs, motivo) {
    if (ESTADOS.indexOf(hasta) === -1) throw ErrorDemo('ESTADO_DESCONOCIDO', 'Estado desconocido: ' + hasta);
    if (!puedeTransicionar(turno.estado, hasta)) {
      throw ErrorDemo('TRANSICION_INVALIDA', 'No se puede pasar de «' + turno.estado + '» a «' + hasta + '».');
    }
    turno.historial = turno.historial || [];
    turno.historial.push({ estado: hasta, desde: turno.estado, en: ahoraMs, motivo: motivo || '' });
    turno.estado = hasta;
    return turno;
  }

  // ¿El turno ocupa su horario en este instante?
  // Una reserva retenida lo ocupa solo mientras no se agote el contador.
  function bloqueaHorario(turno, ahoraMs) {
    if (turno.estado === 'confirmado' || turno.estado === 'en_revision') return true;
    if (turno.estado === 'reservada') return turno.venceEn > ahoraMs;
    return false;
  }

  function estadoVisible(turno, ahoraMs) {
    if (turno.estado === 'confirmado' && turno.inicio + turno.duracionMin * 60000 <= ahoraMs) return 'finalizado';
    return turno.estado;
  }

  ED.estados = {
    ESTADOS: ESTADOS, TRANSICIONES: TRANSICIONES, ETIQUETAS: ETIQUETAS,
    ErrorDemo: ErrorDemo, puedeTransicionar: puedeTransicionar, esTerminal: esTerminal,
    transicionar: transicionar, bloqueaHorario: bloqueaHorario, estadoVisible: estadoVisible
  };
})(typeof window !== 'undefined' ? window : globalThis);
