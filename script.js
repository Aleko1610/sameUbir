const $ = (id) => document.getElementById(id);

let periodos = [];
let dias = [];

let periodoEditando = null;
let diaEditando = null;

function valor(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setValor(id, value) {
  const el = $(id);
  if (el) el.value = value || "";
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

function agregarOActualizarPeriodo() {
  const nuevo = obtenerPeriodoFormulario();

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

  const conflicto = verificarViajeCercano(nuevo, diaEditando);

  if (conflicto.hayConflicto) {
    alert(
      `Atención: ya existe un viaje cercano el ${formatearFecha(conflicto.fecha)}.\n\n` +
      `Horario cargado: ${formatearHora(conflicto.nuevoHorario)}\n` +
      `Horario existente: ${formatearHora(conflicto.horarioExistente)}\n` +
      `Diferencia: ${conflicto.diferencia} minutos.\n\n` +
      `Revisá si corresponde cargarlo.`
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
      <span>Ida: ${formatearHora(p.horarioIda) || "-"} | ${p.salidaIda || "-"} → ${p.llegadaIda || "-"}</span>
      <span>Vuelta: ${formatearHora(p.horarioVuelta) || "-"} | ${p.salidaVuelta || "-"} → ${p.llegadaVuelta || "-"}</span>

      <div class="item-actions">
        <button class="edit-btn" type="button" onclick="editarPeriodo(${index})">Modificar</button>
        <button class="delete-btn" type="button" onclick="eliminarPeriodo(${index})">Eliminar</button>
      </div>
    `;

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

      <div class="item-actions">
        <button class="edit-btn" type="button" onclick="editarDia(${index})">Modificar</button>
        <button class="delete-btn" type="button" onclick="eliminarDia(${index})">Eliminar</button>
      </div>
    `;

    contenedor.appendChild(item);
  });
}

function pintarPreviewPeriodos() {
  const contenedor = $("previewContenido");
  contenedor.innerHTML = "";

  if (periodos.length === 0) {
    contenedor.innerHTML = `
      <article class="periodo-card">
        <div class="card-title">
          <h3>Sin períodos cargados</h3>
        </div>
      </article>
    `;
    pintarResumen(["No hay períodos cargados todavía."]);
    return;
  }

  periodos.forEach((p) => {
    const card = document.createElement("article");
    card.className = "periodo-card";

    card.innerHTML = `
      <div class="card-title">
        <h3>${textoPeriodo(p.desde, p.hasta)}</h3>
      </div>

      ${crearBloqueViaje("ida", p.horarioIda, p.salidaIda, p.llegadaIda, p.pasajerosIda)}
      ${crearBloqueViaje("vuelta", p.horarioVuelta, p.salidaVuelta, p.llegadaVuelta, p.pasajerosVuelta)}
    `;

    contenedor.appendChild(card);
  });

  pintarResumen(periodos.map((p) => {
    return `${textoPeriodo(p.desde, p.hasta)}: ida ${formatearHora(p.horarioIda) || "-"} / vuelta ${formatearHora(p.horarioVuelta) || "-"}.`;
  }));
}

function agruparDiasPorFecha() {
  const grupos = {};

  dias.forEach((dia) => {
    if (!grupos[dia.fecha]) grupos[dia.fecha] = [];

    if (dia.ida) {
      grupos[dia.fecha].push({
        tipo: "ida",
        ...dia.ida
      });
    }

    if (dia.vuelta) {
      grupos[dia.fecha].push({
        tipo: "vuelta",
        ...dia.vuelta
      });
    }
  });

  Object.keys(grupos).forEach((fecha) => {
    grupos[fecha].sort((a, b) => {
      return (horaAMinutos(a.horario) || 0) - (horaAMinutos(b.horario) || 0);
    });
  });

  return grupos;
}

function pintarPreviewDias() {
  const contenedor = $("previewContenido");
  contenedor.innerHTML = "";

  if (dias.length === 0) {
    contenedor.innerHTML = `
      <article class="fecha-card">
        <div class="card-title">
          <h3>Sin días cargados</h3>
        </div>
      </article>
    `;
    pintarResumen(["No hay días cargados todavía."]);
    return;
  }

  const grupos = agruparDiasPorFecha();

  Object.keys(grupos)
    .sort()
    .forEach((fecha) => {
      const card = document.createElement("article");
      card.className = "fecha-card";

      const viajesHTML = grupos[fecha].map((v) => {
        return crearBloqueViaje(v.tipo, v.horario, v.salida, v.llegada, v.pasajeros);
      }).join("");

      card.innerHTML = `
        <div class="card-title">
          <h3>${formatearFecha(fecha) || "Día no especificado"}</h3>
        </div>

        ${viajesHTML}
      `;

      contenedor.appendChild(card);
    });

  const resumen = [];

  Object.keys(grupos)
    .sort()
    .forEach((fecha) => {
      const viajes = grupos[fecha]
        .map((v) => `${v.tipo} ${formatearHora(v.horario) || "sin horario"}`)
        .join(" / ");

      resumen.push(`${formatearFecha(fecha) || "Día no especificado"}: ${viajes}.`);
    });

  pintarResumen(resumen);
}

function crearBloqueViaje(tipo, horario, salida, llegada, pasajeros) {
  const clase = tipo === "vuelta" ? "vuelta" : "ida";
  const titulo = tipo === "vuelta" ? "Viaje de vuelta" : "Viaje de ida";

  return `
    <div class="viaje ${clase}">
      <h4>${titulo}</h4>
      <div class="data-grid">
        <div><span>Horario</span><strong>${formatearHora(horario) || "-"}</strong></div>
        <div><span>Salida</span><strong>${salida || "-"}</strong></div>
        <div><span>Llegada</span><strong>${llegada || "-"}</strong></div>
        <div><span>Pasajeros</span><strong>${textoPasajeros(pasajeros)}</strong></div>
      </div>
    </div>
  `;
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

function actualizarModo() {
  const modo = valor("modo");

  $("abrirModalPeriodo").classList.toggle("hidden", modo !== "periodo");
  $("abrirModalDia").classList.toggle("hidden", modo !== "dia");

  $("listaPeriodosBox").classList.toggle("hidden", modo !== "periodo");
  $("listaDiasBox").classList.toggle("hidden", modo !== "dia");
}

function actualizarTodo() {
  actualizarModo();

  $("previewCliente").textContent = `Cliente: ${valor("cliente") || "Sin especificar"}`;
  $("previewChofer").textContent = `Chofer: ${valor("chofer") || "Sin especificar"}`;
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
  alert("Cronograma guardado en este dispositivo.");
}

function cargarLocal() {
  const raw = localStorage.getItem("cronograma-v4");

  if (!raw) {
    setValor("vehiculo", "Citroën C3");
    actualizarTodo();
    return;
  }

  const data = JSON.parse(raw);

  setValor("cliente", data.cliente);
  setValor("chofer", data.chofer);
  setValor("vehiculo", data.vehiculo || "Citroën C3");
  setValor("modo", data.modo || "periodo");

  periodos = Array.isArray(data.periodos) ? data.periodos : [];
  dias = Array.isArray(data.dias) ? data.dias : [];

  actualizarTodo();
}

function limpiarTodo() {
  if (!confirm("¿Seguro que querés limpiar todo?")) return;

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

cargarLocal();
actualizarBloquesDia();
actualizarTodo();