// FILTROS DEL PORTAFOLIO
const tarjetas = [...document.querySelectorAll('.proyecto')];
const filtros = [...document.querySelectorAll('[data-filtro]')];
const verMas = document.querySelector('#ver-mas');
let filtroActual = 'todos';
let mostrarTodos = false;

function actualizarProyectos() {
  const coincidentes = tarjetas.filter(t => filtroActual === 'todos' || t.dataset.categoria === filtroActual);
  tarjetas.forEach(t => { t.hidden = true; });
  const visibles = mostrarTodos ? coincidentes : coincidentes.slice(0, 6);
  visibles.forEach(t => { t.hidden = false; });
  document.querySelector('.contador').textContent = `Mostrando ${visibles.length} de ${coincidentes.length} proyectos`;
  verMas.hidden = visibles.length === coincidentes.length;
}

filtros.forEach(boton => boton.addEventListener('click', () => {
  filtroActual = boton.dataset.filtro;
  mostrarTodos = false;
  filtros.forEach(f => {
    const activo = f === boton;
    f.classList.toggle('activo', activo);
    f.setAttribute('aria-pressed', String(activo));
  });
  actualizarProyectos();
}));

verMas.addEventListener('click', () => {
  const siguiente = tarjetas.find(t => t.hidden && (filtroActual === 'todos' || t.dataset.categoria === filtroActual));
  mostrarTodos = true;
  actualizarProyectos();
  siguiente?.querySelector('button').focus({ preventScroll:true });
});

// GALERÍA: funciona también abriendo index.html directamente en el navegador.
const galeria = document.querySelector('#galeria');
const foto = document.querySelector('#galeria-foto');
const miniaturas = document.querySelector('#miniaturas');
let proyectoActual;
let fotoActual = 0;
let botonOrigen;

function mostrarFoto(indice) {
  fotoActual = (indice + proyectoActual.photos.length) % proyectoActual.photos.length;
  const imagen = proyectoActual.photos[fotoActual];
  foto.src = imagen.src;
  foto.alt = imagen.alt;
  document.querySelector('#galeria-contador').textContent = `${String(fotoActual + 1).padStart(2, '0')} / ${String(proyectoActual.photos.length).padStart(2, '0')}`;
  [...miniaturas.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === fotoActual)));
  const unica = proyectoActual.photos.length === 1;
  document.querySelector('#foto-anterior').hidden = unica;
  document.querySelector('#foto-siguiente').hidden = unica;
}

document.querySelectorAll('[data-proyecto]').forEach(boton => boton.addEventListener('click', () => {
  proyectoActual = window.PROYECTOS.find(p => p.id === boton.dataset.proyecto);
  if (!proyectoActual) return;
  botonOrigen = boton;
  document.querySelector('#galeria-titulo').textContent = proyectoActual.name;
  miniaturas.replaceChildren();
  proyectoActual.photos.forEach((imagen, i) => {
    const miniatura = document.createElement('button');
    miniatura.type = 'button';
    miniatura.setAttribute('aria-label', `Ver fotografía ${i + 1} de ${proyectoActual.name}`);
    const img = document.createElement('img');
    img.src = imagen.src;
    img.alt = '';
    img.loading = 'lazy';
    miniatura.append(img);
    miniatura.addEventListener('click', () => mostrarFoto(i));
    miniaturas.append(miniatura);
  });
  mostrarFoto(0);
  galeria.showModal();
  document.body.classList.add('galeria-abierta');
}));

document.querySelector('#foto-anterior').addEventListener('click', () => mostrarFoto(fotoActual - 1));
document.querySelector('#foto-siguiente').addEventListener('click', () => mostrarFoto(fotoActual + 1));
document.querySelector('#cerrar-galeria').addEventListener('click', () => galeria.close());
galeria.addEventListener('close', () => {
  document.body.classList.remove('galeria-abierta');
  botonOrigen?.focus({ preventScroll:true });
});
galeria.addEventListener('click', event => { if (event.target === galeria) {
  const r = galeria.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) galeria.close();
}});
galeria.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    mostrarFoto(fotoActual + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
document.querySelector('#anio').textContent = new Date().getFullYear();
