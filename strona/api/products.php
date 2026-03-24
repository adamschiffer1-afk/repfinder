<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$productsFile = dirname(__DIR__) . "/products.json";

if (!file_exists($productsFile)) {
    file_put_contents($productsFile, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function readProducts($filePath) {
    $raw = file_get_contents($filePath);
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        return [];
    }

    return $data;
}

function writeProducts($filePath, $products) {
    $json = json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($filePath, $json, LOCK_EX);
}

function getJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

function cleanValue($value) {
    if ($value === null) return "";
    return trim((string)$value);
}

function validateProduct($product) {
    if (cleanValue($product["Nazwa"] ?? "") === "") return "Podaj nazwę produktu.";
    if (cleanValue($product["Cena_USD"] ?? "") === "") return "Podaj cenę USD.";
    if (cleanValue($product["Kategoria"] ?? "") === "") return "Podaj kategorię.";
    if (cleanValue($product["WyswietlanaKategoria"] ?? "") === "") return "Podaj wyświetlaną kategorię.";
    if (cleanValue($product["Link_Zdjecie"] ?? "") === "") return "Podaj link do zdjęcia.";

    $hasShopLink =
        cleanValue($product["Link_Kakobuy"] ?? "") !== "" ||
        cleanValue($product["Link_Litbuy"] ?? "") !== "";

    if (!$hasShopLink) return "Podaj przynajmniej jeden link sklepu.";

    return "";
}

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    echo json_encode(readProducts($productsFile), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method === "POST") {
    $input = getJsonInput();
    $action = cleanValue($input["action"] ?? "");

    $products = readProducts($productsFile);

    if ($action === "create") {
        $product = $input["product"] ?? [];
        $error = validateProduct($product);

        if ($error !== "") {
            http_response_code(400);
            echo json_encode(["error" => $error], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $maxId = 0;
        foreach ($products as $item) {
            $itemId = (int)($item["id"] ?? 0);
            if ($itemId > $maxId) $maxId = $itemId;
        }

        $product["id"] = $maxId + 1;
        $products[] = $product;

        writeProducts($productsFile, $products);

        echo json_encode([
            "success" => true,
            "product" => $product
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === "update") {
        $product = $input["product"] ?? [];
        $productId = (int)($product["id"] ?? 0);

        if ($productId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Brak poprawnego ID produktu."], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $error = validateProduct($product);

        if ($error !== "") {
            http_response_code(400);
            echo json_encode(["error" => $error], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $found = false;

        foreach ($products as $index => $item) {
            if ((int)($item["id"] ?? 0) === $productId) {
                $products[$index] = $product;
                $found = true;
                break;
            }
        }

        if (!$found) {
            http_response_code(404);
            echo json_encode(["error" => "Nie znaleziono produktu do edycji."], JSON_UNESCAPED_UNICODE);
            exit;
        }

        writeProducts($productsFile, $products);

        echo json_encode([
            "success" => true,
            "product" => $product
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($action === "delete") {
        $id = (int)($input["id"] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Brak poprawnego ID produktu."], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $newProducts = array_values(array_filter($products, function ($item) use ($id) {
            return (int)($item["id"] ?? 0) !== $id;
        }));

        writeProducts($productsFile, $newProducts);

        echo json_encode([
            "success" => true
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === "replace_all") {
        $newProducts = $input["products"] ?? [];

        if (!is_array($newProducts)) {
            http_response_code(400);
            echo json_encode(["error" => "Niepoprawny format danych."], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $normalized = [];
        $nextId = 1;

        foreach ($newProducts as $product) {
            if (!is_array($product)) continue;

            $error = validateProduct($product);
            if ($error !== "") continue;

            $product["id"] = $nextId;
            $nextId += 1;
            $normalized[] = $product;
        }

        writeProducts($productsFile, $normalized);

        echo json_encode([
            "success" => true,
            "products" => $normalized
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(400);
    echo json_encode(["error" => "Nieznana akcja."], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"], JSON_UNESCAPED_UNICODE);