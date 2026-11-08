/* Spa Demo · reglas de reserva
   Operaciones sobre el estado de la demo. Cada función MODIFICA el estado que recibe
   (el almacén se lo entrega como copia de trabajo) y lanza un ErrorDemo con código si algo no corresponde.
   Reglas que reproduce:
   - un servicio por grupo (se puede combinar uno de Manos con uno de Pies);
   - la reserva retiene el horario durante el tiempo de retención; solo al vencer el contador pasa a «vencida»;
   - el turno se confirma únicamente cuando el pago se aprueba a tiempo;
   - un pago tardío confirma si el horario sigue libre, o va a «en revisión» si ya lo ocupó otra persona;
   - cancelar desde el panel un turno con seña obliga a elegir «devolver» o «quedarme»;
     la demo SOLO REGISTRA esa decisión: no hace ninguna devolución real.
   Depende de: config-demo.js, tiempo.js, estados.js, disponibilidad.js. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo, E = ED.estados, D = ED.disponibilidad, ErrorDemo = E.ErrorDemo;

  var NOTA_DEVOLUCION_DEMO = 'Decisión registrada en la demo. No se realizó ninguna devolución real.';
  var NOTA_SENA_RETENIDA_PANEL = 'La administradora decidió quedarse con la seña.';
  var NOTA_SENA_RETENIDA_CLIENTA = 'La seña no se devuelve cuando cancela la clienta.';

  function pad4(n) { var s = String(n); while (s.length < 4) s = '0' + s; return s; }

  function siguienteId(estado) {
    estado.contador = (estado.contador || 0) + 1;
    return 'T-' + pad4(estado.contador);
  }

  function buscarServicio(estado, id) {
    for (var i = 0; i < estado.servicios.length; i++) if (estado.servicios[i].id === id) return estado.servicios[i];
    return null;
  }

  function buscarGrupo(estado, id) {
    for (var i = 0; i < estado.grupos.length; i++) if (estado.grupos[i].id === id) return estado.grupos[i];
    return null;
  }

  function buscarTurno(estado, id) {
    for (var i = 0; i < estado.turnos.length; i++) if (estado.turnos[i].id === id) return estado.turnos[i];
    throw ErrorDemo('TURNO_INEXISTENTE', 'No existe el turno ' + id + '.');
  }

  /* ---------- servicios ---------- */

  function validarSeleccionServicios(estado, ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { ok: false, errores: ['Elegí al menos un servicio.'] };
    var errores = [], vistos = {};
    ids.forEach(function (id) {
      var s = buscarServicio(estado, id);
      if (!s) { errores.push('Servicio inexistente: ' + id + '.'); return; }
      if (vistos[s.grupoId]) {
        var g = buscarGrupo(estado, s.grupoId);
        errores.push('Solo se puede elegir un servicio por grupo (' + (g ? g.nombre : s.grupoId) + ').');
      }
      vistos[s.grupoId] = true;
    });
    return { ok: errores.length === 0, errores: errores };
  }

  // Elegir un servicio reemplaza al que ya había elegido del mismo grupo. Devuelve una lista nueva.
  function aplicarSeleccion(estado, seleccion, servicioId) {
    var nuevo = buscarServicio(estado, servicioId);
    if (!nuevo) return seleccion.slice();
    var resto = seleccion.filter(function (id) {
      var s = buscarServicio(estado, id);
      return s && s.grupoId !== nuevo.grupoId;
    });
    resto.push(servicioId);
    return resto;
  }

  /* ---------- datos de la clienta ---------- */

  function validarDatosClienta(datos) {
    var d = datos || {}, errores = {};
    var nombre = String(d.nombre || '').trim();
    var email = String(d.email || '').trim();
    var telefono = String(d.telefono || '').trim();
    if (nombre.length < 2 || nombre.length > 80) errores.nombre = 'Ingresá un nombre (entre 2 y 80 caracteres).';
    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = 'Ingresá un mail válido.';
    var digitos = telefono.replace(/\D/g, '');
    if (!/^[\d\s()+\-]+$/.test(telefono) || digitos.length < 8 || digitos.length > 15) errores.telefono = 'Ingresá un teléfono válido (entre 8 y 15 dígitos).';
    return { ok: Object.keys(errores).length === 0, errores: errores, datos: { nombre: nombre, email: email, telefono: telefono } };
  }

  /* ---------- reserva y pago ---------- */

  // Crea una reserva «reservada»: el horario queda retenido hasta que venza el contador.
  function iniciarReserva(estado, pedido, ahoraMs) {
    var vs = validarSeleccionServicios(estado, pedido.serviciosIds);
    if (!vs.ok) throw ErrorDemo('SERVICIOS_INVALIDOS', vs.errores.join(' '));
    var vd = validarDatosClienta(pedido.clienta);
    if (!vd.ok) { var e = ErrorDemo('DATOS_INVALIDOS', 'Revisá los datos ingresados.'); e.detalle = vd.errores; throw e; }
    var dur = estado.config.agenda.duracionMin;
    if (!D.estaLibre(estado, pedido.inicio, dur, ahoraMs)) throw ErrorDemo('HORARIO_NO_DISPONIBLE', 'Ese horario ya no está disponible.');
    var retencionMs = estado.config.modoRapido ? ED.config.RETENCION_RAPIDA_MS : estado.config.sena.retencionMin * 60000;
    var turno = {
      id: siguienteId(estado),
      estado: 'reservada',
      origen: 'web',
      inicio: pedido.inicio,
      duracionMin: dur,
      serviciosIds: pedido.serviciosIds.slice(),
      clienta: vd.datos,
      creadoEn: ahoraMs,
      venceEn: ahoraMs + retencionMs,
      sena: { monto: estado.config.sena.monto, estado: 'pendiente', devolucionRealizada: false, nota: '' },
      intentosPago: [],
      cancelacion: null,
      historial: [{ estado: 'reservada', desde: null, en: ahoraMs, motivo: 'Reserva iniciada: horario retenido hasta que venza el contador' }]
    };
    estado.turnos.push(turno);
    return turno;
  }

  // Pasa a «vencida» toda reserva cuyo contador se agotó. Devuelve los ids afectados.
  function vencerPendientes(estado, ahoraMs) {
    var ids = [];
    estado.turnos.forEach(function (t) {
      if (t.estado === 'reservada' && t.venceEn <= ahoraMs) {
        E.transicionar(t, 'vencida', ahoraMs, 'Se agotó el tiempo de retención sin pago aprobado');
        ids.push(t.id);
      }
    });
    return ids;
  }

  // resultado: 'aprobado' | 'no_completado'
  function resolverPago(estado, turnoId, resultado, ahoraMs) {
    if (resultado !== 'aprobado' && resultado !== 'no_completado') throw ErrorDemo('RESULTADO_INVALIDO', 'Resultado de pago desconocido: ' + resultado);
    vencerPendientes(estado, ahoraMs);
    var t = buscarTurno(estado, turnoId);
    if (t.estado !== 'reservada' && t.estado !== 'vencida') throw ErrorDemo('TURNO_NO_PAGABLE', 'Este turno no admite un pago nuevo.');
    t.intentosPago.push({ resultado: resultado, en: ahoraMs });

    // Pago no completado: NO cambia el estado. El horario sigue retenido hasta que venza el contador.
    if (resultado === 'no_completado') return t;

    if (t.estado === 'reservada') {
      E.transicionar(t, 'confirmado', ahoraMs, 'Pago aprobado a tiempo');
      t.sena.estado = 'pagada';
      t.sena.pagadaEn = ahoraMs;
      return t;
    }

    // Pago tardío (el turno ya estaba vencida)
    t.sena.estado = 'pagada';
    t.sena.pagadaEn = ahoraMs;
    var fin = t.inicio + t.duracionMin * 60000;
    if (!D.haySolape(estado, t.inicio, fin, ahoraMs, t.id)) {
      E.transicionar(t, 'confirmado', ahoraMs, 'Pago tardío: el horario seguía libre');
    } else {
      E.transicionar(t, 'en_revision', ahoraMs, 'Pagó tarde y el horario ya lo ocupó otra persona');
    }
    return t;
  }

  /* ---------- cancelaciones ---------- */

  function cerrarSena(t, estabaPagada, decision, porClienta) {
    if (estabaPagada) {
      if (decision === 'devolver') {
        t.sena.estado = 'devolucion_registrada';
        t.sena.devolucionRealizada = false;     // la demo nunca devuelve nada
        t.sena.nota = NOTA_DEVOLUCION_DEMO;
      } else {
        t.sena.estado = 'retenida';
        t.sena.nota = porClienta ? NOTA_SENA_RETENIDA_CLIENTA : NOTA_SENA_RETENIDA_PANEL;
      }
    } else if (t.sena && t.sena.estado === 'pendiente') {
      t.sena.estado = 'no_cobrada';
    }
  }

  // opciones.decisionSena: 'devolver' | 'quedarme' (obligatoria si la seña está pagada)
  function cancelarDesdePanel(estado, turnoId, opciones, ahoraMs) {
    vencerPendientes(estado, ahoraMs);
    var t = buscarTurno(estado, turnoId);
    var decision = opciones && opciones.decisionSena;
    var estabaPagada = !!(t.sena && t.sena.estado === 'pagada');
    if (estabaPagada && decision !== 'devolver' && decision !== 'quedarme') {
      throw ErrorDemo('DECISION_SENA_REQUERIDA', 'Elegí si devolvés la seña o te quedás con ella.');
    }
    E.transicionar(t, 'cancelado', ahoraMs, 'Cancelado desde el panel');
    cerrarSena(t, estabaPagada, decision, false);
    t.cancelacion = { por: 'administradora', en: ahoraMs, decisionSena: estabaPagada ? decision : null };
    return t;
  }

  // La clienta cancela: la seña no se devuelve.
  function cancelarPorClienta(estado, turnoId, ahoraMs) {
    vencerPendientes(estado, ahoraMs);
    var t = buscarTurno(estado, turnoId);
    var estabaPagada = !!(t.sena && t.sena.estado === 'pagada');
    E.transicionar(t, 'cancelado', ahoraMs, 'Cancelado por la clienta');
    cerrarSena(t, estabaPagada, 'quedarme', true);
    t.cancelacion = { por: 'clienta', en: ahoraMs, decisionSena: estabaPagada ? 'quedarme' : null };
    return t;
  }

  ED.reservas = {
    NOTA_DEVOLUCION_DEMO: NOTA_DEVOLUCION_DEMO,
    siguienteId: siguienteId, buscarServicio: buscarServicio, buscarGrupo: buscarGrupo, buscarTurno: buscarTurno,
    validarSeleccionServicios: validarSeleccionServicios, aplicarSeleccion: aplicarSeleccion,
    validarDatosClienta: validarDatosClienta,
    iniciarReserva: iniciarReserva, vencerPendientes: vencerPendientes, resolverPago: resolverPago,
    cancelarDesdePanel: cancelarDesdePanel, cancelarPorClienta: cancelarPorClienta
  };
})(typeof window !== 'undefined' ? window : globalThis);
