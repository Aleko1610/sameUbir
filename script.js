const $ = (id) => document.getElementById(id);

function actualizarCronograma() {
  const periodo = $("periodo").value;
  const excepcion = $("excepcion").value;

  const horarioIda = $("horarioIda").value;
  const salidaIda = $("salidaIda").value;
  const llegadaIda = $("llegadaIda").value;
  const pasajerosIda = $("pasajerosIda").value;

  const horarioVuelta = $("horarioVuelta").value;
  const salidaVuelta = $("salidaVuelta").value;
  const llegadaVuelta = $("llegadaVuelta").value;
  const pasajerosVuelta = $("pasajerosVuelta").value;

  $("txtPeriodo").textContent = periodo;
  $("txtExcepcion").textContent = excepcion;

  $("txtHorarioIda").textContent = horarioIda;
  $("txtSalidaIda").textContent = salidaIda;
  $("txtLlegadaIda").textContent = llegadaIda;
  $("txtPasajerosIda").textContent = pasajerosIda;

  $("txtHorarioVuelta").textContent = horarioVuelta;
  $("txtSalidaVuelta").textContent = salidaVuelta;
  $("txtLlegadaVuelta").textContent = llegadaVuelta;
  $("txtPasajerosVuelta").textContent = pasajerosVuelta;

  $("resPeriodo").textContent = `Período: ${periodo}`;
  $("resExcepcion").textContent = `Excepción: ${excepcion}`;
  $("resIda").textContent = `Ida: ${horarioIda}`;
  $("resVuelta").textContent = `Vuelta: ${horarioVuelta}`;
  $("resPasajeros").textContent = `Pasajeros: ${pasajerosIda} ida / ${pasajerosVuelta} vuelta`;
}

function descargarImagen() {
  actualizarCronograma();

  const cronograma = $("cronograma");

  html2canvas(cronograma, {
    scale: 2,
    backgroundColor: "#ffffff"
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "cronograma-viajes.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

$("actualizar").addEventListener("click", actualizarCronograma);
$("descargar").addEventListener("click", descargarImagen);

actualizarCronograma();