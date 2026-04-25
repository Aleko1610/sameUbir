# CronoVic — Generador de Cronogramas de Viajes

App web para gestionar y exportar cronogramas de viajes por cliente. Incluye dashboard con gestión de usuarios, ABM de entidades, calendario de viajes y exportación a imagen PNG.

---

## Requisitos

- **XAMPP** con PHP 8.1+ y Apache
- Extensiones PDO y PDO_SQLite habilitadas (activas por defecto en XAMPP)
- Navegador moderno (Chrome, Firefox, Edge)

---

## Instalación local (XAMPP)

### Paso 1 — Copiar el proyecto
```
Windows: C:/xampp/htdocs/sameUbir/
Mac:     /Applications/XAMPP/htdocs/sameUbir/
Linux:   /opt/lampp/htdocs/sameUbir/
```

### Paso 2 — Permisos (Mac/Linux)
```bash
chmod 775 /opt/lampp/htdocs/sameUbir/db
```

### Paso 3 — Iniciar Apache en XAMPP

### Paso 4 — Instalar la base de datos
```
http://localhost/sameUbir/install.php
```
Debe mostrar "CronoVic instalado". Ejecutar una sola vez.

### Paso 5 — Acceder
```
http://localhost/sameUbir/dash.html
```

**Credenciales iniciales del dev:**
| Campo      | Valor    |
|------------|----------|
| Usuario    | `dev`    |
| Contraseña | `dev2026`|

> ⚠ Cambiar la contraseña desde Configuración antes de usar en producción.

---

## Migración de BD existente

Si ya tenías una BD de una versión anterior, la API aplica automáticamente la migración de la columna `estado` en cronogramas al primer request. No es necesario re-ejecutar `install.php`.

---

## Verificar que la API responde

```
http://localhost/sameUbir/api/auth.php?accion=sesion
```
Debe responder: `{"ok":false,"mensaje":"No autenticado.",...}`

---

## Habilitar PDO_SQLite en XAMPP (si no funciona)

1. XAMPP → Apache → Config → `php.ini`
2. Descomentar (quitar `;`):
```ini
extension=pdo_sqlite
extension=sqlite3
```
3. Reiniciar Apache

---

## Roles y permisos

| Acción                          | Dev | Chofer |
|---------------------------------|-----|--------|
| Crear/ver/editar cronogramas    | ✅  | ✅     |
| Ver viajes del día              | ✅  | ✅     |
| Gestionar clientes/choferes/veh | ✅  | ✅     |
| Ver datos de otros usuarios     | ✅  | ❌     |
| Crear/editar/eliminar usuarios  | ✅  | ❌     |
| Activar/desactivar usuarios     | ✅  | ❌     |
| Panel de administración         | ✅  | ❌     |

---

## Funcionalidades del dashboard

### Sidebar
- Contraer/expandir con botones separados (◀ para contraer, ▶ para expandir)
- En modo contraído muestra solo íconos con tooltips al hacer hover
- En mobile funciona como drawer (botón ☰ en el topbar)
- Estado colapsado se recuerda en localStorage

### Inicio
- Cards con estadísticas de cronogramas, clientes, choferes y vehículos

### Viajes de hoy
- Calendario mensual interactivo — hacer clic en cualquier día muestra los viajes de ese día
- Puntos de color en el calendario: naranja = pendiente, verde = completado, rojo = cancelado
- Viajes ordenados por horario con detalle completo (cliente, chofer, vehículo, salida, llegada, pasajeros)

### Cronogramas
- Formulario de creación con selects de clientes/choferes/vehículos
- Modos: por período (rango de fechas) o por día (fechas específicas)
- Vista previa en modal con el cronograma completo
- Descarga del cronograma como imagen PNG
- Al guardar limpia el formulario para crear uno nuevo

### Estados de cronograma
- Pendiente / Completado / Cancelado
- Se cambian desde el calendario de Viajes de hoy al hacer clic en un día

### Gestión (Clientes / Choferes / Vehículos)
- Cada entidad tiene su propia sección en el sidebar
- ABM completo: agregar, modificar, eliminar con confirmación

### Usuarios (solo Dev)
- Crear choferes con usuario y contraseña
- Activar/desactivar usuarios sin eliminarlos
- Cada usuario ve solo sus propios datos

### Configuración
- Cambio de nombre y contraseña del usuario logueado

---

## Producción (Hostinger)

1. Subir la carpeta al servidor vía FTP
2. Editar `config.php`:
```php
define("DB_DRIVER", "mysql");
define("APP_ENV",   "prod");
define("MYSQL_HOST", "tu-host");
define("MYSQL_DB",   "tu-base-de-datos");
define("MYSQL_USER", "tu-usuario");
define("MYSQL_PASS", "tu-contraseña");
```
3. Crear la BD en hPanel → Bases de datos → MySQL
4. Ejecutar `http://tu-dominio.com/sameUbir/install.php`
5. **Eliminar `install.php` del servidor**

---

## Endpoints de la API

| Método | URL                              | Acceso  |
|--------|----------------------------------|---------|
| POST   | `api/auth.php?accion=login`      | Todos   |
| POST   | `api/auth.php?accion=logout`     | Todos   |
| GET    | `api/auth.php?accion=sesion`     | Todos   |
| GET/POST/PUT/DELETE | `api/usuarios.php`  | Dev     |
| GET/POST/PUT/DELETE | `api/clientes.php`  | Todos   |
| GET/POST/PUT/DELETE | `api/choferes.php`  | Todos   |
| GET/POST/PUT/DELETE | `api/vehiculos.php` | Todos   |
| GET/POST/PUT/DELETE | `api/cronogramas.php`| Todos  |

---

## Estructura del proyecto

```
sameUbir/
├── dash.html           Dashboard principal (punto de entrada)
├── dash.js             Lógica del dashboard SPA
├── api.js              Cliente HTTP para la API
├── config.php          Conexión a BD (SQLite/MySQL)
├── install.php         Instalador inicial (ejecutar una vez)
├── styles.css          Estilos del cronograma exportable
├── index.html          Cronograma standalone (legacy)
├── script.js           Lógica del cronograma standalone
├── abm.html            ABM standalone (legacy)
├── abm.js              Lógica ABM standalone
├── admin.html          Panel admin standalone (legacy)
├── admin.js            Lógica admin standalone
├── api/
│   ├── helpers.php
│   ├── auth.php
│   ├── usuarios.php
│   ├── clientes.php
│   ├── choferes.php
│   ├── vehiculos.php
│   └── cronogramas.php
├── db/
│   └── cronovic.db     Base de datos SQLite (se genera al instalar)
├── icons/              Íconos PNG del cronograma exportable
└── img/                Imágenes (vehículo, etc.)
```

---

## PWA — Instalación como app en el celular

CronoVic incluye un `manifest.json` que permite instalarla como app nativa en cualquier dispositivo sin necesidad del Play Store ni App Store.

**Android (Chrome):**
1. Abrí `http://tu-servidor/sameUbir/dash.html` en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. La app aparece como ícono en el escritorio

**iPhone/iPad (Safari):**
1. Abrí la URL en Safari
2. Botón Compartir → "Agregar a pantalla de inicio"

**Desktop (Chrome/Edge):**
1. Abrí la URL
2. Hacé clic en el ícono de instalación en la barra de direcciones

> Para que funcione en producción, el servidor debe servir el contenido por HTTPS.
