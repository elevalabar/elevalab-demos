/* Spa Demo · archivo de calendario (.ics)
   Genera, en el navegador, el archivo que la clienta puede agregar a su calendario. No hace ninguna conexión.
   Las horas se escriben en UTC (con «Z») para no depender de definiciones de zona horaria: el calendario las convierte.
   Depende de: tiempo.js, estados.js. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var E = ED.estados;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function utc(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  // Escapes que pide el formato para texto: \  ;  ,  y saltos de línea.
  function escapar(texto) {
    return String(texto).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function largoUtf8(caracter) {
    var cp = caracter.codePointAt(0);
    return cp < 0x80 ? 1 : (cp < 0x800 ? 2 : (cp < 0x10000 ? 3 : 4));
  }

  // El formato exige líneas de hasta 75 octetos; si es más larga, se continúa en la siguiente con un espacio al inicio.
  function plegar(linea) {
    var partes = [], actual = '', largo = 0;
    Array.from(linea).forEach(function (c) {
      var n = largoUtf8(c);
      if (largo + n > 75) { partes.push(actual); actual = ' '; largo = 1; }
      actual += c; largo += n;
    });
    partes.push(actual);
    return partes.join('\r\n');
  }

  // Solo un turno confirmado se puede agregar al calendario.
  function generarICS(estado, turno, ahoraMs) {
    if (turno.estado !== 'confirmado') throw E.ErrorDemo('TURNO_NO_CONFIRMADO', 'Solo se puede agregar al calendario un turno confirmado.');
    var nombres = turno.serviciosIds.map(function (id) {
      var s = estado.servicios.filter(function (x) { return x.id === id; })[0];
      return s ? s.nombre : id;
    });
    var lineas = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ElevaLab//Spa Demo//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + turno.id + '@spa-demo.example',
      'DTSTAMP:' + utc(ahoraMs),
      'DTSTART:' + utc(turno.inicio),
      'DTEND:' + utc(turno.inicio + turno.duracionMin * 60000),
      'SUMMARY:' + escapar('Turno en Spa Demo'),
      'DESCRIPTION:' + escapar('Servicios: ' + nombres.join(', ') + '\nDemostración con datos ficticios. Código de reserva: ' + turno.id),
      'LOCATION:' + escapar('Spa Demo (marca ficticia)'),
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lineas.map(plegar).join('\r\n') + '\r\n';
  }

  function nombreArchivo(turno) { return 'turno-spa-demo-' + turno.id + '.ics'; }

  ED.ics = { generarICS: generarICS, nombreArchivo: nombreArchivo, escapar: escapar, plegar: plegar, utc: utc };
})(typeof window !== 'undefined' ? window : globalThis);
