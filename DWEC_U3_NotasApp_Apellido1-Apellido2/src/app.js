// DWEC U3 — Plantilla mínima NotasApp

/** @typedef {{ id:string, texto:string, fecha:string, prioridad:number, completada?:boolean }} Nota */


const estado = {
  notas: /** @type {Nota[]} */ ([]),
  filtro: obtenerFiltroDesdeHash()
};
//RF9-PERSISTENCIA DE DATOS:
function guardarEstado(){
try {
  //creamos objeto:
    const datos = {
      notas: estado.notas,
      filtro: estado.filtro
    };
    localStorage.setItem("tablon_estado", JSON.stringify(datos));
  } catch (err) {
    console.error("Error al guardar:", err);
  }
}

function cargarEstado() {
  try {
    const raw = localStorage.getItem("tablon_estado");
    if (!raw) return;
    const datos = JSON.parse(raw);
    if (Array.isArray(datos.notas)) estado.notas = datos.notas;
    if (typeof datos.filtro === "string") estado.filtro = datos.filtro;
  } catch (err) {
    console.warn("Datos corruptos en localStorage. Se reinicia el estado.", err);
    localStorage.removeItem("tablon_estado");
  }
}



document.addEventListener("DOMContentLoaded", () => {
  //
  cargarEstado();
  document.querySelectorAll("nav [data-hash]").forEach(btn => {
    btn.addEventListener("click", () => { location.hash = btn.getAttribute("data-hash"); });
  });
  document.getElementById("formNota").addEventListener("submit", onSubmitNota);
  document.getElementById("btnPanelDiario").addEventListener("click", abrirPanelDiario);
  document.getElementById("btnPantallaCompleta").addEventListener("click", togglePantallaCompleta);
  render();
});

window.addEventListener("hashchange", () => {
  estado.filtro = obtenerFiltroDesdeHash();
  render();
});

function crearNota(texto, fecha, prioridad) {
  const t = String(texto).trim();
  const p = Math.max(1, Math.min(3, Number(prioridad) || 1));
  const f = new Date(fecha);
  if (!t || Number.isNaN(f.getTime())) throw new Error("Datos de nota inválidos");
  return { id: "n" + Math.random().toString(36).slice(2), texto: t, fecha: f.toISOString().slice(0,10), prioridad: p };
}

function obtenerFiltroDesdeHash() {
  const h = (location.hash || "#todas").toLowerCase();
  return ["#hoy","#semana","#todas"].includes(h) ? h : "#todas";
}

function filtrarNotas(notas) {
  const hoy = new Date(); const ymd = hoy.toISOString().slice(0,10);
  if (estado.filtro === "#hoy") return notas.filter(n => n.fecha === ymd);
  if (estado.filtro === "#semana") {
    const fin = new Date(hoy); fin.setDate(hoy.getDate() + 7);
    return notas.filter(n => new Date(n.fecha) >= hoy && new Date(n.fecha) <= fin);
  }
  return notas;
}

function ordenarNotas(notas) {
  return [...notas].sort((a,b) =>
    b.prioridad - a.prioridad ||
    new Date(a.fecha) - new Date(b.fecha) ||
    a.texto.localeCompare(b.texto)
  );
}

function render() {
  const cont = document.getElementById("listaNotas");
  cont.innerHTML = "";
  const visibles = ordenarNotas(filtrarNotas(estado.notas));
  for (const n of visibles) {
    const card = document.createElement("article");
    card.className = "nota";
    card.innerHTML = `
      <header>
        <strong>[P${n.prioridad}] ${escapeHtml(n.texto)}</strong>
        <time datetime="${n.fecha}">${formatearFecha(n.fecha)}</time>
      </header>
      <footer>
        <button data-acc="completar" data-id="${n.id}">Completar</button>
        <button data-acc="borrar" data-id="${n.id}">Borrar</button>
      </footer>
    `;
    cont.appendChild(card);
  }
  cont.querySelectorAll("button[data-acc]").forEach(btn => btn.addEventListener("click", onAccionNota));
}

function formatearFecha(ymd) {
  const d = new Date(ymd);
  return new Intl.DateTimeFormat(navigator.language || "es-ES", { dateStyle: "medium" }).format(d);
}

function onSubmitNota(e) {
  e.preventDefault();
  const texto = document.getElementById("txtTexto").value;
  const fecha = document.getElementById("txtFecha").value;
  const prioridad = document.getElementById("selPrioridad").value;
  try {
    const nota = crearNota(texto, fecha, prioridad);
    estado.notas.push(nota);
    guardarEstado();
    e.target.reset();
    alert("Nota creada");
    render();
  } catch (err) { alert(err.message); }
}
//
function onAccionNota(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const acc = btn.getAttribute("data-acc");
  const idx = estado.notas.findIndex(n => n.id === id);
  if (idx < 0) return;
  if (acc === "borrar" && confirm("¿Borrar la nota?")) estado.notas.splice(idx, 1)
    //
  guardarEstado();
  if (acc === "completar") estado.notas[idx].completada = true
  //
  guardarEstado();
  render();
}
//RF7
//Intenta abrir una ventana nueva. Si el navegador bloquea el popup, avisa al usuario.
function abrirPanelDiario() {
    //Abrir el panel desde la app principal
  const ref = window.open("panel.html", "PanelDiario", "width=420,height=560");
  if (!ref) { alert("Pop-up bloqueado. Permita ventanas emergentes."); return; }
    //Enviar los datos al panel con snapshot con notas filtradas
  const snapshot = { tipo: "SNAPSHOT", notas: filtrarNotas(estado.notas) };
  setTimeout(() => { try { ref.postMessage(snapshot, "*"); } catch {} }, 400);
}

window.addEventListener("message", (ev) => {
   //Validar origen
   if (ev.origin !== location.origin) return; // ignora mensajes de otros sitios
  if (!ev.data || typeof ev.data !== "object") return;
//Validación de tipo mensaje 
  const mensaje = ev.data;
  //Si no es un mensaje o un objeto 
  if(!mensaje || typeof mensaje !== "object") return;
  if (mensaje.tipo === "SNAPSHOT"){
    
  
  if(ev.data.tipo === "SNAPSHOT" && Array.isArray(ev.data.notas)) {
    renderNotas(ev.data.notas);
  }


  
  if (ev.data.tipo === "BORRADO") {
    const id = ev.data.id;
    estado.notas = estado.notas.filter(n => n.id !== id)
    //
    guardarEstado();
    render();
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

// === Control de pantalla completa (RF6) ===
function togglePantallaCompleta() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    console.log("Pantalla completa desactivada");
  } else {
    document.documentElement.requestFullscreen();
    console.log("Pantalla completa activada");
  }
}
