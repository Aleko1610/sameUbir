<?php
require_once __DIR__ . "/helpers.php";
cors();

$usuario = requireLogin();
$db      = getDB();
$metodo  = $_SERVER["REQUEST_METHOD"];
$id      = isset($_GET["id"]) ? (int)$_GET["id"] : null;
$uid     = $usuario["id"];

// Migración segura: agregar columna estado si no existe
try {
    $db->exec("ALTER TABLE cronogramas ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente'");
} catch (Exception $e) {
    // La columna ya existe, ignorar
}

if ($metodo === "GET") {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM cronogramas WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, $uid]);
        $row = $stmt->fetch();
        if (!$row) responderError(404, "Cronograma no encontrado.");
        $datos = json_decode($row["datos"], true);
        $row["datos"] = $datos;
        responderOk($row);
    } else {
        $stmt = $db->prepare("SELECT id, estado, creado_en, actualizado_en, datos FROM cronogramas WHERE usuario_id = ? ORDER BY actualizado_en DESC");
        $stmt->execute([$uid]);
        $lista = $stmt->fetchAll();

        // Extraer cliente y modo del JSON de datos
        $resultado = array_map(function($row) {
            $datos = json_decode($row["datos"], true);
            return [
                "id"             => $row["id"],
                "estado"         => $row["estado"] ?? "pendiente",
                "creado_en"      => $row["creado_en"],
                "actualizado_en" => $row["actualizado_en"],
                "cliente"        => $datos["cliente"] ?? "",
                "modo"           => $datos["modo"]    ?? "",
            ];
        }, $lista);

        responderOk($resultado);
    }
}

if ($metodo === "POST") {
    $body  = bodyJSON();
    $datos = get($body, "datos");
    if (!$datos) responderError(400, "Los datos del cronograma son obligatorios.");
    $estado = $datos["estado"] ?? "pendiente";
    $stmt = $db->prepare("INSERT INTO cronogramas (usuario_id, estado, datos) VALUES (?, ?, ?)");
    $stmt->execute([$uid, $estado, json_encode($datos, JSON_UNESCAPED_UNICODE)]);
    responderOk(["id" => $db->lastInsertId()], "Cronograma guardado.");
}

if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");
    $body  = bodyJSON();
    $datos = get($body, "datos");
    if (!$datos) responderError(400, "Los datos del cronograma son obligatorios.");
    $estado = $datos["estado"] ?? "pendiente";
    $stmt = $db->prepare("UPDATE cronogramas SET datos = ?, estado = ?, actualizado_en = datetime('now') WHERE id = ? AND usuario_id = ?");
    $stmt->execute([json_encode($datos, JSON_UNESCAPED_UNICODE), $estado, $id, $uid]);
    responderOk(null, "Cronograma actualizado.");
}

if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");
    $stmt = $db->prepare("DELETE FROM cronogramas WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $uid]);
    responderOk(null, "Cronograma eliminado.");
}

responderError(405, "Método no permitido.");
