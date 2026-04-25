<?php
require_once __DIR__ . "/helpers.php";
cors();

$usuario = requireLogin();
$db      = getDB();
$metodo  = $_SERVER["REQUEST_METHOD"];
$id      = isset($_GET["id"]) ? (int)$_GET["id"] : null;
$uid     = $usuario["id"];

if ($metodo === "GET") {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM cronogramas WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, $uid]);
        $row = $stmt->fetch();
        if (!$row) responderError(404, "Cronograma no encontrado.");
        $row["datos"] = json_decode($row["datos"], true);
        responderOk($row);
    } else {
        $stmt = $db->prepare("
            SELECT c.id, c.creado_en, c.actualizado_en,
                   json_extract(c.datos, '$.cliente') AS cliente,
                   json_extract(c.datos, '$.modo')    AS modo
            FROM cronogramas c
            WHERE c.usuario_id = ?
            ORDER BY c.actualizado_en DESC
        ");
        $stmt->execute([$uid]);
        responderOk($stmt->fetchAll());
    }
}

if ($metodo === "POST") {
    $body = bodyJSON();
    $datos = get($body, "datos");
    if (!$datos) responderError(400, "Los datos del cronograma son obligatorios.");

    $stmt = $db->prepare("INSERT INTO cronogramas (usuario_id, datos) VALUES (?, ?)");
    $stmt->execute([$uid, json_encode($datos, JSON_UNESCAPED_UNICODE)]);

    responderOk(["id" => $db->lastInsertId()], "Cronograma guardado.");
}

if ($metodo === "PUT") {
    if (!$id) responderError(400, "ID requerido.");
    $body  = bodyJSON();
    $datos = get($body, "datos");
    if (!$datos) responderError(400, "Los datos del cronograma son obligatorios.");

    $stmt = $db->prepare("
        UPDATE cronogramas
        SET datos = ?, actualizado_en = datetime('now')
        WHERE id = ? AND usuario_id = ?
    ");
    $stmt->execute([json_encode($datos, JSON_UNESCAPED_UNICODE), $id, $uid]);

    responderOk(null, "Cronograma actualizado.");
}

if ($metodo === "DELETE") {
    if (!$id) responderError(400, "ID requerido.");
    $stmt = $db->prepare("DELETE FROM cronogramas WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $uid]);
    responderOk(null, "Cronograma eliminado.");
}

responderError(405, "Método no permitido.");
