<?php
require_once __DIR__ . "/helpers.php";
cors();

$usuario = requireLogin();
$db      = getDB();
$metodo  = $_SERVER["REQUEST_METHOD"];
$id      = isset($_GET["id"]) ? (int)$_GET["id"] : null;
$uid     = $usuario["id"];

// ── GET — listar ─────────────────────────────
if ($metodo === "GET") {
    $stmt = $db->prepare("SELECT * FROM clientes WHERE usuario_id = ? ORDER BY nombre");
    $stmt->execute([$uid]);
    responderOk($stmt->fetchAll());
}

// ── POST — crear ─────────────────────────────
if ($metodo === "POST") {
    $body   = bodyJSON();
    $nombre = trim(get($body, "nombre", ""));

    if (!$nombre) responderError(400, "El nombre es obligatorio.");

    $stmt = $db->prepare("INSERT INTO clientes (usuario_id, nombre, telefono, direccion) VALUES (?, ?, ?, ?)");
    $stmt->execute([$uid, $nombre, get($body, "telefono"), get($body, "direccion")]);

    responderOk(["id" => $db->lastInsertId()], "Cliente creado.");
}

// ── PUT — modificar ──────────────────────────
if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");

    $body   = bodyJSON();
    $nombre = trim(get($body, "nombre", ""));
    if (!$nombre) responderError(400, "El nombre es obligatorio.");

    // Solo puede editar sus propios registros
    $stmt = $db->prepare("UPDATE clientes SET nombre = ?, telefono = ?, direccion = ? WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$nombre, get($body, "telefono"), get($body, "direccion"), $id, $uid]);

    responderOk(null, "Cliente actualizado.");
}

// ── DELETE — eliminar ────────────────────────
if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");

    $stmt = $db->prepare("DELETE FROM clientes WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $uid]);

    responderOk(null, "Cliente eliminado.");
}

responderError(405, "Método no permitido.");
