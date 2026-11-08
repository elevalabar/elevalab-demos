/* Spa Demo · almacenamiento
   Guarda el estado de la demo en localStorage (clave propia, con versión).
   - Se comparte entre las vistas y las pestañas del MISMO navegador (evento «storage»).
   - NO se comparte entre visitantes ni entre dispositivos: nada sale de este navegador.
   - Si el navegador no permite guardar (modo privado, cuota llena), la demo sigue funcionando
     en memoria, solo en esta pestaña (modo() devuelve 'memoria').
   - Si lo guardado está dañado, es de otra versión o tiene una forma inesperada, se descarta y se vuelve a cargar el ejemplo.
   Depende de: config-demo.js, tiempo.js, estados.js, semillas.js. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};

  // Revisión mínima de forma. No pretende ser exhaustiva: evita que datos viejos o editados a mano rompan las pantallas.
  function validarEstado(est) {
    try {
      if (!est || typeof est !== 'object') return false;
      if (est.version !== ED.config.VERSION_ESTADO) return false;
      var c = est.config;
      if (!c || !c.agenda || typeof c.agenda.dias !== 'object' || !Array.isArray(c.agenda.bloqueos)) return false;
      if (!(c.agenda.duracionMin > 0) || !(c.agenda.ventanaDias >= 0) || !(c.agenda.anticipacionMin >= 0)) return false;
      if (!c.sena || typeof c.sena.monto !== 'number' || !(c.sena.retencionMin > 0)) return false;
      if (!Array.isArray(est.grupos) || !Array.isArray(est.servicios) || !Array.isArray(est.turnos)) return false;
      if (est.turnos.length > 2000) return false;
      return est.turnos.every(function (t) {
        return t && typeof t.id === 'string' && ED.estados.ESTADOS.indexOf(t.estado) !== -1 &&
          isFinite(t.inicio) && t.duracionMin > 0 && Array.isArray(t.serviciosIds) && t.clienta && typeof t.clienta === 'object';
      });
    } catch (e) { return false; }
  }

  // Acceder a localStorage puede lanzar un error (por ejemplo, cookies bloqueadas).
  function obtenerStorage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function crear(opciones) {
    var o = opciones || {};
    var storage = o.storage || null;
    var clave = o.clave || ED.config.CLAVE_ESTADO;
    var ahora = o.ahora || ED.tiempo.ahora;
    var semilla = o.semilla || function (ms) { return ED.semillas.crearEstadoInicial(ms); };
    var ventana = o.ventana || null;
    var escuchas = [];
    var memoriaTexto = null;
    var modoActual = 'memoria';

    function probar(s) {
      try { var k = clave + ':sonda'; s.setItem(k, '1'); s.removeItem(k); return true; } catch (e) { return false; }
    }
    if (storage && probar(storage)) modoActual = 'localStorage';

    function leerTexto() {
      if (modoActual === 'localStorage') {
        try { return storage.getItem(clave); } catch (e) { modoActual = 'memoria'; }
      }
      return memoriaTexto;
    }
    function escribirTexto(txt) {
      if (modoActual === 'localStorage') {
        try { storage.setItem(clave, txt); memoriaTexto = txt; return; } catch (e) { modoActual = 'memoria'; }
      }
      memoriaTexto = txt;
    }

    function leer() {
      var txt = leerTexto(), est = null;
      if (txt) { try { est = JSON.parse(txt); } catch (e) { est = null; } }
      if (!validarEstado(est)) {
        est = semilla(ahora());
        escribirTexto(JSON.stringify(est));
      }
      return est;
    }

    function notificar(est) {
      escuchas.slice().forEach(function (cb) { try { cb(est); } catch (e) { /* una pantalla con error no debe frenar a las demás */ } });
    }

    // Lee una copia, la modifica con fn(copia) y la guarda. Si fn lanza un error, no se guarda nada.
    // Es «gana la última escritura»: suficiente para una demo de una sola persona.
    function actualizar(fn) {
      var est = leer();
      var resultado = fn(est);
      if (!validarEstado(est)) throw new Error('El estado quedó inválido después de la actualización; no se guardó.');
      escribirTexto(JSON.stringify(est));
      notificar(est);
      return resultado;
    }

    function reiniciar() {
      var est = semilla(ahora());
      escribirTexto(JSON.stringify(est));
      notificar(est);
      return est;
    }

    function suscribir(cb) {
      escuchas.push(cb);
      return function () { var i = escuchas.indexOf(cb); if (i !== -1) escuchas.splice(i, 1); };
    }

    // Cambios hechos desde otra pestaña del mismo navegador.
    function procesarEventoStorage(ev) {
      if (!ev) return;
      if (ev.key === null || ev.key === clave) notificar(leer());
    }
    if (ventana && ventana.addEventListener) ventana.addEventListener('storage', procesarEventoStorage);
    function destruir() {
      if (ventana && ventana.removeEventListener) ventana.removeEventListener('storage', procesarEventoStorage);
      escuchas = [];
    }

    return {
      leer: leer, actualizar: actualizar, reiniciar: reiniciar, suscribir: suscribir,
      modo: function () { return modoActual; },
      procesarEventoStorage: procesarEventoStorage, destruir: destruir, clave: clave
    };
  }

  ED.almacen = { crear: crear, obtenerStorage: obtenerStorage, validarEstado: validarEstado };
})(typeof window !== 'undefined' ? window : globalThis);
