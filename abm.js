// ── STORAGE KEYS ──
const KEY_CLIENTES  = "cronovic-clientes";
const KEY_CHOFERES  = "cronovic-choferes";
const KEY_VEHICULOS = "cronovic-vehiculos";

const $ = (id) => document.getElementById(id);

// ── UTILIDADES ──
function cargarDB(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function guardarDB(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function sanitizar(texto) {
  if (!texto) return "";
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valor(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setValor(id, val) {
  const el = $(id);
  if (el) el.value = val || "";
}

function abrirModal(id) { $(id).classList.remove("hidden"); }
function cerrarModal(id) { $(id).classList.add("hidden"); }

// ── TABS ──
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── CERRAR MODALES ──
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => cerrarModal(btn.dataset.close));
});

document.querySelectorAll(".abm-modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal(modal.id);
  });
});

// ── CONFIRM MODAL ──
let _confirmCallback = null;

function mostrarConfirm(titulo, texto, onConfirmar) {
  $("abmConfirmTitle").textContent = titulo;
  $("abmConfirmText").textContent  = texto;
  _confirmCallback = onConfirmar;
  $("abmConfirmModal").classList.remove("hidden");
}

$("abmConfirmBtn").addEventListener("click", () => {
  $("abmConfirmModal").classList.add("hidden");
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
});

$("abmCancelBtn").addEventListener("click", () => {
  $("abmConfirmModal").classList.add("hidden");
  _confirmCallback = null;
});

// ── MODAL NOTIFICACIÓN ──
function mostrarNota(titulo, texto) {
  // Reutiliza el modal de confirmación como simple aviso
  $("abmConfirmTitle").textContent = titulo;
  $("abmConfirmText").textContent  = texto;
  _confirmCallback = null;
  $("abmConfirmBtn").textContent = "Aceptar";
  $("abmCancelBtn").classList.add("hidden");
  $("abmConfirmModal").classList.remove("hidden");
  $("abmConfirmBtn").textContent = "Aceptar";
}

// Restaurar texto del botón al cerrar
$("abmConfirmBtn").addEventListener("click", () => {
  $("abmCancelBtn").classList.remove("hidden");
  $("abmConfirmBtn").textContent = "Eliminar";
}, { capture: false });


// ══════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════
let clientes = cargarDB(KEY_CLIENTES);
let clienteEditando = null;

function pintarClientes() {
  const contenedor = $("listaClientes");
  contenedor.innerHTML = "";

  if (clientes.length === 0) {
    contenedor.innerHTML = `<div class="abm-empty">Todavía no hay clientes cargados.</div>`;
    return;
  }

  clientes.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "abm-item";

    item.innerHTML = `
      <div class="abm-item-info">
        <strong>${sanitizar(c.nombre)}</strong>
        <span>${sanitizar(c.telefono) || "Sin teléfono"} · ${sanitizar(c.direccion) || "Sin dirección"}</span>
      </div>
      <div class="abm-item-actions"></div>
    `;

    const acciones = item.querySelector(".abm-item-actions");

    const btnEditar = document.createElement("button");
    btnEditar.className = "edit-btn";
    btnEditar.textContent = "Modificar";
    btnEditar.addEventListener("click", () => editarCliente(i));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "delete-btn";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminarCliente(i));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);
    contenedor.appendChild(item);
  });
}

function limpiarModalCliente() {
  setValor("cNombre", "");
  setValor("cTelefono", "");
  setValor("cDireccion", "");
  clienteEditando = null;
  $("tituloModalCliente").textContent = "Nuevo cliente";
  $("guardarCliente").textContent = "Guardar";
}

function editarCliente(i) {
  const c = clientes[i];
  setValor("cNombre", c.nombre);
  setValor("cTelefono", c.telefono);
  setValor("cDireccion", c.direccion);
  clienteEditando = i;
  $("tituloModalCliente").textContent = "Modificar cliente";
  $("guardarCliente").textContent = "Guardar cambios";
  abrirModal("modalCliente");
}

function eliminarCliente(i) {
  mostrarConfirm(
    "Eliminar cliente",
    `¿Seguro que querés eliminar a "${clientes[i].nombre}"?`,
    () => {
      clientes.splice(i, 1);
      guardarDB(KEY_CLIENTES, clientes);
      pintarClientes();
    }
  );
}

$("btnNuevoCliente").addEventListener("click", () => {
  limpiarModalCliente();
  abrirModal("modalCliente");
});

$("guardarCliente").addEventListener("click", () => {
  const nombre = valor("cNombre");
  if (!nombre) { alert("El nombre es obligatorio."); return; }

  const nuevo = {
    nombre,
    telefono:  valor("cTelefono"),
    direccion: valor("cDireccion"),
  };

  if (clienteEditando !== null) {
    clientes[clienteEditando] = nuevo;
  } else {
    clientes.push(nuevo);
  }

  guardarDB(KEY_CLIENTES, clientes);
  cerrarModal("modalCliente");
  limpiarModalCliente();
  pintarClientes();
});


// ══════════════════════════════════════════
// CHOFERES
// ══════════════════════════════════════════
let choferes = cargarDB(KEY_CHOFERES);
let choferEditando = null;

function pintarChoferes() {
  const contenedor = $("listaChoferes");
  contenedor.innerHTML = "";

  if (choferes.length === 0) {
    contenedor.innerHTML = `<div class="abm-empty">Todavía no hay choferes cargados.</div>`;
    return;
  }

  choferes.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "abm-item";

    item.innerHTML = `
      <div class="abm-item-info">
        <strong>${sanitizar(c.nombre)}</strong>
        <span>${sanitizar(c.telefono) || "Sin teléfono"} · Licencia: ${sanitizar(c.licencia) || "Sin licencia"}</span>
      </div>
      <div class="abm-item-actions"></div>
    `;

    const acciones = item.querySelector(".abm-item-actions");

    const btnEditar = document.createElement("button");
    btnEditar.className = "edit-btn";
    btnEditar.textContent = "Modificar";
    btnEditar.addEventListener("click", () => editarChofer(i));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "delete-btn";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminarChofer(i));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);
    contenedor.appendChild(item);
  });
}

function limpiarModalChofer() {
  setValor("chNombre", "");
  setValor("chTelefono", "");
  setValor("chLicencia", "");
  choferEditando = null;
  $("tituloModalChofer").textContent = "Nuevo chofer";
  $("guardarChofer").textContent = "Guardar";
}

function editarChofer(i) {
  const c = choferes[i];
  setValor("chNombre", c.nombre);
  setValor("chTelefono", c.telefono);
  setValor("chLicencia", c.licencia);
  choferEditando = i;
  $("tituloModalChofer").textContent = "Modificar chofer";
  $("guardarChofer").textContent = "Guardar cambios";
  abrirModal("modalChofer");
}

function eliminarChofer(i) {
  mostrarConfirm(
    "Eliminar chofer",
    `¿Seguro que querés eliminar a "${choferes[i].nombre}"?`,
    () => {
      choferes.splice(i, 1);
      guardarDB(KEY_CHOFERES, choferes);
      pintarChoferes();
    }
  );
}

$("btnNuevoChofer").addEventListener("click", () => {
  limpiarModalChofer();
  abrirModal("modalChofer");
});

$("guardarChofer").addEventListener("click", () => {
  const nombre = valor("chNombre");
  if (!nombre) { alert("El nombre es obligatorio."); return; }

  const nuevo = {
    nombre,
    telefono: valor("chTelefono"),
    licencia: valor("chLicencia"),
  };

  if (choferEditando !== null) {
    choferes[choferEditando] = nuevo;
  } else {
    choferes.push(nuevo);
  }

  guardarDB(KEY_CHOFERES, choferes);
  cerrarModal("modalChofer");
  limpiarModalChofer();
  pintarChoferes();
});


// ══════════════════════════════════════════
// VEHÍCULOS
// ══════════════════════════════════════════
let vehiculos = cargarDB(KEY_VEHICULOS);
let vehiculoEditando = null;

function pintarVehiculos() {
  const contenedor = $("listaVehiculos");
  contenedor.innerHTML = "";

  if (vehiculos.length === 0) {
    contenedor.innerHTML = `<div class="abm-empty">Todavía no hay vehículos cargados.</div>`;
    return;
  }

  vehiculos.forEach((v, i) => {
    const item = document.createElement("div");
    item.className = "abm-item";

    item.innerHTML = `
      <div class="abm-item-info">
        <strong>${sanitizar(v.marca)} ${sanitizar(v.modelo)}</strong>
        <span>Patente: ${sanitizar(v.patente) || "-"} · Año: ${sanitizar(v.anio) || "-"}</span>
      </div>
      <div class="abm-item-actions"></div>
    `;

    const acciones = item.querySelector(".abm-item-actions");

    const btnEditar = document.createElement("button");
    btnEditar.className = "edit-btn";
    btnEditar.textContent = "Modificar";
    btnEditar.addEventListener("click", () => editarVehiculo(i));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "delete-btn";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminarVehiculo(i));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);
    contenedor.appendChild(item);
  });
}

function limpiarModalVehiculo() {
  setValor("vMarca", "");
  setValor("vModelo", "");
  setValor("vPatente", "");
  setValor("vAnio", "");
  vehiculoEditando = null;
  $("tituloModalVehiculo").textContent = "Nuevo vehículo";
  $("guardarVehiculo").textContent = "Guardar";
}

function editarVehiculo(i) {
  const v = vehiculos[i];
  setValor("vMarca",   v.marca);
  setValor("vModelo",  v.modelo);
  setValor("vPatente", v.patente);
  setValor("vAnio",    v.anio);
  vehiculoEditando = i;
  $("tituloModalVehiculo").textContent = "Modificar vehículo";
  $("guardarVehiculo").textContent = "Guardar cambios";
  abrirModal("modalVehiculo");
}

function eliminarVehiculo(i) {
  mostrarConfirm(
    "Eliminar vehículo",
    `¿Seguro que querés eliminar "${vehiculos[i].marca} ${vehiculos[i].modelo}"?`,
    () => {
      vehiculos.splice(i, 1);
      guardarDB(KEY_VEHICULOS, vehiculos);
      pintarVehiculos();
    }
  );
}

$("btnNuevoVehiculo").addEventListener("click", () => {
  limpiarModalVehiculo();
  abrirModal("modalVehiculo");
});

$("guardarVehiculo").addEventListener("click", () => {
  const marca  = valor("vMarca");
  const modelo = valor("vModelo");
  if (!marca || !modelo) { alert("Marca y modelo son obligatorios."); return; }

  const nuevo = {
    marca,
    modelo,
    patente: valor("vPatente"),
    anio:    valor("vAnio"),
  };

  if (vehiculoEditando !== null) {
    vehiculos[vehiculoEditando] = nuevo;
  } else {
    vehiculos.push(nuevo);
  }

  guardarDB(KEY_VEHICULOS, vehiculos);
  cerrarModal("modalVehiculo");
  limpiarModalVehiculo();
  pintarVehiculos();
});

// ── INIT ──
pintarClientes();
pintarChoferes();
pintarVehiculos();
