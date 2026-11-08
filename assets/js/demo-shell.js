/* ElevaLab · marco general de las demos
   Dibuja la barra fija con el aviso «datos ficticios», el selector de vista (Clienta / Administradora),
   el modo rápido y el botón «Reiniciar demo».
   No conoce la demo: recibe el almacén por parámetro (ver spa/js/core/almacen.js).
   No hace ninguna conexión. Depende de: assets/css/demo-shell.css. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};

  function el(tag, clase, texto) {
    var n = root.document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // opc.destino: id o elemento donde dibujar la barra.
  // opc.vista: 'inicio' | 'cliente' | 'admin' (cuál se marca como actual).
  // opc.rutas: { cliente: 'ruta' | null, admin: 'ruta' | null }. Con null, el botón queda deshabilitado.
  // opc.almacen: objeto del almacén (o null: se ocultan modo rápido y reinicio).
  function montar(opc) {
    var destino = typeof opc.destino === 'string' ? root.document.getElementById(opc.destino) : opc.destino;
    if (!destino) return null;
    var rutas = opc.rutas || {};
    var almacen = opc.almacen || null;
    var temporizador = null, baja = null;

    destino.textContent = '';
    var barra = el('div', 'demo-barra');
    barra.setAttribute('role', 'region');
    barra.setAttribute('aria-label', 'Aviso de demostración');
    var interno = el('div', 'demo-barra-interno');

    var aviso = el('p', 'demo-aviso');
    var fuerte = el('strong', null, 'Demostración con datos ficticios.');
    aviso.appendChild(fuerte);
    aviso.appendChild(root.document.createTextNode(' No se envían mails ni se procesan pagos.'));
    interno.appendChild(aviso);

    var controles = el('div', 'demo-controles');
    var nav = el('nav', 'demo-vistas');
    nav.setAttribute('aria-label', 'Vista de la demo');
    [['cliente', 'Clienta'], ['admin', 'Administradora']].forEach(function (par) {
      var ruta = rutas[par[0]];
      var nodo;
      if (ruta) {
        nodo = el('a', 'demo-vista', par[1]);
        nodo.href = ruta;
        if (opc.vista === par[0]) nodo.setAttribute('aria-current', 'page');
      } else {
        nodo = el('span', 'demo-vista', par[1]);
        nodo.setAttribute('aria-disabled', 'true');
        nodo.title = 'Disponible en una próxima etapa';
      }
      nav.appendChild(nodo);
    });
    controles.appendChild(nav);

    var mensaje = el('p', 'demo-mensaje');
    mensaje.setAttribute('role', 'status');
    mensaje.setAttribute('aria-live', 'polite');

    var rapido = null;
    if (almacen) {
      var etiqueta = el('label', 'demo-rapido');
      rapido = el('input');
      rapido.type = 'checkbox';
      etiqueta.appendChild(rapido);
      etiqueta.appendChild(root.document.createTextNode('Modo rápido (reserva vence en 60 s)'));
      controles.appendChild(etiqueta);

      var reiniciar = el('button', 'demo-reiniciar', 'Reiniciar demo');
      reiniciar.type = 'button';
      reiniciar.addEventListener('click', function () {
        if (reiniciar.getAttribute('data-confirmar') !== 'si') {
          reiniciar.setAttribute('data-confirmar', 'si');
          reiniciar.textContent = 'Confirmar reinicio';
          temporizador = root.setTimeout(function () {
            reiniciar.removeAttribute('data-confirmar');
            reiniciar.textContent = 'Reiniciar demo';
          }, 4000);
          return;
        }
        root.clearTimeout(temporizador);
        reiniciar.removeAttribute('data-confirmar');
        reiniciar.textContent = 'Reiniciar demo';
        almacen.reiniciar();
        mensaje.textContent = 'Demo reiniciada: se cargaron de nuevo los datos de ejemplo.';
      });
      controles.appendChild(reiniciar);

      rapido.addEventListener('change', function () {
        var valor = rapido.checked;
        almacen.actualizar(function (e) { e.config.modoRapido = valor; });
        mensaje.textContent = valor ? 'Modo rápido activado: las reservas nuevas vencen en 60 segundos.' : 'Modo rápido desactivado.';
      });
      var sincronizar = function (e) { rapido.checked = !!(e && e.config && e.config.modoRapido); };
      sincronizar(almacen.leer());
      baja = almacen.suscribir(sincronizar);
    }
    interno.appendChild(controles);

    var info = el('details', 'demo-info');
    info.appendChild(el('summary', null, '¿Cómo se guardan los datos?'));
    info.appendChild(el('p', null,
      'Los datos de la demo se guardan en este navegador (localStorage). Se comparten entre las vistas y las pestañas de este mismo navegador, ' +
      'pero no entre visitantes ni entre dispositivos: nadie más ve lo que hacés. «Reiniciar demo» borra esos datos y vuelve a cargar los de ejemplo. ' +
      'No ingreses datos reales.'));
    interno.appendChild(info);

    if (almacen && almacen.modo() === 'memoria') {
      interno.appendChild(el('p', 'demo-alerta',
        'Tu navegador no permite guardar datos (por ejemplo, en modo privado). La demo funciona, pero los datos viven solo en esta pestaña y se pierden al recargar o cambiar de página.'));
    }
    interno.appendChild(mensaje);
    barra.appendChild(interno);
    destino.appendChild(barra);

    return { destruir: function () { if (baja) baja(); root.clearTimeout(temporizador); destino.textContent = ''; } };
  }

  ED.shell = { montar: montar };
})(typeof window !== 'undefined' ? window : globalThis);
