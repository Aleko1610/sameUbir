const LOGIN_USER = "vic";
const LOGIN_PASS = "vic2026";
let loginCorrectoPendiente = false;

const $ = (id) => document.getElementById(id);

// ── ICONOS PNG por color ──
const ICO = {
  ida: {
    reloj:    `<img src="icons/icon-reloj-verde.png"      class="ico" alt="">`,
    casa:     `<img src="icons/icon-casa-verde.png"       class="ico" alt="">`,
    pin:      `<img src="icons/icon-pin-verde.png"        class="ico" alt="">`,
    personas: `<img src="icons/icon-personas-verde.png"   class="ico" alt="">`,
    flecha:   `<img src="icons/icon-flecha-der-verde.png" class="ico-flecha" alt="">`,
  },
  vuelta: {
    reloj:    `<img src="icons/icon-reloj-azul.png"       class="ico" alt="">`,
    casa:     `<img src="icons/icon-casa-azul.png"        class="ico" alt="">`,
    pin:      `<img src="icons/icon-pin-azul.png"         class="ico" alt="">`,
    personas: `<img src="icons/icon-personas-azul.png"    class="ico" alt="">`,
    flecha:   `<img src="icons/icon-flecha-izq-azul.png"  class="ico-flecha" alt="">`,
  },
  calendario: `<img src="icons/icon-calendario.png" class="ico" alt="">`,
};

let periodos = [];
let dias = [];

let periodoEditando = null;
let diaEditando = null;

// ── KEYS ABM ──
const KEY_CLIENTES  = "cronovic-clientes";
const KEY_CHOFERES  = "cronovic-choferes";
const KEY_VEHICULOS = "cronovic-vehiculos";

function cargarDBAbm(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function cargarSelects() {
  const clientes  = cargarDBAbm(KEY_CLIENTES);
  const choferes  = cargarDBAbm(KEY_CHOFERES);
  const vehiculos = cargarDBAbm(KEY_VEHICULOS);

  const selCliente  = $("cliente");
  const selChofer   = $("chofer");
  const selVehiculo = $("vehiculo");

  const valCliente  = selCliente.value;
  const valChofer   = selChofer.value;
  const valVehiculo = selVehiculo.value;

  selCliente.innerHTML  = `<option value="">— Seleccioná un cliente —</option>`;
  selChofer.innerHTML   = `<option value="">— Seleccioná un chofer —</option>`;
  selVehiculo.innerHTML = `<option value="">— Seleccioná un vehículo —</option>`;

  clientes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    selCliente.appendChild(opt);
  });

  choferes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    selChofer.appendChild(opt);
  });

  vehiculos.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = `${v.marca} ${v.modelo}`;
    opt.textContent = `${v.marca} ${v.modelo}${v.patente ? ` — ${v.patente}` : ""}`;
    selVehiculo.appendChild(opt);
  });

  if (valCliente)  selCliente.value  = valCliente;
  if (valChofer)   selChofer.value   = valChofer;
  if (valVehiculo) selVehiculo.value = valVehiculo;
}

function valor(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setValor(id, value) {
  const el = $(id);
  if (el) el.value = value || "";
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

function formatearFecha(fechaISO) {
  if (!fechaISO) return "";

  const fecha = new Date(`${fechaISO}T00:00:00`);

  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatearHora(hora) {
  return hora ? `${hora} hs` : "";
}

function textoPasajeros(cantidad) {
  const numero = Number(cantidad);
  if (!numero || numero <= 0) return "Sin pasajeros indicados";
  return numero === 1 ? "1 pasajero" : `${numero} pasajeros`;
}

function textoPeriodo(desde, hasta) {
  const d = formatearFecha(desde);
  const h = formatearFecha(hasta);

  if (d && h) return `Desde el ${d} hasta el ${h}`;
  if (d) return `Desde el ${d}`;
  if (h) return `Hasta el ${h}`;
  return "Período no especificado";
}

function textoTipoViaje(tipo) {
  if (tipo === "ida") return "Viaje de ida";
  if (tipo === "vuelta") return "Viaje de vuelta";
  return "Viaje de ida y vuelta";
}

function horaAMinutos(hora) {
  if (!hora) return null;

  const [h, m] = hora.split(":").map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function abrirModal(id) {
  $(id).classList.remove("hidden");
}

function cerrarModal(id) {
  $(id).classList.add("hidden");
}

function actualizarBloquesDia() {
  const tipo = valor("dTipo");

  $("bloqueDiaIda").classList.toggle("hidden", tipo === "vuelta");
  $("bloqueDiaVuelta").classList.toggle("hidden", tipo === "ida");
}

function obtenerPeriodoFormulario() {
  return {
    desde: valor("pDesde"),
    hasta: valor("pHasta"),
    horarioIda: valor("pHorarioIda"),
    salidaIda: valor("pSalidaIda"),
    llegadaIda: valor("pLlegadaIda"),
    pasajerosIda: valor("pPasajerosIda"),
    horarioVuelta: valor("pHorarioVuelta"),
    salidaVuelta: valor("pSalidaVuelta"),
    llegadaVuelta: valor("pLlegadaVuelta"),
    pasajerosVuelta: valor("pPasajerosVuelta")
  };
}

function obtenerDiaFormulario() {
  const tipo = valor("dTipo");

  const data = {
    fecha: valor("dFecha"),
    tipo,
    ida: null,
    vuelta: null
  };

  if (tipo === "ida" || tipo === "ida y vuelta") {
    data.ida = {
      horario: valor("dHorarioIda"),
      salida: valor("dSalidaIda"),
      llegada: valor("dLlegadaIda"),
      pasajeros: valor("dPasajerosIda")
    };
  }

  if (tipo === "vuelta" || tipo === "ida y vuelta") {
    data.vuelta = {
      horario: valor("dHorarioVuelta"),
      salida: valor("dSalidaVuelta"),
      llegada: valor("dLlegadaVuelta"),
      pasajeros: valor("dPasajerosVuelta")
    };
  }

  return data;
}

function limpiarPeriodoFormulario() {
  setValor("pDesde", "");
  setValor("pHasta", "");
  setValor("pHorarioIda", "");
  setValor("pSalidaIda", "");
  setValor("pLlegadaIda", "");
  setValor("pPasajerosIda", "2");
  setValor("pHorarioVuelta", "");
  setValor("pSalidaVuelta", "");
  setValor("pLlegadaVuelta", "");
  setValor("pPasajerosVuelta", "3");

  periodoEditando = null;
  $("tituloPeriodo").textContent = "Agregar período";
  $("guardarPeriodo").textContent = "Guardar período";
}

function limpiarDiaFormulario() {
  setValor("dFecha", "");
  setValor("dTipo", "ida");

  setValor("dHorarioIda", "");
  setValor("dSalidaIda", "");
  setValor("dLlegadaIda", "");
  setValor("dPasajerosIda", "2");

  setValor("dHorarioVuelta", "");
  setValor("dSalidaVuelta", "");
  setValor("dLlegadaVuelta", "");
  setValor("dPasajerosVuelta", "3");

  diaEditando = null;
  $("tituloDia").textContent = "Agregar día";
  $("guardarDia").textContent = "Guardar día";

  actualizarBloquesDia();
}

function obtenerHorariosDeDia(dia) {
  const horarios = [];

  if (dia.ida?.horario) {
    horarios.push({
      tipo: "ida",
      horario: dia.ida.horario
    });
  }

  if (dia.vuelta?.horario) {
    horarios.push({
      tipo: "vuelta",
      horario: dia.vuelta.horario
    });
  }

  return horarios;
}

function verificarViajeCercano(nuevoDia, indexEditando = null) {
  const nuevos = obtenerHorariosDeDia(nuevoDia);

  for (let i = 0; i < dias.length; i++) {
    if (i === indexEditando) continue;

    const diaExistente = dias[i];

    if (diaExistente.fecha !== nuevoDia.fecha) continue;

    const existentes = obtenerHorariosDeDia(diaExistente);

    for (const nuevo of nuevos) {
      const nuevoMin = horaAMinutos(nuevo.horario);

      if (nuevoMin === null) continue;

      for (const existente of existentes) {
        const existenteMin = horaAMinutos(existente.horario);

        if (existenteMin === null) continue;

        const diferencia = Math.abs(nuevoMin - existenteMin);

        if (diferencia <= 30) {
          return {
            hayConflicto: true,
            fecha: nuevoDia.fecha,
            nuevoHorario: nuevo.horario,
            horarioExistente: existente.horario,
            diferencia
          };
        }
      }
    }
  }

  return { hayConflicto: false };
}

function validarPeriodo(p) {
  if (!p.desde || !p.hasta) return "Completá las fechas de inicio y fin del período.";
  if (p.desde > p.hasta) return "La fecha de inicio no puede ser posterior a la de fin.";
  if (!p.horarioIda && !p.horarioVuelta) return "Ingresá al menos un horario (ida o vuelta).";
  return null;
}

function validarDia(d) {
  if (!d.fecha) return "Seleccioná una fecha para el día.";
  if (d.tipo === "ida" && !d.ida?.horario) return "Ingresá el horario del viaje de ida.";
  if (d.tipo === "vuelta" && !d.vuelta?.horario) return "Ingresá el horario del viaje de vuelta.";
  if (d.tipo === "ida y vuelta" && !d.ida?.horario && !d.vuelta?.horario) return "Ingresá al menos un horario (ida o vuelta).";
  return null;
}

function agregarOActualizarPeriodo() {
  const nuevo = obtenerPeriodoFormulario();

  const error = validarPeriodo(nuevo);
  if (error) {
    mostrarLoginModal("error", "Datos incompletos", error);
    return;
  }

  if (periodoEditando !== null) {
    periodos[periodoEditando] = nuevo;
  } else {
    periodos.push(nuevo);
  }

  limpiarPeriodoFormulario();
  cerrarModal("modalPeriodo");
  actualizarTodo();
}

function agregarOActualizarDia() {
  const nuevo = obtenerDiaFormulario();

  const error = validarDia(nuevo);
  if (error) {
    mostrarLoginModal("error", "Datos incompletos", error);
    return;
  }

  const conflicto = verificarViajeCercano(nuevo, diaEditando);

  if (conflicto.hayConflicto) {
    mostrarLoginModal(
      "error",
      "Viaje cercano detectado",
      `Ya existe un viaje cercano el ${formatearFecha(conflicto.fecha)}. ` +
      `Horario cargado: ${formatearHora(conflicto.nuevoHorario)} / ` +
      `Existente: ${formatearHora(conflicto.horarioExistente)} ` +
      `(diferencia: ${conflicto.diferencia} min). Revisá si corresponde cargarlo.`
    );
  }

  if (diaEditando !== null) {
    dias[diaEditando] = nuevo;
  } else {
    dias.push(nuevo);
  }

  limpiarDiaFormulario();
  cerrarModal("modalDia");
  actualizarTodo();
}

function editarPeriodo(index) {
  const p = periodos[index];

  setValor("pDesde", p.desde);
  setValor("pHasta", p.hasta);
  setValor("pHorarioIda", p.horarioIda);
  setValor("pSalidaIda", p.salidaIda);
  setValor("pLlegadaIda", p.llegadaIda);
  setValor("pPasajerosIda", p.pasajerosIda);
  setValor("pHorarioVuelta", p.horarioVuelta);
  setValor("pSalidaVuelta", p.salidaVuelta);
  setValor("pLlegadaVuelta", p.llegadaVuelta);
  setValor("pPasajerosVuelta", p.pasajerosVuelta);

  periodoEditando = index;

  $("tituloPeriodo").textContent = "Modificar período";
  $("guardarPeriodo").textContent = "Guardar cambios";

  abrirModal("modalPeriodo");
}

function editarDia(index) {
  const d = dias[index];

  setValor("dFecha", d.fecha);
  setValor("dTipo", d.tipo);

  setValor("dHorarioIda", d.ida?.horario || "");
  setValor("dSalidaIda", d.ida?.salida || "");
  setValor("dLlegadaIda", d.ida?.llegada || "");
  setValor("dPasajerosIda", d.ida?.pasajeros || "2");

  setValor("dHorarioVuelta", d.vuelta?.horario || "");
  setValor("dSalidaVuelta", d.vuelta?.salida || "");
  setValor("dLlegadaVuelta", d.vuelta?.llegada || "");
  setValor("dPasajerosVuelta", d.vuelta?.pasajeros || "3");

  diaEditando = index;

  $("tituloDia").textContent = "Modificar día";
  $("guardarDia").textContent = "Guardar cambios";

  actualizarBloquesDia();
  abrirModal("modalDia");
}

function eliminarPeriodo(index) {
  periodos.splice(index, 1);
  actualizarTodo();
}

function eliminarDia(index) {
  dias.splice(index, 1);
  actualizarTodo();
}

function pintarListaPeriodos() {
  const contenedor = $("listaPeriodos");
  contenedor.innerHTML = "";

  if (periodos.length === 0) {
    contenedor.innerHTML = `<div class="empty">Todavía no hay períodos cargados.</div>`;
    return;
  }

  periodos.forEach((p, index) => {
    const item = document.createElement("div");
    item.className = "item-card";

    item.innerHTML = `
      <strong>${textoPeriodo(p.desde, p.hasta)}</strong>
      <span>Ida: ${formatearHora(p.horarioIda) || "-"} | ${sanitizar(p.salidaIda) || "-"} → ${sanitizar(p.llegadaIda) || "-"}</span>
      <span>Vuelta: ${formatearHora(p.horarioVuelta) || "-"} | ${sanitizar(p.salidaVuelta) || "-"} → ${sanitizar(p.llegadaVuelta) || "-"}</span>
      <div class="item-actions"></div>
    `;

    const acciones = item.querySelector(".item-actions");

    const btnEditar = document.createElement("button");
    btnEditar.className = "edit-btn";
    btnEditar.type = "button";
    btnEditar.textContent = "Modificar";
    btnEditar.addEventListener("click", () => editarPeriodo(index));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "delete-btn";
    btnEliminar.type = "button";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminarPeriodo(index));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);

    contenedor.appendChild(item);
  });
}

function pintarListaDias() {
  const contenedor = $("listaDias");
  contenedor.innerHTML = "";

  if (dias.length === 0) {
    contenedor.innerHTML = `<div class="empty">Todavía no hay días cargados.</div>`;
    return;
  }

  dias.forEach((d, index) => {
    const partes = [];

    if (d.ida) partes.push(`Ida ${formatearHora(d.ida.horario) || "-"}`);
    if (d.vuelta) partes.push(`Vuelta ${formatearHora(d.vuelta.horario) || "-"}`);

    const item = document.createElement("div");
    item.className = "item-card";

    item.innerHTML = `
      <strong>${formatearFecha(d.fecha) || "Día no especificado"}</strong>
      <span>${textoTipoViaje(d.tipo)} | ${partes.join(" / ")}</span>
      <div class="item-actions"></div>
    `;

    const acciones = item.querySelector(".item-actions");

    const btnEditar = document.createElement("button");
    btnEditar.className = "edit-btn";
    btnEditar.type = "button";
    btnEditar.textContent = "Modificar";
    btnEditar.addEventListener("click", () => editarDia(index));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "delete-btn";
    btnEliminar.type = "button";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminarDia(index));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);

    contenedor.appendChild(item);
  });
}

function crearTablaViaje(tipo, filas) {
  const clase      = tipo === "vuelta" ? "vuelta" : "ida";
  const titulo     = tipo === "vuelta" ? "VIAJE DE VUELTA" : "VIAJE DE IDA";
  const ico        = ICO[clase];
  const subPeriodo = filas[0]?.subPeriodo || "";

  const tieneFecha = filas.some((x) => x.fechaLabel);

  const filasHTML = filas.map((f) => {
    const destacada = f.destacada ? ' class="row-destacada"' : "";
    const fechaCel  = f.fechaLabel
      ? `<td class="col-fecha">${sanitizar(f.fechaLabel)}${f.subLabel ? `<span class="sub-label">${sanitizar(f.subLabel)}</span>` : ""}</td>`
      : "";

    return `
      <tr${destacada}>
        ${tieneFecha ? fechaCel : ""}
        <td><strong>${sanitizar(formatearHora(f.horario)) || "-"}</strong></td>
        <td class="td-icono">${ico.casa} ${sanitizar(f.salida) || "-"}</td>
        <td class="td-icono">${ico.pin} ${sanitizar(f.llegada) || "-"}</td>
        <td>${textoPasajeros(f.pasajeros)}</td>
      </tr>
    `;
  }).join("");

  const colFecha = tieneFecha ? `<th class="col-fecha"></th>` : "";

  return `
    <div class="seccion-header ${clase}">
      ${ico.flecha}
      <h4>${titulo}${subPeriodo ? `<span class="sub-periodo">${sanitizar(subPeriodo)}</span>` : ""}</h4>
    </div>
    <table class="viaje-tabla ${clase}">
      <thead>
        <tr>
          ${colFecha}
          <th><span class="th-icono">${ico.reloj}</span>Horario</th>
          <th><span class="th-icono">${ico.casa}</span>Lugar de salida</th>
          <th><span class="th-icono">${ico.pin}</span>Lugar de llegada</th>
          <th><span class="th-icono">${ico.personas}</span>Pasajeros</th>
        </tr>
      </thead>
      <tbody>${filasHTML}</tbody>
    </table>
  `;
}

function pintarPreviewPeriodos() {
  const contenedor = $("previewContenido");
  contenedor.innerHTML = "";

  if (periodos.length === 0) {
    contenedor.innerHTML = `<article class="periodo-card"><div class="card-title">${ICO.calendario}<h3>Sin períodos cargados</h3></div></article>`;
    pintarResumen(["No hay períodos cargados todavía."]);
    return;
  }

  periodos.forEach((p) => {
    const card = document.createElement("article");
    card.className = "periodo-card";

    const idaHTML    = crearTablaViaje("ida",    [{ horario: p.horarioIda,    salida: p.salidaIda,    llegada: p.llegadaIda,    pasajeros: p.pasajerosIda,    subPeriodo: textoPeriodo(p.desde, p.hasta) }]);
    const vueltaHTML = crearTablaViaje("vuelta", [{ horario: p.horarioVuelta, salida: p.salidaVuelta, llegada: p.llegadaVuelta, pasajeros: p.pasajerosVuelta }]);

    card.innerHTML = `
      <div class="card-title">
        ${ICO.calendario}
        <h3>${textoPeriodo(p.desde, p.hasta)}</h3>
      </div>
      ${idaHTML}
      ${vueltaHTML}
    `;

    contenedor.appendChild(card);
  });

  pintarResumen(periodos.map((p) =>
    `${textoPeriodo(p.desde, p.hasta)}: ida ${formatearHora(p.horarioIda) || "-"} / vuelta ${formatearHora(p.horarioVuelta) || "-"}.`
  ));
}

function agruparDiasPorFecha() {
  const grupos = {};

  dias.forEach((dia) => {
    if (!grupos[dia.fecha]) grupos[dia.fecha] = [];

    if (dia.ida) {
      grupos[dia.fecha].push({ tipo: "ida", ...dia.ida });
    }

    if (dia.vuelta) {
      grupos[dia.fecha].push({ tipo: "vuelta", ...dia.vuelta });
    }
  });

  Object.keys(grupos).forEach((fecha) => {
    grupos[fecha].sort((a, b) =>
      (horaAMinutos(a.horario) || 0) - (horaAMinutos(b.horario) || 0)
    );
  });

  return grupos;
}

function pintarPreviewDias() {
  const contenedor = $("previewContenido");
  contenedor.innerHTML = "";

  if (dias.length === 0) {
    contenedor.innerHTML = `<article class="fecha-card"><div class="card-title">${ICO.calendario}<h3>Sin días cargados</h3></div></article>`;
    pintarResumen(["No hay días cargados todavía."]);
    return;
  }

  const grupos = agruparDiasPorFecha();

  // Agrupar por tipo de viaje para armar tablas con filas por fecha
  const idas    = [];
  const vueltas = [];

  Object.keys(grupos).sort().forEach((fecha) => {
    grupos[fecha].forEach((v) => {
      const fila = {
        horario: v.horario,
        salida: v.salida,
        llegada: v.llegada,
        pasajeros: v.pasajeros,
        fechaLabel: formatearFecha(fecha) || "Día no especificado"
      };
      if (v.tipo === "ida")    idas.push(fila);
      if (v.tipo === "vuelta") vueltas.push(fila);
    });
  });

  const card = document.createElement("article");
  card.className = "fecha-card";

  let html = "";
  if (idas.length > 0)    html += crearTablaViaje("ida",    idas);
  if (vueltas.length > 0) html += crearTablaViaje("vuelta", vueltas);

  card.innerHTML = html;
  contenedor.appendChild(card);

  const resumen = [];
  Object.keys(grupos).sort().forEach((fecha) => {
    const viajes = grupos[fecha]
      .map((v) => `${v.tipo} ${formatearHora(v.horario) || "sin horario"}`)
      .join(" / ");
    resumen.push(`${formatearFecha(fecha) || "Día no especificado"}: ${viajes}.`);
  });

  pintarResumen(resumen);
}

function pintarResumen(items) {
  const ul = $("previewResumen");
  ul.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
}

function cargarSelects() {
  const clientes  = dbCargar("clientes");
  const choferes  = dbCargar("choferes");
  const vehiculos = dbCargar("vehiculos");

  const selCliente = $("cliente");
  const selChofer  = $("chofer");
  const selVehiculo = $("vehiculo");

  const valorCliente  = selCliente.value;
  const valorChofer   = selChofer.value;
  const valorVehiculo = selVehiculo.value;

  selCliente.innerHTML  = `<option value="">— Seleccioná un cliente —</option>`;
  selChofer.innerHTML   = `<option value="">— Seleccioná un chofer —</option>`;
  selVehiculo.innerHTML = `<option value="">— Seleccioná un vehículo —</option>`;

  clientes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    if (c.nombre === valorCliente) opt.selected = true;
    selCliente.appendChild(opt);
  });

  choferes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    if (c.nombre === valorChofer) opt.selected = true;
    selChofer.appendChild(opt);
  });

  vehiculos.forEach((v) => {
    const label = `${v.marca} ${v.modelo}${v.patente ? ` — ${v.patente}` : ""}`;
    const opt = document.createElement("option");
    opt.value = `${v.marca} ${v.modelo}`;
    opt.textContent = label;
    if (opt.value === valorVehiculo) opt.selected = true;
    selVehiculo.appendChild(opt);
  });
}


  const modo = valor("modo");

  $("abrirModalPeriodo").classList.toggle("hidden", modo !== "periodo");
  $("abrirModalDia").classList.toggle("hidden", modo !== "dia");

  $("listaPeriodosBox").classList.toggle("hidden", modo !== "periodo");
  $("listaDiasBox").classList.toggle("hidden", modo !== "dia");
}

function actualizarTodo() {
  actualizarModo();

  $("previewCliente").textContent = valor("cliente") || "Sin especificar";
  $("previewChofer").textContent = valor("chofer") || "Sin especificar";
  $("previewVehiculo").textContent = valor("vehiculo") || "Vehículo no especificado";

  pintarListaPeriodos();
  pintarListaDias();

  if (valor("modo") === "periodo") {
    pintarPreviewPeriodos();
  } else {
    pintarPreviewDias();
  }
}

function guardarLocal() {
  const data = {
    cliente: valor("cliente"),
    chofer: valor("chofer"),
    vehiculo: valor("vehiculo"),
    modo: valor("modo"),
    periodos,
    dias
  };

  localStorage.setItem("cronograma-v4", JSON.stringify(data));
  mostrarLoginModal("ok", "Guardado", "Cronograma guardado en este dispositivo.");
}

function cargarLocal() {
  const raw = localStorage.getItem("cronograma-v4");

  if (!raw) {
    setValor("vehiculo", "Citroën C3");
    actualizarTodo();
    return;
  }

  try {
    const data = JSON.parse(raw);

    setValor("cliente", data.cliente);
    setValor("chofer", data.chofer);
    setValor("vehiculo", data.vehiculo || "Citroën C3");
    setValor("modo", data.modo || "periodo");

    periodos = Array.isArray(data.periodos) ? data.periodos : [];
    dias = Array.isArray(data.dias) ? data.dias : [];
  } catch (e) {
    console.warn("Datos guardados corruptos, se reinicia el cronograma.", e);
    localStorage.removeItem("cronograma-v4");
    setValor("vehiculo", "Citroën C3");
    periodos = [];
    dias = [];
  }

  actualizarTodo();
}

function limpiarTodo() {
  mostrarConfirm(
    "Limpiar todo",
    "¿Seguro que querés limpiar todo? Se perderán los datos no guardados.",
    () => {
      localStorage.removeItem("cronograma-v4");

      periodos = [];
      dias = [];

      setValor("cliente", "");
      setValor("chofer", "");
      setValor("vehiculo", "Citroën C3");
      setValor("modo", "periodo");

      limpiarPeriodoFormulario();
      limpiarDiaFormulario();
      actualizarTodo();
    }
  );
}

function descargarImagen() {
  actualizarTodo();

  html2canvas($("cronograma"), {
    scale: 2,
    backgroundColor: "#ffffff"
  }).then((canvas) => {
    const link = document.createElement("a");

    const cliente = valor("cliente")
      ? valor("cliente").replace(/\s+/g, "-").toLowerCase()
      : "cliente";

    link.download = `cronograma-${cliente}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function abrirPreviewMobile() {
  actualizarTodo();

  const clone = $("cronograma").cloneNode(true);
  $("previewMobileTarget").innerHTML = "";
  $("previewMobileTarget").appendChild(clone);

  abrirModal("previewModal");
}

["cliente", "chofer", "vehiculo", "modo"].forEach((id) => {
  $(id).addEventListener("input", actualizarTodo);
  $(id).addEventListener("change", actualizarTodo);
});

$("dTipo").addEventListener("change", actualizarBloquesDia);

$("abrirModalPeriodo").addEventListener("click", () => {
  limpiarPeriodoFormulario();
  abrirModal("modalPeriodo");
});

$("abrirModalDia").addEventListener("click", () => {
  limpiarDiaFormulario();
  abrirModal("modalDia");
});

$("guardarPeriodo").addEventListener("click", agregarOActualizarPeriodo);
$("guardarDia").addEventListener("click", agregarOActualizarDia);

$("guardar").addEventListener("click", guardarLocal);
$("descargar").addEventListener("click", descargarImagen);
$("limpiar").addEventListener("click", limpiarTodo);
$("verPreview").addEventListener("click", abrirPreviewMobile);

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => cerrarModal(btn.dataset.close));
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal(modal.id);
  });
});

function mostrarLoginModal(tipo, titulo, texto) {
  const modal = $("loginModal");
  const icon = $("loginModalIcon");

  $("loginModalTitle").textContent = titulo;
  $("loginModalText").textContent = texto;

  icon.className = `login-modal-icon ${tipo}`;
  icon.textContent = tipo === "ok" ? "✓" : "!";

  $("loginModalCancelBtn").classList.add("hidden");
  modal._confirmCallback = null;

  modal.classList.remove("hidden");
}

let _confirmCallback = null;

function mostrarConfirm(titulo, texto, onConfirmar) {
  const modal = $("loginModal");
  const icon = $("loginModalIcon");

  $("loginModalTitle").textContent = titulo;
  $("loginModalText").textContent = texto;

  icon.className = "login-modal-icon error";
  icon.textContent = "!";

  $("loginModalBtn").textContent = "Confirmar";
  $("loginModalCancelBtn").classList.remove("hidden");

  _confirmCallback = onConfirmar;

  modal.classList.remove("hidden");
}

function cerrarLoginModal() {
  $("loginModal").classList.add("hidden");
  $("loginModalBtn").textContent = "Aceptar";
  $("loginModalCancelBtn").classList.add("hidden");

  if (loginCorrectoPendiente) {
    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");
    localStorage.setItem("cronovic-login", "ok");
    loginCorrectoPendiente = false;
    actualizarTodo();
    return;
  }

  if (_confirmCallback) {
    const cb = _confirmCallback;
    _confirmCallback = null;
    cb();
  }
}

function cancelarConfirm() {
  $("loginModal").classList.add("hidden");
  $("loginModalBtn").textContent = "Aceptar";
  $("loginModalCancelBtn").classList.add("hidden");
  _confirmCallback = null;
}

function intentarLogin() {
  const user = valor("loginUser");
  const pass = valor("loginPass");

  if (!user || !pass) {
    mostrarLoginModal("error", "Datos incompletos", "Ingresá usuario y contraseña para continuar.");
    return;
  }

  if (user === LOGIN_USER && pass === LOGIN_PASS) {
    loginCorrectoPendiente = true;
    mostrarLoginModal("ok", "Ingreso correcto", "Bienvenida a CronoVic.");
    return;
  }

  mostrarLoginModal("error", "Acceso denegado", "Usuario o contraseña incorrectos.");
}

function verificarSesionLogin() {
  if (localStorage.getItem("cronovic-login") === "ok") {
    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");
  }
}

$("btnLogin").addEventListener("click", intentarLogin);
$("loginModalBtn").addEventListener("click", cerrarLoginModal);
$("loginModalCancelBtn").addEventListener("click", cancelarConfirm);

$("loginUser").addEventListener("keydown", (e) => {
  if (e.key === "Enter") intentarLogin();
});

$("loginPass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") intentarLogin();
});

$("cerrarSesion").addEventListener("click", () => {
  localStorage.removeItem("cronovic-login");
  location.reload();
});

verificarSesionLogin();
cargarLocal();
cargarSelects();
actualizarBloquesDia();
actualizarTodo();