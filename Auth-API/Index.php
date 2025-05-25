<?php
header("Content-Type: application/json; charset=UTF-8");

$secretKey = "A097FA4F0BF1AC41931AAC438CF7684E4ED2985CCCC81F98A48488681CD14B47"; // Secret, parece ok
$request_url = $_SERVER['REQUEST_URI'];
$request_url = explode("?", $request_url)[0];

switch ($request_url) {
    case "/create":
        createUser();
        break; // falta o break aqui
    case "/GetToken":
        GetToken();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada']);
        exit;
}

function createUser()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        exit;
    }

    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    $name = $data["name"] ?? null;
    $lastname = $data["lastname"] ?? null;
    $email = $data["email"] ?? null;
    $password = $data["password"] ?? null;

    if (empty($name) || empty($lastname) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(["error" => "All fields are required"]);
        exit;
    }

    try {
        // Ajuste: conexão PDO
        $pdo = new PDO("mysql:host=host.docker.internal;dbname=Message;charset=utf8mb4", "root", "vi@@2022");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // CORREÇÃO: na query, o placeholder é ":password", mas você usou ":hashedPassword" no SQL
        // Altere para :password para manter padrão e evitar erro
        $sql = "INSERT INTO users (name, last_name, email, password) VALUES (:name, :lastname, :email, :password)";

        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ":name" => $name,
            ":lastname" => $lastname,
            ":email" => $email,
            ":password" => $hashedPassword
        ]);

        // Responder ao cliente
        http_response_code(201);
        echo json_encode([
            'status' => 'success',
            'message' => 'User created successfully',
            "id" => $pdo->lastInsertId(),
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => "Database error: " . $e
        ]);
    }
}

function GetToken(){
    
}
