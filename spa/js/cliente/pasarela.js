/* Spa Demo · pasarela de pago SIMULADA
   Pantalla propia y genérica: no imita la interfaz de ningún servicio real, no pide datos de tarjeta y no cobra nada.
   Muestra la reserva retenida con su contador real y dos botones para elegir el resultado del pago:
   - aprobado: el turno pasa a «confirmado» y la seña a «pagada»;
   - no completado: no cambia nada; el horario sigue retenido hasta que venza el contador.
   Si el contador llega a cero, la reserva pasa a «vencida» y el horario se libera.
   Los temporizadores se calculan con marcas de tiempo (no con conteos), así siguen bien si la pestaña estuvo en segundo plano.
   Depende de: spa/js/core/ (config-demo, tiempo, estados, disponibilidad, reservas, semillas, almacen). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, R = ED.reservas;
  var doc = root.document;

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pesos(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function mmss(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(total / 60), s = total % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function parametro(nombre) {
    try { return new root.URLSearchParams(root.location.search).get(nombre); } catch (e) { return null; }
  }

  // opc.almacen, opc.destino (id), opc.volver (ruta de la pantalla de estado del turno), opc.inicio (ruta del asistente)
  function montar(opc) {
    var almacen = opc.almacen;
    var cont = typeof opc.destino === 'string' ? doc.getElementById(opc.destino) : opc.destino;
    if (!cont) return null;
    var id = parametro('turno');
    var temporizador = null;

    function irAlEstado(extra) { root.location.href = opc.volver + '?turno=' + encodeURIComponent(id) + (extra || ''); }

    function mensaje(titulo, texto) {
      cont.textContent = '';
      var caja = el('div', 'pasarela-tarjeta');
      caja.appendChild(el('h2', null, titulo));
      caja.appendChild(el('p', null, texto));
      var a = el('a', 'pg-btn pg-btn-sec', 'Volver al spa');
      a.href = opc.inicio;
      caja.appendChild(a);
      cont.appendChild(caja);
    }

    var estado = almacen.leer();
    var turno = estado.turnos.filter(function (t) { return t.id === id; })[0];
    if (!turno) { mensaje('No encontramos esa reserva', 'Puede que la demo se haya reiniciado. Podés empezar una reserva nueva.'); return null; }

    // Primero se vencen las reservas cuyo contador ya se agotó (incluida esta).
    almacen.actualizar(function (e) { R.vencerPendientes(e, T.ahora()); });
    turno = almacen.leer().turnos.filter(function (t) { return t.id === id; })[0];
    if (turno.estado !== 'reservada') { irAlEstado(); return null; }   // ya está confirmada, vencida o cancelada

    var visorContador;

    function resolver(resultado) {
      try {
        almacen.actualizar(function (e) { R.resolverPago(e, id, resultado, T.ahora()); });
      } catch (err) {
        mensaje('No se pudo registrar el pago', 'Probá de nuevo desde el spa.');
        return;
      }
      root.clearInterval(temporizador);
      irAlEstado(resultado === 'aprobado' ? '&verificando=1' : '');
    }

    function tick() {
      var ahora = T.ahora(), resta = turno.venceEn - ahora;
      if (resta <= 0) {
        root.clearInterval(temporizador);
        almacen.actualizar(function (e) { R.vencerPendientes(e, T.ahora()); });
        irAlEstado();
        return;
      }
      visorContador.textContent = mmss(resta);
    }

    function dibujar() {
      cont.textContent = '';
      var servicios = turno.serviciosIds.map(function (sid) { return R.buscarServicio(estado, sid).nombre; });
      var caja = el('div', 'pasarela-tarjeta');

      var banner = el('p', 'pasarela-banner');
      banner.appendChild(el('strong', null, 'SIMULACIÓN'));
      banner.appendChild(doc.createTextNode(' · No se cobra nada. No ingreses datos de ninguna tarjeta.'));
      caja.appendChild(banner);

      var h = el('h2', null, 'Pasarela de pago (simulada)');
      h.id = 'titulo-pasarela'; h.tabIndex = -1;
      caja.appendChild(h);

      var dl = el('dl', 'pasarela-datos');
      function fila(r, v) { dl.appendChild(el('dt', null, r)); dl.appendChild(el('dd', null, v)); }
      fila('Comercio', 'Spa Demo (marca ficticia)');
      fila('Concepto', 'Seña de turno ' + turno.id);
      fila('Turno', cap(T.etiquetaDia(T.claveDia(turno.inicio))) + ', ' + T.formatoHora(turno.inicio) + ' hs');
      fila('Servicios', servicios.join(' + '));
      dl.appendChild(el('dt', null, 'Importe'));
      var imp = el('dd', 'pasarela-importe');
      imp.appendChild(el('strong', null, pesos(turno.sena.monto)));
      imp.appendChild(el('span', null, ' · monto de ejemplo'));
      dl.appendChild(imp);
      caja.appendChild(dl);

      var cuenta = el('p', 'pasarela-cuenta');
      cuenta.appendChild(doc.createTextNode('Tu horario está guardado durante '));
      visorContador = el('strong', 'pasarela-reloj', mmss(turno.venceEn - T.ahora()));
      visorContador.setAttribute('role', 'timer');
      visorContador.setAttribute('aria-live', 'off');
      cuenta.appendChild(visorContador);
      cuenta.appendChild(doc.createTextNode('. Si se agota, la reserva vence y el horario se libera.'));
      caja.appendChild(cuenta);

      caja.appendChild(el('p', 'pasarela-ayuda', 'Elegí qué resultado querés simular:'));
      var botones = el('div', 'pasarela-botones');
      var ok = el('button', 'pg-btn pg-btn-ok', 'Simular pago aprobado'); ok.type = 'button';
      ok.addEventListener('click', function () { resolver('aprobado'); });
      var no = el('button', 'pg-btn pg-btn-sec', 'Simular pago no completado'); no.type = 'button';
      no.addEventListener('click', function () { resolver('no_completado'); });
      botones.appendChild(ok); botones.appendChild(no);
      caja.appendChild(botones);
      caja.appendChild(el('p', 'pasarela-ayuda pequeno', 'Con «no completado» la reserva sigue guardada hasta que se agote el contador.'));

      var volver = el('a', 'pasarela-enlace', 'Volver al spa sin pagar');
      volver.href = opc.volver + '?turno=' + encodeURIComponent(id);
      caja.appendChild(volver);
      cont.appendChild(caja);
      h.focus();
    }

    dibujar();
    temporizador = root.setInterval(tick, 500);
    // Si el estado cambia desde otra pestaña (reinicio, cancelación), se pasa a la pantalla de estado.
    almacen.suscribir(function (e) {
      var t = e.turnos.filter(function (x) { return x.id === id; })[0];
      if (!t || t.estado !== 'reservada') { root.clearInterval(temporizador); irAlEstado(); }
    });
    return { destruir: function () { root.clearInterval(temporizador); cont.textContent = ''; } };
  }

  ED.pasarela = { montar: montar };
})(typeof window !== 'undefined' ? window : globalThis);
