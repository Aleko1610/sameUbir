<?php
require_once __DIR__ . "/helpers.php";
cors();

$usuario = requireLogin();
$db      = getDB();
$metodo  = $_SERVER["REQUEST_METHOD"];
$id      = isset($_GET["id"]) ? (int)$_GET["id"] : null;
$uid     = $usuario["id"];

if ($metodo === "GET") {
    $stmt = $db->prepare("SELECT * FROM vehiculos WHERE usuario_id = ? ORDER BY marca, modelo");
    $stmt->execute([$uid]);
    responderOk($stmt->fetchAll());
}

if ($metodo === "POST") {
    $body   = bodyJSON();
    $marca  = trim(get($body, "marca", ""));
    $modelo = trim(get($body, "modelo", ""));
    if (!$marca || !$modelo) responderError(400, "Marca y modelo son obligatorios.");

    $stmt = $db->prepare("INSERT INTO vehiculos (usuario_id, marca, modelo, patente, anio) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$uid, $marca, $modelo, get($body, "patente"), get($body, "anio")]);

    responderOk(["id" => $db->lastInsertId()], "Vehículo creado.");
}

if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");
    $body   = bodyJSON();
    $marca  = trim(get($body, "marca", ""));
    $modelo = trim(get($body, "modelo", ""));
    if (!$marca || !$modelo) responderError(400, "Marca y modelo son obligatorios.");

    $stmt = $db->prepare("UPDATE vehiculos SET marca = ?, modelo = ?, patente = ?, anio = ? WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$marca, $modelo, get($body, "patente"), get($body, "anio"), $id, $uid]);

    responderOk(null, "Vehículo actualizado.");
}

if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");
    $stmt = $db->prepare("DELETE FROM vehiculos WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $uid]);
    responderOk(null, "Vehículo eliminado.");
}

responderError(405, "Método no permitido.");
