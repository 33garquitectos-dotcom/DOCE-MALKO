// FORMULARIO: el destinatario se configura exclusivamente en FormSubmit.
// El identificador público NO es una contraseña ni contiene el correo del estudio.
const formulario = document.querySelector('#consulta-proyecto');
const pasos = [...document.querySelectorAll('.paso-formulario')];
const etiquetasPaso = [...document.querySelectorAll('.pasos-formulario li')];
const siguientePaso = document.querySelector('#paso-siguiente');
const anteriorPaso = document.querySelector('#paso-anterior');
const enviarConsulta = document.querySelector('#enviar-consulta');
const estadoFormulario = document.querySelector('#formulario-estado');
const referenciaCasa = document.querySelector('#casa-referencia');
let pasoActual = 0;
let enviandoConsulta = false;

// Inversión: rangos claros en MXN y un monto libre con formato monetario.
const rangoPresupuesto = document.querySelector('#presupuesto-rango');
const montoPresupuesto = document.querySelector('#presupuesto');
const grupoMonto = document.querySelector('#monto-personalizado');
const formatoPesos = new Intl.NumberFormat('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });
function numeroPresupuesto() {
  const texto = montoPresupuesto.value.trim().replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(texto)) return NaN;
  return Number(texto);
}
function formatearPresupuesto() {
  if (montoPresupuesto.disabled) return true;
  const numero = numeroPresupuesto();
  const valido = Number.isFinite(numero) && numero > 0 && numero <= 999999999999.99;
  montoPresupuesto.setCustomValidity(valido ? '' : 'Escribe un monto mayor que cero, con hasta dos decimales. Ejemplo: 1000000.00');
  if (valido) montoPresupuesto.value = '$ ' + formatoPesos.format(numero);
  return valido;
}
function actualizarPresupuesto(enfocar = false) {
  const personalizado = rangoPresupuesto.value === 'Monto personalizado';
  grupoMonto.hidden = !personalizado;
  montoPresupuesto.disabled = !personalizado;
  montoPresupuesto.required = personalizado;
  montoPresupuesto.setCustomValidity('');
  if (personalizado && enfocar) montoPresupuesto.focus();
}
rangoPresupuesto.addEventListener('change', () => actualizarPresupuesto(true));
montoPresupuesto.addEventListener('input', () => montoPresupuesto.setCustomValidity(''));
montoPresupuesto.addEventListener('blur', formatearPresupuesto);
formulario.addEventListener('reset', () => setTimeout(() => actualizarPresupuesto(), 0));
actualizarPresupuesto();


window.PROYECTOS.forEach(casa => {
  const opcion = document.createElement('option');
  opcion.value = casa.name; opcion.textContent = casa.name; referenciaCasa.append(opcion);
});
function mostrarPaso(numero, enfocar = true) {
  pasoActual = numero;
  pasos.forEach((paso, i) => { paso.hidden = i !== numero; });
  etiquetasPaso.forEach((etiqueta, i) => {
    etiqueta.classList.toggle('actual', i === numero);
    etiqueta.classList.toggle('completo', i < numero);
    if (i === numero) etiqueta.setAttribute('aria-current', 'step');
    else etiqueta.removeAttribute('aria-current');
  });
  anteriorPaso.hidden = numero === 0;
  siguientePaso.hidden = numero === 2;
  enviarConsulta.hidden = numero !== 2;
  document.querySelector('#paso-contador').textContent = `Paso ${numero + 1} de 3`;
  estadoFormulario.textContent = '';
  if (numero === 2) {
    const resumen = document.querySelector('#resumen-consulta');
    resumen.replaceChildren();
    const titulo = document.createElement('strong'); titulo.textContent = 'Tu consulta';
    const texto = document.createElement('p');
    texto.textContent = `${formulario.elements.Proyecto.value} · ${formulario.elements.Ubicacion.value}${referenciaCasa.value ? ' · Inspiración: ' + referenciaCasa.value : ''} · Inversión: ${rangoPresupuesto.value === 'Monto personalizado' ? montoPresupuesto.value : rangoPresupuesto.value} MXN`;
    resumen.append(titulo, texto);
  }
  if (enfocar) pasos[numero].querySelector('input,select,textarea').focus({ preventScroll:true });
}
function validarPaso(numero) {
  if (numero === 1) formatearPresupuesto();
  for (const campo of pasos[numero].querySelectorAll('input,select,textarea')) {
    if (campo.required && campo.type !== 'checkbox') campo.value = campo.value.trim();
    if (!campo.checkValidity()) {
      mostrarPaso(numero, false); campo.reportValidity(); return false;
    }
  }
  return true;
}
siguientePaso.addEventListener('click', () => { if (validarPaso(pasoActual)) mostrarPaso(pasoActual + 1); });
anteriorPaso.addEventListener('click', () => mostrarPaso(pasoActual - 1));
document.addEventListener('doce:consultar-casa', () => {
  document.querySelector('#consulta-enviada').hidden = true;
  formulario.hidden = false; document.querySelector('.pasos-formulario').hidden = false;
  mostrarPaso(0, false);
});
formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (enviandoConsulta) return;
  if (pasoActual < 2) { if (validarPaso(pasoActual)) mostrarPaso(pasoActual + 1); return; }
  for (let i = 0; i < pasos.length; i++) if (!validarPaso(i)) return;
  // Evita afirmar que se envió cuando todavía falta activar el destino.
  const identificador = window.DOCE_FORMULARIO?.identificador || '';
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(identificador)) {
    estadoFormulario.textContent = 'El envío aún no está habilitado. Conservamos lo que escribiste en esta página; por ahora puedes contactarnos por Instagram.';
    estadoFormulario.dataset.tipo = 'error'; return;
  }
  if (formulario.elements._honey.value) return;
  const datos = Object.fromEntries(new FormData(formulario));
  datos._subject = 'DOCE | Nueva consulta de proyecto residencial';
  datos._template = 'table';
  datos._url = location.href.split('#')[0];
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 20000);
  enviandoConsulta = true; enviarConsulta.disabled = true; anteriorPaso.disabled = true;
  enviarConsulta.textContent = 'Enviando…'; estadoFormulario.textContent = ''; estadoFormulario.dataset.tipo = '';
  formulario.setAttribute('aria-busy', 'true');
  try {
    const respuesta = await fetch(`https://formsubmit.co/ajax/${identificador}`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' },
      body:JSON.stringify(datos), signal:controlador.signal,
    });
    const resultado = await respuesta.json();
    const activacionPendiente = /activate|activation|confirm your email|not activated/i.test(resultado.message || '');
    if (!respuesta.ok || ![true, 'true'].includes(resultado.success) || activacionPendiente) throw new Error('Envío no confirmado');
    formulario.hidden = true;
    document.querySelector('.pasos-formulario').hidden = true;
    document.querySelector('#paso-contador').textContent = 'Solicitud enviada';
    const confirmacion = document.querySelector('#consulta-enviada');
    confirmacion.hidden = false; confirmacion.focus({ preventScroll:true });
    formulario.reset();
  } catch (error) {
    estadoFormulario.dataset.tipo = 'error';
    estadoFormulario.textContent = error.name === 'AbortError'
      ? 'No pudimos confirmar el envío a tiempo. Tus datos siguen aquí. Espera un momento antes de intentarlo otra vez para evitar duplicados.'
      : 'No se pudo confirmar el envío. Tus datos siguen aquí; inténtalo de nuevo o contáctanos por Instagram.';
  } finally {
    clearTimeout(limite); enviandoConsulta = false; enviarConsulta.disabled = false; anteriorPaso.disabled = false;
    enviarConsulta.textContent = 'Enviar mi solicitud ↗'; formulario.setAttribute('aria-busy', 'false');
  }
});
document.querySelector('#nueva-consulta').addEventListener('click', () => {
  document.querySelector('#consulta-enviada').hidden = true;
  formulario.hidden = false; document.querySelector('.pasos-formulario').hidden = false;
  mostrarPaso(0);
});
