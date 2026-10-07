// DOCE — sin librerías externas. También funciona con doble clic en index.html.
const proyectos = window.PROYECTOS;
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
const galeria = document.querySelector('#galeria');
const portada = document.querySelector('.portada');
const menu = document.querySelector('#menu');
const menuBoton = document.querySelector('#menu-boton');
const TIEMPO_POR_IMAGEN = 3000;

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
  botonPausa.textContent = pausaManual ? '▷ Reproducir' : 'Ⅱ Pausar';
  botonPausa.setAttribute('aria-label', pausaManual ? 'Reanudar transiciones automáticas' : 'Pausar transiciones automáticas');
  botonPausa.setAttribute('aria-pressed', String(pausaManual));
}
function programarPortada() {
  clearTimeout(temporizador);
  if (!pausaManual && !document.hidden && portadaVisible && !focoPortada && !galeria.open) {
    temporizador = setTimeout(() => cambiarPortada(slideActual + 1), TIEMPO_POR_IMAGEN);
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
function pausarPortada() {
  pausaManual = true; peticionSlide++; actualizarPausa(); programarPortada();
}
document.querySelector('#portada-anterior').addEventListener('click', () => { pausarPortada(); cambiarPortada(slideActual - 1); });
document.querySelector('#portada-siguiente').addEventListener('click', () => { pausarPortada(); cambiarPortada(slideActual + 1); });
indicadores.forEach(b => b.addEventListener('click', () => { pausarPortada(); cambiarPortada(Number(b.dataset.slide)); }));
botonPausa.addEventListener('click', () => {
  pausaManual = !pausaManual;
  if (pausaManual) peticionSlide++;
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
let fotoMostrada = 0;
let capaActual = 0;
let peticionFoto = 0;
let botonOrigen;
let hashAnterior = '#proyectos';
let pausaGaleria = movimientoReducido.matches;
let temporizadorGaleria;
const botonPausaGaleria = document.querySelector('#galeria-pausa');

function actualizarPausaGaleria() {
  botonPausaGaleria.textContent = pausaGaleria ? '▷ Reproducir' : 'Ⅱ Pausar';
  botonPausaGaleria.setAttribute('aria-pressed', String(pausaGaleria));
  botonPausaGaleria.setAttribute('aria-label', pausaGaleria ? 'Reproducir fotos cada 3 segundos' : 'Pausar fotos para ver los detalles');
  document.querySelector('#galeria-ritmo').textContent = proyectoActual?.photos.length === 1 ? 'Imagen única' : pausaGaleria ? 'En pausa · explora a tu ritmo' : 'Una imagen cada 3 segundos';
}
function programarGaleria() {
  clearTimeout(temporizadorGaleria);
  if (galeria.open && !pausaGaleria && !document.hidden && proyectoActual.photos.length > 1) {
    temporizadorGaleria = setTimeout(() => mostrarFoto(fotoActual + 1), TIEMPO_POR_IMAGEN);
  }
}
function pausarGaleria() {
  pausaGaleria = true;
  if (capas.some(c => c.classList.contains('activa'))) {
    peticionFoto++; fotoActual = fotoMostrada; visor.setAttribute('aria-busy', 'false');
  }
  actualizarPausaGaleria(); programarGaleria();
}
function fotoManual(indice) { pausarGaleria(); mostrarFoto(indice); }
botonPausaGaleria.addEventListener('click', () => {
  if (!pausaGaleria) pausarGaleria();
  else { pausaGaleria = false; actualizarPausaGaleria(); programarGaleria(); }
});
document.addEventListener('visibilitychange', programarGaleria);
movimientoReducido.addEventListener('change', e => { if (e.matches && galeria.open) pausarGaleria(); });
document.querySelector('#galeria-detalle').addEventListener('click', pausarGaleria);
const contenidoGaleria = document.querySelector('#galeria-contenido');
document.querySelector('#galeria-pantalla').hidden = !document.fullscreenEnabled;
document.querySelector('#galeria-pantalla').addEventListener('click', async () => {
  pausarGaleria();
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (contenidoGaleria.requestFullscreen) await contenidoGaleria.requestFullscreen();
  } catch { document.querySelector('#galeria-ritmo').textContent = 'Usa “Ver en detalle” para abrir la imagen completa.'; }
});
document.addEventListener('fullscreenchange', () => {
  document.querySelector('#galeria-pantalla').textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
});
document.querySelector('#consultar-casa').addEventListener('click', () => {
  document.querySelector('#casa-referencia').value = proyectoActual.name;
  document.dispatchEvent(new Event('doce:consultar-casa'));
  galeria.close();
  history.replaceState(null, '', '#contacto');
  document.querySelector('#contacto').scrollIntoView({ behavior:movimientoReducido.matches ? 'instant' : 'smooth' });
  document.querySelector('#tipo-proyecto').focus({ preventScroll:true });
});

async function mostrarFoto(indice, primera = false) {
  clearTimeout(temporizadorGaleria);
  const pedido = ++peticionFoto;
  fotoActual = (indice + proyectoActual.photos.length) % proyectoActual.photos.length;
  const elegida = fotoActual;
  const imagen = proyectoActual.photos[elegida];
  visor.setAttribute('aria-busy', 'true');
  document.querySelector('#galeria-error').hidden = true;
  const precarga = new Image(); precarga.src = imagen.src;
  try { await precarga.decode(); } catch {
    if (pedido === peticionFoto) { visor.setAttribute('aria-busy', 'false'); document.querySelector('#galeria-error').hidden = false; pausaGaleria = true; actualizarPausaGaleria(); }
    return;
  }
  if (pedido !== peticionFoto || !galeria.open) return;
  const destino = primera ? 0 : 1 - capaActual;
  capas[destino].src = imagen.src;
  capas[destino].alt = imagen.alt;
  capas.forEach((c, i) => { c.classList.toggle('activa', i === destino); c.setAttribute('aria-hidden', String(i !== destino)); });
  capaActual = destino;
  fotoMostrada = elegida;
  document.querySelector('#galeria-detalle').href = imagen.src;
  visor.setAttribute('aria-busy', 'false');
  document.querySelector('#galeria-contador').textContent = `${String(elegida + 1).padStart(2, '0')} / ${String(proyectoActual.photos.length).padStart(2, '0')}`;
  [...miniaturas.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === elegida)));
  const boton = miniaturas.children[elegida];
  if (boton) miniaturas.scrollTo({ left:Math.max(0,boton.offsetLeft - miniaturas.offsetLeft - miniaturas.clientWidth / 2 + boton.offsetWidth / 2), behavior:movimientoReducido.matches ? 'instant' : 'smooth' });
  const siguiente = new Image(); siguiente.src = proyectoActual.photos[(elegida + 1) % proyectoActual.photos.length].src;
  programarGaleria();
}

function abrirProyecto(id, origen) {
  const casa = proyectos.find(p => p.id === id);
  if (!casa) return;
  proyectoActual = casa;
  pausaGaleria = movimientoReducido.matches;
  clearTimeout(temporizadorGaleria);
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
    boton.append(img); boton.addEventListener('click', () => fotoManual(i)); miniaturas.append(boton);
  });
  document.querySelector('#foto-anterior').hidden = casa.photos.length === 1;
  document.querySelector('#foto-siguiente').hidden = casa.photos.length === 1;
  botonPausaGaleria.hidden = casa.photos.length === 1;
  actualizarPausaGaleria();
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
document.querySelector('#foto-anterior').addEventListener('click', () => fotoManual(fotoMostrada - 1));
document.querySelector('#foto-siguiente').addEventListener('click', () => fotoManual(fotoMostrada + 1));
document.querySelector('#casa-anterior').addEventListener('click', () => proyectoVecino(-1));
document.querySelector('#casa-siguiente').addEventListener('click', () => proyectoVecino(1));
document.querySelector('#cerrar-galeria').addEventListener('click', () => galeria.close());
galeria.addEventListener('close', () => {
  clearTimeout(temporizadorGaleria);
  if (document.fullscreenElement === contenidoGaleria) document.exitFullscreen().catch(() => {});
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
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); fotoManual(fotoMostrada + (e.key === 'ArrowRight' ? 1 : -1)); }
  if (e.code === 'Space' && !e.target.closest('button,a,input,textarea,select')) { e.preventDefault(); botonPausaGaleria.click(); }
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
gestoHorizontal(visor, delta => fotoManual(fotoMostrada + delta));
gestoHorizontal(portada, delta => { pausarPortada(); cambiarPortada(slideActual + delta); });
document.querySelector('#anio').textContent = new Date().getFullYear();
