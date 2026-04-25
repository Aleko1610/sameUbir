<?php
// ══════════════════════════════════════════════
// CRONOVIC — Instalador
// Ejecutar UNA sola vez: http://localhost/sameUbir/install.php
// Eliminar o proteger este archivo en producción
// ══════════════════════════════════════════════

require_once __DIR__ . "/config.php";

$db = getDB();

// ── TABLAS ──────────────────────────────────

$db->exec("
    CREATE TABLE IF NOT EXISTS usuarios (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        nombre     TEXT NOT NULL,
        rol        TEXT NOT NULL DEFAULT 'chofer',
        activo     INTEGER NOT NULL DEFAULT 1,
        creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
    )
");

$db->exec("
    CREATE TABLE IF NOT EXISTS clientes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        nombre     TEXT NOT NULL,
        telefono   TEXT,
        direccion  TEXT,
        creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
");

$db->exec("
    CREATE TABLE IF NOT EXISTS choferes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        nombre     TEXT NOT NULL,
        telefono   TEXT,
        licencia   TEXT,
        creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
");

$db->exec("
    CREATE TABLE IF NOT EXISTS vehiculos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        marca      TEXT NOT NULL,
        modelo     TEXT NOT NULL,
        patente    TEXT,
        anio       TEXT,
        creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
");

$db->exec("
    CREATE TABLE IF NOT EXISTS cronogramas (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        cliente_id INTEGER,
        estado     TEXT NOT NULL DEFAULT 'pendiente',
        datos      TEXT NOT NULL,
        creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
    )
");

// ── USUARIO DEV INICIAL ──────────────────────
// Cambiá el username y password antes de usar en producción

$devUsername = "dev";
$devPassword = password_hash("dev2026", PASSWORD_DEFAULT);
$devNombre   = "Administrador";

$existe = $db->prepare("SELECT id FROM usuarios WHERE username = ?");
$existe->execute([$devUsername]);

if (!$existe->fetch()) {
    $stmt = $db->prepare("
        INSERT INTO usuarios (username, password, nombre, rol)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$devUsername, $devPassword, $devNombre, ROL_DEV]);
    $devCreado = true;
} else {
    $devCreado = false;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CronoVic — Instalación</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 560px; margin: 60px auto; padding: 0 20px; background: #f1f5f9; color: #1e293b; }
    .card { background: white; border-radius: 18px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,.1); }
    h1 { margin: 0 0 6px; font-size: 26px; }
    p { color: #64748b; }
    .ok   { background: #dcfce7; color: #166534; border-radius: 10px; padding: 12px 16px; margin: 10px 0; font-weight: 700; }
    .warn { background: #fef9c3; color: #854d0e; border-radius: 10px; padding: 12px 16px; margin: 10px 0; font-weight: 700; }
    .cred { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 15px; }
    .cred b { display: inline-block; width: 110px; color: #1e40af; }
    a { display: inline-block; margin-top: 20px; background: #1677d2; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; }
  </style>
</head>
<body>
<div class="card">
  <h1>✅ CronoVic instalado</h1>
  <p>Tablas creadas correctamente.</p>

  <?php if ($devCreado): ?>
    <div class="ok">Usuario dev creado exitosamente.</div>
    <div class="cred">
      <b>Usuario:</b> <?= htmlspecialchars($devUsername) ?><br>
      <b>Contraseña:</b> dev2026<br>
      <b>Rol:</b> Administrador (dev)
    </div>
    <div class="warn">⚠ Cambiá la contraseña del dev desde el panel de administración antes de usar en producción.</div>
  <?php else: ?>
    <div class="warn">El usuario dev ya existía, no se recreó.</div>
  <?php endif; ?>

  <div class="warn">⚠ Eliminá o protegé este archivo (install.php) antes de subir a producción.</div>

  <a href="dash.html">Ir al dashboard →</a>
</div>
</body>
</html>
