/* Spa Demo · datos de ejemplo
   Todo es FICTICIO: nombres inventados, mails @example.com y teléfonos con formato de ejemplo.
   Las fechas se generan relativas al día de hoy (hora de Buenos Aires) para que el calendario nunca quede vacío.
   Depende de: config-demo.js, tiempo.js, disponibilidad.js, reservas.js (solo para numerar los turnos). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, D = ED.disponibilidad;

  var HORA = 3600000, DIA = 86400000;

  var CLIENTAS = {
    camila: { nombre: 'Camila Ejemplo', email: 'camila.ejemplo@example.com', telefono: '11 5555-0101' },
    julia:  { nombre: 'Julia Muestra',  email: 'julia.muestra@example.com',  telefono: '11 5555-0102' },
    sofia:  { nombre: 'Sofía Prueba',   email: 'sofia.prueba@example.com',   telefono: '11 5555-0103' },
    lara:   { nombre: 'Lara Demo',      email: 'lara.demo@example.com',      telefono: '11 5555-0104' },
    noa:    { nombre: 'Noa Ficticia',   email: 'noa.ficticia@example.com',   telefono: '11 5555-0105' }
  };

  function clonar(x) { return JSON.parse(JSON.stringify(x)); }

  // Los próximos n días con atención, empezando por hoy.
  function diasAbiertosDesde(agenda, desde, n) {
    var res = [], clave = desde;
    for (var i = 0; i < 30 && res.length < n; i++, clave = T.sumarDias(clave, 1)) {
      if (D.tramosDelDia(agenda, clave).length > 0) res.push(clave);
    }
    return res;
  }

  // El último día con atención anterior a hoy.
  function ultimoDiaAbiertoAntes(agenda, hoy) {
    var clave = T.sumarDias(hoy, -1);
    for (var i = 0; i < 30; i++, clave = T.sumarDias(clave, -1)) {
      if (D.tramosDelDia(agenda, clave).length > 0) return clave;
    }
    return null;
  }

  // Minuto de inicio del horario número idx de un día (siempre cae en un horario real de la agenda).
  function minutoDeHorario(agenda, clave, idx) {
    var inicios = [];
    D.tramosDelDia(agenda, clave).forEach(function (tr) {
      for (var m = tr.desde; m + agenda.duracionMin <= tr.hasta; m += agenda.duracionMin) inicios.push(m);
    });
    return inicios[Math.min(idx, inicios.length - 1)];
  }

  function crearEstadoInicial(ahoraMs) {
    var C = ED.config;
    var estado = {
      version: C.VERSION_ESTADO,
      creadoEn: ahoraMs,
      contador: 0,
      config: C.crearConfigInicial(),
      grupos: clonar(C.GRUPOS),
      servicios: clonar(C.SERVICIOS),
      turnos: []
    };
    var ag = estado.config.agenda;
    var hoy = T.claveDia(ahoraMs);
    ag.bloqueos = [T.sumarDias(hoy, 10)];

    function agregar(clave, idx, clienta, serviciosIds, origen, extra) {
      var inicio = T.msDeClave(clave, minutoDeHorario(ag, clave, idx));
      var id = ED.reservas.siguienteId(estado);
      var web = origen === 'web';
      var turno = {
        id: id, estado: 'confirmado', origen: origen, inicio: inicio, duracionMin: ag.duracionMin,
        serviciosIds: serviciosIds, clienta: clonar(clienta),
        creadoEn: inicio - 3 * DIA, venceEn: null,
        sena: web ? { monto: estado.config.sena.monto, estado: 'pagada', devolucionRealizada: false, nota: '' } : null,
        intentosPago: [], cancelacion: null,
        historial: [{ estado: 'confirmado', desde: null, en: inicio - 3 * DIA, motivo: web ? 'Reserva con seña pagada (dato de ejemplo)' : 'Turno cargado desde el panel (dato de ejemplo)' }]
      };
      if (extra && extra.cancelado) {
        turno.estado = 'cancelado';
        turno.sena.estado = 'retenida';
        turno.sena.nota = 'La seña no se devuelve cuando cancela la clienta.';
        turno.cancelacion = { por: 'clienta', en: inicio - DIA, decisionSena: 'quedarme' };
        turno.historial.push({ estado: 'cancelado', desde: 'confirmado', en: inicio - DIA, motivo: 'Cancelado por la clienta' });
      }
      estado.turnos.push(turno);
    }

    var previo = ultimoDiaAbiertoAntes(ag, hoy);
    var proximos = diasAbiertosDesde(ag, hoy, 3);

    if (previo) {
      agregar(previo, 0, CLIENTAS.camila, ['m-clasica', 'p-clasica'], 'web');
      agregar(previo, 3, CLIENTAS.julia, ['p-spa'], 'panel');
    }
    agregar(proximos[0], 1, CLIENTAS.sofia, ['m-semi'], 'web');
    agregar(proximos[0], 2, CLIENTAS.lara, ['m-clasica'], 'panel');
    agregar(proximos[0], 3, CLIENTAS.noa, ['m-gel', 'p-esmaltado'], 'web');
    agregar(proximos[1], 0, CLIENTAS.camila, ['m-semi', 'p-esmaltado'], 'web');
    agregar(proximos[1], 2, CLIENTAS.julia, ['m-clasica'], 'web');
    agregar(proximos[1], 3, CLIENTAS.sofia, ['p-clasica'], 'web', { cancelado: true });
    agregar(proximos[2], 1, CLIENTAS.lara, ['m-gel'], 'web');

    return estado;
  }

  ED.semillas = { crearEstadoInicial: crearEstadoInicial, CLIENTAS: CLIENTAS };
})(typeof window !== 'undefined' ? window : globalThis);
