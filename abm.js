const $ = (id) => document.getElementById(id);

function sanitizar(texto) {
  if (!texto) return "";
  return texto.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function valor(id)       { const el=$(id); return el ? el.value.trim() : ""; }
function setValor(id,val){ const el=$(id); if(el) el.value = val||""; }
function abrirModal(id)  { $(id).classList.remove("hidden"); }
function cerrarModal(id) { $(id).classList.add("hidden"); }

// ── TABS ────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

document.querySelectorAll("[data-close]").forEach(btn=>{
  btn.addEventListener("click",()=>cerrarModal(btn.dataset.close));
});
document.querySelectorAll(".abm-modal").forEach(modal=>{
  modal.addEventListener("click",(e)=>{ if(e.target===modal) cerrarModal(modal.id); });
});

// ── MODALES DE FEEDBACK ─────────────────────
let _confirmCallback = null;

function mostrarConfirm(titulo, texto, onConfirmar) {
  $("abmConfirmTitle").textContent = titulo;
  $("abmConfirmText").textContent  = texto;
  $("abmConfirmBtn").textContent   = "Eliminar";
  $("abmCancelBtn").classList.remove("hidden");
  _confirmCallback = onConfirmar;
  $("abmConfirmModal").classList.remove("hidden");
}
function mostrarNota(titulo, texto) {
  $("abmConfirmTitle").textContent = titulo;
  $("abmConfirmText").textContent  = texto;
  $("abmConfirmBtn").textContent   = "Aceptar";
  $("abmCancelBtn").classList.add("hidden");
  _confirmCallback = null;
  $("abmConfirmModal").classList.remove("hidden");
}
$("abmConfirmBtn").addEventListener("click",()=>{
  $("abmConfirmModal").classList.add("hidden");
  if(_confirmCallback){ _confirmCallback(); _confirmCallback=null; }
});
$("abmCancelBtn").addEventListener("click",()=>{
  $("abmConfirmModal").classList.add("hidden");
  _confirmCallback=null;
});

function setLoading(id){ $(id).innerHTML=`<div class="abm-empty">Cargando...</div>`; }

// ══════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════
let clienteEditando = null;

async function pintarClientes() {
  setLoading("listaClientes");
  try {
    const lista = await Clientes.listar();
    const c = $("listaClientes");
    c.innerHTML = "";
    if (!lista.length) { c.innerHTML=`<div class="abm-empty">Todavía no hay clientes cargados.</div>`; return; }
    lista.forEach(cl => {
      const item = document.createElement("div");
      item.className = "abm-item";
      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${sanitizar(cl.nombre)}</strong>
          <span>${sanitizar(cl.telefono)||"Sin teléfono"} · ${sanitizar(cl.direccion)||"Sin dirección"}</span>
        </div><div class="abm-item-actions"></div>`;
      const acc = item.querySelector(".abm-item-actions");
      const bE = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Modificar";
      bE.addEventListener("click",()=>editarCliente(cl));
      const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Eliminar";
      bD.addEventListener("click",()=>eliminarCliente(cl));
      acc.appendChild(bE); acc.appendChild(bD); c.appendChild(item);
    });
  } catch(err){ $("listaClientes").innerHTML=`<div class="abm-empty">Error: ${sanitizar(err.message)}</div>`; }
}

function limpiarModalCliente(){
  setValor("cNombre",""); setValor("cTelefono",""); setValor("cDireccion","");
  clienteEditando=null; $("tituloModalCliente").textContent="Nuevo cliente"; $("guardarCliente").textContent="Guardar";
}
function editarCliente(cl){
  setValor("cNombre",cl.nombre); setValor("cTelefono",cl.telefono); setValor("cDireccion",cl.direccion);
  clienteEditando=cl.id; $("tituloModalCliente").textContent="Modificar cliente"; $("guardarCliente").textContent="Guardar cambios";
  abrirModal("modalCliente");
}
function eliminarCliente(cl){
  mostrarConfirm("Eliminar cliente",`¿Eliminar a "${cl.nombre}"?`, async()=>{
    try{ await Clientes.eliminar(cl.id); pintarClientes(); }catch(err){ mostrarNota("Error",err.message); }
  });
}
$("btnNuevoCliente").addEventListener("click",()=>{ limpiarModalCliente(); abrirModal("modalCliente"); });
$("guardarCliente").addEventListener("click", async()=>{
  const nombre=valor("cNombre");
  if(!nombre){ mostrarNota("Error","El nombre es obligatorio."); return; }
  const data={ nombre, telefono:valor("cTelefono"), direccion:valor("cDireccion") };
  try{
    clienteEditando ? await Clientes.editar(clienteEditando,data) : await Clientes.crear(data);
    cerrarModal("modalCliente"); limpiarModalCliente(); pintarClientes();
  }catch(err){ mostrarNota("Error",err.message); }
});

// ══════════════════════════════════════════
// CHOFERES
// ══════════════════════════════════════════
let choferEditando = null;

async function pintarChoferes() {
  setLoading("listaChoferes");
  try {
    const lista = await Choferes.listar();
    const c = $("listaChoferes");
    c.innerHTML = "";
    if (!lista.length) { c.innerHTML=`<div class="abm-empty">Todavía no hay choferes cargados.</div>`; return; }
    lista.forEach(ch => {
      const item = document.createElement("div");
      item.className = "abm-item";
      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${sanitizar(ch.nombre)}</strong>
          <span>${sanitizar(ch.telefono)||"Sin teléfono"} · Licencia: ${sanitizar(ch.licencia)||"Sin licencia"}</span>
        </div><div class="abm-item-actions"></div>`;
      const acc = item.querySelector(".abm-item-actions");
      const bE = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Modificar";
      bE.addEventListener("click",()=>editarChofer(ch));
      const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Eliminar";
      bD.addEventListener("click",()=>eliminarChofer(ch));
      acc.appendChild(bE); acc.appendChild(bD); c.appendChild(item);
    });
  } catch(err){ $("listaChoferes").innerHTML=`<div class="abm-empty">Error: ${sanitizar(err.message)}</div>`; }
}

function limpiarModalChofer(){
  setValor("chNombre",""); setValor("chTelefono",""); setValor("chLicencia","");
  choferEditando=null; $("tituloModalChofer").textContent="Nuevo chofer"; $("guardarChofer").textContent="Guardar";
}
function editarChofer(ch){
  setValor("chNombre",ch.nombre); setValor("chTelefono",ch.telefono); setValor("chLicencia",ch.licencia);
  choferEditando=ch.id; $("tituloModalChofer").textContent="Modificar chofer"; $("guardarChofer").textContent="Guardar cambios";
  abrirModal("modalChofer");
}
function eliminarChofer(ch){
  mostrarConfirm("Eliminar chofer",`¿Eliminar a "${ch.nombre}"?`, async()=>{
    try{ await Choferes.eliminar(ch.id); pintarChoferes(); }catch(err){ mostrarNota("Error",err.message); }
  });
}
$("btnNuevoChofer").addEventListener("click",()=>{ limpiarModalChofer(); abrirModal("modalChofer"); });
$("guardarChofer").addEventListener("click", async()=>{
  const nombre=valor("chNombre");
  if(!nombre){ mostrarNota("Error","El nombre es obligatorio."); return; }
  const data={ nombre, telefono:valor("chTelefono"), licencia:valor("chLicencia") };
  try{
    choferEditando ? await Choferes.editar(choferEditando,data) : await Choferes.crear(data);
    cerrarModal("modalChofer"); limpiarModalChofer(); pintarChoferes();
  }catch(err){ mostrarNota("Error",err.message); }
});

// ══════════════════════════════════════════
// VEHÍCULOS
// ══════════════════════════════════════════
let vehiculoEditando = null;

async function pintarVehiculos() {
  setLoading("listaVehiculos");
  try {
    const lista = await Vehiculos.listar();
    const c = $("listaVehiculos");
    c.innerHTML = "";
    if (!lista.length) { c.innerHTML=`<div class="abm-empty">Todavía no hay vehículos cargados.</div>`; return; }
    lista.forEach(v => {
      const item = document.createElement("div");
      item.className = "abm-item";
      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${sanitizar(v.marca)} ${sanitizar(v.modelo)}</strong>
          <span>Patente: ${sanitizar(v.patente)||"-"} · Año: ${sanitizar(v.anio)||"-"}</span>
        </div><div class="abm-item-actions"></div>`;
      const acc = item.querySelector(".abm-item-actions");
      const bE = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Modificar";
      bE.addEventListener("click",()=>editarVehiculo(v));
      const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Eliminar";
      bD.addEventListener("click",()=>eliminarVehiculo(v));
      acc.appendChild(bE); acc.appendChild(bD); c.appendChild(item);
    });
  } catch(err){ $("listaVehiculos").innerHTML=`<div class="abm-empty">Error: ${sanitizar(err.message)}</div>`; }
}

function limpiarModalVehiculo(){
  setValor("vMarca",""); setValor("vModelo",""); setValor("vPatente",""); setValor("vAnio","");
  vehiculoEditando=null; $("tituloModalVehiculo").textContent="Nuevo vehículo"; $("guardarVehiculo").textContent="Guardar";
}
function editarVehiculo(v){
  setValor("vMarca",v.marca); setValor("vModelo",v.modelo); setValor("vPatente",v.patente); setValor("vAnio",v.anio);
  vehiculoEditando=v.id; $("tituloModalVehiculo").textContent="Modificar vehículo"; $("guardarVehiculo").textContent="Guardar cambios";
  abrirModal("modalVehiculo");
}
function eliminarVehiculo(v){
  mostrarConfirm("Eliminar vehículo",`¿Eliminar "${v.marca} ${v.modelo}"?`, async()=>{
    try{ await Vehiculos.eliminar(v.id); pintarVehiculos(); }catch(err){ mostrarNota("Error",err.message); }
  });
}
$("btnNuevoVehiculo").addEventListener("click",()=>{ limpiarModalVehiculo(); abrirModal("modalVehiculo"); });
$("guardarVehiculo").addEventListener("click", async()=>{
  const marca=valor("vMarca"), modelo=valor("vModelo");
  if(!marca||!modelo){ mostrarNota("Error","Marca y modelo son obligatorios."); return; }
  const data={ marca, modelo, patente:valor("vPatente"), anio:valor("vAnio") };
  try{
    vehiculoEditando ? await Vehiculos.editar(vehiculoEditando,data) : await Vehiculos.crear(data);
    cerrarModal("modalVehiculo"); limpiarModalVehiculo(); pintarVehiculos();
  }catch(err){ mostrarNota("Error",err.message); }
});

// ── INIT — verificar sesión ──────────────────
Auth.sesion()
  .then(()=>{ pintarClientes(); pintarChoferes(); pintarVehiculos(); })
  .catch(()=>{ window.location.href="index.html"; });

// Activar tab según hash al cargar
(function() {
  const hash = window.location.hash.replace("#", "");
  const tabs = ["clientes", "choferes", "vehiculos"];
  if (hash && tabs.includes(hash)) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelector(`[data-tab="${hash}"]`)?.classList.add("active");
    document.getElementById(`tab-${hash}`)?.classList.add("active");
  }
})();
