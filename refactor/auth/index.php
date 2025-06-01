<?php
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$redis = new Predis\Client([
    'scheme' => 'tcp',
    'host'   => 'redis',
    'port'   => 6379,
]);

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$uri = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

// POST /user
if ($method === 'POST' && $uri === '/user') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['name'], $data['lastName'], $data['email'], $data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON inválido ou campos obrigatórios ausentes']);
        exit;
    }

    $id = uniqid();
    $user = [
        'user_id' => $id,
        'name' => $data['name'],
        'lastName' => $data['lastName'],
        'email' => $data['email'],
        'password' => $data['password']
    ];

    $redis->set("user:$id", json_encode($user));
    echo json_encode(['message' => 'ok', 'user' => $user]);

// POST /token
} elseif ($method === 'POST' && $uri === '/token') {
    $data = json_decode(file_get_contents('php://input'), true);
    foreach ($redis->keys("user:*") as $key) {
        $user = json_decode($redis->get($key), true);
        if ($user['email'] === $data['email'] && $user['password'] === $data['password']) {
            $payload = ['userId' => $user['user_id'], 'password' => $user['password']];
            $jwt = JWT::encode($payload, 'secret', 'HS256');
            echo json_encode(['token' => $jwt]);
            exit;
        }
    }
    echo json_encode(['token' => false]);

// GET /token?user=
} elseif ($method === 'GET' && $uri === '/token') {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    
    $userId = $_GET['user'] ?? '';
    if (!$token) {
        echo json_encode(['auth' => false]);
        exit;
    }
    $user = json_decode($redis->get("user:$userId"), true);
    try {
        $decoded = JWT::decode($token, new Key('secret', 'HS256'));
        if ($decoded->userId === $user['user_id'] && $decoded->password === $user['password']) {
            echo json_encode(['auth' => true]);
            exit;
        }
    } catch (Exception $e) {
        // token inválido
    }
    echo json_encode(['auth' => false]);

// GET /user-list
} elseif ($method === 'GET' && $uri === '/user-list') {
    $result = [];
    foreach ($redis->keys("user:*") as $key) {
        $result[] = json_decode($redis->get($key), true);
    }
    echo json_encode($result);

// Not Found
} else {
    http_response_code(404);
    echo json_encode(['error' => 'endpoint not found']);
}
