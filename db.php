<?php
// Init
include_once './init.php';
$db = DB::get();

// Auth
Utils::checkAuth();

// Test
$method = strtolower($_SERVER['REQUEST_METHOD']);
if($method === 'head') {
    $ok = $db->test();
    http_response_code($ok ? 200 : 400);
    exit;
}

// Parameters
$isPost = $method === 'post';
$groupClass = $_GET['class'] ?? $_GET['groupClass'] ?? null;
if(!$groupClass) Utils::exitWithError('group class was not supplied in request', 2004);
$groupKey = $_GET['key'] ?? $_GET['groupKey'] ?? null;
$dataJson = file_get_contents('php://input'); // Raw JSON as a string.

// TODO: Add parameter for setting/config so we can use the same class for all DB interactions.
// Execute
$output = null;
if($isPost) {
    $output = $db->saveSetting(
        $groupClass,
        $groupKey,
        $dataJson
    );
} else {
    $output = $db->getSettings(
        $groupClass,
        $groupKey
    );
    if($groupKey) {
        $array = get_object_vars($output);
        $output = array_pop($array);
    }
}

// Output
$db->output($output);