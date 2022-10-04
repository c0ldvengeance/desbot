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
$groupClass = $_GET['class'] ?? $_GET['groupClass'] ?? null;
if($method !== 'get' && !$groupClass) Utils::exitWithError('group class was not supplied in request', 2004);
$groupKey = $_GET['key'] ?? $_GET['groupKey'] ?? null;
$dataJson = file_get_contents('php://input'); // Raw JSON as a string.

// Execute
$output = null;
switch($method) {
    case 'post':
        $output = $db->saveSetting(
            $groupClass,
            $groupKey,
            $dataJson
        );
        break;
    case 'delete':
        $output = $db->deleteSetting(
            $groupClass,
            $groupKey
        );
        break;
    default: // GET, etc
        if(!$groupClass) $output = $db->getSettingsClasses();
        else {
            $output = $db->getSettings(
                $groupClass,
                $groupKey
            );
            if($groupKey) {
                $array = is_object($output) ? get_object_vars($output) : $output;
                $output = array_pop($array);
            }
        }
        break;
}

// Output
$db->output($output);