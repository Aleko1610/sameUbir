// ══════════════════════════════════════════════
// CRONOVIC — Dashboard SPA completo
// ══════════════════════════════════════════════

const $  = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

let sesion = null;
let _confirmCb = null;

// ── CATÁLOGO DE VEHÍCULOS ─────────────────────
const VEHICULOS_CATALOGO = {
  "Chevrolet":  ["Agile","Aveo","Captiva","Cavalier","Classic","Corsa","Cruze","Equinox","Montana","Onix","Onix Plus","S10","Spin","Tracker","Trailblazer","Trax"],
  "Citroën":    ["Berlingo","C3","C4","C4 Cactus","C5","C-Elysée","Jumpy","Nemo","Picasso","Spacetourer","Xsara"],
  "Fiat":       ["Argo","Bravo","Cronos","Doblò","Ducato","Fiorino","Grand Siena","Mobi","Palio","Punto","Siena","Strada","Toro","Uno"],
  "Ford":       ["Connect","EcoSport","Edge","Escape","Explorer","F-150","Fiesta","Focus","Fusion","Ka","Ka+","Kuga","Mondeo","Mustang","Ranger","Territory"],
  "Honda":      ["Accord","City","Civic","CR-V","Fit","HR-V","Jazz","WR-V"],
  "Hyundai":    ["Accent","Creta","Elantra","Getz","HB20","i10","i20","i30","ix35","Santa Fe","Sonata","Tucson","Venue"],
  "Jeep":       ["Compass","Grand Cherokee","Renegade","Wrangler"],
  "Kia":        ["Carnival","Cerato","Picanto","Rio","Seltos","Sorento","Sportage","Stinger"],
  "Mercedes-Benz": ["Clase A","Clase B","Clase C","Clase E","GLA","GLB","GLC","GLE","Sprinter","Vito"],
  "Mitsubishi": ["ASX","Eclipse Cross","L200","Outlander","Pajero"],
  "Nissan":     ["Frontier","Kicks","Leaf","March","Murano","Note","Pathfinder","Qashqai","Sentra","Tiida","Versa","X-Trail"],
  "Peugeot":    ["108","2008","208","3008","301","308","408","5008","508","Boxer","Expert","Partner","Rifter"],
  "Renault":    ["Captur","Clio","Duster","Express","Fluence","Kangoo","Koleos","Kwid","Logan","Megane","Oroch","Sandero","Stepway","Symbol"],
  "Subaru":     ["Forester","Impreza","Legacy","Outback","XV"],
  "Suzuki":     ["Alto","Baleno","Jimny","S-Cross","Swift","Vitara"],
  "Toyota":     ["Corolla","Corolla Cross","Etios","Fortuner","Hiace","Hilux","Land Cruiser","Prius","RAV4","SW4","Yaris"],
  "Volkswagen": ["Amarok","Fox","Gol","Golf","Jetta","Nivus","Passat","Polo","Saveiro","T-Cross","Taos","Tiguan","Touareg","Vento","Virtus","Voyage"],
  "Volvo":      ["S60","S90","V40","V60","V90","XC40","XC60","XC90"],
  "Otra marca": [],
};

const MARCAS_LISTA = Object.keys(VEHICULOS_CATALOGO);

// ── VALIDACIÓN DE CONFLICTOS DE HORARIO ───────
const MIN_INTERVALO = 15; // minutos

function horaAMin(h) {
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

function detectarConflictos(periodos, dias) {
  // Recopila todos los viajes con fecha y horario
  const viajes = [];

  periodos.forEach(p => {
    if (!p.desde || !p.hasta) return;
    let cur = new Date(`${p.desde}T12:00:00`);
    const fin = new Date(`${p.hasta}T12:00:00`);
    while (cur <= fin) {
      const fecha = cur.toISOString().split("T")[0];
      if (p.horarioIda)    viajes.push({ fecha, min: horaAMin(p.horarioIda),    tipo: "ida"    });
      if (p.horarioVuelta) viajes.push({ fecha, min: horaAMin(p.horarioVuelta), tipo: "vuelta" });
      cur.setDate(cur.getDate() + 1);
    }
  });

  dias.forEach(d => {
    if (d.ida?.horario)    viajes.push({ fecha: d.fecha, min: horaAMin(d.ida.horario),    tipo: "ida"    });
    if (d.vuelta?.horario) viajes.push({ fecha: d.fecha, min: horaAMin(d.vuelta.horario), tipo: "vuelta" });
  });

  // Agrupar por fecha y detectar conflictos
  const conflictos = [];
  const porFecha = {};
  viajes.forEach(v => {
    if (v.min === null) return;
    if (!porFecha[v.fecha]) porFecha[v.fecha] = [];
    porFecha[v.fecha].push(v);
  });

  Object.entries(porFecha).forEach(([fecha, lista]) => {
    lista.sort((a, b) => a.min - b.min);
    for (let i = 1; i < lista.length; i++) {
      const diff = lista[i].min - lista[i-1].min;
      if (diff < MIN_INTERVALO) {
        conflictos.push({
          fecha,
          v1: lista[i-1],
          v2: lista[i],
          diff
        });
      }
    }
  });

  return conflictos;
}

function textoConflicto(c) {
  const h1 = `${String(Math.floor(c.v1.min/60)).padStart(2,"0")}:${String(c.v1.min%60).padStart(2,"0")}`;
  const h2 = `${String(Math.floor(c.v2.min/60)).padStart(2,"0")}:${String(c.v2.min%60).padStart(2,"0")}`;
  return `${c.fecha}: ${c.v1.tipo} ${h1} y ${c.v2.tipo} ${h2} (${c.diff} min de diferencia)`;
}

function san(t) {
  return (t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function toast(msg, tipo = "ok") {
  const el = $("dashToast");
  el.textContent = msg;
  el.className = `dash-toast ${tipo} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3000);
}

function confirm(titulo, texto, onOk) {
  $("confirmTitle").textContent = titulo;
  $("confirmText").textContent  = texto;
  _confirmCb = onOk;
  $("confirmModal").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const okBtn = $("confirmOk");
  const cancelBtn = $("confirmCancel");
  if (okBtn) okBtn.addEventListener("click", () => {
    $("confirmModal").classList.add("hidden");
    if (_confirmCb) { _confirmCb(); _confirmCb = null; }
  });
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    $("confirmModal").classList.add("hidden");
    _confirmCb = null;
  });
});

// ── SIDEBAR TOGGLE ────────────────────────────
let sidebar = null;
let collapsed = localStorage.getItem("cv-sidebar-collapsed") === "1";

function aplicarCollapsed() {
  if (!sidebar) return;
  sidebar.classList.toggle("collapsed", collapsed);
  localStorage.setItem("cv-sidebar-collapsed", collapsed ? "1" : "0");
}

function cerrarSidebarMobile() {
  if (!sidebar) return;
  sidebar.classList.remove("mobile-open");
  const ov = $("sbOverlay");
  if (ov) ov.classList.remove("visible");
}

function initSidebar() {
  sidebar = $("sidebar");
  if (!sidebar) return;

  aplicarCollapsed();

  const sbCollapse = $("sbCollapse");
  const sbExpand   = $("sbExpand");
  const menuBtn    = $("menuBtn");
  const sbOverlay  = $("sbOverlay");

  if (sbCollapse) {
    sbCollapse.addEventListener("click", () => {
      if (window.innerWidth <= 768) { cerrarSidebarMobile(); return; }
      collapsed = true;
      aplicarCollapsed();
    });
  }

  if (sbExpand) {
    sbExpand.addEventListener("click", () => {
      collapsed = false;
      aplicarCollapsed();
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.add("mobile-open");
      if (sbOverlay) sbOverlay.classList.add("visible");
    });
  }

  if (sbOverlay) {
    sbOverlay.addEventListener("click", () => {
      cerrarSidebarMobile();
    });
  }

  // Listeners de navegación
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => navegar(btn.dataset.sec));
  });
}

// ── NAVEGACIÓN ────────────────────────────────
const TITULOS = {
  home:          "Inicio",
  "viajes-hoy":  "Viajes de hoy",
  cronogramas:   "Cronogramas",
  clientes:      "Clientes",
  choferes:      "Choferes",
  vehiculos:     "Vehículos",
  usuarios:      "Usuarios",
  reportes:      "Reportes",
  perfil:        "Mi perfil",
  configuracion: "Configuración",
};

function navegar(sec) {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.sec === sec));
  $("topbarTitle").textContent = TITULOS[sec] || sec;
  cerrarSidebarMobile();

  const renders = {
    home:          renderHome,
    "viajes-hoy":  renderViajesHoy,
    cronogramas:   renderCronogramas,
    clientes:      () => renderEntidad("clientes"),
    choferes:      () => renderEntidad("choferes"),
    vehiculos:     () => renderEntidad("vehiculos"),
    usuarios:      renderUsuarios,
    reportes:      renderReportes,
    perfil:        renderPerfil,
    configuracion: renderConfig,
  };

  const fn = renders[sec];
  if (fn) fn();
}

// Los listeners de nav-item se registran en initSidebar()

// ══════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════
async function renderHome() {
  const el = $("mainContent");
  el.innerHTML = `
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card" data-nav="cronogramas">
        <div class="stat-icon blue">📋</div>
        <div class="stat-info"><label>Cronogramas</label><strong id="stCron">—</strong></div>
      </div>
      <div class="stat-card" data-nav="clientes">
        <div class="stat-icon green">👥</div>
        <div class="stat-info"><label>Clientes</label><strong id="stCli">—</strong></div>
      </div>
      <div class="stat-card" data-nav="choferes">
        <div class="stat-icon blue">🚗</div>
        <div class="stat-info"><label>Choferes</label><strong id="stCho">—</strong></div>
      </div>
      <div class="stat-card" data-nav="vehiculos">
        <div class="stat-icon orange">🚘</div>
        <div class="stat-info"><label>Vehículos</label><strong id="stVeh">—</strong></div>
      </div>
    </div>
    <div class="dash-card">
      <p style="color:var(--dash-muted);font-size:14px;">Bienvenido/a, <strong>${san(sesion?.nombre)}</strong>. Usá el menú lateral para navegar.</p>
    </div>
  `;

  $$("[data-nav]").forEach(c => c.addEventListener("click", () => navegar(c.dataset.nav)));

  try {
    const [cron, cli, cho, veh] = await Promise.all([
      Cronogramas.listar(), Clientes.listar(), Choferes.listar(), Vehiculos.listar()
    ]);
    $("stCron").textContent = cron.length;
    $("stCli").textContent  = cli.length;
    $("stCho").textContent  = cho.length;
    $("stVeh").textContent  = veh.length;
  } catch {}
}

// ══════════════════════════════════════════════
// VIAJES DE HOY
// ══════════════════════════════════════════════
async function renderViajesHoy() {
  const el = $("mainContent");
  const hoy = new Date().toISOString().split("T")[0];
  const diaLabel = new Date(`${hoy}T12:00:00`).toLocaleDateString("es-AR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start" id="viajesLayout">
      <div>
        <div class="dash-card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px">📅</span>
            <div>
              <h2 style="margin:0;font-size:17px;text-transform:capitalize" id="viajesTitulo">${diaLabel}</h2>
              <p style="color:var(--dash-muted);font-size:13px;margin-top:2px">Cronogramas activos para este día</p>
            </div>
          </div>
        </div>
        <div id="viajesContainer"><div class="abm-empty">Buscando viajes...</div></div>
      </div>

      <!-- Calendario -->
      <div class="dash-card">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:var(--dash-muted);text-transform:uppercase;letter-spacing:.5px">Seleccionar fecha</div>
        <div id="calViajesContainer"><div class="abm-empty" style="padding:16px;font-size:13px">Cargando...</div></div>
      </div>
    </div>
  `;

  // Cargar calendario y viajes
  await cargarCalendarioViajes(hoy);
  await cargarViajesDelDia(hoy);
}

async function cargarCalendarioViajes(fechaSeleccionada) {
  const c = $("calViajesContainer");
  if (!c) return;

  try {
    const lista = await Cronogramas.listar();
    const detalles = lista.length ? await Promise.all(lista.map(cr => Cronogramas.obtener(cr.id))) : [];

    const fechasConCrono = {};
    detalles.forEach(cr => {
      const d = cr.datos;
      if (!d) return;
      const estado  = d.estado || "pendiente";
      const cliente = d.cliente || "Sin cliente";

      const agregar = (fecha) => {
        if (!fecha) return;
        if (!fechasConCrono[fecha]) fechasConCrono[fecha] = [];
        if (!fechasConCrono[fecha].find(x => x.id === cr.id))
          fechasConCrono[fecha].push({ id:cr.id, cliente, estado });
      };

      if (d.modo === "periodo" && Array.isArray(d.periodos)) {
        d.periodos.forEach(p => {
          if (!p.desde || !p.hasta) return;
          let cur = new Date(`${p.desde}T12:00:00`);
          const fin = new Date(`${p.hasta}T12:00:00`);
          while (cur <= fin) { agregar(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate()+1); }
        });
      }
      if (d.modo === "dia" && Array.isArray(d.dias)) {
        d.dias.forEach(dia => agregar(dia.fecha));
      }
    });

    const hoy   = new Date();
    const selDate = new Date(`${fechaSeleccionada}T12:00:00`);
    const year  = c._calYear  !== undefined ? c._calYear  : selDate.getFullYear();
    const month = c._calMonth !== undefined ? c._calMonth : selDate.getMonth();
    c._calYear = year; c._calMonth = month;

    const nombreMes = new Date(year, month, 1).toLocaleDateString("es-AR", { month:"long", year:"numeric" });
    const primerDia = new Date(year, month, 1).getDay();
    const diasMes   = new Date(year, month + 1, 0).getDate();
    const offset    = (primerDia + 6) % 7;
    const keyHoy    = hoy.toISOString().split("T")[0];

    let celdas = "";
    for (let i = 0; i < offset; i++) celdas += `<div></div>`;
    for (let d = 1; d <= diasMes; d++) {
      const key   = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const items = fechasConCrono[key] || [];
      const tiene = items.length > 0;
      const esSel = key === fechaSeleccionada;
      const esHoy = key === keyHoy;

      const hayPendiente  = items.some(e => e.estado === "pendiente");
      const hayCompletado = items.some(e => e.estado === "completado");
      const dotColor = hayPendiente ? "#d97706" : hayCompletado ? "#059669" : tiene ? "#dc2626" : "";

      celdas += `
        <div class="cal-day${esHoy?" cal-hoy":""}${tiene?" cal-con-viaje":""}${esSel?" cal-selected":""}"
             data-fecha="${key}" style="cursor:${tiene||true?"pointer":"default"}">
          <span>${d}</span>
          ${dotColor ? `<span class="cal-dot" style="background:${dotColor}"></span>` : ""}
        </div>`;
    }

    c.innerHTML = `
      <div class="cal-nav">
        <button class="cal-nav-btn" id="calVPrev">◀</button>
        <span style="font-size:12px;font-weight:700;text-transform:capitalize">${nombreMes}</span>
        <button class="cal-nav-btn" id="calVNext">▶</button>
      </div>
      <div class="cal-grid">
        <div class="cal-label">Lu</div><div class="cal-label">Ma</div>
        <div class="cal-label">Mi</div><div class="cal-label">Ju</div>
        <div class="cal-label">Vi</div><div class="cal-label">Sa</div>
        <div class="cal-label">Do</div>
        ${celdas}
      </div>
    `;

    $("calVPrev").addEventListener("click", () => {
      c._calMonth = month === 0 ? 11 : month - 1;
      c._calYear  = month === 0 ? year - 1 : year;
      cargarCalendarioViajes(fechaSeleccionada);
    });
    $("calVNext").addEventListener("click", () => {
      c._calMonth = month === 11 ? 0 : month + 1;
      c._calYear  = month === 11 ? year + 1 : year;
      cargarCalendarioViajes(fechaSeleccionada);
    });

    c.querySelectorAll(".cal-day").forEach(dia => {
      dia.addEventListener("click", async () => {
        const fecha = dia.dataset.fecha;
        c.querySelectorAll(".cal-day").forEach(d => d.classList.remove("cal-selected"));
        dia.classList.add("cal-selected");
        // Actualizar título
        const titulo = $("viajesTitulo");
        if (titulo) titulo.textContent = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
        await cargarViajesDelDia(fecha);
      });
    });

  } catch(err) {
    if ($("calViajesContainer")) $("calViajesContainer").innerHTML = `<div class="abm-empty">Error al cargar calendario.</div>`;
  }
}

async function cargarViajesDelDia(fecha) {
  const container = $("viajesContainer");
  if (!container) return;
  container.innerHTML = `<div class="abm-empty">Buscando viajes...</div>`;

  try {
    const lista = await Cronogramas.listar();
    if (!lista.length) { container.innerHTML = `<div class="abm-empty">No tenés cronogramas guardados.</div>`; return; }

    const detalles = await Promise.all(lista.map(c => Cronogramas.obtener(c.id)));
    const viajesHoy = [];

    detalles.forEach(crono => {
      const datos = crono.datos;
      if (!datos) return;
      const cliente  = datos.cliente  || "Sin cliente";
      const chofer   = datos.chofer   || "Sin chofer";
      const vehiculo = datos.vehiculo || "Sin vehículo";

      if (datos.modo === "periodo" && Array.isArray(datos.periodos)) {
        datos.periodos.forEach(p => {
          if (!p.desde || !p.hasta || fecha < p.desde || fecha > p.hasta) return;
          if (p.horarioIda)    viajesHoy.push({ tipo:"ida",    horario:p.horarioIda,    salida:p.salidaIda,    llegada:p.llegadaIda,    pasajeros:p.pasajerosIda,    cliente, chofer, vehiculo });
          if (p.horarioVuelta) viajesHoy.push({ tipo:"vuelta", horario:p.horarioVuelta, salida:p.salidaVuelta, llegada:p.llegadaVuelta, pasajeros:p.pasajerosVuelta, cliente, chofer, vehiculo });
        });
      }
      if (datos.modo === "dia" && Array.isArray(datos.dias)) {
        datos.dias.forEach(d => {
          if (d.fecha !== fecha) return;
          if (d.ida)    viajesHoy.push({ tipo:"ida",    horario:d.ida.horario,    salida:d.ida.salida,    llegada:d.ida.llegada,    pasajeros:d.ida.pasajeros,    cliente, chofer, vehiculo });
          if (d.vuelta) viajesHoy.push({ tipo:"vuelta", horario:d.vuelta.horario, salida:d.vuelta.salida, llegada:d.vuelta.llegada, pasajeros:d.vuelta.pasajeros, cliente, chofer, vehiculo });
        });
      }
    });

    if (!viajesHoy.length) {
      container.innerHTML = `<div class="abm-empty">No hay viajes programados para este día.</div>`;
      return;
    }

    viajesHoy.sort((a, b) => {
      const m = h => { if (!h) return 9999; const [hh,mm]=h.split(":"); return +hh*60 + +mm; };
      return m(a.horario) - m(b.horario);
    });

    container.innerHTML = viajesHoy.map(v => `
      <div class="viaje-dia-card">
        <div class="viaje-dia-header ${v.tipo}">
          <span>${v.tipo==="ida"?"➡":"⬅"}</span>
          <span>VIAJE DE ${v.tipo.toUpperCase()}</span>
          <span style="margin-left:auto;font-size:18px;font-family:var(--mono)">${v.horario||"--:--"}</span>
        </div>
        <div class="viaje-dia-body">
          <div class="viaje-dato"><label>Cliente</label><strong>${san(v.cliente)}</strong></div>
          <div class="viaje-dato"><label>Salida</label><strong>${san(v.salida)||"—"}</strong></div>
          <div class="viaje-dato"><label>Llegada</label><strong>${san(v.llegada)||"—"}</strong></div>
          <div class="viaje-dato"><label>Pasajeros</label><strong>${san(String(v.pasajeros||"—"))}</strong></div>
          <div class="viaje-dato"><label>Chofer</label><strong>${san(v.chofer)}</strong></div>
          <div class="viaje-dato"><label>Vehículo</label><strong>${san(v.vehiculo)}</strong></div>
        </div>
      </div>
    `).join("");

  } catch(err) {
    if ($("viajesContainer")) $("viajesContainer").innerHTML = `<div class="abm-empty">Error: ${san(err.message)}</div>`;
  }
}

// ══════════════════════════════════════════════
// CRONOGRAMAS
// ══════════════════════════════════════════════
let cronoActualId = null;
let periodos = [];
let dias = [];

async function renderCronogramas() {
  const el = $("mainContent");
  el.innerHTML = `
    <div style="display:grid;gap:20px" id="cronoLayout">
      <div class="dash-card" id="cronoFormCard">
        <div class="dash-card-header">
          <h2>Nuevo cronograma</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="db-btn success" id="btnGuardarCrono">💾 Guardar</button>
            <button class="db-btn primary" id="btnVerPreview">👁 Vista previa</button>
            <button class="db-btn success" id="btnDescargar">⬇ Descargar</button>
            <button class="db-btn warning" id="btnLimpiarCrono">🗑 Limpiar</button>
          </div>
        </div>

        <div class="crono-selects" id="cronoSelects">
          <div class="dash-field">
            <label>Cliente</label>
            <select id="cCliente"><option value="">— Seleccioná —</option></select>
          </div>
          <div class="dash-field">
            <label>Chofer</label>
            <select id="cChofer"><option value="">— Seleccioná —</option></select>
          </div>
          <div class="dash-field">
            <label>Vehículo</label>
            <select id="cVehiculo"><option value="">— Seleccioná —</option></select>
          </div>
          <div class="dash-field">
            <label>Tipo</label>
            <select id="cModo">
              <option value="periodo">Por período</option>
              <option value="dia">Por día</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:16px">
          <button class="db-btn primary" id="btnAbrirPeriodo">+ Período</button>
          <button class="db-btn primary hidden" id="btnAbrirDia">+ Día</button>
        </div>

        <div id="listaPeriodosBox">
          <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--dash-muted);margin-bottom:10px">Períodos</h3>
          <div class="abm-list" id="listaPeriodos"></div>
        </div>
        <div id="listaDiasBox" style="display:none">
          <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--dash-muted);margin-bottom:10px">Días</h3>
          <div class="abm-list" id="listaDias"></div>
        </div>
      </div>
    </div>

    <!-- Cronograma oculto para html2canvas -->
    <div style="position:absolute;left:-9999px;top:0;pointer-events:none;opacity:0" aria-hidden="true">
      <div id="cronoCanvas" class="cronograma">
        <header class="preview-header">
          <h2>CRONOGRAMA DE VIAJES</h2>
          <div class="preview-header-meta">
            <span><strong>Cliente:</strong> <span id="previewCliente">Sin especificar</span></span>
            <span><strong>Chofer:</strong> <span id="previewChofer">Sin especificar</span></span>
          </div>
        </header>
        <section id="previewContenido" class="preview-content"></section>
        <footer class="preview-footer">
          <div class="preview-footer-resumen">
            <h3><img src="icons/icon-calendario.png" class="ico" alt=""> Resumen</h3>
            <ul id="previewResumen"></ul>
          </div>
          <div class="car-card">
            <img src="img/citroen-c3.png" alt="Vehículo">
            <span id="previewVehiculo">Citroën C3</span>
          </div>
        </footer>
        <div class="watermark">Diseñado por LOLOSTECH.com</div>
      </div>
    </div>

    <!-- Modal periodo -->
    <div class="dash-modal hidden" id="modalPeriodoDash">
      <div class="dash-modal-card">
        <div class="dash-modal-head">
          <h2 id="tituloPeriodoDash">Agregar período</h2>
          <button class="dash-modal-close" data-close="modalPeriodoDash">×</button>
        </div>
        <div class="dash-grid-2">
          <div class="dash-field"><label>Desde</label><input id="pDesde" type="date"></div>
          <div class="dash-field"><label>Hasta</label><input id="pHasta" type="date"></div>
        </div>
        <p style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--green)">▶ Viaje de ida</p>
        <div class="dash-grid-2">
          <div class="dash-field"><label>Horario</label><input id="pHorarioIda" type="time"></div>
          <div class="dash-field"><label>Pasajeros</label><input id="pPasajerosIda" type="number" min="0" value="2"></div>
        </div>
        <div class="dash-grid-2">
          <div class="dash-field"><label>Salida</label><input id="pSalidaIda" type="text" placeholder="Casa"></div>
          <div class="dash-field"><label>Llegada</label><input id="pLlegadaIda" type="text" placeholder="Destino"></div>
        </div>
        <p style="font-weight:700;font-size:13px;margin:10px 0;color:var(--blue)">◀ Viaje de vuelta</p>
        <div class="dash-grid-2">
          <div class="dash-field"><label>Horario</label><input id="pHorarioVuelta" type="time"></div>
          <div class="dash-field"><label>Pasajeros</label><input id="pPasajerosVuelta" type="number" min="0" value="3"></div>
        </div>
        <div class="dash-grid-2">
          <div class="dash-field"><label>Salida</label><input id="pSalidaVuelta" type="text" placeholder="Destino"></div>
          <div class="dash-field"><label>Llegada</label><input id="pLlegadaVuelta" type="text" placeholder="Casa"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="db-btn primary" id="guardarPeriodoDash">Guardar</button>
          <button class="db-btn muted" data-close="modalPeriodoDash">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal día -->
    <div class="dash-modal hidden" id="modalDiaDash">
      <div class="dash-modal-card">
        <div class="dash-modal-head">
          <h2 id="tituloDiaDash">Agregar día</h2>
          <button class="dash-modal-close" data-close="modalDiaDash">×</button>
        </div>
        <div class="dash-field"><label>Fecha</label><input id="dFecha" type="date"></div>
        <div class="dash-field">
          <label>Tipo de viaje</label>
          <select id="dTipo">
            <option value="ida y vuelta">Ida y vuelta</option>
            <option value="ida">Solo ida</option>
            <option value="vuelta">Solo vuelta</option>
          </select>
        </div>
        <div id="bloqueIdaDash">
          <p style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--green)">▶ Viaje de ida</p>
          <div class="dash-grid-2">
            <div class="dash-field"><label>Horario</label><input id="dHorarioIda" type="time"></div>
            <div class="dash-field"><label>Pasajeros</label><input id="dPasajerosIda" type="number" min="0" value="2"></div>
          </div>
          <div class="dash-grid-2">
            <div class="dash-field"><label>Salida</label><input id="dSalidaIda" type="text" placeholder="Casa"></div>
            <div class="dash-field"><label>Llegada</label><input id="dLlegadaIda" type="text" placeholder="Destino"></div>
          </div>
        </div>
        <div id="bloqueVueltaDash">
          <p style="font-weight:700;font-size:13px;margin:10px 0;color:var(--blue)">◀ Viaje de vuelta</p>
          <div class="dash-grid-2">
            <div class="dash-field"><label>Horario</label><input id="dHorarioVuelta" type="time"></div>
            <div class="dash-field"><label>Pasajeros</label><input id="dPasajerosVuelta" type="number" min="0" value="3"></div>
          </div>
          <div class="dash-grid-2">
            <div class="dash-field"><label>Salida</label><input id="dSalidaVuelta" type="text" placeholder="Destino"></div>
            <div class="dash-field"><label>Llegada</label><input id="dLlegadaVuelta" type="text" placeholder="Casa"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="db-btn primary" id="guardarDiaDash">Guardar</button>
          <button class="db-btn muted" data-close="modalDiaDash">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal preview -->
    <div class="preview-modal-overlay hidden" id="previewOverlay">
      <div class="preview-modal-wrap">
        <div class="preview-modal-topbar">
          <h2>Vista previa del cronograma</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="db-btn success" id="btnDescargarPreview">⬇ Descargar imagen</button>
            <button class="dash-modal-close" id="cerrarPreview">×</button>
          </div>
        </div>
        <div class="preview-modal-body" id="previewBody"></div>
      </div>
    </div>
  `;

  // Cargar selects
  await cargarSelectsCrono();
  actualizarModoCrono();
  pintarListasCrono();
  actualizarCanvasCrono();

  // Modo
  $("cModo").addEventListener("change", actualizarModoCrono);
  ["cCliente","cChofer","cVehiculo"].forEach(id => {
    $$(  `#${id}`)[0]?.addEventListener("change", actualizarCanvasCrono);
  });

  // Botones
  $("btnAbrirPeriodo").addEventListener("click", () => abrirModalPeriodoDash());
  $("btnAbrirDia").addEventListener("click",     () => abrirModalDiaDash());
  $("guardarPeriodoDash").addEventListener("click", guardarPeriodoDash);
  $("guardarDiaDash").addEventListener("click",     guardarDiaDash);
  $("btnVerPreview").addEventListener("click",   abrirPreviewDash);
  $("btnDescargar").addEventListener("click",    descargarCrono);
  $("btnDescargarPreview").addEventListener("click", () => { cerrarPreviewDash(); descargarCrono(); });
  $("cerrarPreview").addEventListener("click",   cerrarPreviewDash);
  $("btnLimpiarCrono").addEventListener("click", limpiarCrono);
  $("btnGuardarCrono").addEventListener("click", guardarCrono);
  $("dTipo").addEventListener("change", actualizarBloquesDiaDash);

  // Cerrar modales
  $$("[data-close]").forEach(b => b.addEventListener("click", () => {
    $( b.dataset.close)?.classList.add("hidden");
  }));
  $$(".dash-modal").forEach(m => m.addEventListener("click", e => {
    if (e.target === m) m.classList.add("hidden");
  }));
}

async function cargarSelectsCrono() {
  try {
    const [cli, cho, veh] = await Promise.all([
      Clientes.listar(), Choferes.listar(), Vehiculos.listar()
    ]);

    const selCli = $("cCliente"), selCho = $("cChofer"), selVeh = $("cVehiculo");
    cli.forEach(c => { const o=document.createElement("option"); o.value=c.nombre; o.textContent=c.nombre; selCli.appendChild(o); });
    cho.forEach(c => { const o=document.createElement("option"); o.value=c.nombre; o.textContent=c.nombre; selCho.appendChild(o); });
    veh.forEach(v => { const o=document.createElement("option"); o.value=`${v.marca} ${v.modelo}`; o.textContent=`${v.marca} ${v.modelo}${v.patente?` — ${v.patente}`:""}`;selVeh.appendChild(o); });
  } catch {}
}

function actualizarModoCrono() {
  const modo = $("cModo")?.value;
  if (!modo) return;
  $("btnAbrirPeriodo").classList.toggle("hidden", modo !== "periodo");
  $("btnAbrirDia").classList.toggle("hidden", modo !== "dia");
  $("listaPeriodosBox").style.display = modo === "periodo" ? "" : "none";
  $("listaDiasBox").style.display     = modo === "dia"    ? "" : "none";
  actualizarCanvasCrono();
}

function actualizarBloquesDiaDash() {
  const tipo = $("dTipo")?.value;
  if (!tipo) return;
  $("bloqueIdaDash").style.display    = tipo !== "vuelta" ? "" : "none";
  $("bloqueVueltaDash").style.display = tipo !== "ida"    ? "" : "none";
}

// ── Periodos ──
let periodoEditIdx = null;

function abrirModalPeriodoDash(idx = null) {
  periodoEditIdx = idx;
  if (idx !== null) {
    const p = periodos[idx];
    $("pDesde").value          = p.desde || "";
    $("pHasta").value          = p.hasta || "";
    $("pHorarioIda").value     = p.horarioIda || "";
    $("pPasajerosIda").value   = p.pasajerosIda || "";
    $("pSalidaIda").value      = p.salidaIda || "";
    $("pLlegadaIda").value     = p.llegadaIda || "";
    $("pHorarioVuelta").value  = p.horarioVuelta || "";
    $("pPasajerosVuelta").value= p.pasajerosVuelta || "";
    $("pSalidaVuelta").value   = p.salidaVuelta || "";
    $("pLlegadaVuelta").value  = p.llegadaVuelta || "";
    $("tituloPeriodoDash").textContent = "Modificar período";
  } else {
    ["pDesde","pHasta","pHorarioIda","pSalidaIda","pLlegadaIda","pHorarioVuelta","pSalidaVuelta","pLlegadaVuelta"]
      .forEach(id => { if($(id)) $(id).value = ""; });
    $("pPasajerosIda").value = 2;
    $("pPasajerosVuelta").value = 3;
    $("tituloPeriodoDash").textContent = "Agregar período";
  }
  $("modalPeriodoDash").classList.remove("hidden");
}

function guardarPeriodoDash() {
  const desde = $("pDesde").value;
  const hasta = $("pHasta").value;
  if (!desde || !hasta) { toast("Completá las fechas del período.", "err"); return; }
  if (desde > hasta) { toast("La fecha de inicio no puede ser posterior a la de fin.", "err"); return; }

  const p = {
    desde, hasta,
    horarioIda:    $("pHorarioIda").value,
    salidaIda:     $("pSalidaIda").value,
    llegadaIda:    $("pLlegadaIda").value,
    pasajerosIda:  $("pPasajerosIda").value,
    horarioVuelta: $("pHorarioVuelta").value,
    salidaVuelta:  $("pSalidaVuelta").value,
    llegadaVuelta: $("pLlegadaVuelta").value,
    pasajerosVuelta: $("pPasajerosVuelta").value,
  };

  if (periodoEditIdx !== null) { periodos[periodoEditIdx] = p; }
  else { periodos.push(p); }

  $("modalPeriodoDash").classList.add("hidden");
  pintarListasCrono();
  actualizarCanvasCrono();
}

// ── Días ──
let diaEditIdx = null;

function abrirModalDiaDash(idx = null) {
  diaEditIdx = idx;
  if (idx !== null) {
    const d = dias[idx];
    $("dFecha").value = d.fecha || "";
    $("dTipo").value  = d.tipo  || "ida y vuelta";
    $("dHorarioIda").value    = d.ida?.horario    || "";
    $("dSalidaIda").value     = d.ida?.salida     || "";
    $("dLlegadaIda").value    = d.ida?.llegada    || "";
    $("dPasajerosIda").value  = d.ida?.pasajeros  || "";
    $("dHorarioVuelta").value   = d.vuelta?.horario   || "";
    $("dSalidaVuelta").value    = d.vuelta?.salida    || "";
    $("dLlegadaVuelta").value   = d.vuelta?.llegada   || "";
    $("dPasajerosVuelta").value = d.vuelta?.pasajeros || "";
    $("tituloDiaDash").textContent = "Modificar día";
  } else {
    $("dFecha").value = "";
    $("dTipo").value  = "ida y vuelta";
    ["dHorarioIda","dSalidaIda","dLlegadaIda","dHorarioVuelta","dSalidaVuelta","dLlegadaVuelta"].forEach(id => $(id).value="");
    $("dPasajerosIda").value = 2; $("dPasajerosVuelta").value = 3;
    $("tituloDiaDash").textContent = "Agregar día";
  }
  actualizarBloquesDiaDash();
  $("modalDiaDash").classList.remove("hidden");
}

function guardarDiaDash() {
  const fecha = $("dFecha").value;
  const tipo  = $("dTipo").value;
  if (!fecha) { toast("Seleccioná una fecha.", "err"); return; }

  const d = { fecha, tipo };
  if (tipo !== "vuelta") d.ida    = { horario:$("dHorarioIda").value, salida:$("dSalidaIda").value, llegada:$("dLlegadaIda").value, pasajeros:$("dPasajerosIda").value };
  if (tipo !== "ida")    d.vuelta = { horario:$("dHorarioVuelta").value, salida:$("dSalidaVuelta").value, llegada:$("dLlegadaVuelta").value, pasajeros:$("dPasajerosVuelta").value };

  if (diaEditIdx !== null) { dias[diaEditIdx] = d; }
  else { dias.push(d); }

  $("modalDiaDash").classList.add("hidden");
  pintarListasCrono();
  actualizarCanvasCrono();
}

function pintarListasCrono() {
  const lp = $("listaPeriodos");
  const ld = $("listaDias");
  if (!lp || !ld) return;

  if (!periodos.length) {
    lp.innerHTML = `<div class="abm-empty" style="padding:16px;font-size:13px">Sin períodos cargados.</div>`;
  } else {
    lp.innerHTML = "";
    periodos.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "abm-item";
      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${san(p.desde)} → ${san(p.hasta)}</strong>
          <span>Ida: ${san(p.horarioIda)||"—"} · Vuelta: ${san(p.horarioVuelta)||"—"}</span>
        </div>
        <div class="abm-item-actions"></div>
      `;
      const acc = item.querySelector(".abm-item-actions");
      const bE = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Editar";
      bE.addEventListener("click", () => abrirModalPeriodoDash(i));
      const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Quitar";
      bD.addEventListener("click", () => { periodos.splice(i,1); pintarListasCrono(); actualizarCanvasCrono(); });
      acc.appendChild(bE); acc.appendChild(bD);
      lp.appendChild(item);
    });
  }

  if (!dias.length) {
    ld.innerHTML = `<div class="abm-empty" style="padding:16px;font-size:13px">Sin días cargados.</div>`;
  } else {
    ld.innerHTML = "";
    dias.forEach((d, i) => {
      const item = document.createElement("div");
      item.className = "abm-item";
      item.innerHTML = `
        <div class="abm-item-info">
          <strong>${san(d.fecha)}</strong>
          <span>${san(d.tipo)} · Ida: ${san(d.ida?.horario)||"—"} · Vuelta: ${san(d.vuelta?.horario)||"—"}</span>
        </div>
        <div class="abm-item-actions"></div>
      `;
      const acc = item.querySelector(".abm-item-actions");
      const bE = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Editar";
      bE.addEventListener("click", () => abrirModalDiaDash(i));
      const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Quitar";
      bD.addEventListener("click", () => { dias.splice(i,1); pintarListasCrono(); actualizarCanvasCrono(); });
      acc.appendChild(bE); acc.appendChild(bD);
      ld.appendChild(item);
    });
  }
}

// ── Canvas (para html2canvas) ──
function actualizarCanvasCrono() {
  const cliente  = $("cCliente")?.value  || "";
  const chofer   = $("cChofer")?.value   || "";
  const vehiculo = $("cVehiculo")?.value || "";
  const modo     = $("cModo")?.value     || "periodo";

  if ($("previewCliente")) $("previewCliente").textContent = cliente || "Sin especificar";
  if ($("previewChofer"))  $("previewChofer").textContent  = chofer  || "Sin especificar";
  if ($("previewVehiculo"))$("previewVehiculo").textContent= vehiculo || "Vehículo no especificado";

  if (modo === "periodo") pintarPreviewPeriodosDash();
  else                    pintarPreviewDiasDash();
}

// Reutiliza las funciones de renderizado del script.js original
function pintarPreviewPeriodosDash() {
  const contenedor = $("previewContenido");
  if (!contenedor) return;
  contenedor.innerHTML = "";
  if (!periodos.length) {
    contenedor.innerHTML = `<article class="periodo-card"><div class="card-title">${ICO.calendario}<h3>Sin períodos cargados</h3></div></article>`;
    pintarResumenDash(["No hay períodos cargados todavía."]);
    return;
  }
  periodos.forEach(p => {
    const card = document.createElement("article");
    card.className = "periodo-card";
    card.innerHTML = `
      <div class="card-title">${ICO.calendario}<h3>${san(p.desde)} al ${san(p.hasta)}</h3></div>
      ${crearTablaViajeDash("ida",    [{ horario:p.horarioIda,    salida:p.salidaIda,    llegada:p.llegadaIda,    pasajeros:p.pasajerosIda }])}
      ${crearTablaViajeDash("vuelta", [{ horario:p.horarioVuelta, salida:p.salidaVuelta, llegada:p.llegadaVuelta, pasajeros:p.pasajerosVuelta }])}
    `;
    contenedor.appendChild(card);
  });
  pintarResumenDash(periodos.map(p => `${p.desde} al ${p.hasta}: ida ${p.horarioIda||"—"} / vuelta ${p.horarioVuelta||"—"}.`));
}

function pintarPreviewDiasDash() {
  const contenedor = $("previewContenido");
  if (!contenedor) return;
  contenedor.innerHTML = "";
  if (!dias.length) {
    contenedor.innerHTML = `<article class="fecha-card"><div class="card-title">${ICO.calendario}<h3>Sin días cargados</h3></div></article>`;
    pintarResumenDash(["No hay días cargados todavía."]);
    return;
  }
  const idas = [], vueltas = [];
  [...dias].sort((a,b) => a.fecha > b.fecha ? 1 : -1).forEach(d => {
    if (d.ida)    idas.push({ ...d.ida,    fechaLabel:d.fecha });
    if (d.vuelta) vueltas.push({ ...d.vuelta, fechaLabel:d.fecha });
  });
  const card = document.createElement("article");
  card.className = "fecha-card";
  card.innerHTML = (idas.length    ? crearTablaViajeDash("ida",    idas)    : "")
                 + (vueltas.length ? crearTablaViajeDash("vuelta", vueltas) : "");
  contenedor.appendChild(card);
  pintarResumenDash(dias.map(d => `${d.fecha}: ${d.tipo}.`));
}

function pintarResumenDash(items) {
  const ul = $("previewResumen");
  if (!ul) return;
  ul.innerHTML = "";
  items.forEach(i => { const li = document.createElement("li"); li.textContent = i; ul.appendChild(li); });
}

function crearTablaViajeDash(tipo, filas) {
  const ico = ICO[tipo === "vuelta" ? "vuelta" : "ida"];
  const titulo = tipo === "vuelta" ? "VIAJE DE VUELTA" : "VIAJE DE IDA";
  const tieneFecha = filas.some(f => f.fechaLabel);
  const filasHTML = filas.map(f => `
    <tr>
      ${tieneFecha ? `<td class="col-fecha">${san(f.fechaLabel)}</td>` : ""}
      <td><strong>${san(f.horario)||"—"}</strong></td>
      <td class="td-icono">${ico.casa} ${san(f.salida)||"—"}</td>
      <td class="td-icono">${ico.pin} ${san(f.llegada)||"—"}</td>
      <td>${f.pasajeros ? f.pasajeros + " pas." : "—"}</td>
    </tr>
  `).join("");
  const colFecha = tieneFecha ? `<th class="col-fecha"></th>` : "";
  return `
    <div class="seccion-header ${tipo === "vuelta" ? "vuelta" : "ida"}">
      ${ico.flecha}
      <h4>${titulo}</h4>
    </div>
    <table class="viaje-tabla ${tipo === "vuelta" ? "vuelta" : "ida"}">
      <thead><tr>${colFecha}
        <th><span class="th-icono">${ico.reloj}</span>Horario</th>
        <th><span class="th-icono">${ico.casa}</span>Salida</th>
        <th><span class="th-icono">${ico.pin}</span>Llegada</th>
        <th><span class="th-icono">${ico.personas}</span>Pasajeros</th>
      </tr></thead>
      <tbody>${filasHTML}</tbody>
    </table>
  `;
}

// Objeto de iconos (mismo que en script.js)
const ICO = {
  ida: {
    reloj:    `<img src="icons/icon-reloj-verde.png"     class="ico" alt="">`,
    casa:     `<img src="icons/icon-casa-verde.png"      class="ico" alt="">`,
    pin:      `<img src="icons/icon-pin-verde.png"       class="ico" alt="">`,
    personas: `<img src="icons/icon-personas-verde.png"  class="ico" alt="">`,
    flecha:   `<img src="icons/icon-flecha-der-verde.png" class="ico-flecha" alt="">`,
  },
  vuelta: {
    reloj:    `<img src="icons/icon-reloj-azul.png"      class="ico" alt="">`,
    casa:     `<img src="icons/icon-casa-azul.png"       class="ico" alt="">`,
    pin:      `<img src="icons/icon-pin-azul.png"        class="ico" alt="">`,
    personas: `<img src="icons/icon-personas-azul.png"   class="ico" alt="">`,
    flecha:   `<img src="icons/icon-flecha-izq-azul.png" class="ico-flecha" alt="">`,
  },
  calendario: `<img src="icons/icon-calendario.png" class="ico" alt="">`,
};

function abrirPreviewDash() {
  actualizarCanvasCrono();
  const clone = $("cronoCanvas").cloneNode(true);
  $("previewBody").innerHTML = "";
  $("previewBody").appendChild(clone);
  $("previewOverlay").classList.remove("hidden");
}

function cerrarPreviewDash() {
  $("previewOverlay").classList.add("hidden");
}

function descargarCrono() {
  actualizarCanvasCrono();
  const cliente = $("cCliente")?.value || "cronograma";
  html2canvas($("cronoCanvas"), { scale:2, useCORS:true, backgroundColor:"#ffffff" }).then(canvas => {
    const link = document.createElement("a");
    link.download = `cronograma-${cliente.replace(/\s+/g,"-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function guardarCrono() {
  const datos = {
    cliente:  $("cCliente")?.value  || "",
    chofer:   $("cChofer")?.value   || "",
    vehiculo: $("cVehiculo")?.value || "",
    modo:     $("cModo")?.value     || "periodo",
    estado:   "pendiente",
    periodos, dias
  };

  // Validar conflictos de horario
  const conflictos = detectarConflictos(periodos, dias);
  if (conflictos.length > 0) {
    const lista = conflictos.slice(0, 3).map(c => `• ${textoConflicto(c)}`).join("\n");
    const extra = conflictos.length > 3 ? `\n• ...y ${conflictos.length - 3} más.` : "";
    confirm(
      "⚠ Conflicto de horarios",
      `Viajes con menos de ${MIN_INTERVALO} min de diferencia:\n\n${lista}${extra}\n\n¿Guardarlo de todos modos?`,
      () => _ejecutarGuardado(datos)
    );
    return;
  }

  await _ejecutarGuardado(datos);
}

async function _ejecutarGuardado(datos) {
  try {
    if (cronoActualId) {
      await Cronogramas.actualizar(cronoActualId, datos);
      toast("Cronograma actualizado ✓");
    } else {
      await Cronogramas.guardar(datos);
      toast("Cronograma guardado ✓");
    }
    periodos = []; dias = []; cronoActualId = null;
    if($("cCliente"))  $("cCliente").value  = "";
    if($("cChofer"))   $("cChofer").value   = "";
    if($("cVehiculo")) $("cVehiculo").value = "";
    if($("cModo"))     $("cModo").value     = "periodo";
    pintarListasCrono();
    actualizarCanvasCrono();
  } catch(err) { toast(err.message, "err"); }
}

function limpiarCrono() {
  confirm("Limpiar cronograma", "¿Descartás todos los datos del formulario?", () => {
    periodos = []; dias = []; cronoActualId = null;
    if($("cCliente"))  $("cCliente").value  = "";
    if($("cChofer"))   $("cChofer").value   = "";
    if($("cVehiculo")) $("cVehiculo").value = "";
    if($("cModo"))     $("cModo").value     = "periodo";
    pintarListasCrono();
    actualizarCanvasCrono();
  });
}

async function pintarCronogramasGuardados() {
  const c = $("listaCronogramas");
  if (!c) return;

  try {
    const lista = await Cronogramas.listar();

    if (!lista.length) {
      c.innerHTML = `<div class="abm-empty" style="padding:24px;font-size:13px">No hay cronogramas guardados todavía.</div>`;
      return;
    }

    // Para el calendario necesitamos los datos completos — los cargamos todos
    const detalles = await Promise.all(lista.map(cr => Cronogramas.obtener(cr.id)));

    // Construir mapa fecha → cronogramas
    const fechasConCrono = {};

    detalles.forEach(cr => {
      const d = cr.datos;
      if (!d) return;
      const estado  = d.estado || "pendiente";
      const cliente = d.cliente || "Sin cliente";

      const agregarFecha = (fecha) => {
        if (!fecha) return;
        if (!fechasConCrono[fecha]) fechasConCrono[fecha] = [];
        // Evitar duplicados del mismo cronograma en el mismo día
        if (!fechasConCrono[fecha].find(x => x.id === cr.id)) {
          fechasConCrono[fecha].push({ id: cr.id, cliente, estado });
        }
      };

      if (d.modo === "periodo" && Array.isArray(d.periodos)) {
        d.periodos.forEach(p => {
          if (!p.desde || !p.hasta) return;
          let cur = new Date(`${p.desde}T12:00:00`);
          const fin = new Date(`${p.hasta}T12:00:00`);
          while (cur <= fin) {
            agregarFecha(cur.toISOString().split("T")[0]);
            cur.setDate(cur.getDate() + 1);
          }
        });
      }

      if (d.modo === "dia" && Array.isArray(d.dias)) {
        d.dias.forEach(dia => agregarFecha(dia.fecha));
      }
    });

    // Renderizar calendario
    const hoy   = new Date();
    const year  = c._calYear  !== undefined ? c._calYear  : hoy.getFullYear();
    const month = c._calMonth !== undefined ? c._calMonth : hoy.getMonth();
    c._calYear  = year;
    c._calMonth = month;

    const nombreMes = new Date(year, month, 1).toLocaleDateString("es-AR", { month:"long", year:"numeric" });
    const primerDia = new Date(year, month, 1).getDay();
    const diasMes   = new Date(year, month + 1, 0).getDate();
    const offset    = (primerDia + 6) % 7; // Lunes = 0
    const keyHoy    = hoy.toISOString().split("T")[0];

    let celdas = "";
    for (let i = 0; i < offset; i++) celdas += `<div></div>`;

    for (let d = 1; d <= diasMes; d++) {
      const key  = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const esHoy = key === keyHoy;
      const items = fechasConCrono[key] || [];
      const tiene = items.length > 0;

      const hayPendiente  = items.some(e => e.estado === "pendiente");
      const hayCompletado = items.some(e => e.estado === "completado");
      const dotColor = hayPendiente ? "#d97706" : hayCompletado ? "#059669" : tiene ? "#dc2626" : "";

      celdas += `
        <div class="cal-day${esHoy?" cal-hoy":""}${tiene?" cal-con-viaje":""}"
             data-fecha="${key}">
          <span>${d}</span>
          ${dotColor ? `<span class="cal-dot" style="background:${dotColor}"></span>` : ""}
        </div>`;
    }

    c.innerHTML = `
      <div class="cal-nav">
        <button class="cal-nav-btn" id="calPrev">◀</button>
        <span style="font-size:13px;font-weight:700;text-transform:capitalize">${nombreMes}</span>
        <button class="cal-nav-btn" id="calNext">▶</button>
      </div>
      <div class="cal-grid">
        <div class="cal-label">Lu</div><div class="cal-label">Ma</div>
        <div class="cal-label">Mi</div><div class="cal-label">Ju</div>
        <div class="cal-label">Vi</div><div class="cal-label">Sa</div>
        <div class="cal-label">Do</div>
        ${celdas}
      </div>
      <div id="calDetalle" style="margin-top:14px"></div>
    `;

    // Navegación
    $("calPrev").addEventListener("click", () => {
      c._calMonth = month === 0 ? 11 : month - 1;
      c._calYear  = month === 0 ? year - 1 : year;
      pintarCronogramasGuardados();
    });
    $("calNext").addEventListener("click", () => {
      c._calMonth = month === 11 ? 0 : month + 1;
      c._calYear  = month === 11 ? year + 1 : year;
      pintarCronogramasGuardados();
    });

    // Click en día con viajes
    c.querySelectorAll(".cal-day.cal-con-viaje").forEach(dia => {
      dia.addEventListener("click", () => {
        c.querySelectorAll(".cal-day").forEach(d => d.classList.remove("cal-selected"));
        dia.classList.add("cal-selected");
        mostrarDetalleDia(dia.dataset.fecha, fechasConCrono[dia.dataset.fecha], detalles);
      });
    });

    // Mostrar hoy si tiene viajes, sino el primer día con viajes del mes
    if (fechasConCrono[keyHoy]) {
      const diaHoy = c.querySelector(`[data-fecha="${keyHoy}"]`);
      if (diaHoy) { diaHoy.classList.add("cal-selected"); mostrarDetalleDia(keyHoy, fechasConCrono[keyHoy], detalles); }
    }

  } catch(err) {
    const cont = $("listaCronogramas");
    if (cont) cont.innerHTML = `<div class="abm-empty" style="padding:16px;font-size:13px">Error al cargar cronogramas.</div>`;
    console.error("pintarCronogramasGuardados:", err);
  }
}

// ── Estados ──
const ESTADOS = {
  pendiente:  { label:"Pendiente",  color:"#d97706", bg:"#fef9c3" },
  completado: { label:"Completado", color:"#059669", bg:"#d1fae5" },
  cancelado:  { label:"Cancelado",  color:"#dc2626", bg:"#fee2e2" },
};

async function cambiarEstadoCrono(id, estado) {
  try {
    const crono = await Cronogramas.obtener(id);
    crono.datos.estado = estado;
    await Cronogramas.actualizar(id, crono.datos);
    toast(`Estado: ${ESTADOS[estado].label} ✓`);
    pintarCronogramasGuardados();
  } catch(err) { toast(err.message, "err"); }
}

function mostrarDetalleDia(fecha, items, detalles) {
  const det = $("calDetalle");
  if (!det) return;

  const label = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
  const ids = [...new Set(items.map(i => i.id))];

  const cards = ids.map(id => {
    const crono = detalles.find(d => d.id == id);
    if (!crono) return "";
    const datos  = crono.datos;
    const estado = datos.estado || "pendiente";
    const est    = ESTADOS[estado];

    return `
      <div style="border:1px solid var(--dash-border);border-radius:12px;padding:14px 16px;margin-bottom:10px;background:white">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap">
          <div>
            <strong style="font-size:14px">${san(datos.cliente)||"Sin cliente"}</strong>
            <span style="font-size:12px;color:var(--dash-muted);margin-left:8px">${san(datos.chofer)||""}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="background:${est.bg};color:${est.color};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700">${est.label}</span>
            ${estado==="pendiente" ? `
              <button class="db-btn success" style="padding:5px 10px;font-size:11px" onclick="cambiarEstadoCrono(${id},'completado')">✓ Completar</button>
              <button class="db-btn danger"  style="padding:5px 10px;font-size:11px" onclick="cambiarEstadoCrono(${id},'cancelado')">✕ Cancelar</button>
            ` : `
              <button class="db-btn muted" style="padding:5px 10px;font-size:11px" onclick="cambiarEstadoCrono(${id},'pendiente')">↩ Reabrir</button>
            `}
            <button class="edit-btn" style="padding:5px 10px;font-size:11px" onclick="cargarCronoGuardado(${id})">✏ Editar</button>
            <button class="delete-btn" style="padding:5px 10px;font-size:11px" onclick="confirmarEliminarCrono(${id})">🗑</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--dash-muted)">${san(datos.modo==="periodo"?"Por período":"Por día")} · ${san(datos.vehiculo)||""}</div>
      </div>
    `;
  }).join("");

  det.innerHTML = `
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--dash-muted);margin-bottom:10px;text-transform:capitalize">${label}</div>
    ${cards}
  `;
}

function confirmarEliminarCrono(id) {
  confirm("Eliminar cronograma", "¿Eliminás este cronograma? No se puede deshacer.", async () => {
    await Cronogramas.eliminar(id);
    if (cronoActualId === id) { cronoActualId=null; }
    toast("Cronograma eliminado.");
    pintarCronogramasGuardados();
  });
}

async function cargarCronoGuardado(id) {
  try {
    const crono = await Cronogramas.obtener(id);
    const d = crono.datos;
    cronoActualId = id;
    periodos = Array.isArray(d.periodos) ? d.periodos : [];
    dias     = Array.isArray(d.dias)     ? d.dias     : [];
    if ($("cCliente"))  $("cCliente").value  = d.cliente  || "";
    if ($("cChofer"))   $("cChofer").value   = d.chofer   || "";
    if ($("cVehiculo")) $("cVehiculo").value = d.vehiculo || "";
    if ($("cModo"))     $("cModo").value     = d.modo     || "periodo";
    actualizarModoCrono();
    pintarListasCrono();
    actualizarCanvasCrono();
    toast("Cronograma cargado.");
  } catch(err) { toast(err.message,"err"); }
}

// ══════════════════════════════════════════════
// ENTIDADES — secciones individuales
// ══════════════════════════════════════════════
function renderEntidad(tipo) {
  const CONF = {
    clientes: {
      titulo: "Clientes", nuevo: "Nuevo cliente",
      campos: [
        { id:"eNombre",    label:"Nombre completo", type:"text", ph:"Juan Pérez",     req:true },
        { id:"eTelefono",  label:"Teléfono",         type:"tel",  ph:"299 4123456"             },
        { id:"eDireccion", label:"Dirección",         type:"text", ph:"Belgrano 1234"           },
      ],
      api: Clientes,
      item: (e) => ({ nombre:e.nombre, info:`${e.telefono||"Sin tel."} · ${e.direccion||"Sin dirección"}` }),
    },
    choferes: {
      titulo: "Choferes", nuevo: "Nuevo chofer",
      campos: [
        { id:"eNombre",   label:"Nombre completo", type:"text", ph:"Carlos Rodríguez", req:true },
        { id:"eTelefono", label:"Teléfono",         type:"tel",  ph:"299 4654321"               },
        { id:"eLicencia", label:"Licencia",          type:"text", ph:"B2 - 00123456"             },
      ],
      api: Choferes,
      item: (e) => ({ nombre:e.nombre, info:`${e.telefono||"Sin tel."} · Lic: ${e.licencia||"—"}` }),
    },
    vehiculos: {
      titulo: "Vehículos", nuevo: "Nuevo vehículo",
      campos: [], // campos custom con catálogo
      api: Vehiculos,
      item: (e) => ({ nombre:`${e.marca} ${e.modelo}`, info:`Patente: ${e.patente||"—"} · Año: ${e.anio||"—"}` }),
    },
  };

  const conf = CONF[tipo];
  const el   = $("mainContent");

  // HTML del modal — vehículos tiene formulario especial con catálogo
  const modalCamposHTML = tipo === "vehiculos"
    ? buildModalVehiculos()
    : conf.campos.map(c =>
        `<div class="dash-field"><label>${c.label}</label><input id="${c.id}" type="${c.type}" placeholder="${c.ph||""}"></div>`
      ).join("");

  el.innerHTML = `
    <div class="dash-card">
      <div class="dash-card-header">
        <h2>${conf.titulo}</h2>
        <button class="db-btn primary" id="btnNuevoEntidad">+ ${conf.nuevo}</button>
      </div>
      <div class="abm-list" id="listaEntidad"><div class="abm-empty">Cargando...</div></div>
    </div>

    <div class="dash-modal hidden" id="modalEntidad">
      <div class="dash-modal-card">
        <div class="dash-modal-head">
          <h2 id="tituloModalEntidad">${conf.nuevo}</h2>
          <button class="dash-modal-close" data-close="modalEntidad">×</button>
        </div>
        ${modalCamposHTML}
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="db-btn primary" id="guardarEntidad">Guardar</button>
          <button class="db-btn muted" data-close="modalEntidad">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  $$("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close)?.classList.add("hidden")));
  $$(".dash-modal").forEach(m => m.addEventListener("click", e => { if(e.target===m) m.classList.add("hidden"); }));

  // Init catálogo si es vehículos
  if (tipo === "vehiculos") initCatalogoVehiculos();

  let editId = null;

  function limpiarModal() {
    editId = null;
    $("tituloModalEntidad").textContent = conf.nuevo;
    $("guardarEntidad").textContent = "Guardar";
    if (tipo !== "vehiculos") {
      conf.campos.forEach(c => { if($(c.id)) $(c.id).value=""; });
    } else {
      resetFormVehiculo();
    }
  }

  async function pintar() {
    const c = $("listaEntidad");
    c.innerHTML = `<div class="abm-empty">Cargando...</div>`;
    try {
      const lista = await conf.api.listar();
      if (!lista.length) { c.innerHTML=`<div class="abm-empty">Sin ${conf.titulo.toLowerCase()} cargados.</div>`; return; }
      c.innerHTML = "";
      lista.forEach(e => {
        const info = conf.item(e);
        const item = document.createElement("div"); item.className="abm-item";
        item.innerHTML=`<div class="abm-item-info"><strong>${san(info.nombre)}</strong><span>${san(info.info)}</span></div><div class="abm-item-actions"></div>`;
        const acc = item.querySelector(".abm-item-actions");
        const bE  = document.createElement("button"); bE.className="edit-btn"; bE.textContent="Editar";
        bE.addEventListener("click", () => {
          editId = e.id;
          if (tipo==="clientes")  { $("eNombre").value=e.nombre||""; $("eTelefono").value=e.telefono||""; $("eDireccion").value=e.direccion||""; }
          if (tipo==="choferes")  { $("eNombre").value=e.nombre||""; $("eTelefono").value=e.telefono||""; $("eLicencia").value=e.licencia||""; }
          if (tipo==="vehiculos") cargarVehiculoEnForm(e);
          $("tituloModalEntidad").textContent = `Modificar ${conf.titulo.slice(0,-1).toLowerCase()}`;
          $("guardarEntidad").textContent = "Guardar cambios";
          $("modalEntidad").classList.remove("hidden");
        });
        const bD = document.createElement("button"); bD.className="delete-btn"; bD.textContent="Eliminar";
        bD.addEventListener("click", () => confirm(`Eliminar`, `¿Eliminar "${san(info.nombre)}"?`, async () => {
          await conf.api.eliminar(e.id); toast("Eliminado."); pintar();
        }));
        acc.appendChild(bE); acc.appendChild(bD); c.appendChild(item);
      });
    } catch(err) { c.innerHTML=`<div class="abm-empty">Error: ${san(err.message)}</div>`; }
  }

  $("btnNuevoEntidad").addEventListener("click", () => { limpiarModal(); $("modalEntidad").classList.remove("hidden"); });

  $("guardarEntidad").addEventListener("click", async () => {
    let data = {};
    if (tipo==="clientes")  { data={ nombre:$("eNombre").value.trim(), telefono:$("eTelefono").value.trim(), direccion:$("eDireccion").value.trim() }; if(!data.nombre){ toast("El nombre es obligatorio.","err"); return; } }
    if (tipo==="choferes")  { data={ nombre:$("eNombre").value.trim(), telefono:$("eTelefono").value.trim(), licencia:$("eLicencia").value.trim() };  if(!data.nombre){ toast("El nombre es obligatorio.","err"); return; } }
    if (tipo==="vehiculos") {
      data = obtenerDatosVehiculo();
      if (!data) return; // validación interna
    }
    try {
      editId ? await conf.api.editar(editId,data) : await conf.api.crear(data);
      $("modalEntidad").classList.add("hidden");
      toast("Guardado ✓"); pintar();
    } catch(err) { toast(err.message,"err"); }
  });

  pintar();
}

// ── Formulario con catálogo de vehículos ──────

function buildModalVehiculos() {
  const opsMarcas = MARCAS_LISTA.map(m =>
    `<option value="${san(m)}">${san(m)}</option>`
  ).join("");

  return `
    <div class="dash-field">
      <label>Marca</label>
      <select id="vSelMarca">
        <option value="">— Seleccioná una marca —</option>
        ${opsMarcas}
      </select>
    </div>
    <div class="dash-field" id="vCampoMarcaManual" style="display:none">
      <label>Marca (manual)</label>
      <input id="vInputMarca" type="text" placeholder="Escribí la marca">
    </div>
    <div class="dash-field">
      <label>Modelo</label>
      <select id="vSelModelo" disabled>
        <option value="">— Primero seleccioná marca —</option>
      </select>
    </div>
    <div class="dash-field" id="vCampoModeloManual" style="display:none">
      <label>Modelo (manual)</label>
      <input id="vInputModelo" type="text" placeholder="Escribí el modelo">
    </div>
    <div class="dash-grid-2">
      <div class="dash-field"><label>Patente</label><input id="ePatente" type="text" placeholder="ABC 123"></div>
      <div class="dash-field"><label>Año</label><input id="eAnio" type="number" placeholder="2020" min="1990" max="2099"></div>
    </div>
  `;
}

function initCatalogoVehiculos() {
  const selMarca  = $("vSelMarca");
  const selModelo = $("vSelModelo");
  if (!selMarca || !selModelo) return;

  selMarca.addEventListener("change", () => {
    const marca = selMarca.value;
    const esOtra = marca === "Otra marca";
    const campoManual = $("vCampoMarcaManual");
    if (campoManual) campoManual.style.display = esOtra ? "" : "none";

    // Actualizar modelos
    selModelo.innerHTML = "";
    if (!marca || esOtra) {
      selModelo.disabled = true;
      selModelo.innerHTML = `<option value="">—</option>`;
      // En "Otra marca" el modelo también es manual
      const campoModManual = $("vCampoModeloManual");
      if (campoModManual) campoModManual.style.display = esOtra ? "" : "none";
      return;
    }

    $("vCampoModeloManual").style.display = "none";
    const modelos = VEHICULOS_CATALOGO[marca] || [];
    selModelo.disabled = false;
    selModelo.innerHTML = `<option value="">— Seleccioná un modelo —</option>`;
    modelos.forEach(m => {
      const o = document.createElement("option");
      o.value = m; o.textContent = m;
      selModelo.appendChild(o);
    });
    // Opción "Otro modelo"
    const oOtro = document.createElement("option");
    oOtro.value = "__otro__"; oOtro.textContent = "Otro modelo...";
    selModelo.appendChild(oOtro);

    selModelo.addEventListener("change", () => {
      const campoModManual = $("vCampoModeloManual");
      if (campoModManual) campoModManual.style.display = selModelo.value === "__otro__" ? "" : "none";
    }, { once:true });
  });
}

function resetFormVehiculo() {
  if ($("vSelMarca"))  { $("vSelMarca").value = ""; }
  if ($("vSelModelo")) { $("vSelModelo").disabled = true; $("vSelModelo").innerHTML = `<option value="">— Primero seleccioná marca —</option>`; }
  if ($("vInputMarca"))  $("vInputMarca").value  = "";
  if ($("vInputModelo")) $("vInputModelo").value = "";
  if ($("ePatente"))   $("ePatente").value   = "";
  if ($("eAnio"))      $("eAnio").value      = "";
  if ($("vCampoMarcaManual"))  $("vCampoMarcaManual").style.display  = "none";
  if ($("vCampoModeloManual")) $("vCampoModeloManual").style.display = "none";
}

function cargarVehiculoEnForm(e) {
  const marcaConocida = MARCAS_LISTA.includes(e.marca) && e.marca !== "Otra marca";
  const selMarca = $("vSelMarca");
  const selModelo = $("vSelModelo");

  if (marcaConocida) {
    selMarca.value = e.marca;
    // Disparar change para poblar modelos
    selMarca.dispatchEvent(new Event("change"));
    // Esperar un tick y setear el modelo
    setTimeout(() => {
      const modelos = VEHICULOS_CATALOGO[e.marca] || [];
      const modeloConocido = modelos.includes(e.modelo);
      if (modeloConocido) {
        selModelo.value = e.modelo;
      } else {
        selModelo.value = "__otro__";
        if ($("vCampoModeloManual")) $("vCampoModeloManual").style.display = "";
        if ($("vInputModelo")) $("vInputModelo").value = e.modelo || "";
      }
    }, 50);
  } else {
    selMarca.value = "Otra marca";
    selMarca.dispatchEvent(new Event("change"));
    setTimeout(() => {
      if ($("vInputMarca"))  $("vInputMarca").value  = e.marca  || "";
      if ($("vInputModelo")) $("vInputModelo").value = e.modelo || "";
    }, 50);
  }

  if ($("ePatente")) $("ePatente").value = e.patente || "";
  if ($("eAnio"))    $("eAnio").value    = e.anio    || "";
}

function obtenerDatosVehiculo() {
  const selMarca  = $("vSelMarca");
  const selModelo = $("vSelModelo");
  const marcaSel  = selMarca?.value;
  const esOtra    = marcaSel === "Otra marca";

  let marca  = esOtra ? ($("vInputMarca")?.value.trim()  || "") : (marcaSel || "");
  let modelo = "";

  if (esOtra) {
    modelo = $("vInputModelo")?.value.trim() || "";
  } else if (selModelo?.value === "__otro__") {
    modelo = $("vInputModelo")?.value.trim() || "";
  } else {
    modelo = selModelo?.value || "";
  }

  if (!marca)  { toast("La marca es obligatoria.",  "err"); return null; }
  if (!modelo) { toast("El modelo es obligatorio.", "err"); return null; }

  return {
    marca,
    modelo,
    patente: $("ePatente")?.value.trim() || "",
    anio:    $("eAnio")?.value           || "",
  };
}

// ══════════════════════════════════════════════
// USUARIOS (solo dev)
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// REPORTES (solo dev)
// ══════════════════════════════════════════════
async function renderReportes() {
  const el = $("mainContent");
  el.innerHTML = `<div style="display:grid;gap:20px">
    <div class="dash-card" id="rptResumen">
      <div class="dash-card-header"><h2>Cargando reportes...</h2></div>
    </div>
  </div>`;

  try {
    const [cronos, clientes, choferes, vehiculos, usuarios] = await Promise.all([
      Cronogramas.listar(),
      Clientes.listar(),
      Choferes.listar(),
      Vehiculos.listar(),
      Usuarios.listar(),
    ]);

    // ── Estadísticas generales
    const total     = cronos.length;
    const pendiente = cronos.filter(c => (c.estado||"pendiente") === "pendiente").length;
    const completado= cronos.filter(c => c.estado === "completado").length;
    const cancelado = cronos.filter(c => c.estado === "cancelado").length;

    // ── Mes actual
    const hoy = new Date();
    const mesKey = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
    const cronosMes = cronos.filter(c => (c.actualizado_en||c.creado_en||"").slice(0,7) === mesKey);

    // ── Por chofer (solo usuarios tipo chofer)
    const choferesList = usuarios.filter(u => u.rol === "chofer");

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px">
        <div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><label>Total cronogramas</label><strong>${total}</strong></div></div>
        <div class="stat-card"><div class="stat-icon orange">⏳</div><div class="stat-info"><label>Pendientes</label><strong>${pendiente}</strong></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><label>Completados</label><strong>${completado}</strong></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fee2e2">❌</div><div class="stat-info"><label>Cancelados</label><strong>${cancelado}</strong></div></div>
        <div class="stat-card"><div class="stat-icon blue">📅</div><div class="stat-info"><label>Este mes</label><strong>${cronosMes.length}</strong></div></div>
        <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><label>Clientes</label><strong>${clientes.length}</strong></div></div>
        <div class="stat-card"><div class="stat-icon blue">🚗</div><div class="stat-info"><label>Choferes activos</label><strong>${choferesList.filter(c=>c.activo).length}</strong></div></div>
        <div class="stat-card"><div class="stat-icon orange">🚘</div><div class="stat-info"><label>Vehículos</label><strong>${vehiculos.length}</strong></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

        <!-- Cronogramas por chofer -->
        <div class="dash-card">
          <div class="dash-card-header"><h2>Actividad por chofer</h2></div>
          ${choferesList.length === 0
            ? `<div class="abm-empty">Sin choferes registrados.</div>`
            : choferesList.map(ch => {
                const cCh  = cronos.filter(c => c.cliente && ch.username);
                const pct  = total > 0 ? Math.round((cCh.length/total)*100) : 0;
                return `
                  <div style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <div>
                        <strong style="font-size:14px">${san(ch.nombre)}</strong>
                        <span style="font-size:12px;color:var(--dash-muted);margin-left:8px">@${san(ch.username)}</span>
                      </div>
                      <span style="font-size:12px;color:var(--dash-muted)">${cCh.length} cronogramas</span>
                    </div>
                    <div style="height:6px;background:var(--dash-border);border-radius:999px;overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:var(--blue);border-radius:999px;transition:width .5s"></div>
                    </div>
                  </div>`;
              }).join("")
          }
        </div>

        <!-- Vehículos registrados -->
        <div class="dash-card">
          <div class="dash-card-header"><h2>Vehículos registrados</h2></div>
          ${vehiculos.length === 0
            ? `<div class="abm-empty">Sin vehículos registrados.</div>`
            : vehiculos.map(v => `
                <div class="abm-item" style="margin-bottom:8px">
                  <div class="abm-item-info">
                    <strong>${san(v.marca)} ${san(v.modelo)}</strong>
                    <span>Patente: ${san(v.patente)||"—"} · Año: ${san(v.anio)||"—"}</span>
                  </div>
                </div>`
              ).join("")
          }
        </div>

      </div>

      <!-- Últimos cronogramas -->
      <div class="dash-card" style="margin-top:20px">
        <div class="dash-card-header"><h2>Últimos 10 cronogramas</h2></div>
        ${cronos.length === 0
          ? `<div class="abm-empty">Sin cronogramas.</div>`
          : `<div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="border-bottom:2px solid var(--dash-border)">
                    <th style="text-align:left;padding:8px 12px;color:var(--dash-muted);font-weight:700;text-transform:uppercase;font-size:11px">Cliente</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--dash-muted);font-weight:700;text-transform:uppercase;font-size:11px">Modo</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--dash-muted);font-weight:700;text-transform:uppercase;font-size:11px">Estado</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--dash-muted);font-weight:700;text-transform:uppercase;font-size:11px">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${cronos.slice(0,10).map(c => {
                    const est = ESTADOS[c.estado||"pendiente"] || ESTADOS.pendiente;
                    return `<tr style="border-bottom:1px solid var(--dash-border)">
                      <td style="padding:10px 12px;font-weight:600">${san(c.cliente)||"Sin cliente"}</td>
                      <td style="padding:10px 12px;color:var(--dash-muted)">${san(c.modo||"—")}</td>
                      <td style="padding:10px 12px"><span style="background:${est.bg};color:${est.color};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${est.label}</span></td>
                      <td style="padding:10px 12px;color:var(--dash-muted);font-size:12px">${san((c.actualizado_en||c.creado_en||"").slice(0,10))}</td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>`
        }
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="dash-card"><div class="abm-empty">Error al cargar reportes: ${san(err.message)}</div></div>`;
  }
}

// ══════════════════════════════════════════════
// MI PERFIL (chofer carga sus propios datos)
// ══════════════════════════════════════════════
async function renderPerfil() {
  const el = $("mainContent");
  el.innerHTML = `<div style="display:grid;gap:20px;max-width:600px">
    <div class="dash-card" id="perfilCard">Cargando...</div>
  </div>`;

  try {
    const [miChofer, misVehiculos] = await Promise.all([
      Choferes.listar(),
      Vehiculos.listar(),
    ]);

    // El chofer ve solo sus propios datos
    const chofer   = miChofer[0]   || null;
    const vehiculo = misVehiculos[0] || null;

    el.innerHTML = `
      <div style="display:grid;gap:20px;max-width:600px">

        <!-- Datos personales -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h2>Mis datos</h2>
            <button class="db-btn primary" id="btnGuardarPerfil">Guardar</button>
          </div>
          <div class="dash-field"><label>Nombre completo</label><input id="pNombre" type="text" value="${san(chofer?.nombre||sesion?.nombre||"")}" placeholder="Tu nombre"></div>
          <div class="dash-field"><label>Teléfono</label><input id="pTelefono" type="tel" value="${san(chofer?.telefono||"")}" placeholder="299 4123456"></div>
          <div class="dash-field"><label>Licencia</label><input id="pLicencia" type="text" value="${san(chofer?.licencia||"")}" placeholder="B2 - 00123456"></div>
          <div id="perfilMsg" style="margin-top:10px;font-size:13px;display:none"></div>
        </div>

        <!-- Mi vehículo -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h2>Mi vehículo</h2>
            <button class="db-btn primary" id="btnGuardarVehiculo">Guardar</button>
          </div>
          ${buildModalVehiculos()}
          <div id="vehiculoMsg" style="margin-top:10px;font-size:13px;display:none"></div>
        </div>

      </div>
    `;

    initCatalogoVehiculos();

    // Si ya tiene vehículo, cargarlo
    if (vehiculo) cargarVehiculoEnForm(vehiculo);

    const _choferId = chofer?.id || null;
    const _vehId    = vehiculo?.id || null;

    $("btnGuardarPerfil").addEventListener("click", async () => {
      const nombre   = $("pNombre").value.trim();
      const telefono = $("pTelefono").value.trim();
      const licencia = $("pLicencia").value.trim();
      if (!nombre) { toast("El nombre es obligatorio.", "err"); return; }
      try {
        const data = { nombre, telefono, licencia };
        _choferId ? await Choferes.editar(_choferId, data) : await Choferes.crear(data);
        // También actualizar nombre en la sesión
        await Usuarios.editar(sesion.id, { nombre });
        sesion.nombre = nombre;
        $("sbUserName").textContent  = nombre;
        $("sbAvatar").textContent    = nombre.charAt(0).toUpperCase();
        toast("Datos guardados ✓");
      } catch(err) { toast(err.message, "err"); }
    });

    $("btnGuardarVehiculo").addEventListener("click", async () => {
      const data = obtenerDatosVehiculo();
      if (!data) return;
      try {
        _vehId ? await Vehiculos.editar(_vehId, data) : await Vehiculos.crear(data);
        toast("Vehículo guardado ✓");
      } catch(err) { toast(err.message, "err"); }
    });

  } catch(err) {
    el.innerHTML = `<div class="dash-card"><div class="abm-empty">Error: ${san(err.message)}</div></div>`;
  }
}

function renderUsuarios() {
  const el = $("mainContent");
  el.innerHTML = `
    <div class="dash-card">
      <div class="dash-card-header">
        <h2>Usuarios del sistema</h2>
        <button class="db-btn primary" id="btnNuevoUsuario">+ Nuevo usuario</button>
      </div>
      <div class="abm-list" id="listaUsuarios"><div class="abm-empty">Cargando...</div></div>
    </div>

    <div class="dash-modal hidden" id="modalUsuarioDash">
      <div class="dash-modal-card">
        <div class="dash-modal-head"><h2 id="tituloUsuarioDash">Nuevo usuario</h2><button class="dash-modal-close" data-close="modalUsuarioDash">×</button></div>
        <div class="dash-field"><label>Nombre completo</label><input id="uNombre" type="text" placeholder="Carlos Rodríguez"></div>
        <div class="dash-field"><label>Usuario (login)</label><input id="uUsername" type="text" placeholder="carlos" autocomplete="off"></div>
        <div class="dash-field"><label id="uPassLabel">Contraseña</label><input id="uPassword" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>
        <div id="uPassHint" class="hidden" style="font-size:12px;color:var(--dash-muted);margin-bottom:10px">Dejá en blanco para no cambiar.</div>
        <div class="dash-field"><label>Rol</label><select id="uRol"><option value="chofer">Chofer</option><option value="dev">Dev / Admin</option></select></div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="db-btn primary" id="guardarUsuarioDash">Guardar</button>
          <button class="db-btn muted" data-close="modalUsuarioDash">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close)?.classList.add("hidden")));
  $$(".dash-modal").forEach(m=>m.addEventListener("click",e=>{ if(e.target===m) m.classList.add("hidden"); }));

  let usuEditId = null;
  pintarUsuarios();

  $("btnNuevoUsuario").addEventListener("click",()=>{
    usuEditId=null;
    ["uNombre","uUsername","uPassword"].forEach(id=>$(id).value="");
    $("uRol").value="chofer"; $("uUsername").disabled=false;
    $("uPassLabel").textContent="Contraseña"; $("uPassHint").classList.add("hidden");
    $("tituloUsuarioDash").textContent="Nuevo usuario";
    $("modalUsuarioDash").classList.remove("hidden");
  });

  $("guardarUsuarioDash").addEventListener("click", async()=>{
    const nombre=$("uNombre").value.trim(), username=$("uUsername").value.trim();
    const password=$("uPassword").value.trim(), rol=$("uRol").value;
    if(!nombre){ toast("El nombre es obligatorio.","err"); return; }
    if(!usuEditId&&!username){ toast("El usuario es obligatorio.","err"); return; }
    if(!usuEditId&&!password){ toast("La contraseña es obligatoria.","err"); return; }
    if(password&&password.length<6){ toast("Mínimo 6 caracteres.","err"); return; }
    const data={ nombre, rol };
    if(!usuEditId) data.username=username;
    if(password)   data.password=password;
    try{
      usuEditId ? await Usuarios.editar(usuEditId,data) : await Usuarios.crear(data);
      $("modalUsuarioDash").classList.add("hidden"); toast("Usuario guardado ✓"); pintarUsuarios();
    }catch(err){ toast(err.message,"err"); }
  });

  async function pintarUsuarios() {
    const c=$("listaUsuarios"); c.innerHTML=`<div class="abm-empty">Cargando...</div>`;
    try{
      const lista=await Usuarios.listar();
      if(!lista.length){ c.innerHTML=`<div class="abm-empty">Sin usuarios.</div>`; return; }
      c.innerHTML="";
      lista.forEach(u=>{
        const esMio = u.id==sesion?.id;
        const badge = u.rol==="dev"
          ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">Dev</span>`
          : `<span style="background:var(--green-soft);color:var(--green);padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">Chofer</span>`;
        const inactivo = !u.activo ? `<span style="background:#fee2e2;color:var(--red);padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">Inactivo</span>` : "";
        const item=document.createElement("div"); item.className="abm-item";
        item.innerHTML=`<div class="abm-item-info"><strong>${san(u.nombre)} ${badge} ${inactivo} ${esMio?'<span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">Vos</span>':""}</strong><span>@${san(u.username)} · ${san(u.creado_en?.slice(0,10)||"—")}</span></div><div class="abm-item-actions"></div>`;
        const acc=item.querySelector(".abm-item-actions");
        const bE=document.createElement("button"); bE.className="edit-btn"; bE.textContent="Editar";
        bE.addEventListener("click",()=>{
          usuEditId=u.id; $("uNombre").value=u.nombre; $("uUsername").value=u.username; $("uPassword").value=""; $("uRol").value=u.rol;
          $("uUsername").disabled=true; $("uPassLabel").textContent="Nueva contraseña (opcional)"; $("uPassHint").classList.remove("hidden");
          $("tituloUsuarioDash").textContent="Modificar usuario"; $("modalUsuarioDash").classList.remove("hidden");
        });
        acc.appendChild(bE);
        if(!esMio){
          const bT=document.createElement("button"); bT.className=u.activo?"delete-btn":"edit-btn"; bT.textContent=u.activo?"Desactivar":"Activar";
          bT.addEventListener("click",()=>confirm(u.activo?"Desactivar":"Activar",`¿${u.activo?"Desactivar":"Activar"} a "${u.nombre}"?`,async()=>{ await Usuarios.editar(u.id,{activo:u.activo?0:1}); toast("Usuario actualizado."); pintarUsuarios(); }));
          const bD=document.createElement("button"); bD.className="delete-btn"; bD.textContent="Eliminar";
          bD.addEventListener("click",()=>confirm("Eliminar usuario",`¿Eliminar a "${u.nombre}"? Se borran todos sus datos.`,async()=>{ await Usuarios.eliminar(u.id); toast("Eliminado."); pintarUsuarios(); }));
          acc.appendChild(bT); acc.appendChild(bD);
        }
        c.appendChild(item);
      });
    }catch(err){ c.innerHTML=`<div class="abm-empty">Error: ${san(err.message)}</div>`; }
  }
}

// ══════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════
function renderConfig() {
  const el = $("mainContent");
  el.innerHTML = `
    <div class="dash-card" style="max-width:500px">
      <div class="dash-card-header"><h2>Mi cuenta</h2></div>
      <div class="dash-field"><label>Nombre completo</label><input id="cfgNombre" type="text" value="${san(sesion?.nombre||"")}"></div>
      <div class="dash-field"><label>Nueva contraseña <span style="font-weight:400;text-transform:none">(opcional)</span></label><input id="cfgPassword" type="password" placeholder="••••••••"></div>
      <button class="db-btn primary" id="cfgGuardar">Guardar cambios</button>
      <div id="cfgMsg" style="margin-top:12px;font-size:13px;display:none"></div>
    </div>
  `;

  $("cfgGuardar").addEventListener("click", async () => {
    const nombre=$("cfgNombre").value.trim(), pass=$("cfgPassword").value.trim();
    if(!nombre){ toast("El nombre es obligatorio.","err"); return; }
    if(pass&&pass.length<6){ toast("Mínimo 6 caracteres.","err"); return; }
    const data={ nombre };
    if(pass) data.password=pass;
    try{
      await Usuarios.editar(sesion.id,data);
      sesion.nombre=nombre;
      $("sbUserName").textContent=nombre;
      $("sbAvatar").textContent=nombre.charAt(0).toUpperCase();
      toast("Cambios guardados ✓");
    }catch(err){ toast(err.message,"err"); }
  });
}

// ══════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════
function mostrarLogin() {
  $("loadingOverlay").classList.add("out");
  setTimeout(()=>$("loadingOverlay").classList.add("hidden"),400);
  $("loginOverlay").classList.remove("hidden");
}

function mostrarApp() {
  $("loadingOverlay").classList.add("out");
  setTimeout(()=>$("loadingOverlay").classList.add("hidden"),400);
  $("loginOverlay").classList.add("hidden");
  $("shell").classList.remove("hidden");

  // Inicializar sidebar ahora que el DOM está visible
  initSidebar();

  $("sbUserName").textContent  = sesion.nombre;
  $("sbAvatar").textContent    = sesion.nombre.charAt(0).toUpperCase();
  $("sbUserRol").textContent   = sesion.rol;
  $("badgeRol").textContent    = sesion.rol;
  $("badgeRol").className      = `badge-rol badge-${sesion.rol}`;
  $("badgeRol").classList.remove("hidden");

  if (sesion.rol === "dev") {
    $("navUsuarios").classList.remove("hidden");
    $("navReportes").classList.remove("hidden");
    $("labelAdmin").classList?.remove("hidden");
  }

  // Choferes no ven la lista de otros choferes — solo su perfil
  if (sesion.rol === "chofer") {
    const navChoferes = document.querySelector('[data-sec="choferes"]');
    if (navChoferes) navChoferes.style.display = "none";
  }

  navegar("home");
}

async function intentarLogin() {
  const user=$("loginUser").value.trim(), pass=$("loginPass").value.trim();
  if(!user||!pass){ $("loginError").textContent="Ingresá usuario y contraseña."; $("loginError").classList.remove("hidden"); return; }
  $("btnLogin").disabled=true; $("loginError").classList.add("hidden");
  try{
    sesion = await Auth.login(user,pass);
    mostrarApp();
  }catch(err){
    $("loginError").textContent=err.message||"Usuario o contraseña incorrectos.";
    $("loginError").classList.remove("hidden");
  }finally{ $("btnLogin").disabled=false; }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin  = $("btnLogin");
  const loginUser = $("loginUser");
  const loginPass = $("loginPass");
  const btnLogout = $("btnLogout");

  if (btnLogin)  btnLogin.addEventListener("click", intentarLogin);
  if (loginUser) loginUser.addEventListener("keydown", e => { if(e.key==="Enter") intentarLogin(); });
  if (loginPass) loginPass.addEventListener("keydown", e => { if(e.key==="Enter") intentarLogin(); });
  if (btnLogout) btnLogout.addEventListener("click", async () => {
    await Auth.logout().catch(()=>{});
    location.reload();
  });
});

// ── INIT ──────────────────────────────────────
Auth.sesion()
  .then(s=>{ sesion=s; mostrarApp(); })
  .catch(()=>mostrarLogin());
