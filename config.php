<?php
// ══════════════════════════════════════════════
// CRONOVIC — Configuración de base de datos
// ══════════════════════════════════════════════
// Para desarrollo local: DB_DRIVER = "sqlite"
// Para producción (Hostinger): DB_DRIVER = "mysql"
// ══════════════════════════════════════════════

define("DB_DRIVER", "sqlite");   // "sqlite" | "mysql"
define("APP_ENV",   "dev");      // "dev" | "prod"

// ── SQLite (local con XAMPP) ──
define("SQLITE_PATH", __DIR__ . "/db/cronovic.db");

// ── MySQL (Hostinger) ──
define("MYSQL_HOST", "localhost");
define("MYSQL_PORT", "3306");
define("MYSQL_DB",   "cronovic");
define("MYSQL_USER", "root");
define("MYSQL_PASS", "");

// ── Sesión ──
define("SESSION_NAME",   "cronovic_session");
define("SESSION_EXPIRE", 60 * 60 * 8); // 8 horas

// ── Roles ──
define("ROL_DEV",    "dev");
define("ROL_CHOFER", "chofer");

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (DB_DRIVER === "sqlite") {
        $pdo = new PDO("sqlite:" . SQLITE_PATH);
    } else {
        $dsn = "mysql:host=" . MYSQL_HOST . ";port=" . MYSQL_PORT . ";dbname=" . MYSQL_DB . ";charset=utf8mb4";
        $pdo = new PDO($dsn, MYSQL_USER, MYSQL_PASS);
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES,   false);

    if (DB_DRIVER === "sqlite") {
        $pdo->exec("PRAGMA journal_mode = WAL");
        $pdo->exec("PRAGMA foreign_keys = ON");
    }

    return $pdo;
}
