<?php
require_once __DIR__ . "/../config.php";

// ── SESIÓN ──────────────────────────────────
function iniciarSesion(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_set_cookie_params([
            "lifetime" => SESSION_EXPIRE,
            "path"     => "/",
            "secure"   => APP_ENV === "prod",
            "httponly" => true,
            "samesite" => "Strict",
        ]);
        session_start();
    }
}

function usuarioActual(): array|null {
    iniciarSesion();
    return $_SESSION["usuario"] ?? null;
}

function requireLogin(): array {
    $u = usuarioActual();
    if (!$u) responderError(401, "No autenticado.");
    return $u;
}

function requireDev(): array {
    $u = requireLogin();
    if ($u["rol"] !== ROL_DEV) responderError(403, "Acceso denegado.");
    return $u;
}

// ── RESPUESTAS JSON ──────────────────────────
function responderJSON(mixed $data, int $code = 200): never {
    http_response_code($code);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function responderOk(mixed $data = null, string $mensaje = "ok"): never {
    responderJSON(["ok" => true, "mensaje" => $mensaje, "data" => $data]);
}

function responderError(int $code, string $mensaje): never {
    responderJSON(["ok" => false, "mensaje" => $mensaje], $code);
}

// ── INPUT ────────────────────────────────────
function bodyJSON(): array {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function get(array $data, string $key, mixed $default = null): mixed {
    return isset($data[$key]) && $data[$key] !== "" ? $data[$key] : $default;
}

// ── CORS (desarrollo local) ──────────────────
function cors(): void {
    if (APP_ENV === "dev") {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type");
        if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;
    }
}
