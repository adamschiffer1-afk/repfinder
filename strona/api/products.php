<?php
// Ustawienie nagłówka, żeby strona wiedziała, że to odpowiedź JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Odbiór danych wysłanych z Panelu Admina (z fetch)
$inputJSON = file_get_contents('php://input');

// Ścieżka do Twojego pliku z bazą produktów
$file = 'products.json';

// Zapisz dane do pliku
if (file_put_contents($file, $inputJSON) !== false) {
    http_response_code(200);
    echo json_encode(["status" => "success", "message" => "Zapisano pomyślnie"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Błąd zapisu. Sprawdź uprawnienia (CHMOD 777) pliku products.json"]);
}
?>