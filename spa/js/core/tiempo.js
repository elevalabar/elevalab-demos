/* Spa Demo · tiempo
   Todo el cálculo de fechas se hace en hora de Buenos Aires (UTC-3 fijo: Argentina no usa
   horario de verano desde 2009), así la demo se ve igual sin importar dónde esté el visitante.
   El reloj se puede reemplazar (setReloj / fijarAhora) para que las pruebas no dependan de la fecha real.
   Depende de: nada. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};

  var OFFSET_MIN = -180;
  var reloj = null;
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function ahora() { return reloj ? reloj() : Date.now(); }
  function setReloj(fn) { reloj = (typeof fn === 'function') ? fn : null; }
  function fijarAhora(ms) { setReloj(function () { return ms; }); }

  // Partes de calendario de un instante, en hora de Buenos Aires.
  function partes(ms) {
    var d = new Date(ms + OFFSET_MIN * 60000);
    return {
      anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(),
      hora: d.getUTCHours(), minuto: d.getUTCMinutes(), diaSemana: d.getUTCDay()
    };
  }

  // Instante (ms) de una fecha y hora de pared de Buenos Aires.
  function aMs(anio, mes, dia, hora, minuto) {
    return Date.UTC(anio, mes - 1, dia, hora || 0, minuto || 0) - OFFSET_MIN * 60000;
  }

  function claveDia(ms) {
    var p = partes(ms);
    return p.anio + '-' + pad(p.mes) + '-' + pad(p.dia);
  }

  function parseClave(clave) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(clave));
    if (!m) throw new Error('Clave de día inválida: ' + clave);
    return { anio: +m[1], mes: +m[2], dia: +m[3] };
  }

  // Instante de un día (clave) a cierta cantidad de minutos desde las 00:00.
  function msDeClave(clave, minutosDelDia) {
    var c = parseClave(clave);
    return aMs(c.anio, c.mes, c.dia, 0, 0) + (minutosDelDia || 0) * 60000;
  }

  function sumarDias(clave, n) {
    var c = parseClave(clave);
    var d = new Date(Date.UTC(c.anio, c.mes - 1, c.dia + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function diaSemanaDeClave(clave) {
    var c = parseClave(clave);
    return new Date(Date.UTC(c.anio, c.mes - 1, c.dia)).getUTCDay();
  }

  function diasEnMes(anio, mes) { return new Date(Date.UTC(anio, mes, 0)).getUTCDate(); }

  function formatoHora(ms) {
    var p = partes(ms);
    return pad(p.hora) + ':' + pad(p.minuto);
  }

  function minutosAHHMM(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }

  function etiquetaDia(clave) {
    var c = parseClave(clave);
    return DIAS[diaSemanaDeClave(clave)] + ' ' + c.dia + ' de ' + MESES[c.mes - 1];
  }

  ED.tiempo = {
    OFFSET_MIN: OFFSET_MIN, DIAS: DIAS, MESES: MESES,
    ahora: ahora, setReloj: setReloj, fijarAhora: fijarAhora,
    partes: partes, aMs: aMs, claveDia: claveDia, parseClave: parseClave, msDeClave: msDeClave,
    sumarDias: sumarDias, diaSemanaDeClave: diaSemanaDeClave, diasEnMes: diasEnMes,
    formatoHora: formatoHora, minutosAHHMM: minutosAHHMM, etiquetaDia: etiquetaDia
  };
})(typeof window !== 'undefined' ? window : globalThis);
