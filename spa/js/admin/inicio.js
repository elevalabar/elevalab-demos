/* Spa Demo · panel de administración · Inicio
   Muestra el saludo, los turnos de hoy y los próximos turnos confirmados (con su insignia de seña).
   Solo lee el estado (spa/js/core/consultas.js); no modifica nada.
   Depende de: spa/js/core/ y de panel.js (que lo dibuja y le entrega el contexto). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, R = ED.reservas, Q = ED.consultas, D = ED.disponibilidad;
  var doc = root.document;
  ED.adminSecciones = ED.adminSecciones || {};

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  function etiquetaDiaCorta(clave, hoy) {
    if (clave === hoy) return 'Hoy';
    if (clave === T.sumarDias(hoy, 1)) return 'Mañana';
    return cap(T.etiquetaDia(clave));
  }

  // Etiquetas de un turno: insignia de seña (si tiene) y de dónde vino.
  function etiquetas(turno) {
    var caja = el('div', 'adm-etiquetas');
    var ins = Q.insigniaSena(turno);
    if (ins) caja.appendChild(el('span', 'adm-insignia ' + ins.tipo, ins.texto));
    caja.appendChild(el('span', 'adm-insignia origen', turno.origen === 'web' ? 'Reserva web' : 'Cargado desde el panel'));
    return caja;
  }

  function renderizar(cont, ctx) {
    var estado = ctx.estado, ahora = ctx.ahora, hoy = T.claveDia(ahora);

    var h = el('h2', 'adm-titulo', 'Inicio');
    h.id = 'adm-titulo'; h.tabIndex = -1;
    cont.appendChild(h);
    cont.appendChild(el('p', 'apagado', 'Hola, administradora. Hoy es ' + T.etiquetaDia(hoy) + '.'));

    var grilla = el('div', 'adm-grilla');

    // Turnos de hoy
    var res = Q.resumenHoy(estado, ahora);
    var t1 = el('section', 'adm-tarjeta');
    t1.setAttribute('aria-labelledby', 'adm-hoy');
    var h1 = el('h3', null, 'Turnos de hoy'); h1.id = 'adm-hoy';
    t1.appendChild(h1);
    t1.appendChild(el('p', 'adm-numero', String(res.total)));
    if (res.total === 0) {
      var atiende = D.tramosDelDia(estado.config.agenda, hoy).length > 0;
      t1.appendChild(el('p', 'adm-detalle', atiende ? 'Todavía no hay turnos para hoy.' : 'Hoy el spa no atiende.'));
    } else {
      var partes = [plural(res.porVenir, 'confirmado por venir', 'confirmados por venir'), plural(res.finalizados, 'finalizado', 'finalizados')];
      if (res.enRevision > 0) partes.push(res.enRevision + ' en revisión');
      t1.appendChild(el('p', 'adm-detalle', partes.join(' · ')));
    }
    grilla.appendChild(t1);

    // Próximos turnos
    var t2 = el('section', 'adm-tarjeta');
    t2.setAttribute('aria-labelledby', 'adm-prox');
    var h2 = el('h3', null, 'Próximos turnos'); h2.id = 'adm-prox';
    t2.appendChild(h2);
    var prox = Q.proximosTurnos(estado, ahora, 3);
    if (prox.length === 0) t2.appendChild(el('p', 'adm-vacio', 'No hay turnos próximos.'));
    else {
      var ul = el('ul', 'adm-lista');
      prox.forEach(function (t) {
        var li = el('li', 'adm-item');
        li.appendChild(el('span', 'adm-item-hora', etiquetaDiaCorta(T.claveDia(t.inicio), hoy) + ', ' + T.formatoHora(t.inicio) + ' hs'));
        li.appendChild(el('span', 'adm-item-sub', t.serviciosIds.map(function (id) { return R.buscarServicio(estado, id).nombre; }).join(' + ')));
        li.appendChild(el('span', 'adm-item-sub', t.clienta.nombre));
        li.appendChild(etiquetas(t));
        ul.appendChild(li);
      });
      t2.appendChild(ul);
    }
    grilla.appendChild(t2);

    // Sobre la demo
    var t3 = el('section', 'adm-tarjeta');
    t3.setAttribute('aria-labelledby', 'adm-demo');
    var h3 = el('h3', null, 'Sobre esta demostración'); h3.id = 'adm-demo';
    t3.appendChild(h3);
    t3.appendChild(el('p', 'apagado', 'Este panel es una simulación con datos ficticios. Por ahora incluye Inicio y Turnos; Clientes, Agenda y Caja se agregan más adelante.'));
    if (ctx.rutaCliente) {
      var a = el('a', 'adm-btn adm-btn-sec', 'Ir a la vista de la clienta');
      a.href = ctx.rutaCliente;
      t3.appendChild(a);
    }
    grilla.appendChild(t3);

    cont.appendChild(grilla);
  }

  ED.adminSecciones.inicio = { titulo: 'Inicio', render: renderizar };
})(typeof window !== 'undefined' ? window : globalThis);
