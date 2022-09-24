<!DOCTYPE html>
<html lang="en">
<body>
<?php
include_once('./init.php');

// Error TODO: Do something with these later?
$missing = $_REQUEST['missing'] ?? '';
$missingName = $_REQUEST['missingName'] ?? '';

$code = $_REQUEST['code'] ?? '';
$scope = $_REQUEST['scope'] ?? '';
$state = $_REQUEST['state'] ?? '';
$gotAuthResponse = !empty($code) && !empty($scope) && !empty($state);
$scopes = [
    "bits:read",
    "chat:read",
    "chat:edit",
    "whispers:read",
    "whispers:edit",
    "channel:read:redemptions",
    "channel:read:subscriptions",
    "channel:manage:redemptions",
    "channel:manage:broadcast",
    "channel:manage:raids"
];

function getAuthUrl():string {
    global $scopes;
    $db = DB::get();
    $twitchClient = $db->getSettings('SettingTwitchClient', 'Main');
    $config = $twitchClient->Main;
    $url = 'https://id.twitch.tv/oauth2/authorize';
    $url .= "?client_id=$config->clientId";
    $url .= "&redirect_uri=$config->redirectUri";
    $url .= "&force_verify=true";
    $url .= "&response_type=code";
    $url .= '&scope='.implode(" ", $scopes);
    $url .= '&state='.rand(0, 1000000);
    return $url;
}

if(!$gotAuthResponse) { ?>
    <script>
        window.onload = ()=>{
            window.location.assign('<?=getAuthUrl()?>')
        }
    </script>
<?php } else {
    /**
     * We got a response so we are retrieving tokens.
     */
    $db = DB::get();
    $twitchClient = $db->getSettings('SettingTwitchClient', 'Main');
    $config = $twitchClient->Main;
    $result = Utils::postForm('https://id.twitch.tv/oauth2/token', [
        'client_id' => $config->clientId,
        'client_secret' => $config->clientSecret,
        'code' => $code,
        'grant_type' => 'authorization_code',
        'redirect_uri' => $config->redirectUri
    ]);
    $json = json_decode($result);
    $success = false;
    if($result && $json) {
        // Get user info so we know who to save tokens for.
        $userInfoArr = json_decode(Utils::get('https://api.twitch.tv/helix/users', [
            "Authorization: Bearer {$json->access_token}",
            "Client-Id: {$config->clientId}"
        ]));
        $userInfo = $userInfoArr->data[0] ?? (object) [];
        if($userInfo) {
            $success = $db->saveSetting('SettingTwitchTokens', 'Channel', json_encode([
                'userId'=> intval($userInfo->id),
                'accessToken' => $json->access_token,
                'refreshToken' => $json->refresh_token,
                'scope'=>implode(" ", $scopes)
            ]));
        }
    }
    ?>
    <script>
        window.onload = ()=>{
            window.opener['ReportTwitchOAuthResult']('<?=$success ? $userInfo->id : ''?>')
            window.close()
        }
    </script>
<?php
}
?>
</body>
</html>
