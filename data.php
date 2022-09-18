<?php
include_once('./init.php');

// Incoming path to which file we want to write or read
$path = $_REQUEST['path'] ?? $_REQUEST['p'] ?? '';
if(empty($path)) Utils::exitWithError('path was not supplied', 1001);
$path = strtolower($path);

// Incoming authentication to be allowed to do this request
$auth = Utils::getAuth();

// Get request body (json/string)
$input = file_get_contents('php://input');
$data = json_decode($input) ?? $input;

// Perform authorization check
if(empty($auth->hash) && $path === AUTH_PATH) {
    $newPassword = $data->password ?? '';
    if($newPassword) $data = (object) ['hash'=>Utils::sha256($newPassword)];
    else Utils::exitWithError('need to provide auth value to set it for future requests', 1002);
} elseif(empty($auth->hash) || empty($auth->password) || $auth->hash !== Utils::sha256($auth->password)) {
    // This path is used to check that we have a stored auth hash in the setup.
    if($path === AUTH_PATH && !empty($auth->hash)) {
        Utils::outputJson((object) ['hash'=>'']); // Faking output as to not include actual hash.
    } else { // Else, just throw an error that it has not been set.
        Utils::exitWithError(empty($auth->hash) ? 'authentication not yet set' : 'authentication did not validate', 1003);
    }
}

$method = strtolower($_SERVER['REQUEST_METHOD'] ?? '');
switch($method) {
    case 'post':
        $bytes = Files::write($path, $data);
        if($bytes !== false) http_response_code(200);
        else Utils::exitWithError('unable to write data', 1004);
        break;
    case 'put':
        $bytes = Files::write($path, $data, true);
        if($bytes !== false) http_response_code(200);
        else Utils::exitWithError('unable to append data', 1005);
        break;
    default:
        $data = Files::read($path);
        if(is_object($data) || is_array($data)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($data);
            exit;
        } else if($data !== null) {
            header('Content-Type: plain/text; charset=utf-8');
            echo strval($data);
            exit;
        } else {
            Utils::exitWithError('unable to read data', 1006);
        }
        break;
}