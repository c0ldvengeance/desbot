<?php
include_once('./inc/utils.php');

$method = $_SERVER['REQUEST_METHOD'];
$setting = $_GET['setting'] ?? null;
$password = getallheaders()['password'] ?? null;

$cfg = include_once('./config.php');
if($cfg->password != Utils::decode($password)) {
    http_response_code(403);
    exit("Unauthorized");
}
if($setting === null) {
    http_response_code(422);
    exit("Missing parameter(s)");
}
$filePath = getFilePath($setting);

if($method === 'POST') { 
    // Save settings
    $success = writeSettings($filePath);
    if($success) exit("Settings written");
    else {
        http_response_code(400);
        exit("Could not write file to disk");
    }
} else { 
    // Load settings
    if(!file_exists($filePath)) {
        http_response_code(404); 
        exit("File does not exist");
    }
    $contents = readSettings($filePath);
    header("Content-Type: application/json");
    exit(json_encode($contents));
}

function writeSettings($filePath) {
    $inputJson = file_get_contents('php://input');
    $inputRows = json_decode($inputJson);

    if(!is_object($inputRows) && !is_array($inputRows)) {
        return file_put_contents($filePath, $inputRows);
    }

    if(!is_array($inputRows)) $inputRows = [$inputRows];
    $input = array();
    foreach($inputRows as $row) {
        $result = [];
        foreach($row as $key => $value) {
            $value = str_replace(['|', ';'], ['', ''], $value);
            if(is_numeric($key)) $result[] = $value;
            else $result[] = "$key|$value";
        }
        $input[] = implode(';', $result);
    }
    $inputString = implode("\n", array_filter($input)); // Filter removes empty items
    return file_put_contents($filePath, $inputString);
}

function readSettings($filePath) {
    $outputCsv = str_replace("\r", '', file_get_contents($filePath));
    $outputRows = explode("\n", $outputCsv);
    $output = [];
    foreach($outputRows as $row) {
        $fields = explode(';', $row);
        $result = [];
        foreach($fields as $field) {
            if(strpos($field, '|') !== false) {
                $fieldParts = explode('|', $field);
                $result[$fieldParts[0]] = $fieldParts[1];
            } else {
                $result[] = $field;
            }
        }
        $output[] = $result;
    }
    return $output;
}

function getFilePath($filename) {
    $filename = preg_replace('/\W+/', '_', $filename);
    return "./settings/$filename.csv";
}