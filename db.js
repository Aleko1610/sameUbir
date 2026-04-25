// ── CronoVic DB — localStorage compartido ──

const DB_KEYS = {
  clientes: "cronovic-clientes",
  choferes: "cronovic-choferes",
  vehiculos: "cronovic-vehiculos",
};

function dbCargar(entidad) {
  try {
    const raw = localStorage.getItem(DB_KEYS[entidad]);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`DB: error al cargar ${entidad}`, e);
    return [];
  }
}

function dbGuardar(entidad, lista) {
  try {
    localStorage.setItem(DB_KEYS[entidad], JSON.stringify(lista));
    return true;
  } catch (e) {
    console.warn(`DB: error al guardar ${entidad}`, e);
    return false;
  }
}

function dbAgregar(entidad, item) {
  const lista = dbCargar(entidad);
  const nuevo = { ...item, id: Date.now().toString() };
  lista.push(nuevo);
  dbGuardar(entidad, lista);
  return nuevo;
}

function dbActualizar(entidad, id, item) {
  const lista = dbCargar(entidad);
  const idx = lista.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  lista[idx] = { ...item, id };
  dbGuardar(entidad, lista);
  return true;
}

function dbEliminar(entidad, id) {
  const lista = dbCargar(entidad);
  const nueva = lista.filter((x) => x.id !== id);
  dbGuardar(entidad, nueva);
}
