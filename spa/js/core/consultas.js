/* Spa Demo · consultas para el panel de administración
   Funciones puras que leen el estado y devuelven lo que el panel necesita mostrar (no modifican nada).
   Qué turnos ve el panel: confirmados (con su deducción «finalizado»), cancelados y en revisión.
   Las reservas todavía retenidas («reservada») y las vencidas NO se muestran en el panel.
   Depende de: tiempo.js, estados.js. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, E = ED.estados;

  var VISIBLES = ['confirmado', 'cancelado', 'en_revision'];
  var FILTROS = ['todos', 'confirmado', 'finalizado', 'cancelado'];

  function visibleEnPanel(turno) { return VISIBLES.indexOf(turno.estado) !== -1; }
  function fin(turno) { return turno.inicio + turno.duracionMin * 60000; }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) { return a.inicio - b.inicio || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)); });
  }

  // Turnos de un día (clave 'AAAA-MM-DD') que el panel muestra, ordenados por hora.
  function turnosDelDia(estado, clave) {
    return ordenar(estado.turnos.filter(function (t) { return visibleEnPanel(t) && T.claveDia(t.inicio) === clave; }));
  }

  // filtro: 'todos' | 'confirmado' (por venir) | 'finalizado' | 'cancelado'
  function filtrar(lista, filtro, ahoraMs) {
    if (filtro === 'todos') return lista.slice();
    return lista.filter(function (t) { return E.estadoVisible(t, ahoraMs) === filtro; });
  }

  function contarPorFiltro(lista, ahoraMs) {
    var c = { todos: lista.length, confirmado: 0, finalizado: 0, cancelado: 0 };
    lista.forEach(function (t) {
      var v = E.estadoVisible(t, ahoraMs);
      if (c[v] !== undefined) c[v]++;
    });
    return c;
  }

  // Resumen de hoy: los cancelados no cuentan como turnos del día.
  function resumenHoy(estado, ahoraMs) {
    var lista = turnosDelDia(estado, T.claveDia(ahoraMs)).filter(function (t) { return t.estado !== 'cancelado'; });
    var r = { total: lista.length, porVenir: 0, finalizados: 0, enRevision: 0 };
    lista.forEach(function (t) {
      var v = E.estadoVisible(t, ahoraMs);
      if (v === 'confirmado') r.porVenir++;
      else if (v === 'finalizado') r.finalizados++;
      else if (v === 'en_revision') r.enRevision++;
    });
    return r;
  }

  // Los próximos n turnos confirmados que todavía no empezaron.
  function proximosTurnos(estado, ahoraMs, n) {
    return ordenar(estado.turnos.filter(function (t) { return t.estado === 'confirmado' && t.inicio > ahoraMs; })).slice(0, n);
  }

  // Rango de días que el panel deja recorrer: 30 días hacia atrás y la ventana de reservas hacia adelante.
  function limitesDias(estado, ahoraMs) {
    var hoy = T.claveDia(ahoraMs);
    return { min: T.sumarDias(hoy, -30), max: T.sumarDias(hoy, estado.config.agenda.ventanaDias) };
  }

  // Insignia de la seña de un turno (null si no tiene seña).
  function insigniaSena(turno) {
    if (!turno.sena) return null;
    switch (turno.sena.estado) {
      case 'pagada': return { tipo: 'pagada', texto: 'Seña pagada' };
      case 'devolucion_registrada': return { tipo: 'devuelta', texto: 'Devolución de seña registrada (no real)' };
      case 'retenida': return { tipo: 'retenida', texto: 'Seña retenida' };
      default: return null;
    }
  }

  ED.consultas = {
    VISIBLES: VISIBLES, FILTROS: FILTROS, visibleEnPanel: visibleEnPanel, fin: fin,
    turnosDelDia: turnosDelDia, filtrar: filtrar, contarPorFiltro: contarPorFiltro,
    resumenHoy: resumenHoy, proximosTurnos: proximosTurnos, limitesDias: limitesDias, insigniaSena: insigniaSena
  };
})(typeof window !== 'undefined' ? window : globalThis);
