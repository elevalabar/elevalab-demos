/* Spa Demo · disponibilidad
   Un horario se ofrece solo si lo permiten: la agenda (días, hasta dos tramos por día, bloqueos),
   la ventana de reservas, la anticipación mínima, que el turno termine antes del cierre del tramo
   y que no se superponga con un turno que ocupa el horario. Si algo no cuadra, no se ofrece nada.
   Depende de: tiempo.js, estados.js. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, E = ED.estados;

  function tramosDelDia(agenda, clave) {
    if (agenda.bloqueos && agenda.bloqueos.indexOf(clave) !== -1) return [];
    return agenda.dias[T.diaSemanaDeClave(clave)] || [];
  }

  function dentroDeVentana(agenda, clave, ahoraMs) {
    var hoy = T.claveDia(ahoraMs);
    return clave >= hoy && clave <= T.sumarDias(hoy, agenda.ventanaDias);
  }

  // ¿Algún turno que ocupa su horario se superpone con [inicio, fin)?
  function haySolape(estado, inicio, fin, ahoraMs, ignorarId) {
    return estado.turnos.some(function (t) {
      if (ignorarId && t.id === ignorarId) return false;
      if (!E.bloqueaHorario(t, ahoraMs)) return false;
      var tFin = t.inicio + t.duracionMin * 60000;
      return inicio < tFin && t.inicio < fin;
    });
  }

  // Horarios libres de un día: [{ inicio, fin, etiqueta }]
  function horariosLibres(estado, clave, ahoraMs, opciones) {
    var ag = estado.config.agenda;
    var salida = [];
    if (!dentroDeVentana(ag, clave, ahoraMs)) return salida;
    var dur = (opciones && opciones.duracionMin) || ag.duracionMin;
    var ignorarId = opciones && opciones.ignorarId;
    var minimo = ahoraMs + ag.anticipacionMin * 60000;
    tramosDelDia(ag, clave).forEach(function (tr) {
      for (var m = tr.desde; m + dur <= tr.hasta; m += ag.duracionMin) {
        var inicio = T.msDeClave(clave, m);
        var fin = inicio + dur * 60000;
        if (inicio < minimo) continue;
        if (haySolape(estado, inicio, fin, ahoraMs, ignorarId)) continue;
        salida.push({ inicio: inicio, fin: fin, etiqueta: T.minutosAHHMM(m) });
      }
    });
    return salida;
  }

  // ¿Ese instante exacto es hoy un horario que se ofrecería?
  function estaLibre(estado, inicio, duracionMin, ahoraMs, ignorarId) {
    var clave = T.claveDia(inicio);
    return horariosLibres(estado, clave, ahoraMs, { duracionMin: duracionMin, ignorarId: ignorarId })
      .some(function (s) { return s.inicio === inicio; });
  }

  // Para pintar el calendario mensual: { 'AAAA-MM-DD': cantidadDeHorariosLibres } solo con días que tienen horarios.
  function diasConHorarios(estado, anio, mes, ahoraMs) {
    var res = {};
    var n = T.diasEnMes(anio, mes);
    for (var d = 1; d <= n; d++) {
      var clave = anio + '-' + (mes < 10 ? '0' : '') + mes + '-' + (d < 10 ? '0' : '') + d;
      var cant = horariosLibres(estado, clave, ahoraMs).length;
      if (cant > 0) res[clave] = cant;
    }
    return res;
  }

  ED.disponibilidad = {
    tramosDelDia: tramosDelDia, dentroDeVentana: dentroDeVentana, haySolape: haySolape,
    horariosLibres: horariosLibres, estaLibre: estaLibre, diasConHorarios: diasConHorarios
  };
})(typeof window !== 'undefined' ? window : globalThis);
