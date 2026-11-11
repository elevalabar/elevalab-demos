/* ElevaLab · marco del sitio dentro de las demos (barra superior y pie)
   Dibuja la misma barra superior y el mismo pie que elevalab.com.ar, para que la demo se sienta parte de la web.
   Los enlaces a la web principal son absolutos (https://elevalab.com.ar/...). Los datos de abajo son una COPIA de
   elevalab-web/assets/js/site.js (NAV, PIE_EXTRA, CONTACTO, redes): si cambian allá, actualizarlos acá a mano.
   No hace ninguna conexión: solo arma enlaces. Depende de: assets/css/sitio-elevalab.css. */
(function (root) {
  'use strict';
  var ED = root.ElevaDemo = root.ElevaDemo || {};
  var doc = root.document;

  var WEB = 'https://elevalab.com.ar/';
  var SISTEMA = 'https://admin.elevalab.com.ar/';
  var CORREO = 'elevalab.ar@gmail.com';
  var INSTAGRAM = 'https://instagram.com/elevalab.ar';

  var ICONO_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
  var ICONO_CERRAR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

  // opc.cabecera / opc.pie: ids de los contenedores. opc.logo: ruta (relativa a la página) del logo PNG.
  // opc.demos: ruta (relativa a la página) de la portada de las demostraciones. opc.saltarA: id del contenido principal.
  function montar(opc) {
    var cab = doc.getElementById(opc.cabecera);
    var pie = doc.getElementById(opc.pie);
    var logo = opc.logo, demos = opc.demos || WEB;

    if (cab) {
      cab.innerHTML =
        '<a class="sitio-skip" href="#' + (opc.saltarA || 'contenido') + '">Ir al contenido</a>' +
        '<header class="sitio-nav" id="sitio-nav"><div class="sitio-contenedor">' +
          '<a class="sitio-marca" href="' + WEB + 'index.html" aria-label="ElevaLab, inicio">' +
            '<img src="' + logo + '" alt="" width="38" height="38"><span>Eleva<b>Lab</b></span></a>' +
          '<button class="sitio-btn-menu" id="sitio-btn-menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="sitio-enlaces">' + ICONO_MENU + '</button>' +
          '<nav class="sitio-enlaces" id="sitio-enlaces" aria-label="Navegación principal de ElevaLab">' +
            '<a href="' + WEB + 'index.html">Inicio</a>' +
            '<a href="' + WEB + 'proyectos/index.html">Proyectos</a>' +
            '<a href="' + SISTEMA + 'diagnostico/index.html">Diagnóstico</a>' +
            '<a href="' + WEB + 'contacto/index.html">Contacto</a>' +
            '<a class="sitio-acceso" href="' + WEB + 'acceso/index.html">Acceso al sistema</a>' +
            '<a class="sitio-cta" href="' + WEB + 'contacto/index.html">Hablemos →</a>' +
          '</nav></div></header>';

      var btn = doc.getElementById('sitio-btn-menu'), nav = doc.getElementById('sitio-enlaces'), caja = doc.getElementById('sitio-nav');
      var fijar = function (abierto) {
        nav.classList.toggle('abierto', abierto);
        btn.setAttribute('aria-expanded', String(abierto));
        btn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        btn.innerHTML = abierto ? ICONO_CERRAR : ICONO_MENU;
      };
      btn.addEventListener('click', function () { fijar(!nav.classList.contains('abierto')); });
      nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) fijar(false); });
      doc.addEventListener('click', function (e) {
        if (nav.classList.contains('abierto') && !e.composedPath().includes(caja)) fijar(false);
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('abierto')) { fijar(false); btn.focus(); }
      });
      if (root.matchMedia) root.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) fijar(false); });
    }

    if (pie) {
      pie.innerHTML =
        '<footer class="sitio-pie"><div class="sitio-contenedor">' +
          '<div class="sitio-pie-grid">' +
            '<div><a class="sitio-pie-marca" href="' + WEB + 'index.html"><img src="' + logo + '" alt="" width="44" height="44" loading="lazy"><span>Eleva<b>Lab</b></span></a>' +
              '<p class="sitio-pie-frase">Tecnología para que los negocios avancen.</p></div>' +
            '<div><h2 class="sitio-pie-tit">Explorar</h2><ul>' +
              '<li><a href="' + WEB + 'index.html">Inicio</a></li>' +
              '<li><a href="' + WEB + 'proyectos/index.html">Proyectos</a></li>' +
              '<li><a href="' + SISTEMA + 'diagnostico/index.html">Diagnóstico</a></li>' +
              '<li><a href="' + WEB + 'contacto/index.html">Contacto</a></li>' +
              '<li><a href="' + WEB + 'sobre/index.html">Sobre ElevaLab</a></li>' +
              '<li><a href="' + demos + '">Demostraciones</a></li></ul></div>' +
            '<div><h2 class="sitio-pie-tit">Redes</h2><ul>' +
              '<li><a href="mailto:' + CORREO + '">Correo</a></li>' +
              '<li><a href="' + INSTAGRAM + '" target="_blank" rel="noopener">Instagram</a></li></ul></div>' +
            '<div><h2 class="sitio-pie-tit">Sistema</h2><ul><li><a href="' + WEB + 'acceso/index.html">Acceso al sistema</a></li></ul></div>' +
          '</div>' +
          '<div class="sitio-pie-base"><span>© ' + new Date().getFullYear() + ' ElevaLab. Un proyecto de Sebastián Quiven.</span>' +
            '<span><a href="mailto:' + CORREO + '">' + CORREO + '</a></span></div>' +
        '</div></footer>';
    }
  }

  ED.sitio = { montar: montar };
})(typeof window !== 'undefined' ? window : globalThis);
