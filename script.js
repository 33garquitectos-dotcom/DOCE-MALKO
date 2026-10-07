// DOCE — sin librerías externas. También funciona con doble clic en index.html.
const proyectos = window.PROYECTOS;
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
const galeria = document.querySelector('#galeria');
const portada = document.querySelector('.portada');
const menu = document.querySelector('#menu');
const menuBoton = document.querySelector('#menu-boton');

// MENÚ Y CABECERA
function cerrarMenu() {
  menu.classList.remove('abierto');
  menuBoton.setAttribute('aria-expanded', 'false');
}
menuBoton.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  menuBoton.setAttribute('aria-expanded', String(abierto));
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', cerrarMenu));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.classList.contains('abierto')) {
    cerrarMenu(); menuBoton.focus();
  }
});
let scrollPendiente = false;
function actualizarCabecera() {
  document.querySelector('#cabecera').classList.toggle('fija', window.scrollY > 90);
  scrollPendiente = false;
}
window.addEventListener('scroll', () => {
  if (!scrollPendiente) { scrollPendiente = true; requestAnimationFrame(actualizarCabecera); }
}, { passive:true });
actualizarCabecera();

// APARICIÓN DE SECCIONES. No se modifica el comportamiento del scroll.
let observador;
if ('IntersectionObserver' in window && !movimientoReducido.matches) {
  document.body.classList.add('con-movimiento');
  observador = new IntersectionObserver(entradas => entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('visible'); observador.unobserve(entrada.target);
    }
  }), { threshold:0.08 });
  document.querySelectorAll('.revelar').forEach(el => observador.observe(el));
}

// BUSCADOR DE CASAS
const tarjetas = [...document.querySelectorAll('.proyecto')];
const buscar = document.querySelector('#buscar-casa');
const verMas = document.querySelector('#ver-mas');
let mostrarTodas = false;
const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function actualizarCasas() {
  const consulta = normalizar(buscar.value.trim());
  const coincidentes = tarjetas.filter(t => normalizar(t.dataset.nombre).includes(consulta));
  tarjetas.forEach(t => { t.hidden = true; });
  const visibles = mostrarTodas || consulta ? coincidentes : coincidentes.slice(0, 6);
  visibles.forEach(t => { t.hidden = false; if (observador) observador.observe(t); });
  document.querySelector('.contador').textContent = `Mostrando ${visibles.length} de ${coincidentes.length} casas`;
  verMas.hidden = visibles.length === coincidentes.length;
  document.querySelector('#sin-resultados').hidden = coincidentes.length !== 0;
}
buscar.addEventListener('input', actualizarCasas);
verMas.addEventListener('click', () => {
  const siguiente = tarjetas.find(t => t.hidden);
  mostrarTodas = true; actualizarCasas();
  siguiente?.querySelector('a').focus({ preventScroll:true });
});

// CARRUSEL DE PORTADA: modifica esta lista y las imágenes de index.html juntas.
const casasPortada = ['casa-maoris', 'casa-lomas-12-1', 'casa-staines', 'casa-burgos'];
const slides = [...document.querySelectorAll('.portada-slide')];
const indicadores = [...document.querySelectorAll('[data-slide]')];
const botonPausa = document.querySelector('#portada-pausa');
const enlacePortada = document.querySelector('#portada-proyecto');
let slideActual = 0;
let peticionSlide = 0;
let pausaManual = movimientoReducido.matches;
let portadaVisible = true;
let focoPortada = false;
let temporizador;

function actualizarPausa() {
  botonPausa.textContent = pausaManual ? '▷' : 'Ⅱ';
  botonPausa.setAttribute('aria-label', pausaManual ? 'Reanudar transiciones automáticas' : 'Pausar transiciones automáticas');
  botonPausa.setAttribute('aria-pressed', String(pausaManual));
}
function programarPortada() {
  clearTimeout(temporizador);
  if (!pausaManual && !document.hidden && portadaVisible && !focoPortada && !galeria.open) {
    temporizador = setTimeout(() => cambiarPortada(slideActual + 1), 6500);
  }
}
async function cambiarPortada(indice) {
  const pedido = ++peticionSlide;
  const siguiente = (indice + slides.length) % slides.length;
  const img = slides[siguiente].querySelector('img');
  try { await img.decode(); } catch { programarPortada(); return; }
  if (pedido !== peticionSlide) return;
  slideActual = siguiente;
  slides.forEach((s, i) => s.classList.toggle('activa', i === siguiente));
  indicadores.forEach((b, i) => {
    b.classList.toggle('activo', i === siguiente);
    b.setAttribute('aria-pressed', String(i === siguiente));
  });
  const casa = proyectos.find(p => p.id === casasPortada[siguiente]);
  enlacePortada.dataset.proyecto = casa.id;
  enlacePortada.href = `#proyecto=${casa.id}`;
  enlacePortada.replaceChildren(document.createTextNode(casa.name + ' '));
  const flecha = document.createElement('span'); flecha.textContent = '↗'; flecha.setAttribute('aria-hidden', 'true'); enlacePortada.append(flecha);
  programarPortada();
}
document.querySelector('#portada-anterior').addEventListener('click', () => cambiarPortada(slideActual - 1));
document.querySelector('#portada-siguiente').addEventListener('click', () => cambiarPortada(slideActual + 1));
indicadores.forEach(b => b.addEventListener('click', () => cambiarPortada(Number(b.dataset.slide))));
botonPausa.addEventListener('click', () => {
  pausaManual = !pausaManual;
  // Una orden explícita de reproducir también reanuda con el botón enfocado.
  if (!pausaManual) focoPortada = false;
  actualizarPausa(); programarPortada();
});
portada.addEventListener('focusin', () => { focoPortada = true; programarPortada(); });
portada.addEventListener('focusout', e => { if (!portada.contains(e.relatedTarget)) { focoPortada = false; programarPortada(); } });
document.addEventListener('visibilitychange', programarPortada);
movimientoReducido.addEventListener('change', e => {
  pausaManual = e.matches; actualizarPausa(); programarPortada();
  if (e.matches) document.body.classList.remove('con-movimiento');
});
if ('IntersectionObserver' in window) new IntersectionObserver(entradas => {
  portadaVisible = entradas[0].isIntersecting; programarPortada();
}, { threshold:0.1 }).observe(portada);
actualizarPausa(); programarPortada();

// GALERÍA CON FUNDIDO ENTRE DOS IMÁGENES Y PROTECCIÓN ANTE CLICS RÁPIDOS.
const capas = [...document.querySelectorAll('.galeria-imagen')];
const miniaturas = document.querySelector('#miniaturas');
const visor = document.querySelector('#galeria-visor');
let proyectoActual;
let fotoActual = 0;
let capaActual = 0;
let peticionFoto = 0;
let botonOrigen;
let hashAnterior = '#proyectos';

async function mostrarFoto(indice, primera = false) {
  const pedido = ++peticionFoto;
  fotoActual = (indice + proyectoActual.photos.length) % proyectoActual.photos.length;
  const elegida = fotoActual;
  const imagen = proyectoActual.photos[elegida];
  visor.setAttribute('aria-busy', 'true');
  document.querySelector('#galeria-error').hidden = true;
  const precarga = new Image(); precarga.src = imagen.src;
  try { await precarga.decode(); } catch {
    if (pedido === peticionFoto) { visor.setAttribute('aria-busy', 'false'); document.querySelector('#galeria-error').hidden = false; }
    return;
  }
  if (pedido !== peticionFoto || !galeria.open) return;
  const destino = primera ? 0 : 1 - capaActual;
  capas[destino].src = imagen.src;
  capas[destino].alt = imagen.alt;
  capas.forEach((c, i) => { c.classList.toggle('activa', i === destino); c.setAttribute('aria-hidden', String(i !== destino)); });
  capaActual = destino;
  visor.setAttribute('aria-busy', 'false');
  document.querySelector('#galeria-contador').textContent = `${String(elegida + 1).padStart(2, '0')} / ${String(proyectoActual.photos.length).padStart(2, '0')}`;
  [...miniaturas.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === elegida)));
  const boton = miniaturas.children[elegida];
  if (boton) miniaturas.scrollTo({ left:Math.max(0,boton.offsetLeft - miniaturas.offsetLeft - miniaturas.clientWidth / 2 + boton.offsetWidth / 2), behavior:movimientoReducido.matches ? 'instant' : 'smooth' });
  const siguiente = new Image(); siguiente.src = proyectoActual.photos[(elegida + 1) % proyectoActual.photos.length].src;
}

function abrirProyecto(id, origen) {
  const casa = proyectos.find(p => p.id === id);
  if (!casa) return;
  proyectoActual = casa;
  if (origen) botonOrigen = origen;
  peticionFoto++;
  capas.forEach(c => { c.classList.remove('activa'); c.removeAttribute('src'); });
  document.querySelector('#galeria-titulo').textContent = casa.name;
  document.querySelector('#galeria-contador').textContent = 'Cargando…';
  miniaturas.replaceChildren();
  casa.photos.forEach((imagen, i) => {
    const boton = document.createElement('button'); boton.type = 'button';
    boton.setAttribute('aria-label', `Ver fotografía ${i + 1} de ${casa.name}`);
    boton.setAttribute('aria-pressed', 'false');
    const img = document.createElement('img'); img.src = imagen.src; img.alt = ''; img.loading = 'lazy';
    boton.append(img); boton.addEventListener('click', () => mostrarFoto(i)); miniaturas.append(boton);
  });
  document.querySelector('#foto-anterior').hidden = casa.photos.length === 1;
  document.querySelector('#foto-siguiente').hidden = casa.photos.length === 1;
  if (!galeria.open) galeria.showModal();
  document.body.classList.add('galeria-abierta');
  mostrarFoto(0, true); programarPortada();
}
document.addEventListener('click', e => {
  const enlace = e.target.closest('[data-proyecto]');
  if (!enlace || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (!location.hash.startsWith('#proyecto=')) hashAnterior = location.hash || '#proyectos';
  history.pushState(null, '', `#proyecto=${enlace.dataset.proyecto}`);
  abrirProyecto(enlace.dataset.proyecto, enlace);
});
function proyectoVecino(delta) {
  const i = proyectos.findIndex(p => p.id === proyectoActual.id);
  const casa = proyectos[(i + delta + proyectos.length) % proyectos.length];
  history.replaceState(null, '', `#proyecto=${casa.id}`); abrirProyecto(casa.id);
}
document.querySelector('#foto-anterior').addEventListener('click', () => mostrarFoto(fotoActual - 1));
document.querySelector('#foto-siguiente').addEventListener('click', () => mostrarFoto(fotoActual + 1));
document.querySelector('#casa-anterior').addEventListener('click', () => proyectoVecino(-1));
document.querySelector('#casa-siguiente').addEventListener('click', () => proyectoVecino(1));
document.querySelector('#cerrar-galeria').addEventListener('click', () => galeria.close());
galeria.addEventListener('close', () => {
  peticionFoto++; document.body.classList.remove('galeria-abierta');
  if (location.hash.startsWith('#proyecto=')) history.replaceState(null, '', hashAnterior);
  botonOrigen?.focus({ preventScroll:true }); programarPortada();
});
galeria.addEventListener('click', e => {
  if (e.target !== galeria) return;
  const r = galeria.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) galeria.close();
});
galeria.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); mostrarFoto(fotoActual + (e.key === 'ArrowRight' ? 1 : -1)); }
});
function seguirRuta() {
  const id = location.hash.startsWith('#proyecto=') ? location.hash.slice(10) : null;
  if (id && proyectos.some(p => p.id === id)) abrirProyecto(id);
  else if (galeria.open) galeria.close();
}
window.addEventListener('popstate', seguirRuta);
window.addEventListener('hashchange', seguirRuta);
seguirRuta();

// GESTOS: desliza a los lados sin bloquear el scroll vertical del celular.
function gestoHorizontal(elemento, alDeslizar) {
  let inicio;
  elemento.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('button,a')) { inicio = null; return; }
    inicio = { x:e.touches[0].clientX, y:e.touches[0].clientY };
  }, { passive:true });
  elemento.addEventListener('touchend', e => {
    if (!inicio) return;
    const dx = e.changedTouches[0].clientX - inicio.x;
    const dy = e.changedTouches[0].clientY - inicio.y;
    inicio = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) alDeslizar(dx < 0 ? 1 : -1);
  }, { passive:true });
  elemento.addEventListener('touchcancel', () => { inicio = null; }, { passive:true });
}
gestoHorizontal(visor, delta => mostrarFoto(fotoActual + delta));
gestoHorizontal(portada, delta => cambiarPortada(slideActual + delta));
document.querySelector('#anio').textContent = new Date().getFullYear();
