# elevalab-demos

Demostraciones interactivas de sistemas que ElevaLab ya construyó para negocios reales.
Cada demo es una **simulación independiente**: usa una marca ficticia y datos ficticios, y no se conecta a nada.

## Principios

- **Datos 100 % ficticios.** Nombres inventados, mails `@example.com`, teléfonos con formato de ejemplo, montos de ejemplo. Nada se copia de ningún negocio real.
- **Cero conexiones.** Ninguna página llama a servicios, bases de datos, cuentas ni APIs. No se envían mails ni se procesan pagos. Sin analíticas.
- **Sin dependencias externas.** Tipografía del sistema (sin Google Fonts), sin librerías de terceros, sin build. Son archivos estáticos.
- **Honestidad.** Todo lo que la demo muestra como funcionando existe en el sistema que reproduce; lo que es simulación se rotula como tal. Ver `docs/ALCANCE.md`.
- **Independiente.** Este repositorio no modifica ni depende de ningún proyecto de cliente ni del sitio institucional.

## Estado

| Etapa | Contenido | Estado |
|---|---|---|
| B1 | Estructura, identidad ElevaLab, marca ficticia, marco de la demo | Hecha |
| B2 | Módulos de agenda, estados, tiempo y almacenamiento, con pruebas | Hecha |
| B3 | Vista de la clienta: reserva con seña simulada, pasarela ficticia, confirmación y calendario `.ics` | Hecha |
| B4 | Panel de administración: ingreso, Inicio y Turnos (con cancelación y decisión sobre la seña) | Hecha |
| B5 | Revisión final: accesibilidad (auditoría automática sin errores), responsive, conexiones y datos | Hecha |
| B6 | Subdominio `demos.elevalab.com.ar` (GitHub Pages + registro CNAME en el DNS) | Se configura fuera del código |

## Estructura

```
index.html                  catálogo de demos
404.html, robots.txt        página de error y directivas
CNAME                       subdominio de la demo (demos.elevalab.com.ar)
assets/                     identidad y marco común de todas las demos
  css/ elevalab-tokens.css, base.css, demo-shell.css, sitio-elevalab.css
  js/  demo-shell.js, sitio-elevalab.js
  img/ logo-dorado-160.png
docs/                       alcance y reglas de negocio reproducidas
spa/                        demo de gestión de spa («Spa Demo», marca ficticia)
  index.html                entrada y estado de la demo
  admin/index.html          panel de administración (Inicio y Turnos)
  cliente/                  vista de la clienta
    index.html              portada y asistente de reserva (4 pasos)
    pago/index.html         pasarela de pago SIMULADA
    turno/index.html        estado de la reserva y calendario .ics
  css/ marca-spa.css, cliente.css, pasarela.css, turno.css, admin.css
  img/ spa-demo-logo.svg, spa-demo-marca.svg
  js/core/                  lógica de la demo (sin pantallas)
  js/cliente/               pantallas de la clienta (asistente, pasarela, retorno)
  js/admin/                 pantallas del panel (panel, inicio, turnos)
  pruebas/                  pruebas automáticas (se abren en el navegador)
```

## Cómo probar

1. Publicar el repositorio con GitHub Pages (rama `main`, carpeta raíz).
2. Abrir `…/spa/pruebas/` y verificar que dice «Todas las pruebas pasaron».
3. Abrir `…/spa/` para ver el estado de la base técnica.

La demo se publica en `https://demos.elevalab.com.ar/` (archivo `CNAME` de la raíz) y, de respaldo, en `https://elevalabar.github.io/elevalab-demos/`. Todas las rutas son relativas, así que funciona igual bajo un dominio, un subdominio o un subdirectorio.

## Barra superior y pie de ElevaLab

Todas las pantallas (menos las pruebas automáticas y la página de error) muestran la misma barra superior y el mismo pie que
`elevalab.com.ar`, para que la demostración se sienta parte de la web. Los enlaces apuntan a la web principal con direcciones
absolutas (`https://elevalab.com.ar/...`).

Es una **copia propia** (`assets/css/sitio-elevalab.css` y `assets/js/sitio-elevalab.js`), no se carga nada desde la web principal.
Por eso, si cambia el menú o el pie de `elevalab-web` (en `assets/js/site.js`: `NAV`, `PIE_EXTRA`, correo e Instagram), hay que
actualizar el mismo dato en `assets/js/sitio-elevalab.js`.

## Datos y almacenamiento

La demo guarda su estado en `localStorage`, con una clave propia (`elevalab-demo-spa:…`) y con versión.

- Se comparte entre **las vistas y las pestañas del mismo navegador**.
- **No** se comparte entre visitantes ni entre dispositivos: cada persona ve solo lo que hace en su propio navegador.
- Si el navegador no permite guardar (modo privado), la demo funciona en memoria, solo en esa pestaña.
- «Reiniciar demo» borra el estado y vuelve a cargar los datos de ejemplo.

## Buscadores y privacidad

Todas las páginas llevan `noindex, nofollow`. Eso pide a los buscadores que no las listen, pero **no hace privado el sitio**: cualquiera con la dirección puede abrirlo. Por eso en este repositorio no debe existir ningún dato real ni sensible, ni en el código, ni en el historial, ni en las imágenes.

## Reglas para sumar o cambiar contenido

- Reescribir siempre; no copiar archivos, textos, marca, imágenes ni datos de proyectos de clientes.
- Imágenes solo propias o con licencia comprobada y registrada.
- Si se agrega una función, debe figurar en `docs/ALCANCE.md` como real o simulada.
- Mantener los archivos como texto plano y las rutas relativas.

## Archivo que se copia desde otro repositorio

`assets/img/logo-dorado-160.png` es el logo de ElevaLab (PNG, 160 × 160 px, fondo transparente). Se copia tal cual desde `elevalab-web/assets/img/logo-dorado-160.png`.
