// ══════════════════════════════════════════════
// CRONOVIC — Panel de Administración
// Solo accesible por usuarios con rol "dev"
// ══════════════════════════════════════════════

const $ = (id) => document.getElementById(id);

function sanitizar(texto) {
  if (!texto) return "";
  return texto.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function valor(id)        { const el=$(id); return el ? el.value.trim() : ""; }
function setValor(id, val){ const el=$(id); if(el) el.value = val||""; }
function abrirModal(id)   { $(id).classList.remove("hidden"); }
function cerrarModal(id)  { $(id).classList.add("hidden"); }

// ── CONFIRM MODAL ────────────────────────────
let _confirmCallback = null;

function mostrarConfirm(titulo, texto, onConfirmar) {
  $("adminConfirmTitle").textContent = titulo;
  $("adminConfirmText").textContent  = texto;
  $("adminConfirmBtn").textContent   = "Confirmar";
  $("adminCancelBtn").classList.remove("hidden");
  _confirmCallback = onConfirmar;
  $("adminConfirmModal").classList.remove("hidden");
}

function mostrarNota(titulo, texto) {
  $("adminConfirmTitle").textContent = titulo;
  $("adminConfirmText").textContent  = texto;
  $("adminConfirmBtn").textContent   = "Aceptar";
  $("adminCancelBtn").classList.add("hidden");
  _confirmCallback = null;
  $("adminConfirmModal").classList.remove("hidden");
}

$("adminConfirmBtn").addEventListener("click", () => {
  $("adminConfirmModal").classList.add("hidden");
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
});
$("adminCancelBtn").addEventListener("click", () => {
  $("adminConfirmModal").classList.add("hidden");
  _confirmCallback = null;
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => cerrarModal(btn.dataset.close));
});

// ── LISTA DE USUARIOS ────────────────────────
let usuarioEditando = null;
let sesionActual    = null;

async function pintarUsuarios() {
  const contenedor = $("listaUsuarios");
  contenedor.innerHTML = `<div class="abm-empty">Cargando...</div>`;

  try {
    const lista = await Usuarios.listar();
    contenedor.innerHTML = "";

    if (!lista.length) {
      contenedor.innerHTML = `<div class="abm-empty">No hay usuarios cargados.</div>`;
      return;
    }

    lista.forEach((u) => {
      const item = document.createElement("div");
      item.className = "abm-item";

      const badgeRol    = u.rol === "dev"
        ? `<span class="badge badge-dev">Dev</span>`
        : `<span class="badge badge-chofer">Chofer</span>`;

      const badgeEstado = u.activo == 0
        ? `<span class="badge badge-inactivo">Inactivo</span>`
        : "";

      const esSesionActual = sesionActual && u.id == sesionActual.id;

      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${sanitizar(u.nombre)} ${badgeRol} ${badgeEstado} ${esSesionActual ? "<span class='badge' style='background:#e0f2fe;color:#0369a1'>Vos</span>" : ""}</strong>
          <span>Usuario: ${sanitizar(u.username)} · Creado: ${sanitizar(u.creado_en?.split("T")[0] || u.creado_en || "-")}</span>
        </div>
        <div class="abm-item-actions"></div>
      `;

      const acc = item.querySelector(".abm-item-actions");

      // Botón editar
      const bE = document.createElement("button");
      bE.className = "edit-btn"; bE.textContent = "Modificar";
      bE.addEventListener("click", () => editarUsuario(u));
      acc.appendChild(bE);

      // Botón activar/desactivar (no para uno mismo)
      if (!esSesionActual) {
        const bT = document.createElement("button");
        bT.className = u.activo ? "delete-btn" : "edit-btn";
        bT.textContent = u.activo ? "Desactivar" : "Activar";
        bT.addEventListener("click", () => toggleActivo(u));
        acc.appendChild(bT);
      }

      // Botón eliminar (no para uno mismo)
      if (!esSesionActual) {
        const bD = document.createElement("button");
        bD.className = "delete-btn"; bD.textContent = "Eliminar";
        bD.addEventListener("click", () => eliminarUsuario(u));
        acc.appendChild(bD);
      }

      contenedor.appendChild(item);
    });
  } catch (err) {
    contenedor.innerHTML = `<div class="abm-empty">Error: ${sanitizar(err.message)}</div>`;
  }
}

// ── NUEVO / EDITAR USUARIO ───────────────────
function limpiarModalUsuario() {
  setValor("uNombre", ""); setValor("uUsername", "");
  setValor("uPassword", ""); setValor("uRol", "chofer");
  usuarioEditando = null;
  $("tituloModalUsuario").textContent = "Nuevo usuario";
  $("guardarUsuario").textContent     = "Guardar";
  $("uUsername").disabled             = false;
  $("fieldPasswordHint").style.display = "none";
  $("labelPassword").textContent      = "Contraseña";
}

function editarUsuario(u) {
  setValor("uNombre",   u.nombre);
  setValor("uUsername", u.username);
  setValor("uPassword", "");
  setValor("uRol",      u.rol);
  usuarioEditando = u.id;
  $("tituloModalUsuario").textContent  = "Modificar usuario";
  $("guardarUsuario").textContent      = "Guardar cambios";
  $("uUsername").disabled              = true; // No se puede cambiar el username
  $("fieldPasswordHint").style.display = "block";
  $("labelPassword").textContent       = "Nueva contraseña (opcional)";
  abrirModal("modalUsuario");
}

function toggleActivo(u) {
  const accion = u.activo ? "desactivar" : "activar";
  mostrarConfirm(
    `${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario`,
    `¿Querés ${accion} a "${u.nombre}"?`,
    async () => {
      try {
        await Usuarios.editar(u.id, { activo: u.activo ? 0 : 1 });
        pintarUsuarios();
      } catch (err) { mostrarNota("Error", err.message); }
    }
  );
}

function eliminarUsuario(u) {
  mostrarConfirm(
    "Eliminar usuario",
    `¿Seguro que querés eliminar a "${u.nombre}"? Se eliminarán todos sus datos.`,
    async () => {
      try {
        await Usuarios.eliminar(u.id);
        pintarUsuarios();
      } catch (err) { mostrarNota("Error", err.message); }
    }
  );
}

$("btnNuevoUsuario").addEventListener("click", () => {
  limpiarModalUsuario();
  abrirModal("modalUsuario");
});

$("guardarUsuario").addEventListener("click", async () => {
  const nombre   = valor("uNombre");
  const username = valor("uUsername");
  const password = valor("uPassword");
  const rol      = valor("uRol");

  if (!nombre) { mostrarNota("Error", "El nombre es obligatorio."); return; }
  if (!usuarioEditando && !username) { mostrarNota("Error", "El usuario es obligatorio."); return; }
  if (!usuarioEditando && !password) { mostrarNota("Error", "La contraseña es obligatoria para un usuario nuevo."); return; }
  if (password && password.length < 6) { mostrarNota("Error", "La contraseña debe tener al menos 6 caracteres."); return; }

  const data = { nombre, rol };
  if (!usuarioEditando) data.username = username;
  if (password) data.password = password;

  try {
    if (usuarioEditando) {
      await Usuarios.editar(usuarioEditando, data);
    } else {
      await Usuarios.crear(data);
    }
    cerrarModal("modalUsuario");
    limpiarModalUsuario();
    pintarUsuarios();
  } catch (err) { mostrarNota("Error", err.message); }
});

// ── INIT — verificar que sea dev ─────────────
Auth.sesion()
  .then((sesion) => {
    sesionActual = sesion;
    if (sesion.rol !== "dev") {
      window.location.href = "index.html";
      return;
    }
    pintarUsuarios();
  })
  .catch(() => {
    window.location.href = "index.html";
  });
