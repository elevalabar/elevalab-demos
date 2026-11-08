/* Spa Demo · asistente de reserva (vista de la clienta)
   Entrega B3.1: paso 1 (fecha y horario) y paso 2 (servicios). Los pasos 3 y 4 (datos y seña) llegan en la próxima entrega.
   Solo dibuja y guía: todas las reglas (horarios libres, un servicio por grupo) salen de spa/js/core/.
   Los datos que la clienta elige viven en memoria de la página; todavía no se reserva nada ni se guarda nada.
   Depende de: spa/js/core/ (config-demo, tiempo, estados, disponibilidad, reservas, semillas, almacen). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, D = ED.disponibilidad, R = ED.reservas;
  var doc = root.document;

  var SEMANA = [['lun', 'lunes'], ['mar', 'martes'], ['mié', 'miércoles'], ['jue', 'jueves'], ['vie', 'viernes'], ['sáb', 'sábado'], ['dom', 'domingo']];
  var PASOS = ['Fecha y horario', 'Servicios', 'Tus datos', 'Revisar y pagar'];

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function indiceMes(anio, mes) { return anio * 12 + (mes - 1); }

  /* ---------- tarjetas de servicios de la portada ---------- */
  function pintarServiciosInicio(almacen, destino) {
    var cont = typeof destino === 'string' ? doc.getElementById(destino) : destino;
    if (!cont) return;
    var estado = almacen.leer();
    cont.textContent = '';
    estado.grupos.forEach(function (g) {
      var tarjeta = el('article', 'srv-grupo');
      tarjeta.appendChild(el('h3', null, g.nombre));
      var ul = el('ul', 'srv-lista');
      estado.servicios.filter(function (s) { return s.grupoId === g.id; }).forEach(function (s) {
        var li = el('li');
        li.appendChild(el('strong', null, s.nombre));
        li.appendChild(el('span', 'srv-desc', s.descripcion));
        ul.appendChild(li);
      });
      tarjeta.appendChild(ul);
      cont.appendChild(tarjeta);
    });
  }

  /* ---------- asistente ---------- */
  function montar(opc) {
    var almacen = opc.almacen;
    var cont = typeof opc.destino === 'string' ? doc.getElementById(opc.destino) : opc.destino;
    if (!cont) return null;

    var ui = { paso: 1, anio: null, mes: null, dia: null, inicio: null, servicios: [], aviso: '', enfocarPanel: false };
    var ultimaFirma = '';

    function limites(estado, ahora) {
      var ini = T.partes(ahora);
      var fin = T.partes(T.msDeClave(T.sumarDias(T.claveDia(ahora), estado.config.agenda.ventanaDias), 0));
      return { desde: indiceMes(ini.anio, ini.mes), hasta: indiceMes(fin.anio, fin.mes), ini: ini };
    }

    // Mes que se muestra al empezar: el primero que tenga algún día con horarios libres.
    function elegirMesInicial(estado, ahora) {
      var lim = limites(estado, ahora);
      for (var i = lim.desde; i <= lim.hasta; i++) {
        var anio = Math.floor(i / 12), mes = (i % 12) + 1;
        if (Object.keys(D.diasConHorarios(estado, anio, mes, ahora)).length > 0) { ui.anio = anio; ui.mes = mes; return; }
      }
      ui.anio = lim.ini.anio; ui.mes = lim.ini.mes;
    }

    // Si lo que la clienta había elegido dejó de estar disponible (otra pestaña, reinicio, paso del tiempo), se avisa.
    function depurar(estado, ahora) {
      ui.servicios = ui.servicios.filter(function (id) { return R.buscarServicio(estado, id); });
      if (ui.inicio !== null && !D.estaLibre(estado, ui.inicio, estado.config.agenda.duracionMin, ahora)) {
        ui.inicio = null;
        ui.aviso = 'Ese horario ya no está disponible. Elegí otro.';
        if (ui.paso > 1) { ui.paso = 1; ui.enfocarPanel = true; }
      }
    }

    function firma(estado, ahora) {
      return JSON.stringify({
        hoy: T.claveDia(ahora),
        dias: D.diasConHorarios(estado, ui.anio, ui.mes, ahora),
        horas: ui.dia ? D.horariosLibres(estado, ui.dia, ahora).map(function (h) { return h.inicio; }) : []
      });
    }

    /* --- piezas --- */
    function barraPasos() {
      var ol = el('ol', 'pasos');
      ol.setAttribute('aria-label', 'Pasos de la reserva');
      PASOS.forEach(function (nombre, i) {
        var n = i + 1;
        var li = el('li', 'paso ' + (n === ui.paso ? 'actual' : (n < ui.paso ? 'hecho' : 'pendiente')));
        if (n === ui.paso) li.setAttribute('aria-current', 'step');
        li.appendChild(el('span', 'paso-num', String(n)));
        li.appendChild(el('span', 'paso-nombre', nombre));
        ol.appendChild(li);
      });
      return ol;
    }

    function titulo(texto) {
      var h = el('h3', 'panel-titulo', texto);
      h.id = 'titulo-paso';
      h.tabIndex = -1;
      return h;
    }

    function boton(texto, idFoco, clase, alClick, deshabilitado) {
      var b = el('button', clase, texto);
      b.type = 'button';
      b.setAttribute('data-id', idFoco);
      if (deshabilitado) b.disabled = true;
      else b.addEventListener('click', alClick);
      return b;
    }

    function calendario(estado, ahora) {
      var lim = limites(estado, ahora);
      var caja = el('div', 'cal');
      var cab = el('div', 'cal-cab');
      cab.appendChild(boton('‹', 'mes-ant', 'cal-nav', function () {
        if (ui.mes === 1) { ui.mes = 12; ui.anio--; } else ui.mes--;
        dibujar();
      }, indiceMes(ui.anio, ui.mes) <= lim.desde));
      cab.lastChild.setAttribute('aria-label', 'Mes anterior');
      var t = el('p', 'cal-mes', cap(T.MESES[ui.mes - 1]) + ' ' + ui.anio);
      t.setAttribute('aria-live', 'polite');
      cab.appendChild(t);
      cab.appendChild(boton('›', 'mes-sig', 'cal-nav', function () {
        if (ui.mes === 12) { ui.mes = 1; ui.anio++; } else ui.mes++;
        dibujar();
      }, indiceMes(ui.anio, ui.mes) >= lim.hasta));
      cab.lastChild.setAttribute('aria-label', 'Mes siguiente');
      caja.appendChild(cab);

      var sem = el('div', 'cal-semana');
      sem.setAttribute('aria-hidden', 'true');
      SEMANA.forEach(function (d) { sem.appendChild(el('span', null, d[0])); });
      caja.appendChild(sem);

      var grilla = el('div', 'cal-grilla');
      grilla.setAttribute('role', 'group');
      grilla.setAttribute('aria-label', 'Días de ' + T.MESES[ui.mes - 1] + ' ' + ui.anio);
      var libres = D.diasConHorarios(estado, ui.anio, ui.mes, ahora);
      var primero = ui.anio + '-' + (ui.mes < 10 ? '0' : '') + ui.mes + '-01';
      var hueco = (T.diaSemanaDeClave(primero) + 6) % 7;      // la semana empieza el lunes
      for (var h = 0; h < hueco; h++) grilla.appendChild(el('span', 'cal-vacio'));
      var hoy = T.claveDia(ahora);
      for (var d = 1; d <= T.diasEnMes(ui.anio, ui.mes); d++) {
        var clave = ui.anio + '-' + (ui.mes < 10 ? '0' : '') + ui.mes + '-' + (d < 10 ? '0' : '') + d;
        var cant = libres[clave] || 0;
        var b = el('button', 'cal-dia' + (clave === hoy ? ' hoy' : '') + (clave === ui.dia ? ' elegido' : ''), String(d));
        b.type = 'button';
        b.setAttribute('data-id', 'dia-' + clave);
        if (cant === 0) {
          b.disabled = true;
          b.setAttribute('aria-label', T.etiquetaDia(clave) + ', sin horarios libres');
        } else {
          b.setAttribute('aria-label', T.etiquetaDia(clave) + ', ' + plural(cant, 'horario libre', 'horarios libres'));
          b.setAttribute('aria-pressed', clave === ui.dia ? 'true' : 'false');
          (function (c) {
            b.addEventListener('click', function () {
              if (ui.dia !== c) { ui.dia = c; ui.inicio = null; }
              ui.aviso = '';
              dibujar();
            });
          })(clave);
        }
        grilla.appendChild(b);
      }
      caja.appendChild(grilla);
      return caja;
    }

    function horarios(estado, ahora) {
      var caja = el('div', 'horarios');
      if (!ui.dia) { caja.appendChild(el('p', 'apagado', 'Elegí un día del calendario para ver los horarios libres.')); return caja; }
      var lista = D.horariosLibres(estado, ui.dia, ahora);
      caja.appendChild(el('h4', 'horarios-titulo', 'Horarios para ' + T.etiquetaDia(ui.dia)));
      if (lista.length === 0) { caja.appendChild(el('p', 'apagado', 'Ya no quedan horarios libres ese día. Elegí otro.')); return caja; }
      var grilla = el('div', 'horarios-grilla');
      lista.forEach(function (hh) {
        var b = el('button', 'hora' + (hh.inicio === ui.inicio ? ' elegido' : ''), hh.etiqueta);
        b.type = 'button';
        b.setAttribute('data-id', 'hora-' + hh.inicio);
        b.setAttribute('aria-pressed', hh.inicio === ui.inicio ? 'true' : 'false');
        b.setAttribute('aria-label', hh.etiqueta + ' hs');
        b.addEventListener('click', function () { ui.inicio = hh.inicio; ui.aviso = ''; dibujar(); });
        grilla.appendChild(b);
      });
      caja.appendChild(grilla);
      caja.appendChild(el('p', 'apagado pequeno', 'Horarios de Buenos Aires. Cada turno dura ' + estado.config.agenda.duracionMin + ' minutos.'));
      return caja;
    }

    function pasoFecha(estado, ahora) {
      var p = el('div', 'panel');
      p.appendChild(titulo('Elegí día y horario'));
      p.appendChild(el('p', 'apagado', 'Solo se habilitan los días que tienen horarios libres.'));
      var aviso = el('p', 'aviso-ui', ui.aviso);
      aviso.setAttribute('role', 'status');
      p.appendChild(aviso);
      p.appendChild(calendario(estado, ahora));
      p.appendChild(horarios(estado, ahora));
      var nav = el('div', 'panel-nav');
      nav.appendChild(boton('Continuar', 'sig', 'btn-spa', function () { ui.paso = 2; ui.enfocarPanel = true; dibujar(); }, ui.inicio === null));
      p.appendChild(nav);
      return p;
    }

    function pasoServicios(estado) {
      var p = el('div', 'panel');
      p.appendChild(titulo('Elegí tus servicios'));
      p.appendChild(el('p', 'apagado', 'Podés elegir un servicio por grupo: uno de Manos, uno de Pies o uno de cada uno. Si elegís otro del mismo grupo, reemplaza al anterior.'));
      estado.grupos.forEach(function (g) {
        var fs = el('fieldset', 'srv-campo');
        fs.appendChild(el('legend', null, g.nombre));
        estado.servicios.filter(function (s) { return s.grupoId === g.id; }).forEach(function (s) {
          var etq = el('label', 'srv-opcion');
          var r = el('input');
          r.type = 'radio'; r.name = 'grupo-' + g.id; r.value = s.id;
          r.setAttribute('data-id', 'srv-' + s.id);
          r.checked = ui.servicios.indexOf(s.id) !== -1;
          r.addEventListener('change', function () { ui.servicios = R.aplicarSeleccion(estado, ui.servicios, s.id); dibujar(); });
          etq.appendChild(r);
          var txt = el('span', 'srv-txt');
          txt.appendChild(el('strong', null, s.nombre));
          txt.appendChild(el('span', 'srv-desc', s.descripcion));
          etq.appendChild(txt);
          fs.appendChild(etq);
        });
        var elegido = ui.servicios.some(function (id) { var s = R.buscarServicio(estado, id); return s && s.grupoId === g.id; });
        if (elegido) {
          fs.appendChild(boton('Quitar mi elección de ' + g.nombre, 'quitar-' + g.id, 'enlace', function () {
            ui.servicios = ui.servicios.filter(function (id) { var s = R.buscarServicio(estado, id); return s && s.grupoId !== g.id; });
            dibujar();
          }));
        }
        p.appendChild(fs);
      });
      var valido = R.validarSeleccionServicios(estado, ui.servicios).ok;
      var nav = el('div', 'panel-nav');
      nav.appendChild(boton('Atrás', 'atras', 'btn-spa-sec', function () { ui.paso = 1; ui.enfocarPanel = true; dibujar(); }));
      nav.appendChild(boton('Continuar', 'sig', 'btn-spa', function () { ui.paso = 3; ui.enfocarPanel = true; dibujar(); }, !valido));
      p.appendChild(nav);
      return p;
    }

    function pasoPendiente() {
      var p = el('div', 'panel');
      p.appendChild(titulo('Tus datos'));
      p.appendChild(el('p', null, 'Hasta acá llega esta entrega de la demo (B3.1). En la próxima se agregan los datos de la clienta, la revisión de la seña, el pago simulado y la confirmación.'));
      p.appendChild(el('p', 'apagado', 'Todavía no se reservó nada: tu elección se ve en el resumen y no se guarda.'));
      var nav = el('div', 'panel-nav');
      nav.appendChild(boton('Atrás', 'atras', 'btn-spa-sec', function () { ui.paso = 2; ui.enfocarPanel = true; dibujar(); }));
      p.appendChild(nav);
      return p;
    }

    function resumen(estado) {
      var a = el('aside', 'resumen');
      a.setAttribute('aria-label', 'Resumen de tu reserva');
      a.appendChild(el('h3', null, 'Tu reserva'));
      var dl = el('dl');
      function fila(rotulo, valor) { dl.appendChild(el('dt', null, rotulo)); dl.appendChild(el('dd', valor ? null : 'vacio', valor || '—')); }
      fila('Día', ui.dia ? cap(T.etiquetaDia(ui.dia)) : '');
      fila('Horario', ui.inicio !== null ? T.formatoHora(ui.inicio) + ' a ' + T.formatoHora(ui.inicio + estado.config.agenda.duracionMin * 60000) + ' hs' : '');
      dl.appendChild(el('dt', null, 'Servicios'));
      var dd = el('dd');
      if (ui.servicios.length === 0) { dd.className = 'vacio'; dd.textContent = '—'; }
      else {
        var ul = el('ul');
        ui.servicios.forEach(function (id) { ul.appendChild(el('li', null, R.buscarServicio(estado, id).nombre)); });
        dd.appendChild(ul);
      }
      dl.appendChild(dd);
      fila('Duración', estado.config.agenda.duracionMin + ' minutos');
      a.appendChild(dl);
      a.appendChild(el('p', 'apagado pequeno', 'Demostración: no se reserva ni se cobra nada real.'));
      return a;
    }

    /* --- dibujo completo, conservando el foco --- */
    function dibujar() {
      var estado = almacen.leer(), ahora = T.ahora();
      if (ui.anio === null) elegirMesInicial(estado, ahora);
      depurar(estado, ahora);
      var activo = doc.activeElement && doc.activeElement.getAttribute ? doc.activeElement.getAttribute('data-id') : null;
      cont.textContent = '';
      cont.appendChild(barraPasos());
      var rejilla = el('div', 'reserva-rejilla');
      rejilla.appendChild(ui.paso === 1 ? pasoFecha(estado, ahora) : (ui.paso === 2 ? pasoServicios(estado) : pasoPendiente()));
      rejilla.appendChild(resumen(estado));
      cont.appendChild(rejilla);
      var destinoFoco = null;
      if (ui.enfocarPanel) { destinoFoco = cont.querySelector('#titulo-paso'); ui.enfocarPanel = false; }
      else if (activo) destinoFoco = cont.querySelector('[data-id="' + activo + '"]');
      if (destinoFoco && !destinoFoco.disabled) destinoFoco.focus();
      ultimaFirma = firma(estado, ahora);
    }

    // Si pasa el tiempo o cambian los datos desde otra pestaña, se actualiza solo lo que cambió.
    function refrescarSiCambio() {
      if (doc.hidden) return;
      var estado = almacen.leer(), ahora = T.ahora();
      if (ui.anio !== null && firma(estado, ahora) !== ultimaFirma) dibujar();
    }
    var baja = almacen.suscribir(function () { dibujar(); });
    var reloj = root.setInterval(refrescarSiCambio, 30000);
    doc.addEventListener('visibilitychange', refrescarSiCambio);

    dibujar();
    return { destruir: function () { baja(); root.clearInterval(reloj); doc.removeEventListener('visibilitychange', refrescarSiCambio); cont.textContent = ''; } };
  }

  ED.asistente = { montar: montar, pintarServiciosInicio: pintarServiciosInicio };
})(typeof window !== 'undefined' ? window : globalThis);
