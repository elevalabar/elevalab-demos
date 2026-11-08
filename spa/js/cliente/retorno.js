/* Spa Demo · estado de la reserva («retorno» del pago)
   Pantalla a la que se llega después de la pasarela. Muestra el estado real del turno:
   verificando el pago (breve, simulado), confirmado, pendiente con hora límite y contador, vencida, cancelada o en revisión.
   Se actualiza sola si el estado cambia (por ejemplo, si la administradora cancela desde otra pestaña).
   Desde acá se agrega el turno al calendario (.ics, generado en el navegador).
   Depende de: spa/js/core/ (incluido ics.js). */
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
  function enlace(texto, href, clase) { var a = el('a', clase, texto); a.href = href; return a; }

  // Baja el archivo .ics sin ninguna conexión: se arma en memoria y se descarga desde el propio navegador.
  function descargarICS(estado, turno) {
    var texto = ED.ics.generarICS(estado, turno, T.ahora());
    var blob = new root.Blob([texto], { type: 'text/calendar;charset=utf-8' });
    var url = root.URL.createObjectURL(blob);
    var a = el('a');
    a.href = url; a.download = ED.ics.nombreArchivo(turno);
    doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
  }

  // opc.almacen, opc.destino (id), opc.pago (ruta de la pasarela), opc.inicio (ruta del asistente)
  function montar(opc) {
    var almacen = opc.almacen;
    var cont = typeof opc.destino === 'string' ? doc.getElementById(opc.destino) : opc.destino;
    if (!cont) return null;
    var id = parametro('turno');
    var verificando = parametro('verificando') === '1';
    var reloj = null, visor = null;
    var primeraVez = true;

    // «Verificando» se muestra una sola vez; se saca de la dirección para que recargar no lo repita.
    if (verificando) { try { root.history.replaceState(null, '', root.location.pathname + '?turno=' + encodeURIComponent(id)); } catch (e) { /* no importa */ } }

    function asegurarVencimiento() {
      var e = almacen.leer();
      var t = e.turnos.filter(function (x) { return x.id === id; })[0];
      if (t && t.estado === 'reservada' && t.venceEn <= T.ahora()) almacen.actualizar(function (x) { R.vencerPendientes(x, T.ahora()); });
    }

    function pantalla(clase, icono, titulo, texto) {
      var caja = el('section', 'turno-caja ' + clase);
      caja.setAttribute('aria-labelledby', 'titulo-estado');
      caja.appendChild(el('p', 'turno-icono', icono)).setAttribute('aria-hidden', 'true');
      var h = el('h2', null, titulo); h.id = 'titulo-estado'; h.tabIndex = -1;
      caja.appendChild(h);
      if (texto) caja.appendChild(el('p', 'turno-texto', texto));
      return caja;
    }

    function detalle(estado, t) {
      var dl = el('dl', 'turno-detalle');
      function fila(r, v) { dl.appendChild(el('dt', null, r)); dl.appendChild(el('dd', null, v)); }
      fila('Código de reserva', t.id);
      fila('Día y horario', cap(T.etiquetaDia(T.claveDia(t.inicio))) + ', ' + T.formatoHora(t.inicio) + ' a ' + T.formatoHora(t.inicio + t.duracionMin * 60000) + ' hs');
      fila('Servicios', t.serviciosIds.map(function (sid) { return R.buscarServicio(estado, sid).nombre; }).join(' + '));
      fila('A nombre de', t.clienta.nombre);
      if (t.sena) fila('Seña', pesos(t.sena.monto) + ' (monto de ejemplo)');
      return dl;
    }

    function dibujar() {
      asegurarVencimiento();
      root.clearInterval(reloj); visor = null;
      var estado = almacen.leer(), ahora = T.ahora();
      var t = estado.turnos.filter(function (x) { return x.id === id; })[0];
      cont.textContent = '';
      var caja;

      if (!t) {
        caja = pantalla('turno-neutro', 'ℹ', 'No encontramos esa reserva', 'Puede que la demo se haya reiniciado. Podés empezar una reserva nueva.');
        caja.appendChild(enlace('Reservar un turno', opc.inicio, 'btn-spa'));
      } else if (t.estado === 'confirmado' && primeraVez && verificando) {
        caja = pantalla('turno-neutro', '…', 'Verificando tu pago…', 'Estamos comprobando que la seña se acreditó. Es solo un instante.');
        caja.setAttribute('role', 'status');
        caja.appendChild(el('span', 'turno-girando')).setAttribute('aria-hidden', 'true');
        primeraVez = false;
        root.setTimeout(dibujar, 1400);
      } else if (t.estado === 'confirmado') {
        primeraVez = false;
        var pasado = t.inicio + t.duracionMin * 60000 <= ahora;
        caja = pantalla('turno-ok', '✓', pasado ? 'Tu turno ya pasó' : '¡Tu turno está confirmado!',
          pasado ? 'Este turno se realizó. Gracias por probar la demostración.' : 'La seña se aprobó y tu horario quedó reservado.');
        caja.appendChild(detalle(estado, t));
        var acc = el('div', 'turno-acciones');
        if (!pasado) {
          var cal = el('button', 'btn-spa', 'Agregar al calendario (.ics)'); cal.type = 'button';
          cal.addEventListener('click', function () { descargarICS(almacen.leer(), t); });
          acc.appendChild(cal);
        }
        acc.appendChild(enlace('Reservar otro turno', opc.inicio, 'btn-spa-sec'));
        caja.appendChild(acc);
        caja.appendChild(el('p', 'apagado pequeno', 'En un sistema real, acá se enviaría un mail de confirmación. En la demo no se envía ningún mail. Cambiar o cancelar desde «Mi turno» se agrega más adelante.'));
      } else if (t.estado === 'reservada') {
        var noCompleto = t.intentosPago.length > 0 && t.intentosPago[t.intentosPago.length - 1].resultado === 'no_completado';
        var limite = T.formatoHora(t.venceEn);
        caja = pantalla('turno-pendiente', '⏳', noCompleto ? 'El pago no se completó' : 'Pago pendiente',
          'Tu horario sigue guardado hasta las ' + limite + ' hs. Si el pago no se aprueba antes, la reserva vence y el horario se libera.');
        var cuenta = el('p', 'turno-cuenta');
        cuenta.appendChild(doc.createTextNode('Tiempo restante: '));
        visor = el('strong', null, mmss(t.venceEn - ahora));
        visor.setAttribute('role', 'timer'); visor.setAttribute('aria-live', 'off');
        cuenta.appendChild(visor);
        caja.appendChild(cuenta);
        caja.appendChild(detalle(estado, t));
        var acc2 = el('div', 'turno-acciones');
        acc2.appendChild(enlace('Ir a la pasarela de pago', opc.pago + '?turno=' + encodeURIComponent(id), 'btn-spa'));
        acc2.appendChild(enlace('Elegir otro horario', opc.inicio, 'btn-spa-sec'));
        caja.appendChild(acc2);
        reloj = root.setInterval(function () {
          var resta = t.venceEn - T.ahora();
          if (resta <= 0) { root.clearInterval(reloj); dibujar(); } else if (visor) visor.textContent = mmss(resta);
        }, 500);
      } else if (t.estado === 'vencida') {
        caja = pantalla('turno-neutro', '⌛', 'Tu reserva venció', 'No se aprobó el pago a tiempo, así que el horario volvió a quedar libre. Podés reservar de nuevo.');
        caja.appendChild(detalle(estado, t));
        caja.appendChild(enlace('Reservar de nuevo', opc.inicio, 'btn-spa'));
      } else if (t.estado === 'cancelado') {
        var porNegocio = t.cancelacion && t.cancelacion.por === 'administradora';
        var msg = porNegocio ? 'El negocio canceló este turno.' : 'Este turno fue cancelado.';
        if (t.sena && t.sena.estado === 'devolucion_registrada') msg += ' El negocio registró la devolución de la seña. En la demo no se realiza ninguna devolución real.';
        else if (t.sena && t.sena.estado === 'retenida') msg += ' La seña quedó retenida.';
        caja = pantalla('turno-neutro', '✕', 'Turno cancelado', msg);
        caja.appendChild(detalle(estado, t));
        caja.appendChild(enlace('Reservar de nuevo', opc.inicio, 'btn-spa'));
      } else {
        caja = pantalla('turno-pendiente', '🔎', 'Estamos revisando tu pago', 'Tu pago llegó, pero hace falta una revisión manual del negocio para confirmar el turno.');
        caja.appendChild(detalle(estado, t));
        caja.appendChild(enlace('Volver al spa', opc.inicio, 'btn-spa-sec'));
      }
      cont.appendChild(caja);
      var h = cont.querySelector('#titulo-estado');
      if (h && !cont.contains(doc.activeElement)) h.focus();
    }

    dibujar();
    var baja = almacen.suscribir(function () { if (!(primeraVez && verificando)) dibujar(); });
    return { destruir: function () { baja(); root.clearInterval(reloj); cont.textContent = ''; } };
  }

  ED.retorno = { montar: montar };
})(typeof window !== 'undefined' ? window : globalThis);
