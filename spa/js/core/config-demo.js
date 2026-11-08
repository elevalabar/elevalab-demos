/* Spa Demo · configuración de la demo
   Todos los valores son FICTICIOS. Nada de acá viene de un sistema real.
   Depende de: nada (se carga primero). */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};

  var VERSION_ESTADO = 1;
  var PREFIJO_ALMACEN = 'elevalab-demo-spa:';

  var GRUPOS = [
    { id: 'manos', nombre: 'Manos' },
    { id: 'pies', nombre: 'Pies' }
  ];

  var SERVICIOS = [
    { id: 'm-clasica', grupoId: 'manos', nombre: 'Manicura clásica', descripcion: 'Limado, cuidado de cutículas y esmaltado simple.' },
    { id: 'm-semi', grupoId: 'manos', nombre: 'Esmaltado semipermanente', descripcion: 'Color de larga duración con acabado brillante.' },
    { id: 'm-gel', grupoId: 'manos', nombre: 'Uñas de gel', descripcion: 'Refuerzo y diseño sobre la uña natural.' },
    { id: 'p-clasica', grupoId: 'pies', nombre: 'Pedicura clásica', descripcion: 'Limado, cuidado de cutículas y esmaltado simple.' },
    { id: 'p-esmaltado', grupoId: 'pies', nombre: 'Esmaltado de pies', descripcion: 'Aplicación de color sobre uñas ya cuidadas.' },
    { id: 'p-spa', grupoId: 'pies', nombre: 'Pedicura spa', descripcion: 'Tratamiento completo con exfoliación e hidratación.' }
  ];

  function copiarTramo(t) { return { desde: t.desde, hasta: t.hasta }; }

  // Horarios en minutos desde las 00:00 (hora de Buenos Aires).
  // Devuelve una copia nueva cada vez para que nadie comparta objetos por accidente.
  function crearConfigInicial() {
    var corrido = [{ desde: 600, hasta: 780 }, { desde: 900, hasta: 1140 }]; // 10-13 y 15-19
    return {
      agenda: {
        duracionMin: 60,       // todos los turnos duran lo mismo
        ventanaDias: 60,       // se puede reservar hasta hoy + 60 días
        anticipacionMin: 120,  // anticipación mínima para reservar
        bloqueos: [],          // fechas 'AAAA-MM-DD' sin atención
        dias: {
          0: [],                                   // domingo cerrado
          1: [],                                   // lunes cerrado
          2: corrido.map(copiarTramo),
          3: corrido.map(copiarTramo),
          4: corrido.map(copiarTramo),
          5: corrido.map(copiarTramo),
          6: [{ desde: 600, hasta: 840 }]          // sábado 10-14
        }
      },
      sena: {
        monto: 5000,               // monto de EJEMPLO, una sola seña general
        retencionMin: 15,          // minutos que se guarda el horario mientras se paga
        horasCambioSinPerder: 24   // horas antes del turno hasta las que se puede cambiar sin perder la seña
      },
      modoRapido: false            // true: la retención dura 60 segundos (para probar el vencimiento)
    };
  }

  ED.config = {
    VERSION_ESTADO: VERSION_ESTADO,
    PREFIJO_ALMACEN: PREFIJO_ALMACEN,
    CLAVE_ESTADO: PREFIJO_ALMACEN + 'v' + VERSION_ESTADO + ':estado',
    RETENCION_RAPIDA_MS: 60000,
    GRUPOS: GRUPOS,
    SERVICIOS: SERVICIOS,
    crearConfigInicial: crearConfigInicial
  };
})(typeof window !== 'undefined' ? window : globalThis);
