<?php
require_once __DIR__ . "/helpers.php";
cors();

$dev    = requireDev();
$db     = getDB();
$metodo = $_SERVER["REQUEST_METHOD"];
$id     = isset($_GET["id"]) ? (int)$_GET["id"] : null;

// ── GET — listar usuarios ────────────────────
if ($metodo === "GET") {
    $stmt = $db->query("SELECT id, username, nombre, rol, activo, creado_en FROM usuarios ORDER BY nombre");
    responderOk($stmt->fetchAll());
}

// ── POST — crear usuario ─────────────────────
if ($metodo === "POST") {
    $body    = bodyJSON();
    $username = trim(get($body, "username", ""));
    $password = trim(get($body, "password", ""));
    $nombre   = trim(get($body, "nombre", ""));
    $rol      = get($body, "rol", ROL_CHOFER);

    if (!$username || !$password || !$nombre) {
        responderError(400, "Usuario, contraseña y nombre son obligatorios.");
    }

    if (!in_array($rol, [ROL_DEV, ROL_CHOFER])) {
        responderError(400, "Rol inválido.");
    }

    // Verificar que el username no exista
    $existe = $db->prepare("SELECT id FROM usuarios WHERE username = ?");
    $existe->execute([$username]);
    if ($existe->fetch()) {
        responderError(409, "El nombre de usuario ya está en uso.");
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)");
    $stmt->execute([$username, $hash, $nombre, $rol]);

    responderOk(["id" => $db->lastInsertId()], "Usuario creado correctamente.");
}

// ── PUT — modificar usuario ──────────────────
if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");

    $body   = bodyJSON();
    $nombre = trim(get($body, "nombre", ""));
    $rol    = get($body, "rol", null);
    $activo = get($body, "activo", null);
    $password = trim(get($body, "password", ""));

    // Construir query dinámico solo con campos enviados
    $campos = [];
    $valores = [];

    if ($nombre)            { $campos[] = "nombre = ?";  $valores[] = $nombre; }
    if ($rol !== null)      { $campos[] = "rol = ?";     $valores[] = $rol; }
    if ($activo !== null)   { $campos[] = "activo = ?";  $valores[] = (int)$activo; }
    if ($password)          { $campos[] = "password = ?"; $valores[] = password_hash($password, PASSWORD_DEFAULT); }

    if (empty($campos)) responderError(400, "Nada que actualizar.");

    $valores[] = $id;
    $stmt = $db->prepare("UPDATE usuarios SET " . implode(", ", $campos) . " WHERE id = ?");
    $stmt->execute($valores);

    responderOk(null, "Usuario actualizado.");
}

// ── DELETE — eliminar usuario ────────────────
if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");

    // No permitir eliminar al dev logueado
    if ($id === $dev["id"]) {
        responderError(403, "No podés eliminar tu propio usuario.");
    }

    $stmt = $db->prepare("DELETE FROM usuarios WHERE id = ?");
    $stmt->execute([$id]);

    responderOk(null, "Usuario eliminado.");
}

responderError(405, "Método no permitido.");
