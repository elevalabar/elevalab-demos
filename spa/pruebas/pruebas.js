/* Spa Demo · pruebas automáticas de las reglas de negocio
   Se abren en el navegador: spa/pruebas/index.html (no necesitan ninguna herramienta ni conexión).
   Usan un reloj fijo (martes 10/11/2026, 09:00 hora de Buenos Aires) y un almacenamiento falso,
   así que no dependen de la fecha real ni tocan los datos guardados de la demo.
   Depende de: todos los módulos de spa/js/core/ (incluidos ics.js y consultas.js) cargados antes. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo;
  var T = ED.tiempo, E = ED.estados, D = ED.disponibilidad, R = ED.reservas, S = ED.semillas, A = ED.almacen, C = ED.config, I = ED.ics, Q = ED.consultas;

  /* ---------- mini ejecutor ---------- */
  var casos = [], grupoActual = '';
  function grupo(nombre) { grupoActual = nombre; }
  function probar(nombre, fn) { casos.push({ grupo: grupoActual, nombre: nombre, fn: fn }); }
  function igual(real, esperado, msg) {
    if (real !== esperado) throw new Error((msg ? msg + ': ' : '') + 'se esperaba ' + JSON.stringify(esperado) + ' y se obtuvo ' + JSON.stringify(real));
  }
  function cierto(cond, msg) { if (!cond) throw new Error(msg || 'Se esperaba verdadero'); }
  function lanza(fn, codigo, msg) {
    try { fn(); } catch (e) {
      if (codigo && e.codigo !== codigo) throw new Error('Se esperaba el error ' + codigo + ' y llegó ' + (e.codigo || e.message));
      return;
    }
    throw new Error(msg || 'Se esperaba un error' + (codigo ? ' ' + codigo : ''));
  }

  /* ---------- ayudas ---------- */
  var MIN = 60000, DIA = 86400000;
  var BASE = T.aMs(2026, 11, 10, 9, 0);                 // martes 10/11/2026 09:00
  var MIE_10 = T.msDeClave('2026-11-11', 600);          // miércoles 11/11 10:00
  var MIE_11 = T.msDeClave('2026-11-11', 660);          // miércoles 11/11 11:00

  function estadoVacio(ms) {
    var e = S.crearEstadoInicial(ms || BASE);
    e.turnos = []; e.contador = 0; e.config.agenda.bloqueos = [];
    return e;
  }
  function pedido(inicio, extra) {
    var p = { inicio: inicio, serviciosIds: ['m-clasica', 'p-clasica'], clienta: { nombre: 'Ana Demo', email: 'ana.demo@example.com', telefono: '11 5555-0199' } };
    for (var k in (extra || {})) p[k] = extra[k];
    return p;
  }
  function libres(estado, clave, ahora) { return D.horariosLibres(estado, clave, ahora || BASE); }
  function etiquetas(lista) { return lista.map(function (s) { return s.etiqueta; }).join(','); }
  function storageFalso(falla) {
    var datos = {};
    return {
      getItem: function (k) { if (falla) throw new Error('bloqueado'); return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
      setItem: function (k, v) { if (falla) throw new Error('lleno'); datos[k] = String(v); },
      removeItem: function (k) { delete datos[k]; },
      _datos: datos
    };
  }
  function almacenDePrueba(storage) { return A.crear({ storage: storage, ahora: function () { return BASE; } }); }

  /* ================= TIEMPO ================= */
  grupo('Tiempo (hora de Buenos Aires)');
  probar('aMs usa UTC-3: 09:00 en Buenos Aires son las 12:00 UTC', function () {
    igual(T.aMs(2026, 11, 10, 9, 0), Date.UTC(2026, 10, 10, 12, 0));
  });
  probar('partes() devuelve la fecha de Buenos Aires aunque en UTC sea otro día', function () {
    var p = T.partes(Date.UTC(2026, 10, 11, 1, 30));     // 01:30 UTC = 22:30 del día anterior en Buenos Aires
    igual(p.dia, 10); igual(p.hora, 22); igual(p.minuto, 30);
  });
  probar('claveDia y msDeClave son inversas', function () {
    igual(T.claveDia(T.msDeClave('2026-11-10', 615)), '2026-11-10');
    igual(T.formatoHora(T.msDeClave('2026-11-10', 615)), '10:15');
  });
  probar('sumarDias cruza fin de mes y de año', function () {
    igual(T.sumarDias('2026-11-30', 1), '2026-12-01');
    igual(T.sumarDias('2026-12-31', 1), '2027-01-01');
    igual(T.sumarDias('2026-03-01', -1), '2026-02-28');
  });
  probar('día de la semana: el 10/11/2026 es martes y el 14/11/2026 es sábado', function () {
    igual(T.diaSemanaDeClave('2026-11-10'), 2);
    igual(T.diaSemanaDeClave('2026-11-14'), 6);
    igual(T.diaSemanaDeClave('2026-11-15'), 0);
  });
  probar('etiquetaDia en español', function () { igual(T.etiquetaDia('2026-11-10'), 'martes 10 de noviembre'); });
  probar('el reloj se puede fijar y restaurar', function () {
    try { T.fijarAhora(BASE); igual(T.ahora(), BASE); } finally { T.setReloj(null); }
    cierto(Math.abs(T.ahora() - Date.now()) < 1000, 'el reloj real no se restauró');
  });

  /* ================= DISPONIBILIDAD ================= */
  grupo('Disponibilidad');
  probar('un martes futuro completo ofrece 10, 11, 12, 15, 16, 17 y 18 hs', function () {
    igual(etiquetas(libres(estadoVacio(), '2026-11-17')), '10:00,11:00,12:00,15:00,16:00,17:00,18:00');
  });
  probar('el sábado atiende solo de 10 a 14 (4 horarios)', function () {
    igual(etiquetas(libres(estadoVacio(), '2026-11-14')), '10:00,11:00,12:00,13:00');
  });
  probar('domingo y lunes están cerrados', function () {
    igual(libres(estadoVacio(), '2026-11-15').length, 0, 'domingo');
    igual(libres(estadoVacio(), '2026-11-16').length, 0, 'lunes');
  });
  probar('un turno entra solo si termina antes del cierre del tramo', function () {
    var e = estadoVacio(); e.config.agenda.dias[3] = [{ desde: 600, hasta: 750 }];   // 10:00 a 12:30
    igual(etiquetas(libres(e, '2026-11-11')), '10:00,11:00');                         // 12:00 terminaría 13:00 > 12:30
  });
  probar('un día bloqueado no ofrece nada', function () {
    var e = estadoVacio(); e.config.agenda.bloqueos = ['2026-11-11'];
    igual(libres(e, '2026-11-11').length, 0);
  });
  probar('anticipación mínima de 2 hs: hoy a las 09:00 el primer horario es 11:00', function () {
    igual(etiquetas(libres(estadoVacio(), '2026-11-10')), '11:00,12:00,15:00,16:00,17:00,18:00');
  });
  probar('anticipación mínima: a las 09:30 el primer horario es 12:00', function () {
    igual(etiquetas(D.horariosLibres(estadoVacio(), '2026-11-10', T.aMs(2026, 11, 10, 9, 30))), '12:00,15:00,16:00,17:00,18:00');
  });
  probar('los horarios que ya pasaron no se ofrecen (hoy a las 20:00 no queda nada)', function () {
    igual(D.horariosLibres(estadoVacio(), '2026-11-10', T.aMs(2026, 11, 10, 20, 0)).length, 0);
  });
  probar('un día anterior a hoy no se ofrece', function () { igual(libres(estadoVacio(), '2026-11-09').length, 0); });
  probar('ventana de reservas: se puede hasta hoy + 60 días y no más', function () {
    var ag = estadoVacio().config.agenda;
    igual(D.dentroDeVentana(ag, '2027-01-09', BASE), true, '+60 días');
    igual(D.dentroDeVentana(ag, '2027-01-10', BASE), false, '+61 días');
    cierto(libres(estadoVacio(), '2027-01-09').length > 0, 'el día +60 (sábado) debería tener horarios');
    igual(libres(estadoVacio(), '2027-01-12').length, 0, 'el día +63 no debería tener horarios');
  });
  probar('un turno confirmado ocupa su horario', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE); R.resolverPago(e, t.id, 'aprobado', BASE);
    igual(etiquetas(libres(e, '2026-11-11')), '11:00,12:00,15:00,16:00,17:00,18:00');
  });
  probar('una reserva retenida (reservada y vigente) ocupa su horario', function () {
    var e = estadoVacio(); R.iniciarReserva(e, pedido(MIE_10), BASE);
    cierto(etiquetas(libres(e, '2026-11-11')).indexOf('10:00') === -1, '10:00 no debería ofrecerse');
  });
  probar('una reserva cuyo contador se agotó ya no ocupa el horario (aunque nadie la haya marcado vencida todavía)', function () {
    var e = estadoVacio(); R.iniciarReserva(e, pedido(MIE_10), BASE);
    var despues = BASE + 15 * MIN;                       // justo cuando vence
    cierto(etiquetas(D.horariosLibres(e, '2026-11-11', despues)).indexOf('10:00') !== -1, '10:00 debería volver a ofrecerse');
  });
  probar('turnos vencidos y cancelados no ocupan horario; en revisión sí', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    t.estado = 'vencida'; cierto(D.estaLibre(e, MIE_10, 60, BASE), 'vencida debería liberar');
    t.estado = 'cancelado'; cierto(D.estaLibre(e, MIE_10, 60, BASE), 'cancelado debería liberar');
    t.estado = 'en_revision'; cierto(!D.estaLibre(e, MIE_10, 60, BASE), 'en revisión debería ocupar');
  });
  probar('estaLibre rechaza horarios que no son de la agenda (10:30)', function () {
    cierto(!D.estaLibre(estadoVacio(), T.msDeClave('2026-11-11', 630), 60, BASE));
  });
  probar('diasConHorarios no incluye lunes, domingos ni días pasados', function () {
    var dias = D.diasConHorarios(estadoVacio(), 2026, 11, BASE);
    cierto(dias['2026-11-10'] === 6, 'martes de hoy: 6 horarios');
    cierto(dias['2026-11-11'] === 7, 'miércoles: 7 horarios');
    cierto(dias['2026-11-14'] === 4, 'sábado: 4 horarios');
    cierto(!dias['2026-11-15'] && !dias['2026-11-16'] && !dias['2026-11-09'], 'domingo, lunes y el día pasado no deberían figurar');
  });

  /* ================= ESTADOS ================= */
  grupo('Máquina de estados');
  probar('las 10 transiciones permitidas pasan y las demás se rechazan (matriz completa)', function () {
    var permitidas = ['reservada>confirmado', 'reservada>vencida', 'reservada>en_revision', 'reservada>cancelado',
      'confirmado>cancelado', 'confirmado>en_revision', 'en_revision>confirmado', 'en_revision>cancelado',
      'vencida>confirmado', 'vencida>en_revision'];
    var cuenta = 0;
    E.ESTADOS.forEach(function (d) {
      E.ESTADOS.forEach(function (h) {
        var esperado = permitidas.indexOf(d + '>' + h) !== -1;
        igual(E.puedeTransicionar(d, h), esperado, d + ' → ' + h);
        if (esperado) cuenta++;
      });
    });
    igual(cuenta, 10);
  });
  probar('cancelado es terminal', function () {
    igual(E.esTerminal('cancelado'), true);
    E.ESTADOS.filter(function (s) { return s !== 'cancelado'; }).forEach(function (s) { igual(E.esTerminal(s), false, s); });
  });
  probar('transicionar rechaza lo prohibido y no modifica el turno', function () {
    var t = { estado: 'cancelado', historial: [] };
    lanza(function () { E.transicionar(t, 'confirmado', BASE); }, 'TRANSICION_INVALIDA');
    igual(t.estado, 'cancelado'); igual(t.historial.length, 0);
    lanza(function () { E.transicionar({ estado: 'reservada' }, 'inexistente', BASE); }, 'ESTADO_DESCONOCIDO');
  });
  probar('transicionar deja constancia en el historial', function () {
    var t = { estado: 'reservada', historial: [] };
    E.transicionar(t, 'confirmado', BASE, 'prueba');
    igual(t.estado, 'confirmado'); igual(t.historial.length, 1);
    igual(t.historial[0].desde, 'reservada'); igual(t.historial[0].motivo, 'prueba');
  });
  probar('«finalizado» se deduce: un turno confirmado que ya pasó', function () {
    var t = { estado: 'confirmado', inicio: BASE - 2 * 3600000, duracionMin: 60 };
    igual(E.estadoVisible(t, BASE), 'finalizado');
    t.inicio = BASE + 3600000; igual(E.estadoVisible(t, BASE), 'confirmado');
    t.estado = 'cancelado'; t.inicio = BASE - 2 * 3600000; igual(E.estadoVisible(t, BASE), 'cancelado');
  });

  /* ================= SERVICIOS Y DATOS ================= */
  grupo('Servicios y datos de la clienta');
  probar('se puede elegir uno de Manos y uno de Pies', function () {
    igual(R.validarSeleccionServicios(estadoVacio(), ['m-semi', 'p-spa']).ok, true);
  });
  probar('dos servicios del mismo grupo no son válidos', function () {
    var r = R.validarSeleccionServicios(estadoVacio(), ['m-semi', 'm-gel']);
    igual(r.ok, false); cierto(r.errores[0].indexOf('Manos') !== -1, 'el mensaje debería nombrar el grupo');
  });
  probar('sin servicios o con uno inexistente no es válido', function () {
    igual(R.validarSeleccionServicios(estadoVacio(), []).ok, false);
    igual(R.validarSeleccionServicios(estadoVacio(), ['no-existe']).ok, false);
  });
  probar('elegir otro servicio del mismo grupo reemplaza al anterior', function () {
    var e = estadoVacio();
    var s = R.aplicarSeleccion(e, ['m-clasica', 'p-spa'], 'm-gel');
    igual(s.length, 2); cierto(s.indexOf('m-gel') !== -1 && s.indexOf('p-spa') !== -1 && s.indexOf('m-clasica') === -1);
    igual(R.aplicarSeleccion(e, s, 'm-gel').length, 2, 'elegir el mismo no duplica');
  });
  probar('validación de datos: nombre, mail y teléfono', function () {
    igual(R.validarDatosClienta({ nombre: 'Ana', email: 'ana@example.com', telefono: '11 5555-0101' }).ok, true);
    var mal = R.validarDatosClienta({ nombre: 'A', email: 'sin-arroba', telefono: '12' });
    igual(mal.ok, false); cierto(mal.errores.nombre && mal.errores.email && mal.errores.telefono, 'tres errores');
    igual(R.validarDatosClienta({ nombre: 'Ana', email: 'ana@example.com', telefono: 'abc12345678' }).ok, false, 'letras en el teléfono');
  });

  /* ================= RESERVA Y PAGO ================= */
  grupo('Reserva, retención y pago');
  probar('iniciar una reserva la deja «reservada» con la seña pendiente y vence a los 15 minutos', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    igual(t.estado, 'reservada'); igual(t.sena.estado, 'pendiente'); igual(t.sena.monto, 5000);
    igual(t.venceEn, BASE + 15 * MIN); igual(t.origen, 'web'); igual(t.id, 'T-0001');
  });
  probar('modo rápido: la retención dura 60 segundos', function () {
    var e = estadoVacio(); e.config.modoRapido = true;
    igual(R.iniciarReserva(e, pedido(MIE_10), BASE).venceEn, BASE + 60000);
  });
  probar('el horario retenido no se puede reservar dos veces', function () {
    var e = estadoVacio(); R.iniciarReserva(e, pedido(MIE_10), BASE);
    lanza(function () { R.iniciarReserva(e, pedido(MIE_10), BASE + MIN); }, 'HORARIO_NO_DISPONIBLE');
  });
  probar('no se reserva un horario fuera de agenda ni con datos o servicios inválidos', function () {
    var e = estadoVacio();
    lanza(function () { R.iniciarReserva(e, pedido(T.msDeClave('2026-11-11', 630)), BASE); }, 'HORARIO_NO_DISPONIBLE', '10:30 no es un horario');
    lanza(function () { R.iniciarReserva(e, pedido(MIE_10, { serviciosIds: ['m-semi', 'm-gel'] }), BASE); }, 'SERVICIOS_INVALIDOS');
    lanza(function () { R.iniciarReserva(e, pedido(MIE_10, { clienta: { nombre: '', email: 'x', telefono: '1' } }), BASE); }, 'DATOS_INVALIDOS');
    igual(e.turnos.length, 0, 'no debe quedar nada guardado');
  });
  probar('pago aprobado a tiempo: el turno queda confirmado y la seña pagada', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.resolverPago(e, t.id, 'aprobado', BASE + 3 * MIN);
    igual(t.estado, 'confirmado'); igual(t.sena.estado, 'pagada'); igual(t.intentosPago.length, 1);
  });
  probar('pago NO completado: la reserva conserva el horario mientras el contador corre', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.resolverPago(e, t.id, 'no_completado', BASE + 2 * MIN);
    igual(t.estado, 'reservada', 'sigue reservada'); igual(t.intentosPago[0].resultado, 'no_completado');
    cierto(!D.estaLibre(e, MIE_10, 60, BASE + 2 * MIN), 'el horario debe seguir ocupado');
    R.vencerPendientes(e, BASE + 15 * MIN - 1);
    igual(t.estado, 'reservada', 'un instante antes de vencer sigue reservada');
    cierto(!D.estaLibre(e, MIE_10, 60, BASE + 15 * MIN - 1), 'un instante antes de vencer sigue ocupado');
  });
  probar('al vencer el contador pasa a «vencida» y recién ahí se libera el horario', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.resolverPago(e, t.id, 'no_completado', BASE + MIN);
    var ids = R.vencerPendientes(e, BASE + 15 * MIN);
    igual(ids.length, 1); igual(t.estado, 'vencida');
    cierto(D.estaLibre(e, MIE_10, 60, BASE + 15 * MIN), 'el horario debería quedar libre');
    cierto(t.historial[t.historial.length - 1].estado === 'vencida', 'queda constancia en el historial');
  });
  probar('con modo rápido el vencimiento ocurre a los 60 segundos', function () {
    var e = estadoVacio(); e.config.modoRapido = true; var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.vencerPendientes(e, BASE + 59999); igual(t.estado, 'reservada');
    R.vencerPendientes(e, BASE + 60000); igual(t.estado, 'vencida');
  });
  probar('pago aprobado con el contador ya agotado y el horario libre: confirma (pago tardío)', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.resolverPago(e, t.id, 'aprobado', BASE + 16 * MIN);
    igual(t.estado, 'confirmado'); igual(t.sena.estado, 'pagada');
    cierto(/tard/i.test(t.historial[t.historial.length - 1].motivo), 'el motivo debe decir que fue tardío');
  });
  probar('pago tardío con el horario ya ocupado por otra persona: pasa a «en revisión» con motivo', function () {
    var e = estadoVacio(); var primero = R.iniciarReserva(e, pedido(MIE_10), BASE);
    var otra = R.iniciarReserva(e, pedido(MIE_10, { clienta: { nombre: 'Bea Muestra', email: 'bea@example.com', telefono: '11 5555-0198' } }), BASE + 16 * MIN);
    R.resolverPago(e, otra.id, 'aprobado', BASE + 17 * MIN);
    R.resolverPago(e, primero.id, 'aprobado', BASE + 18 * MIN);
    igual(primero.estado, 'en_revision'); igual(otra.estado, 'confirmado');
    cierto(/ocup/.test(primero.historial[primero.historial.length - 1].motivo), 'el motivo debe explicar que el horario ya estaba ocupado');
  });
  probar('un turno confirmado no admite otro pago', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE); R.resolverPago(e, t.id, 'aprobado', BASE);
    lanza(function () { R.resolverPago(e, t.id, 'aprobado', BASE); }, 'TURNO_NO_PAGABLE');
    lanza(function () { R.resolverPago(e, t.id, 'raro', BASE); }, 'RESULTADO_INVALIDO');
    lanza(function () { R.resolverPago(e, 'T-9999', 'aprobado', BASE); }, 'TURNO_INEXISTENTE');
  });
  probar('los ids de turno son correlativos', function () {
    var e = estadoVacio();
    igual(R.iniciarReserva(e, pedido(MIE_10), BASE).id, 'T-0001');
    igual(R.iniciarReserva(e, pedido(MIE_11), BASE).id, 'T-0002');
  });

  /* ================= CANCELACIONES ================= */
  grupo('Cancelaciones y seña');
  function confirmado(e, inicio) { var t = R.iniciarReserva(e, pedido(inicio || MIE_10), BASE); R.resolverPago(e, t.id, 'aprobado', BASE); return t; }
  probar('cancelar desde el panel un turno con seña pagada exige elegir devolver o quedarme', function () {
    var e = estadoVacio(); var t = confirmado(e);
    lanza(function () { R.cancelarDesdePanel(e, t.id, {}, BASE); }, 'DECISION_SENA_REQUERIDA');
    lanza(function () { R.cancelarDesdePanel(e, t.id, { decisionSena: 'otra' }, BASE); }, 'DECISION_SENA_REQUERIDA');
    igual(t.estado, 'confirmado', 'sin decisión no se cancela');
  });
  probar('«devolver» solo REGISTRA la decisión: no se realiza ninguna devolución real', function () {
    var e = estadoVacio(); var t = confirmado(e);
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'devolver' }, BASE + MIN);
    igual(t.estado, 'cancelado'); igual(t.sena.estado, 'devolucion_registrada');
    igual(t.sena.devolucionRealizada, false); igual(t.cancelacion.decisionSena, 'devolver'); igual(t.cancelacion.por, 'administradora');
    cierto(t.sena.nota.indexOf('ninguna devolución real') !== -1, 'la nota debe aclarar que no hubo devolución real');
    igual(t.sena.nota, R.NOTA_DEVOLUCION_DEMO);
  });
  probar('«quedarme» deja la seña retenida', function () {
    var e = estadoVacio(); var t = confirmado(e);
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'quedarme' }, BASE + MIN);
    igual(t.estado, 'cancelado'); igual(t.sena.estado, 'retenida'); igual(t.cancelacion.decisionSena, 'quedarme');
  });
  probar('al cancelar, el horario vuelve a quedar libre', function () {
    var e = estadoVacio(); var t = confirmado(e);
    cierto(!D.estaLibre(e, MIE_10, 60, BASE), 'ocupado antes');
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'devolver' }, BASE);
    cierto(D.estaLibre(e, MIE_10, 60, BASE), 'libre después');
  });
  probar('un turno sin seña (cargado desde el panel) se cancela sin elegir nada', function () {
    var e = estadoVacio(); var t = confirmado(e); t.sena = null; t.origen = 'panel';
    R.cancelarDesdePanel(e, t.id, {}, BASE);
    igual(t.estado, 'cancelado'); igual(t.cancelacion.decisionSena, null);
  });
  probar('un turno cancelado no se puede cancelar ni revivir', function () {
    var e = estadoVacio(); var t = confirmado(e);
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'quedarme' }, BASE);
    lanza(function () { R.cancelarDesdePanel(e, t.id, { decisionSena: 'quedarme' }, BASE); }, 'TRANSICION_INVALIDA');
    lanza(function () { E.transicionar(t, 'confirmado', BASE); }, 'TRANSICION_INVALIDA');
  });
  probar('cancelar una reserva todavía sin pagar no cobra seña', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    R.cancelarDesdePanel(e, t.id, {}, BASE + MIN);
    igual(t.estado, 'cancelado'); igual(t.sena.estado, 'no_cobrada');
  });
  probar('si cancela la clienta, la seña no se devuelve', function () {
    var e = estadoVacio(); var t = confirmado(e);
    R.cancelarPorClienta(e, t.id, BASE + MIN);
    igual(t.estado, 'cancelado'); igual(t.sena.estado, 'retenida'); igual(t.cancelacion.por, 'clienta'); igual(t.cancelacion.decisionSena, 'quedarme');
  });
  probar('no se puede cancelar una reserva vencida', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    lanza(function () { R.cancelarDesdePanel(e, t.id, {}, BASE + 20 * MIN); }, 'TRANSICION_INVALIDA');
  });

  /* ================= ALMACENAMIENTO ================= */
  grupo('Almacenamiento');
  probar('con el almacenamiento vacío carga los datos de ejemplo y los guarda', function () {
    var st = storageFalso(); var a = almacenDePrueba(st);
    igual(a.modo(), 'localStorage');
    var e = a.leer();
    cierto(e.turnos.length > 0 && A.validarEstado(e), 'debería haber datos de ejemplo válidos');
    cierto(st._datos[a.clave], 'debería haber quedado guardado en la clave propia');
    cierto(a.clave.indexOf('elevalab-demo-spa:') === 0, 'la clave debe llevar el prefijo propio de la demo');
  });
  probar('lo que se escribe se vuelve a leer', function () {
    var a = almacenDePrueba(storageFalso());
    a.actualizar(function (e) { e.turnos = []; R.iniciarReserva(e, pedido(MIE_10), BASE); });
    cierto(a.leer().turnos.some(function (t) { return t.inicio === MIE_10 && t.estado === 'reservada'; }));
  });
  probar('dos «pestañas» del mismo navegador (mismo storage) ven los mismos datos', function () {
    var st = storageFalso(); var a = almacenDePrueba(st), b = almacenDePrueba(st);
    a.actualizar(function (e) { e.config.modoRapido = true; });
    igual(b.leer().config.modoRapido, true);
  });
  probar('dos navegadores distintos (storages distintos) NO comparten datos', function () {
    var a = almacenDePrueba(storageFalso()), b = almacenDePrueba(storageFalso());
    a.actualizar(function (e) { e.config.modoRapido = true; });
    igual(b.leer().config.modoRapido, false);
  });
  probar('el evento «storage» de otra pestaña avisa a los suscriptos con los datos nuevos', function () {
    var st = storageFalso(); var a = almacenDePrueba(st), b = almacenDePrueba(st);
    var recibido = null; b.suscribir(function (e) { recibido = e; });
    a.actualizar(function (e) { e.config.modoRapido = true; });
    igual(recibido, null, 'sin evento no hay aviso');
    b.procesarEventoStorage({ key: b.clave });
    cierto(recibido && recibido.config.modoRapido === true, 'debería haber recibido el estado nuevo');
    recibido = null; b.procesarEventoStorage({ key: 'otra-cosa' });
    igual(recibido, null, 'una clave ajena se ignora');
  });
  probar('actualizar avisa a los suscriptos de la misma pestaña y se puede cancelar la suscripción', function () {
    var a = almacenDePrueba(storageFalso()); var n = 0;
    var baja = a.suscribir(function () { n++; });
    a.actualizar(function (e) { e.config.modoRapido = true; }); igual(n, 1);
    baja(); a.actualizar(function (e) { e.config.modoRapido = false; }); igual(n, 1);
  });
  probar('si la actualización lanza un error, no se guarda nada', function () {
    var a = almacenDePrueba(storageFalso());
    lanza(function () { a.actualizar(function (e) { e.config.modoRapido = true; throw new Error('falla'); }); });
    igual(a.leer().config.modoRapido, false);
  });
  probar('no guarda un estado que quedó inválido', function () {
    var a = almacenDePrueba(storageFalso());
    lanza(function () { a.actualizar(function (e) { e.turnos = 'roto'; }); });
    cierto(Array.isArray(a.leer().turnos));
  });
  probar('reiniciar vuelve a los datos de ejemplo', function () {
    var a = almacenDePrueba(storageFalso());
    a.actualizar(function (e) { e.turnos = []; });
    igual(a.leer().turnos.length, 0);
    a.reiniciar(); cierto(a.leer().turnos.length > 0);
  });
  probar('si el almacenamiento falla (modo privado), la demo sigue en memoria', function () {
    var a = almacenDePrueba(storageFalso(true));
    igual(a.modo(), 'memoria');
    a.actualizar(function (e) { e.config.modoRapido = true; });
    igual(a.leer().config.modoRapido, true);
  });
  probar('si el almacenamiento falla a mitad de camino, pasa a memoria sin perder datos', function () {
    var st = storageFalso(); var a = almacenDePrueba(st);
    a.leer(); st.setItem = function () { throw new Error('cuota llena'); };
    a.actualizar(function (e) { e.config.modoRapido = true; });
    igual(a.modo(), 'memoria'); igual(a.leer().config.modoRapido, true);
  });
  probar('datos dañados, de otra versión o con otra forma se descartan y se recarga el ejemplo', function () {
    var casosRotos = ['{no es json', JSON.stringify({ version: 999 }), JSON.stringify({ version: C.VERSION_ESTADO }), '123', 'null',
      JSON.stringify(Object.assign(estadoVacio(), { turnos: [{ id: 5 }] }))];
    casosRotos.forEach(function (txt, i) {
      var st = storageFalso(); var a = almacenDePrueba(st);
      st.setItem(a.clave, txt);
      var e = a.leer();
      cierto(A.validarEstado(e) && e.turnos.length > 0, 'caso roto #' + i + ' debería haberse reemplazado por el ejemplo');
    });
  });

  /* ================= DATOS DE EJEMPLO ================= */
  grupo('Datos de ejemplo');
  probar('son válidos, ficticios y coherentes para cualquier día de la semana (14 días seguidos)', function () {
    for (var d = 0; d < 14; d++) {
      var ahora = BASE + d * DIA;
      var e = S.crearEstadoInicial(ahora);
      cierto(A.validarEstado(e), 'estado inválido el día +' + d);
      cierto(e.turnos.length >= 8, 'pocos turnos el día +' + d);
      e.turnos.forEach(function (t, i) {
        cierto(/@example\.com$/.test(t.clienta.email), 'mail no ficticio en ' + t.id);
        cierto(/^11 5555-01\d\d$/.test(t.clienta.telefono), 'teléfono no ficticio en ' + t.id);
        var libresEseDia = D.tramosDelDia(e.config.agenda, T.claveDia(t.inicio));
        cierto(libresEseDia.length > 0, t.id + ' cae en un día sin atención (+' + d + ')');
        var min = T.partes(t.inicio).hora * 60 + T.partes(t.inicio).minuto;
        cierto(libresEseDia.some(function (tr) { return min >= tr.desde && min + t.duracionMin <= tr.hasta; }), t.id + ' queda fuera de los tramos (+' + d + ')');
        for (var j = i + 1; j < e.turnos.length; j++) {
          var u = e.turnos[j];
          cierto(!(t.inicio < u.inicio + u.duracionMin * 60000 && u.inicio < t.inicio + t.duracionMin * 60000), t.id + ' y ' + u.id + ' se superponen (+' + d + ')');
        }
      });
      var visibles = e.turnos.map(function (t) { return E.estadoVisible(t, ahora); });
      cierto(visibles.filter(function (s) { return s === 'finalizado'; }).length >= 2, 'faltan turnos finalizados (+' + d + ')');
      cierto(visibles.filter(function (s) { return s === 'cancelado'; }).length >= 1, 'falta un turno cancelado (+' + d + ')');
      cierto(visibles.filter(function (s) { return s === 'confirmado'; }).length >= 3, 'faltan turnos confirmados futuros (+' + d + ')');
    }
  });
  probar('las fechas son relativas a hoy: el mismo código genera otro calendario otro día', function () {
    var a = S.crearEstadoInicial(BASE), b = S.crearEstadoInicial(BASE + 5 * DIA);
    cierto(a.turnos[0].inicio !== b.turnos[0].inicio);
    igual(a.config.agenda.bloqueos[0], '2026-11-20'); igual(b.config.agenda.bloqueos[0], '2026-11-25');
  });
  probar('con los turnos de ejemplo cargados todavía quedan horarios libres para reservar', function () {
    var e = S.crearEstadoInicial(BASE), hay = false;
    for (var d = 0; d < 14 && !hay; d++) hay = D.horariosLibres(e, T.sumarDias('2026-11-10', d), BASE).length > 0;
    cierto(hay);
  });
  probar('la configuración inicial devuelve copias independientes', function () {
    var a = C.crearConfigInicial(), b = C.crearConfigInicial();
    a.agenda.dias[2][0].desde = 1; igual(b.agenda.dias[2][0].desde, 600);
  });
  probar('hay dos grupos de servicios (Manos y Pies) y ningún servicio lleva precio', function () {
    igual(C.GRUPOS.length, 2);
    C.SERVICIOS.forEach(function (s) { cierto(!('precio' in s), s.id + ' no debería tener precio'); });
  });

  /* ================= CALENDARIO (.ics) ================= */
  grupo('Calendario (.ics)');
  function turnoConfirmado(e) { var t = R.iniciarReserva(e, pedido(MIE_10), BASE); R.resolverPago(e, t.id, 'aprobado', BASE); return t; }
  function lineasICS(texto) { return texto.split('\r\n'); }
  function bytes(linea) { return new TextEncoder().encode(linea).length; }
  probar('genera un archivo de calendario válido: estructura, final de línea y cierre', function () {
    var e = estadoVacio(); var t = turnoConfirmado(e); var txt = I.generarICS(e, t, BASE);
    cierto(txt.indexOf('BEGIN:VCALENDAR\r\n') === 0, 'debe empezar con BEGIN:VCALENDAR');
    cierto(/END:VCALENDAR\r\n$/.test(txt), 'debe terminar con END:VCALENDAR y salto de línea');
    igual(txt.replace(/\r\n/g, '').indexOf('\n'), -1, 'no puede haber saltos de línea sueltos (solo CRLF)');
    ['VERSION:2.0', 'PRODID:', 'BEGIN:VEVENT', 'END:VEVENT', 'UID:', 'DTSTAMP:', 'DTSTART:', 'DTEND:', 'SUMMARY:', 'STATUS:CONFIRMED'].forEach(function (k) {
      cierto(txt.indexOf(k) !== -1, 'falta ' + k);
    });
  });
  probar('las horas se escriben en UTC: 10:00 de Buenos Aires son las 13:00Z', function () {
    var e = estadoVacio(); var t = turnoConfirmado(e); var txt = I.generarICS(e, t, BASE);
    cierto(txt.indexOf('DTSTART:20261111T130000Z\r\n') !== -1, 'DTSTART incorrecto');
    cierto(txt.indexOf('DTEND:20261111T140000Z\r\n') !== -1, 'DTEND incorrecto (60 minutos)');
    cierto(txt.indexOf('DTSTAMP:20261110T120000Z\r\n') !== -1, 'DTSTAMP incorrecto');
  });
  probar('identifica el turno: UID, código en la descripción y nombre de archivo', function () {
    var e = estadoVacio(); var t = turnoConfirmado(e); var txt = I.generarICS(e, t, BASE);
    cierto(txt.indexOf('UID:T-0001@spa-demo.example') !== -1, 'UID');
    cierto(txt.indexOf('T-0001') !== -1 && txt.indexOf('Manicura clásica') !== -1 && txt.indexOf('Pedicura clásica') !== -1, 'la descripción debe nombrar los servicios y el código');
    igual(I.nombreArchivo(t), 'turno-spa-demo-T-0001.ics');
  });
  probar('ninguna línea supera los 75 octetos (aun con acentos y descripciones largas)', function () {
    var e = estadoVacio(); var t = turnoConfirmado(e);
    t.serviciosIds = ['m-semi', 'p-spa'];
    e.servicios.forEach(function (s) { s.nombre = s.nombre + ' con tratamiento hidratante de larga duración y acabado satinado'; });
    var txt = I.generarICS(e, t, BASE);
    lineasICS(txt).forEach(function (l) { cierto(bytes(l) <= 75, 'línea de ' + bytes(l) + ' octetos: ' + l.slice(0, 30) + '…'); });
    cierto(txt.indexOf('\r\n ') !== -1, 'debería haber líneas continuadas');
  });
  probar('escapar() trata coma, punto y coma, barra y salto de línea', function () {
    igual(I.escapar('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  });
  probar('plegar() no corta caracteres de varios bytes y se puede reconstruir', function () {
    var larga = 'DESCRIPTION:' + new Array(40).join('ñandú ');
    var plegada = I.plegar(larga);
    igual(plegada.replace(/\r\n /g, ''), larga, 'al unir las líneas debe quedar el texto original');
    plegada.split('\r\n').forEach(function (l) { cierto(bytes(l) <= 75, 'línea demasiado larga'); });
  });
  probar('solo se puede agregar al calendario un turno confirmado', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    lanza(function () { I.generarICS(e, t, BASE); }, 'TURNO_NO_CONFIRMADO', 'reservada');
    R.resolverPago(e, t.id, 'aprobado', BASE);
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'quedarme' }, BASE);
    lanza(function () { I.generarICS(e, t, BASE); }, 'TURNO_NO_CONFIRMADO', 'cancelado');
  });

  /* ================= CONSULTAS DEL PANEL ================= */
  grupo('Consultas del panel de administración');
  var HOY_10 = T.msDeClave('2026-11-10', 600);          // martes 10/11 10:00 (hoy a las 09:00 es antes)
  function conTurnos() {
    var e = estadoVacio();
    var a = R.iniciarReserva(e, pedido(HOY_10 + 6 * 3600000), BASE); R.resolverPago(e, a.id, 'aprobado', BASE);       // hoy 16:00 confirmado
    var b = R.iniciarReserva(e, pedido(T.msDeClave('2026-11-10', 660)), BASE); R.resolverPago(e, b.id, 'aprobado', BASE); // hoy 11:00 confirmado
    var c = R.iniciarReserva(e, pedido(T.msDeClave('2026-11-11', 600)), BASE); R.resolverPago(e, c.id, 'aprobado', BASE); // mañana 10:00
    var d = R.iniciarReserva(e, pedido(T.msDeClave('2026-11-12', 600)), BASE);                                           // jueves, retenida
    return { e: e, a: a, b: b, c: c, d: d };
  }
  probar('el panel muestra confirmados, cancelados y en revisión; no muestra reservas retenidas ni vencidas', function () {
    var x = conTurnos();
    igual(Q.turnosDelDia(x.e, '2026-11-12').length, 0, 'la reservada no se muestra');
    x.d.estado = 'vencida'; igual(Q.turnosDelDia(x.e, '2026-11-12').length, 0, 'la vencida no se muestra');
    x.d.estado = 'en_revision'; igual(Q.turnosDelDia(x.e, '2026-11-12').length, 1, 'en revisión sí');
    R.cancelarDesdePanel(x.e, x.c.id, { decisionSena: 'quedarme' }, BASE);
    igual(Q.turnosDelDia(x.e, '2026-11-11').length, 1, 'el cancelado sí se muestra');
  });
  probar('turnosDelDia ordena por hora y separa por día (hora de Buenos Aires)', function () {
    var x = conTurnos(); var l = Q.turnosDelDia(x.e, '2026-11-10');
    igual(l.length, 2); igual(l[0].id, x.b.id, 'primero las 11:00'); igual(l[1].id, x.a.id, 'después las 16:00');
    igual(Q.turnosDelDia(x.e, '2026-11-11').length, 1);
  });
  probar('resumenHoy separa por venir y finalizados, y no cuenta los cancelados', function () {
    var x = conTurnos();
    var r = Q.resumenHoy(x.e, BASE); igual(r.total, 2); igual(r.porVenir, 2); igual(r.finalizados, 0);
    var tarde = T.aMs(2026, 11, 10, 13, 0);              // ya pasaron las 11:00 (terminó 12:00)
    r = Q.resumenHoy(x.e, tarde); igual(r.total, 2); igual(r.porVenir, 1); igual(r.finalizados, 1);
    R.cancelarDesdePanel(x.e, x.a.id, { decisionSena: 'devolver' }, tarde);
    r = Q.resumenHoy(x.e, tarde); igual(r.total, 1, 'el cancelado no cuenta');
  });
  probar('proximosTurnos devuelve los próximos confirmados que no empezaron, en orden y limitados', function () {
    var x = conTurnos();
    var p = Q.proximosTurnos(x.e, BASE, 3); igual(p.length, 3);
    igual(p.map(function (t) { return t.id; }).join(','), [x.b.id, x.a.id, x.c.id].join(','));
    igual(Q.proximosTurnos(x.e, BASE, 2).length, 2);
    igual(Q.proximosTurnos(x.e, T.aMs(2026, 11, 10, 11, 30), 3).length, 2, 'uno ya empezó');
    R.cancelarDesdePanel(x.e, x.c.id, { decisionSena: 'quedarme' }, BASE);
    igual(Q.proximosTurnos(x.e, BASE, 3).length, 2, 'los cancelados no son próximos');
  });
  probar('filtros y contadores del panel (Todos, Confirmados, Finalizados, Cancelados)', function () {
    var x = conTurnos(); var tarde = T.aMs(2026, 11, 10, 13, 0);
    R.cancelarDesdePanel(x.e, x.a.id, { decisionSena: 'quedarme' }, tarde);
    var lista = Q.turnosDelDia(x.e, '2026-11-10');
    var c = Q.contarPorFiltro(lista, tarde);
    igual(c.todos, 2); igual(c.finalizado, 1); igual(c.cancelado, 1); igual(c.confirmado, 0);
    igual(Q.filtrar(lista, 'cancelado', tarde)[0].id, x.a.id); igual(Q.filtrar(lista, 'finalizado', tarde)[0].id, x.b.id);
    igual(Q.filtrar(lista, 'todos', tarde).length, 2); igual(Q.filtrar(lista, 'confirmado', tarde).length, 0);
  });
  probar('límites de días: 30 hacia atrás y la ventana de reservas hacia adelante', function () {
    var l = Q.limitesDias(estadoVacio(), BASE);
    igual(l.min, '2026-10-11'); igual(l.max, '2027-01-09');
  });
  probar('insignia de seña: pagada, devolución registrada, retenida y sin seña', function () {
    var e = estadoVacio(); var t = R.iniciarReserva(e, pedido(MIE_10), BASE);
    igual(Q.insigniaSena(t), null, 'pendiente: sin insignia');
    R.resolverPago(e, t.id, 'aprobado', BASE); igual(Q.insigniaSena(t).tipo, 'pagada');
    R.cancelarDesdePanel(e, t.id, { decisionSena: 'devolver' }, BASE); igual(Q.insigniaSena(t).tipo, 'devuelta');
    cierto(Q.insigniaSena(t).texto.indexOf('no real') !== -1, 'debe aclarar que no es una devolución real');
    var u = R.iniciarReserva(e, pedido(MIE_11), BASE); R.resolverPago(e, u.id, 'aprobado', BASE);
    R.cancelarDesdePanel(e, u.id, { decisionSena: 'quedarme' }, BASE); igual(Q.insigniaSena(u).tipo, 'retenida');
    igual(Q.insigniaSena({ sena: null }), null, 'turno cargado desde el panel');
  });
  probar('con los datos de ejemplo, el panel tiene qué mostrar hoy o en los próximos días', function () {
    var e = S.crearEstadoInicial(BASE);
    cierto(Q.proximosTurnos(e, BASE, 3).length === 3, 'deberían verse 3 próximos turnos');
    cierto(e.turnos.some(function (t) { return Q.visibleEnPanel(t); }));
  });

  /* ---------- ejecución y presentación ---------- */
  function ejecutar() {
    var resultados = casos.map(function (c) {
      try { c.fn(); return { grupo: c.grupo, nombre: c.nombre, ok: true }; }
      catch (e) { return { grupo: c.grupo, nombre: c.nombre, ok: false, error: e.message }; }
    });
    T.setReloj(null);
    return resultados;
  }

  var resultados = ejecutar();
  var fallos = resultados.filter(function (r) { return !r.ok; });
  root.ElevaDemoResultados = { total: resultados.length, ok: resultados.length - fallos.length, fallos: fallos, resultados: resultados };

  if (typeof document !== 'undefined' && document.getElementById('resumen')) {
    var resumen = document.getElementById('resumen'), lista = document.getElementById('lista');
    resumen.textContent = (fallos.length === 0 ? 'Todas las pruebas pasaron: ' : 'Hay pruebas que fallaron: ') + (resultados.length - fallos.length) + ' de ' + resultados.length + ' correctas.';
    resumen.className = 'resumen ' + (fallos.length === 0 ? 'ok' : 'mal');
    var actual = null, ul = null;
    resultados.forEach(function (r) {
      if (r.grupo !== actual) {
        actual = r.grupo;
        var h = document.createElement('h2'); h.textContent = actual; lista.appendChild(h);
        ul = document.createElement('ul'); ul.className = 'pruebas'; lista.appendChild(ul);
      }
      var li = document.createElement('li'); li.className = r.ok ? 'ok' : 'mal';
      var marca = document.createElement('span'); marca.className = 'marca'; marca.textContent = r.ok ? '✔' : '✘';
      var txt = document.createElement('span'); txt.textContent = r.nombre + (r.ok ? '' : ' — ' + r.error);
      li.appendChild(marca); li.appendChild(txt); ul.appendChild(li);
    });
  } else if (typeof console !== 'undefined') {
    resultados.forEach(function (r) { console.log((r.ok ? 'OK    ' : 'FALLA ') + '[' + r.grupo + '] ' + r.nombre + (r.ok ? '' : '\n        → ' + r.error)); });
    console.log('\n' + (resultados.length - fallos.length) + ' de ' + resultados.length + ' pruebas correctas.');
  }
})(typeof window !== 'undefined' ? window : globalThis);
