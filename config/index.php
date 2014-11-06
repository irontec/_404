<?php
if (!array_key_exists('data', $_GET)) {
    die(json_encode(array('error' => 'Acceso denegado')));
}
$yaml = yaml_parse_file(__DIR__ . '/config.yaml');
$response = array();
if ($_GET['data'] == 'config') {
    $response = $yaml['config'];
} elseif (array_key_exists($_GET['data'], $yaml['map'])) {
    $response = $yaml['map'][$_GET['data']];
}
die(json_encode($response));