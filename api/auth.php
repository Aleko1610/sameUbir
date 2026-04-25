<?php
require_once __DIR__ . "/helpers.php";
cors();
iniciarSesion();

$metodo = $_SERVER["REQUEST_METHOD"];
$accion = $_GET["accion"] ?? "";

// ── GET /api/auth.php?accion=sesion ──────────
if ($metodo === "GET" && $accion === "sesion") {
    $u = usuarioActual();
    if ($u) {
        responderOk(["id" => $u["id"], "nombre" => $u["nombre"], "rol" => $u["rol"], "username" => $u["username"]]);
    } else {
        responderError(401, "No autenticado.");
    }
}

// ── POST /api/auth.php?accion=login ──────────
if ($metodo === "POST" && $accion === "login") {
    $body = bodyJSON();
    $username = trim(get($body, "username", ""));
    $password = trim(get($body, "password", ""));

    if (!$username || !$password) {
        responderError(400, "Usuario y contraseña son obligatorios.");
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE username = ? AND activo = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password"])) {
        responderError(401, "Usuario o contraseña incorrectos.");
    }

    $_SESSION["usuario"] = [
        "id"       => $user["id"],
        "username" => $user["username"],
        "nombre"   => $user["nombre"],
        "rol"      => $user["rol"],
    ];

    responderOk([
        "id"       => $user["id"],
        "nombre"   => $user["nombre"],
        "rol"      => $user["rol"],
        "username" => $user["username"],
    ], "Bienvenido, " . $user["nombre"] . ".");
}

// ── POST /api/auth.php?accion=logout ─────────
if ($metodo === "POST" && $accion === "logout") {
    session_destroy();
    responderOk(null, "Sesión cerrada.");
}

responderError(400, "Acción no reconocida.");
