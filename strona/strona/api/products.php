<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// Ścieżka do bazy (plik o jeden folder wyżej)
$file = '../products.json';

// Pobieranie danych (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode([]);
    }
    exit;
}

// Zapisywanie danych (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    if (empty($json)) {
        echo json_encode(["status" => "error", "message" => "Brak danych"]);
        exit;
    }

    // Próba zapisu
    if (file_put_contents($file, $json) !== false) {
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Błąd zapisu. Ustaw CHMOD 777 na products.json"]);
    }
}
?>