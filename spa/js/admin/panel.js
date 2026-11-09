/* Spa Demo · panel de administración · estructura general
   - Ingreso: botón «Entrar como administradora (demo)», sin usuario ni contraseña (no hay inicio de sesión real).
   - Cabecera con «Salir», navegación (abajo en celular, arriba en pantallas anchas) y una sección por pantalla.
   - Cada sección se registra en ElevaDemo.adminSecciones (inicio.js, turnos.js) y recibe un contexto con el estado
     (más ir() para cambiar de sección y redibujar() para actualizarse).
   - Se redibuja sola cuando cambian los datos (por ejemplo, si la clienta reserva desde otra pestaña).
   La sesión de la demo dura lo que dura la pestaña (sessionStorage); no guarda nada más.
   Depende de: spa/js/core/ y de las secciones cargadas antes que este archivo. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var T = ED.tiempo;
  var doc = root.document;
  ED.adminSecciones = ED.adminSecciones || {};

  var CLAVE_SESION = 'elevalab-demo-spa:admin-sesion';
  var SECCIONES = [['inicio', 'Inicio'], ['turnos', 'Turnos']];
  var memoriaSesion = false;

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function hayRegistro() { try { return root.sessionStorage.getItem(CLAVE_SESION) === '1'; } catch (e) { return memoriaSesion; } }
  function sesionActiva() { return memoriaSesion || hayRegistro(); }
  function iniciarSesion() { memoriaSesion = true; try { root.sessionStorage.setItem(CLAVE_SESION, '1'); } catch (e) { /* sigue en memoria */ } }
  function cerrarSesion() { memoriaSesion = false; try { root.sessionStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ } }

  function seccionActual() {
    var n = (root.location.hash || '').replace('#', '');
    return SECCIONES.some(function (s) { return s[0] === n; }) ? n : 'inicio';
  }

  // opc.almacen, opc.destino (id), opc.logo (ruta del logo SVG), opc.cliente (ruta de la vista de la clienta)
  function montar(opc) {
    var almacen = opc.almacen;
    var destino = typeof opc.destino === 'string' ? doc.getElementById(opc.destino) : opc.destino;
    if (!destino) return null;
    var main = null, nav = null, anuncio = null;

    function anunciar(texto) { if (anuncio) { anuncio.textContent = ''; root.setTimeout(function () { anuncio.textContent = texto; }, 30); } }

    function marcarNav() {
      if (!nav) return;
      var actual = seccionActual();
      Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
        if (a.getAttribute('data-seccion') === actual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }

    // Cambia de sección (opcionalmente con datos, por ejemplo el día a mostrar en Turnos).
    function ir(nombre, parametros) {
      ED.adminParametros = parametros || null;
      if (seccionActual() === nombre) dibujarSeccion(true); else root.location.hash = '#' + nombre;
    }

    function dibujarSeccion(enfocarTitulo) {
      if (!main) return;
      var activo = doc.activeElement && doc.activeElement.getAttribute ? doc.activeElement.getAttribute('data-id') : null;
      var nombre = seccionActual();
      var seccion = ED.adminSecciones[nombre];
      var parametros = ED.adminParametros || null;     // datos de una navegación («ir a Turnos en tal día»); se usan una sola vez
      ED.adminParametros = null;
      var ctx = {
        almacen: almacen, estado: almacen.leer(), ahora: T.ahora(), rutaCliente: opc.cliente, anunciar: anunciar,
        parametros: parametros, ir: ir, redibujar: function () { dibujarSeccion(false); }
      };
      main.textContent = '';
      if (seccion) seccion.render(main, ctx);
      else {
        var h = el('h2', 'adm-titulo', 'Turnos'); h.id = 'adm-titulo'; h.tabIndex = -1;
        main.appendChild(h);
        main.appendChild(el('p', 'apagado', 'Esta sección todavía no está disponible.'));
      }
      marcarNav();
      var foco = null;
      if (enfocarTitulo) foco = main.querySelector('#adm-titulo');
      else if (activo) foco = main.querySelector('[data-id="' + activo + '"]');
      if (foco) foco.focus();
    }

    function pantallaIngreso() {
      var fondo = el('div', 'adm-login');
      var caja = el('div', 'adm-login-caja');
      if (opc.logo) { var img = el('img'); img.src = opc.logo; img.alt = 'Spa Demo (marca ficticia)'; caja.appendChild(img); }
      var h = el('h2', null, 'Panel de administración');
      h.id = 'adm-login-titulo'; h.tabIndex = -1;
      caja.appendChild(h);
      caja.appendChild(el('p', null, 'Demostración: no hace falta usuario ni contraseña. En un sistema real, acá se pediría iniciar sesión.'));
      var b = el('button', 'adm-btn', 'Entrar como administradora (demo)');
      b.type = 'button';
      b.addEventListener('click', function () { iniciarSesion(); dibujar(true); });
      caja.appendChild(b);
      if (opc.cliente) {
        var p = el('p', 'pequeno');
        var a = el('a', null, 'Ir a la vista de la clienta'); a.href = opc.cliente;
        p.appendChild(a); caja.appendChild(p);
      }
      fondo.appendChild(caja);
      return fondo;
    }

    function dibujar(enfocar) {
      destino.textContent = '';
      main = null; nav = null; anuncio = null;
      if (!sesionActiva()) {
        var login = pantallaIngreso();
        destino.appendChild(login);
        if (enfocar !== false) login.querySelector('#adm-login-titulo').focus();
        return;
      }
      var raiz = el('div', 'adm');
      var cab = el('header', 'adm-cab');
      var cont = el('div', 'contenedor');
      var marca = el('div', 'adm-marca');
      if (opc.logo) { var img = el('img'); img.src = opc.logo; img.alt = ''; marca.appendChild(img); }
      marca.appendChild(el('span', null, 'Panel de administración'));
      cont.appendChild(marca);
      var salir = el('button', 'adm-btn adm-btn-sec', 'Salir'); salir.type = 'button';
      salir.addEventListener('click', function () { cerrarSesion(); dibujar(true); });
      cont.appendChild(salir);
      cab.appendChild(cont);
      raiz.appendChild(cab);

      nav = el('nav', 'adm-nav');
      nav.setAttribute('aria-label', 'Secciones del panel');
      SECCIONES.forEach(function (s) {
        var a = el('a', null, s[1]); a.href = '#' + s[0]; a.setAttribute('data-seccion', s[0]);
        nav.appendChild(a);
      });
      raiz.appendChild(nav);

      main = el('main', 'adm-main');
      main.id = 'adm-contenido';
      var interior = el('div', 'contenedor');
      main.appendChild(interior);
      raiz.appendChild(main);
      anuncio = el('p', 'sr-only'); anuncio.setAttribute('role', 'status'); anuncio.setAttribute('aria-live', 'polite');
      raiz.appendChild(anuncio);
      destino.appendChild(raiz);
      main = interior;
      dibujarSeccion(enfocar !== false);
    }

    var baja = almacen.suscribir(function () { if (sesionActiva()) dibujarSeccion(false); });
    function alCambiarHash() { if (sesionActiva()) dibujarSeccion(true); }
    root.addEventListener('hashchange', alCambiarHash);
    // Si pasa el tiempo (cambia el día o un turno termina), se actualizan los números.
    var reloj = root.setInterval(function () { if (!doc.hidden && sesionActiva()) dibujarSeccion(false); }, 60000);

    dibujar(false);
    return { destruir: function () { baja(); root.removeEventListener('hashchange', alCambiarHash); root.clearInterval(reloj); destino.textContent = ''; } };
  }

  ED.panel = { montar: montar };
})(typeof window !== 'undefined' ? window : globalThis);
