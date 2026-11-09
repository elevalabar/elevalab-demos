/* Spa Demo · panel de administración · Turnos
   - Navegación día a día (flechas, selector de fecha y «Hoy»).
   - Filtros: Todos, Confirmados (por venir), Finalizados y Cancelados, con su cantidad.
   - Tarjeta de cada turno: hora, estado, servicios, datos de contacto y la insignia de seña.
   - Cancelar un turno: si tiene seña pagada hay que elegir «Devolver» o «Quedarme». La demo SOLO REGISTRA esa decisión:
     no realiza ninguna devolución real. Al cancelar, el horario vuelve a quedar libre en la vista de la clienta.
   La lógica vive en spa/js/core/ (consultas.js y reservas.js); acá solo se dibuja y se pide confirmación.
   Depende de: spa/js/core/ y de panel.js (que lo dibuja y le entrega el contexto). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, E = ED.estados, R = ED.reservas, Q = ED.consultas, D = ED.disponibilidad;
  var doc = root.document;
  ED.adminSecciones = ED.adminSecciones || {};

  var FILTROS = [['todos', 'Todos'], ['confirmado', 'Confirmados'], ['finalizado', 'Finalizados'], ['cancelado', 'Cancelados']];
  var ui = { dia: null, filtro: 'todos', mensaje: '' };       // se conserva mientras la página siga abierta

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pesos(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function nombresServicios(estado, t) { return t.serviciosIds.map(function (id) { return R.buscarServicio(estado, id).nombre; }).join(' + '); }
  function puedeCancelarse(t, ahora) { return E.estadoVisible(t, ahora) === 'confirmado' || t.estado === 'en_revision'; }

  /* ---------- ventana de confirmación para cancelar ---------- */
  function abrirCancelar(ctx, turno, volverA) {
    var estado = ctx.almacen.leer();
    var conSena = !!(turno.sena && turno.sena.estado === 'pagada');
    var decision = null;
    var previo = doc.activeElement;

    var fondo = el('div', 'adm-modal-fondo');
    var caja = el('div', 'adm-modal');
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', 'adm-modal-titulo');
    var h = el('h3', null, 'Cancelar turno ' + turno.id);
    h.id = 'adm-modal-titulo'; h.tabIndex = -1;
    caja.appendChild(h);
    caja.appendChild(el('p', 'adm-modal-resumen',
      cap(T.etiquetaDia(T.claveDia(turno.inicio))) + ', ' + T.formatoHora(turno.inicio) + ' hs · ' + turno.clienta.nombre + ' · ' + nombresServicios(estado, turno)));

    var confirmar = el('button', 'adm-btn adm-btn-peligro', 'Confirmar cancelación');
    confirmar.type = 'button';
    var error = el('p', 'adm-error'); error.setAttribute('role', 'alert'); error.hidden = true;

    if (conSena) {
      var fs = el('fieldset', 'adm-opciones');
      fs.appendChild(el('legend', null, 'La seña de ' + pesos(turno.sena.monto) + ' ya está pagada. ¿Qué hacés con ella?'));
      [['devolver', 'Devolver la seña', 'La demo registra la decisión, pero no realiza ninguna devolución real. En un sistema real, la devolución se hace a mano desde la cuenta de cobros.'],
       ['quedarme', 'Quedarme con la seña', 'La seña queda retenida.']].forEach(function (op) {
        var etq = el('label', 'adm-opcion');
        var r = el('input'); r.type = 'radio'; r.name = 'decision-sena'; r.value = op[0];
        r.addEventListener('change', function () { decision = op[0]; confirmar.disabled = false; });
        etq.appendChild(r);
        var txt = el('span', 'adm-opcion-txt');
        txt.appendChild(el('strong', null, op[1]));
        txt.appendChild(el('span', 'adm-opcion-desc', op[2]));
        etq.appendChild(txt);
        fs.appendChild(etq);
      });
      caja.appendChild(fs);
      confirmar.disabled = true;
    } else {
      caja.appendChild(el('p', null, 'Se cancelará el turno y el horario volverá a quedar libre.' +
        (turno.sena && turno.sena.estado === 'pendiente' ? ' La seña todavía no se había pagado.' : '')));
    }
    caja.appendChild(error);

    var botones = el('div', 'adm-modal-botones');
    var volver = el('button', 'adm-btn adm-btn-sec', 'Volver'); volver.type = 'button';
    botones.appendChild(volver); botones.appendChild(confirmar);
    caja.appendChild(botones);
    fondo.appendChild(caja);
    doc.body.appendChild(fondo);

    function cerrar(devolverFoco) {
      doc.removeEventListener('keydown', alTeclear, true);
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      if (devolverFoco && previo && doc.body.contains(previo) && previo.focus) previo.focus();
    }
    function alTeclear(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(true); return; }
      if (ev.key !== 'Tab') return;
      var f = Array.prototype.filter.call(caja.querySelectorAll('button, input'), function (n) { return !n.disabled; });
      if (f.length === 0) return;
      var primero = f[0], ultimo = f[f.length - 1];
      if (!caja.contains(doc.activeElement)) { ev.preventDefault(); primero.focus(); }
      else if (ev.shiftKey && (doc.activeElement === primero || doc.activeElement === h)) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && doc.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    }
    doc.addEventListener('keydown', alTeclear, true);
    volver.addEventListener('click', function () { cerrar(true); });

    confirmar.addEventListener('click', function () {
      try {
        ctx.almacen.actualizar(function (e) { R.cancelarDesdePanel(e, turno.id, { decisionSena: decision }, T.ahora()); });
      } catch (err) {
        error.textContent = (err && err.codigo === 'TRANSICION_INVALIDA') ? 'Este turno ya cambió de estado y no se puede cancelar.' : 'No se pudo cancelar el turno. Probá de nuevo.';
        error.hidden = false;
        return;
      }
      var msg = 'Turno ' + turno.id + ' cancelado. El horario volvió a quedar libre en la vista de la clienta.';
      if (decision === 'devolver') msg += ' Se registró la devolución de la seña; en la demo no se realiza ninguna devolución real.';
      if (decision === 'quedarme') msg += ' La seña quedó retenida.';
      ui.mensaje = msg;
      cerrar(false);
      ctx.redibujar();
      ctx.anunciar(msg);
      var t = doc.getElementById('adm-titulo-dia'); if (t) t.focus();
    });

    (conSena ? caja.querySelector('input') : volver).focus();
  }

  /* ---------- tarjeta de un turno ---------- */
  function tarjeta(ctx, estado, t, ahora) {
    var visible = E.estadoVisible(t, ahora);
    var a = el('article', 'adm-turno');
    var cab = el('div', 'adm-turno-cab');
    cab.appendChild(el('span', 'adm-turno-hora', T.formatoHora(t.inicio) + ' – ' + T.formatoHora(Q.fin(t)) + ' · ' + t.duracionMin + ' min'));
    cab.appendChild(el('span', 'adm-estado ' + visible, E.ETIQUETAS[visible]));
    a.appendChild(cab);
    a.appendChild(el('p', 'adm-turno-serv', nombresServicios(estado, t)));
    a.appendChild(el('p', 'adm-turno-sub', t.clienta.nombre + ' · ' + t.clienta.email + ' · ' + t.clienta.telefono));

    var et = el('div', 'adm-etiquetas');
    var ins = Q.insigniaSena(t);
    if (ins) et.appendChild(el('span', 'adm-insignia ' + ins.tipo, ins.texto));
    et.appendChild(el('span', 'adm-insignia origen', t.origen === 'web' ? 'Reserva web' : 'Cargado desde el panel'));
    a.appendChild(et);

    if (t.estado === 'cancelado' && t.cancelacion) {
      var nota = t.cancelacion.por === 'clienta' ? 'Cancelado por la clienta.' : 'Cancelado desde el panel.';
      if (t.sena && t.sena.nota) nota += ' ' + t.sena.nota;
      a.appendChild(el('p', 'adm-turno-nota', nota));
    }
    if (t.estado === 'en_revision') {
      var h = t.historial && t.historial.length ? t.historial[t.historial.length - 1].motivo : '';
      a.appendChild(el('p', 'adm-turno-nota', 'En revisión' + (h ? ': ' + h : '') + '.'));
    }
    if (puedeCancelarse(t, ahora)) {
      var acc = el('div', 'adm-turno-acciones');
      var b = el('button', 'adm-btn adm-btn-sec adm-btn-chico', 'Cancelar');
      b.type = 'button';
      b.setAttribute('data-id', 'cancelar-' + t.id);
      b.setAttribute('aria-label', 'Cancelar el turno de ' + t.clienta.nombre + ' de las ' + T.formatoHora(t.inicio));
      b.addEventListener('click', function () { abrirCancelar(ctx, t); });
      acc.appendChild(b);
      a.appendChild(acc);
    }
    return a;
  }

  /* ---------- pantalla ---------- */
  function renderizar(cont, ctx) {
    var estado = ctx.estado, ahora = ctx.ahora, hoy = T.claveDia(ahora);
    var lim = Q.limitesDias(estado, ahora);
    if (ctx.parametros && ctx.parametros.dia) { ui.dia = ctx.parametros.dia; ui.filtro = 'todos'; ui.mensaje = ''; }
    if (!ui.dia) ui.dia = hoy;
    if (ui.dia < lim.min) ui.dia = lim.min;
    if (ui.dia > lim.max) ui.dia = lim.max;

    var h = el('h2', 'adm-titulo', 'Turnos');
    h.id = 'adm-titulo'; h.tabIndex = -1;
    cont.appendChild(h);

    function irA(clave) { ui.dia = clave; ui.mensaje = ''; ctx.redibujar(); }

    // navegación por día
    var nav = el('div', 'adm-dia-nav');
    var ant = el('button', 'adm-nav-btn', '‹'); ant.type = 'button'; ant.setAttribute('data-id', 'dia-ant'); ant.setAttribute('aria-label', 'Día anterior');
    ant.disabled = ui.dia <= lim.min;
    ant.addEventListener('click', function () { irA(T.sumarDias(ui.dia, -1)); });
    var sig = el('button', 'adm-nav-btn', '›'); sig.type = 'button'; sig.setAttribute('data-id', 'dia-sig'); sig.setAttribute('aria-label', 'Día siguiente');
    sig.disabled = ui.dia >= lim.max;
    sig.addEventListener('click', function () { irA(T.sumarDias(ui.dia, 1)); });
    var etqFecha = el('label', 'adm-fecha');
    etqFecha.appendChild(el('span', 'sr-only', 'Elegir día'));
    var fecha = el('input'); fecha.type = 'date'; fecha.value = ui.dia; fecha.min = lim.min; fecha.max = lim.max;
    fecha.setAttribute('data-id', 'dia-fecha');
    fecha.addEventListener('change', function () { if (/^\d{4}-\d{2}-\d{2}$/.test(fecha.value) && fecha.value >= lim.min && fecha.value <= lim.max) irA(fecha.value); });
    etqFecha.appendChild(fecha);
    var hoyBtn = el('button', 'adm-btn adm-btn-sec adm-btn-chico', 'Hoy'); hoyBtn.type = 'button'; hoyBtn.setAttribute('data-id', 'dia-hoy');
    hoyBtn.disabled = ui.dia === hoy;
    hoyBtn.addEventListener('click', function () { irA(hoy); });
    nav.appendChild(ant); nav.appendChild(etqFecha); nav.appendChild(sig); nav.appendChild(hoyBtn);
    cont.appendChild(nav);

    var th = el('h3', 'adm-dia-titulo', cap(T.etiquetaDia(ui.dia)) + (ui.dia === hoy ? ' (hoy)' : ''));
    th.id = 'adm-titulo-dia'; th.tabIndex = -1;
    cont.appendChild(th);

    var msg = el('p', 'adm-mensaje', ui.mensaje); msg.setAttribute('role', 'status');
    if (!ui.mensaje) msg.hidden = true;
    cont.appendChild(msg);

    // filtros
    var delDia = Q.turnosDelDia(estado, ui.dia);
    var cuentas = Q.contarPorFiltro(delDia, ahora);
    var filtros = el('div', 'adm-filtros');
    filtros.setAttribute('role', 'group'); filtros.setAttribute('aria-label', 'Filtrar turnos por estado');
    FILTROS.forEach(function (f) {
      var b = el('button', 'adm-filtro' + (ui.filtro === f[0] ? ' activo' : ''), f[1] + ' (' + cuentas[f[0]] + ')');
      b.type = 'button'; b.setAttribute('data-id', 'filtro-' + f[0]); b.setAttribute('aria-pressed', ui.filtro === f[0] ? 'true' : 'false');
      b.addEventListener('click', function () { ui.filtro = f[0]; ui.mensaje = ''; ctx.redibujar(); });
      filtros.appendChild(b);
    });
    cont.appendChild(filtros);

    // lista
    var lista = Q.filtrar(delDia, ui.filtro, ahora);
    if (lista.length === 0) {
      var cerrado = D.tramosDelDia(estado.config.agenda, ui.dia).length === 0;
      cont.appendChild(el('p', 'adm-vacio', delDia.length > 0 ? 'No hay turnos con este filtro.' : (cerrado ? 'El spa no atiende este día.' : 'No hay turnos este día.')));
    } else {
      var grilla = el('div', 'adm-turnos');
      lista.forEach(function (t) { grilla.appendChild(tarjeta(ctx, estado, t, ahora)); });
      cont.appendChild(grilla);
    }
  }

  ED.adminSecciones.turnos = { titulo: 'Turnos', render: renderizar };
})(typeof window !== 'undefined' ? window : globalThis);
