// ══════════════════════════════════════════════
// CRONOVIC — API Client
// Centraliza todos los fetch al backend PHP
// ══════════════════════════════════════════════

const API_BASE = "api";

// ── Fetch base ───────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  const json = await res.json();

  if (!json.ok) {
    const err = new Error(json.mensaje || "Error desconocido");
    err.status = res.status;
    throw err;
  }

  return json.data;
}

function apiGet(endpoint)         { return apiFetch(endpoint, { method: "GET" }); }
function apiPost(endpoint, body)  { return apiFetch(endpoint, { method: "POST",   body: JSON.stringify(body) }); }
function apiPut(endpoint, body)   { return apiFetch(endpoint, { method: "PUT",    body: JSON.stringify(body) }); }
function apiDelete(endpoint)      { return apiFetch(endpoint, { method: "DELETE" }); }

// ── AUTH ─────────────────────────────────────
const Auth = {
  login:   (username, password) => apiPost("auth.php?accion=login",  { username, password }),
  logout:  ()                   => apiPost("auth.php?accion=logout", {}),
  sesion:  ()                   => fetch(`${API_BASE}/auth.php?accion=sesion`, { credentials: "same-origin" })
    .then(res => res.json())
    .then(json => {
      if (!json.ok) throw Object.assign(new Error(json.mensaje), { status: 401 });
      return json.data;
    }),
};

// ── USUARIOS (solo dev) ──────────────────────
const Usuarios = {
  listar:   ()           => apiGet("usuarios.php"),
  crear:    (data)       => apiPost("usuarios.php", data),
  editar:   (id, data)   => apiPut(`usuarios.php?id=${id}`, data),
  eliminar: (id)         => apiDelete(`usuarios.php?id=${id}`),
};

// ── CLIENTES ─────────────────────────────────
const Clientes = {
  listar:   ()         => apiGet("clientes.php"),
  crear:    (data)     => apiPost("clientes.php", data),
  editar:   (id, data) => apiPut(`clientes.php?id=${id}`, data),
  eliminar: (id)       => apiDelete(`clientes.php?id=${id}`),
};

// ── CHOFERES ─────────────────────────────────
const Choferes = {
  listar:   ()         => apiGet("choferes.php"),
  crear:    (data)     => apiPost("choferes.php", data),
  editar:   (id, data) => apiPut(`choferes.php?id=${id}`, data),
  eliminar: (id)       => apiDelete(`choferes.php?id=${id}`),
};

// ── VEHÍCULOS ────────────────────────────────
const Vehiculos = {
  listar:   ()         => apiGet("vehiculos.php"),
  crear:    (data)     => apiPost("vehiculos.php", data),
  editar:   (id, data) => apiPut(`vehiculos.php?id=${id}`, data),
  eliminar: (id)       => apiDelete(`vehiculos.php?id=${id}`),
};

// ── CRONOGRAMAS ──────────────────────────────
const Cronogramas = {
  listar:      ()         => apiGet("cronogramas.php"),
  obtener:     (id)       => apiGet(`cronogramas.php?id=${id}`),
  guardar:     (datos)    => apiPost("cronogramas.php", { datos }),
  actualizar:  (id, datos)=> apiPut(`cronogramas.php?id=${id}`, { datos }),
  eliminar:    (id)       => apiDelete(`cronogramas.php?id=${id}`),
};
