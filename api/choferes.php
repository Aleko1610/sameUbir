<?php
require_once __DIR__ . "/helpers.php";
cors();

$usuario = requireLogin();
$db      = getDB();
$metodo  = $_SERVER["REQUEST_METHOD"];
$id      = isset($_GET["id"]) ? (int)$_GET["id"] : null;
$uid     = $usuario["id"];

if ($metodo === "GET") {
    $stmt = $db->prepare("SELECT * FROM choferes WHERE usuario_id = ? ORDER BY nombre");
    $stmt->execute([$uid]);
    responderOk($stmt->fetchAll());
}

if ($metodo === "POST") {
    $body   = bodyJSON();
    $nombre = trim(get($body, "nombre", ""));
    if (!$nombre) responderError(400, "El nombre es obligatorio.");

    $stmt = $db->prepare("INSERT INTO choferes (usuario_id, nombre, telefono, licencia) VALUES (?, ?, ?, ?)");
    $stmt->execute([$uid, $nombre, get($body, "telefono"), get($body, "licencia")]);

    responderOk(["id" => $db->lastInsertId()], "Chofer creado.");
}

if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");
    $body   = bodyJSON();
    $nombre = trim(get($body, "nombre", ""));
    if (!$nombre) responderError(400, "El nombre es obligatorio.");

    $stmt = $db->prepare("UPDATE choferes SET nombre = ?, telefono = ?, licencia = ? WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$nombre, get($body, "telefono"), get($body, "licencia"), $id, $uid]);

    responderOk(null, "Chofer actualizado.");
}

if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");
    $stmt = $db->prepare("DELETE FROM choferes WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $uid]);
    responderOk(null, "Chofer eliminado.");
}

responderError(405, "Método no permitido.");
