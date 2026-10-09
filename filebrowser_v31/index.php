<?php
// ── CONFIG ──────────────────────────────────────────────────
define('USERNAME',    'admin');
define('PASSWORD',    '443434');
define('ROOT_DIR',    '/mnt/');
define('SESSION_TTL', 3600);
define('MAX_UPLOAD',  500 * 1024 * 1024);
define('ALLOWED_EXT', '');

// Force UTF-8 Encoding
header('Content-Type: text/html; charset=utf-8');

// ── HELPERS ─────────────────────────────────────────────────
session_start();

function is_auth(): bool {
    return isset($_SESSION['auth'],$_SESSION['ts'])
        && $_SESSION['auth'] === true
        && (time()-$_SESSION['ts']) < SESSION_TTL;
}
function safe_path(string $rel): string|false {
    $root = realpath(ROOT_DIR);
    if (!$root) return false;
    if ($rel===''||$rel==='.') return $root;
    $full = realpath($root.DIRECTORY_SEPARATOR.ltrim($rel,'/\\'));
    if (!$full || !str_starts_with($full,$root)) return false;
    return $full;
}
function hsize(int $b): string {
    foreach(['B','KB','MB','GB','TB'] as $u){
        if($b<1024) return round($b,1).' '.$u;
        $b/=1024;
    }
    return round($b,1).' PB';
}
function ficon(string $e): string {
    return match(true){
        in_array($e,['jpg','jpeg','png','gif','webp','avif','bmp','svg'])=>'&#128444;',
        in_array($e,['mp4','mkv','avi','mov','webm','m4v','flv','wmv'])=>'&#127916;',
        in_array($e,['mp3','flac','ogg','wav','aac','m4a','opus'])=>'&#127925;',
        $e==='pdf'=>'&#128196;',
        in_array($e,['txt','log','md','srt','vtt'])=>'&#128221;',
        in_array($e,['zip','rar','7z','tar','gz','bz2'])=>'&#128451;',
        default=>'&#128206;',
    };
}
function is_img(string $e): bool { return in_array($e,['jpg','jpeg','png','gif','webp','avif','bmp','svg']); }
function is_aud(string $e): bool { return in_array($e,['mp3','flac','ogg','wav','aac','m4a','opus']); }
function is_vid(string $e): bool { return in_array($e,['mp4','mkv','webm','mov','m4v','wmv','avi','flv']); }

function subdirs(string $abs): array {
    $o=[];
    if(!is_dir($abs)) return $o;
    foreach(scandir($abs) as $x)
        if($x!=='.'&&$x!=='..'&&is_dir($abs.DIRECTORY_SEPARATOR.$x)) $o[]=$x;
    sort($o); return $o;
}
function build_tree(string $root,string $rel,int $d=0,int $max=5): array {
    if($d>$max) return [];
    $abs=$root.($rel !== '' ? DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $rel) : '');
    $nodes=[];
    foreach(subdirs($abs) as $dir){
        $cr=$rel !== '' ? $rel.'/'.$dir : $dir;
        $nodes[]=['name'=>$dir,'rel'=>$cr,'children'=>build_tree($root,$cr,$d+1,$max)];
    }
    return $nodes;
}
function render_tree(array $nodes,string $cur): void {
    foreach($nodes as $n){
        $hasCh  = !empty($n['children']);
        $active = $cur===$n['rel'];
        $anc    = $cur!==''&&str_starts_with($cur.'/',$n['rel'].'/');
        $open   = $active||$anc;
        $ac     = $active?' active':'';
        $oc     = $open?' open':'';
        $nm     = htmlspecialchars($n['name']);
        $url    = '?path='.urlencode($n['rel']);
        
        echo "<div class=\"tree-node\">";
        echo "<div class=\"tree-row{$ac}\">";
        if($hasCh)
            echo "<span class=\"tree-toggle{$oc}\" onclick=\"tgTree(this, event)\">&#9654;</span>";
        else
            echo "<span class=\"tree-toggle\" style=\"opacity:0\">&#9654;</span>";
        echo "<a href=\"{$url}\" class=\"tree-link\"><span class=\"tree-icon\">&#128193;</span><span class=\"tree-name\">{$nm}</span></a></div>";
        if($hasCh){
            echo "<div class=\"tree-children{$oc}\">";
            render_tree($n['children'],$cur);
            echo "</div>";
        }
        echo "</div>";
    }
}

// ── ACTIONS ─────────────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='login'){
    if($_POST['user']===USERNAME&&$_POST['pass']===PASSWORD){
        $_SESSION['auth']=true; $_SESSION['ts']=time();
    } else { $_SESSION['lerr']='Credențiale greșite.'; }
    header('Location: '.strtok($_SERVER['REQUEST_URI'],'?')); exit;
}
if(isset($_GET['logout'])){ session_destroy(); header('Location: '.strtok($_SERVER['REQUEST_URI'],'?')); exit; }
if(!is_auth()) goto login_page;
$_SESSION['ts']=time();

// STREAMING WITH RANGE HEADERS FIX
if(isset($_GET['dl'])){
    $p=safe_path($_GET['dl']);
    if($p&&is_file($p)){
        $e=strtolower(pathinfo($p,PATHINFO_EXTENSION));
        $inline=in_array($e,['jpg','jpeg','png','gif','webp','avif','svg','bmp','mp4','webm','mov','m4v','wmv','avi','mkv','mp3','ogg','wav','flac','aac','m4a','opus','pdf','txt','log','md','srt','vtt']);
        $mime=mime_content_type($p)?:'application/octet-stream';
        $size=filesize($p);

        header('Content-Type: '.$mime);
        header('Content-Disposition: '.($inline?'inline':'attachment').'; filename="'.basename($p).'"');
        header('Accept-Ranges: bytes');

        if (isset($_SERVER['HTTP_RANGE'])) {
            list($param, $range) = explode('=', $_SERVER['HTTP_RANGE'], 2);
            if ($param === 'bytes' && strpos($range, ',') === false && strpos($range, '-') !== false) {
                list($start, $end) = explode('-', $range, 2);
                $start = ($start === '') ? 0 : intval($start);
                $end = ($end === '') ? $size - 1 : intval($end);

                if ($end >= $size) $end = $size - 1;

                if ($start === 0 && $range[0] === '-') {
                    $suffix = intval($end);
                    if ($suffix <= 0) {
                        header('HTTP/1.1 416 Requested Range Not Satisfiable');
                        header("Content-Range: bytes */$size");
                        exit;
                    }
                    $start = max(0, $size - $suffix);
                    $end = $size - 1;
                }

                if ($start > $end || $start >= $size) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes */$size");
                    exit;
                }
                $length = $end - $start + 1;
                header('HTTP/1.1 206 Partial Content');
                header("Content-Range: bytes $start-$end/$size");
                header("Content-Length: $length");

                $fp = fopen($p, 'rb');
                fseek($fp, $start);
                $buffer = 8192;
                while (!feof($fp) && ($pos = ftell($fp)) <= $end) {
                    if ($pos + $buffer > $end) {
                        $buffer = $end - $pos + 1;
                    }
                    echo fread($fp, $buffer);
                    flush();
                }
                fclose($fp);
                exit;
            }
        }

        header("Content-Length: $size");
        readfile($p);
    }
    exit;
}

if($_SERVER['REQUEST_METHOD']==='POST'&&isset($_FILES['file'])){
    $dir=safe_path($_POST['dir']??'');
    if($dir&&is_dir($dir)&&is_writable($dir)){
        $f=$_FILES['file'];
        if($f['error']===UPLOAD_ERR_OK&&$f['size']<=MAX_UPLOAD){
            $nm=preg_replace('/[^\w\-. ]/u','_',basename($f['name']));
            if(ALLOWED_EXT!==''){
                $ex=strtolower(pathinfo($nm,PATHINFO_EXTENSION));
                $al=array_map('trim',explode(',',strtolower(ALLOWED_EXT)));
                if(!in_array($ex,$al)){ $_SESSION['msg']=['err','Extensie nepermisă: '.$ex]; goto redir; }
            }
            $_SESSION['msg']=move_uploaded_file($f['tmp_name'],$dir.DIRECTORY_SEPARATOR.$nm)
                ?['ok','Upload reușit: '.$nm]:['err','Eroare la salvare.'];
        } else {
            $ec=[2=>'Prea mare',3=>'Incomplet',4=>'Niciun fișier',6=>'No tmp',7=>'Nu pot scrie'];
            $_SESSION['msg']=['err',$ec[$f['error']]??'Eroare.'];
        }
    } else { $_SESSION['msg']=['err','Director invalid.']; }
    redir: header('Location: ?path='.urlencode(ltrim($_POST['dir']??'','/\\')));  exit;
}

// ── TRASH (XDG în ROOT_DIR/.Trash) ──────────────────────────
function trash_base():string{
    $uid=function_exists('posix_getuid')?posix_getuid():0;
    return rtrim(realpath(ROOT_DIR),DIRECTORY_SEPARATOR).'/.Trash-'.$uid;
}
function trash_ensure():bool{
    foreach([trash_base(),trash_base().'/files',trash_base().'/info'] as $d)
        if(!is_dir($d)&&!mkdir($d,0755,true)) return false;
    return true;
}
function trash_unique(string $name):string{
    $f=trash_base().'/files'; $i=trash_base().'/info';
    $ext=pathinfo($name,PATHINFO_EXTENSION);
    $base=$ext?substr($name,0,-(strlen($ext)+1)):$name;
    $out=$name; $n=1;
    while(file_exists($f.'/'.$out)||file_exists($i.'/'.$out.'.trashinfo')){
        $out=$ext?$base.'_'.$n.'.'.$ext:$base.'_'.$n; $n++;
    }
    return $out;
}

if(isset($_POST['action'])&&$_POST['action']==='trash'){
    $isXhr=!empty($_POST['_xhr']);
    $rel_target=trim($_POST['target']??'','/\\');
    $src=safe_path($rel_target);
    if(!$src||(!is_file($src)&&!is_dir($src))){
        if($isXhr){ header('Content-Type: application/json'); echo json_encode(['ok'=>false,'msg'=>'Fișier invalid']); exit; }
        $_SESSION['msg']=['err','Fișier invalid.']; goto trash_redir;
    }
    if(!trash_ensure()){
        if($isXhr){ header('Content-Type: application/json'); echo json_encode(['ok'=>false,'msg'=>'Nu pot crea .Trash-0']); exit; }
        $_SESSION['msg']=['err','Nu pot crea .Trash-0']; goto trash_redir;
    }
    $orig=$src; $sn=trash_unique(basename($src));
    $ti="[Trash Info]\nPath=".str_replace('\\','/',$orig)."\nDeletionDate=".date('Y-m-d\TH:i:s')."\n";
    if(rename($src,trash_base().'/files/'.$sn)&&file_put_contents(trash_base().'/info/'.$sn.'.trashinfo',$ti)!==false){
        if($isXhr){ header('Content-Type: application/json'); echo json_encode(['ok'=>true,'msg'=>htmlspecialchars(basename($src)).' → Trash']); exit; }
        $_SESSION['msg']=['ok',htmlspecialchars(basename($src)).' → Trash'];
    } else {
        if(file_exists(trash_base().'/files/'.$sn)) rename(trash_base().'/files/'.$sn,$src);
        if($isXhr){ header('Content-Type: application/json'); echo json_encode(['ok'=>false,'msg'=>'Eroare la trash']); exit; }
        $_SESSION['msg']=['err','Eroare la trash.'];
    }
    trash_redir: header('Location: ?path='.urlencode(trim($_POST['dir']??'','/\\'))); exit;
}

// ── TRASH RESTORE ────────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='trash_restore'){
    $sn=basename($_POST['stored']??'');
    $sf=trash_base().'/files/'.$sn; $si=trash_base().'/info/'.$sn.'.trashinfo';
    if(!file_exists($sf)){ $_SESSION['msg']=['err','Negăsit în Trash.']; header('Location: ?path=.Trash'); exit; }
    $orig='';
    if(file_exists($si)) foreach(file($si) as $l) if(str_starts_with($l,'Path=')){ $orig=trim(substr($l,5)); break; }
    if(!$orig){ $_SESSION['msg']=['err','Lipsește calea originală.']; header('Location: ?path=.Trash'); exit; }
    $root=realpath(ROOT_DIR);
    $dest=$root.DIRECTORY_SEPARATOR.ltrim(str_replace('/',DIRECTORY_SEPARATOR,$orig),$root.DIRECTORY_SEPARATOR);
    // dacă orig e absolut și în afara root, folosim basename în root
    if(!str_starts_with(realpath(dirname($dest))??'',$root)) $dest=$root.DIRECTORY_SEPARATOR.basename($orig);
    if(file_exists($dest)){ $_SESSION['msg']=['err','Există deja la destinație.']; header('Location: ?path=.Trash'); exit; }
    if(!is_dir(dirname($dest))) mkdir(dirname($dest),0755,true);
    if(rename($sf,$dest)){ @unlink($si); $_SESSION['msg']=['ok',htmlspecialchars($sn).' restaurat']; }
    else $_SESSION['msg']=['err','Eroare la restaurare.'];
    header('Location: ?path=.Trash'); exit;
}

// ── TRASH DELETE DEFINITIV ───────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='trash_delete'){
    $sn=basename($_POST['stored']??'');
    function rmdirr(string $p):void{ if(is_dir($p)){ foreach(scandir($p) as $x) if($x!=='.'&&$x!='..') rmdirr($p.DIRECTORY_SEPARATOR.$x); rmdir($p); } else @unlink($p); }
    rmdirr(trash_base().'/files/'.$sn); @unlink(trash_base().'/info/'.$sn.'.trashinfo');
    $_SESSION['msg']=['ok','Șters definitiv: '.htmlspecialchars($sn)];
    header('Location: ?path=.Trash'); exit;
}

// ── TRASH EMPTY ALL ──────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='trash_empty'){
    $fd=trash_base().'/files'; $id=trash_base().'/info'; $cnt=0;
    if(is_dir($fd)) foreach(scandir($fd) as $x){ if($x==='.'||$x==='..') continue; rmdirr($fd.'/'.$x); @unlink($id.'/'.$x.'.trashinfo'); $cnt++; }
    $_SESSION['msg']=['ok','Coș golit ('.$cnt.' elemente)'];
    header('Location: ?path=.Trash'); exit;
}

// ── COPY ITEM ────────────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='copy_item'){
    $src=safe_path(trim($_POST['src']??'','/\\')); $dd=safe_path(trim($_POST['dst_dir']??'','/\\'));
    if($src&&$dd&&is_dir($dd)&&is_writable($dd)){
        $n=basename($src); $dst=$dd.'/'.$n;
        if(file_exists($dst)){ $e=pathinfo($n,PATHINFO_EXTENSION); $b=$e?substr($n,0,-(strlen($e)+1)):$n; $dst=$dd.'/'.($e?$b.' (copie).'.$e:$b.' (copie)'); }
        function rcopy(string $s,string $d):bool{ if(is_dir($s)){ if(!mkdir($d,0755,true)) return false; foreach(scandir($s) as $f) if($f!=='.'&&$f!='..') rcopy($s.'/'.$f,$d.'/'.$f); return true; } return copy($s,$d); }
        $_SESSION['msg']=rcopy($src,$dst)?['ok','Copiat: '.$n]:['err','Eroare copiere.'];
    } else $_SESSION['msg']=['err','Destinație invalidă.'];
    header('Location: ?path='.urlencode(trim($_POST['dst_dir']??'','/\\'))); exit;
}

// ── MOVE ITEM ────────────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='move_item'){
    $src=safe_path(trim($_POST['src']??'','/\\')); $dd=safe_path(trim($_POST['dst_dir']??'','/\\'));
    if($src&&$dd&&is_dir($dd)&&is_writable($dd)){
        $n=basename($src); $dst=$dd.'/'.$n;
        if(file_exists($dst)){ $e=pathinfo($n,PATHINFO_EXTENSION); $b=$e?substr($n,0,-(strlen($e)+1)):$n; $dst=$dd.'/'.($e?$b.' (mutat).'.$e:$b.' (mutat)'); }
        $_SESSION['msg']=rename($src,$dst)?['ok','Mutat: '.$n]:['err','Eroare mutare.'];
    } else $_SESSION['msg']=['err','Destinație invalidă.'];
    header('Location: ?path='.urlencode(trim($_POST['dst_dir']??'','/\\'))); exit;
}

// ── NEW FOLDER ────────────────────────────────────────────────
if(isset($_POST['action'])&&$_POST['action']==='new_folder'){
    $dir=safe_path(trim($_POST['dir']??'','/\\')); $nm=preg_replace('/[^\w\-. ]/u','_',trim($_POST['name']??''));
    if($dir&&is_dir($dir)&&is_writable($dir)&&$nm!==''){
        $t=$dir.'/'.$nm;
        if(is_dir($t)) $_SESSION['msg']=['err','Există deja.'];
        elseif(mkdir($t,0755)) $_SESSION['msg']=['ok','Folder creat: '.$nm];
        else $_SESSION['msg']=['err','Nu pot crea folderul.'];
    } else $_SESSION['msg']=['err','Parametri invalizi.'];
    header('Location: ?path='.urlencode(trim($_POST['dir']??'','/\\'))); exit;
}

// ── BROWSE ──────────────────────────────────────────────────
$rel=trim($_GET['path']??'','/\\');
$is_trash = ($rel==='.Trash');

if($is_trash){
    $path = trash_base();
    if(!is_dir($path)){ $path=null; }
    $trash_items=[];
    if($path){
        $fd=$path.'/files'; $id=$path.'/info';
        if(is_dir($fd)) foreach(scandir($fd) as $it){
            if($it==='.'||$it==='..') continue;
            $full=$fd.'/'.$it; $orig=''; $del='';
            $inf=$id.'/'.$it.'.trashinfo';
            if(file_exists($inf)) foreach(file($inf) as $l){
                if(str_starts_with($l,'Path=')) $orig=trim(substr($l,5));
                if(str_starts_with($l,'DeletionDate=')) $del=trim(substr($l,13));
            }
            $ext=strtolower(pathinfo($it,PATHINFO_EXTENSION));
            $trash_items[]=['stored'=>$it,'name'=>basename($orig)?:$it,'orig'=>$orig,'del'=>$del,
                'is_dir'=>is_dir($full),'size'=>is_file($full)?filesize($full):0,
                'mtime'=>filemtime($full),'ext'=>$ext,'is_img'=>is_img($ext)];
        }
        usort($trash_items,fn($a,$b)=>strcmp($b['del'],$a['del']));
    }
    $items=[]; $crumbs=[];
} else {
    $path=safe_path($rel);
    if(!$path||!is_dir($path)){ $rel=''; $path=realpath(ROOT_DIR); }
    $items=[];
    foreach(scandir($path) as $it){
        if($it==='.'||$it==='..') continue;
        $full=$path.DIRECTORY_SEPARATOR.$it;
        $ri=($rel?$rel.'/':'').$it;
        if(is_dir($full)){
            $items[]=['name'=>$it,'rel'=>$ri,'is_dir'=>true,'mtime'=>filemtime($full),
                      'count'=>count(array_filter(scandir($full),fn($x)=>$x!=='.'&&$x!=='..')),
                      'size'=>0,'ext'=>'','is_img'=>false,'is_aud'=>false,'is_vid'=>false];
        } else {
            $ex=strtolower(pathinfo($it,PATHINFO_EXTENSION));
            $items[]=['name'=>$it,'rel'=>$ri,'is_dir'=>false,'mtime'=>filemtime($full),
                      'size'=>filesize($full),'ext'=>$ex,'is_img'=>is_img($ex),'is_aud'=>is_aud($ex),'is_vid'=>is_vid($ex)];
        }
    }
    usort($items,fn($a,$b)=>strcasecmp($a['name'],$b['name']));
    $crumbs=[];
    if($rel){ $acc=''; foreach(explode('/',$rel) as $p){ $acc=$acc?$acc.'/'.$p:$p; $crumbs[]=['name'=>$p,'rel'=>$acc]; } }
    $trash_items=[];
}
$tree=build_tree(realpath(ROOT_DIR),'');
$msg=$_SESSION['msg']??null; unset($_SESSION['msg']);

// ── LOGIN PAGE ───────────────────────────────────────────────
login_page:
if(!is_auth()):
$err=$_SESSION['lerr']??''; unset($_SESSION['lerr']);
?><!DOCTYPE html>
<html lang="ro"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f0f0f;color:#e0e0e0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:2.2rem;width:320px}
h2{margin-bottom:1.5rem;font-size:1rem;color:#999;font-weight:500}
input{width:100%;padding:.65rem .9rem;background:#111;border:1px solid #2e2e2e;border-radius:6px;color:#e0e0e0;margin-bottom:.75rem;font-size:.93rem}
input:focus{outline:none;border-color:#444}
button{width:100%;padding:.68rem;background:#2563eb;border:none;border-radius:6px;color:#fff;font-size:.93rem;cursor:pointer}
button:hover{background:#1d4ed8}
.err{color:#f87171;font-size:.83rem;margin-bottom:.75rem;padding:.5rem .7rem;background:#2d0a0a;border-radius:4px}
</style></head><body>
<div class="box">
  <h2>&#128193; Media Browser</h2>
  <?php if($err): ?><div class="err"><?=htmlspecialchars($err)?></div><?php endif ?>
  <form method="post">
    <input type="hidden" name="action" value="login">
    <input type="text" name="user" placeholder="Username" autocomplete="username" required autofocus>
    <input type="password" name="pass" placeholder="Parola" autocomplete="current-password" required>
    <button type="submit">Intra</button>
  </form>
</div></body></html>
<?php exit; endif; ?>
<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
  (function() {
    var savedTheme = localStorage.getItem('mb-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    var savedView = localStorage.getItem('mb-view') || 'grid';
    document.documentElement.setAttribute('data-view', savedView);
    var savedW = parseInt(localStorage.getItem('mb-sbw') || '0');
    if(savedW >= 120) document.documentElement.style.setProperty('--sbw', savedW + 'px');
    var savedThumb = parseInt(localStorage.getItem('mb-thumb-size') || '130');
    document.documentElement.style.setProperty('--thumb-size', savedThumb + 'px');
  })();
</script>
<title>Media Browser<?=$rel?' — '.htmlspecialchars(basename($rel)):''?></title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css" />
<link rel="stylesheet" href="style.css">
</head><body>

<!-- TOPBAR -->
<div class="topbar">
  <div class="topbar-row1">
    <span class="topbar-logo">&#128193;</span>
    <span class="topbar-path">
      <a href="?path=">root</a>
      <?php foreach($crumbs as $c): ?>
      / <a href="?path=<?=urlencode($c['rel'])?>"><?=htmlspecialchars($c['name'])?></a>
      <?php endforeach ?>
    </span>
    <button class="tbtn" id="btnTheme" title="Tema">&#9728;</button>
    <button class="logout-btn" onclick="location.href='?logout=1'">Iesire</button>
  </div>
  <div class="topbar-row2">
    <button class="tbtn" id="btnSb" title="Sidebar">&#9703;</button>
    <div class="tbtn-sep"></div>
    <button class="tbtn" id="btnNewFolder" title="Folder nou">&#128193;+</button>
    <a class="tbtn" href="?path=.Trash" title="Coș de gunoi" style="text-decoration:none">&#128465;</a>
    <div class="tbtn-sep"></div>
    <button class="tbtn" data-view="grid"    title="Grid">&#8862;</button>
    <button class="tbtn" data-view="list"    title="Lista">&#8801;</button>
    <button class="tbtn" data-view="details" title="Detalii">&#9776;</button>
    <button class="tbtn" data-view="thumbs"  title="Thumbs">&#8857;</button>
    <div id="thumb-size-wrap">
      <span class="ts-icon">&#8599;</span>
      <input type="range" id="thumbSize" min="80" max="300" value="130" step="5">
      <span class="ts-icon">&#8600;</span>
    </div>
  </div>
</div>

<div class="layout">
  <!-- SIDEBAR STÂNGA -->
  <div class="sidebar" id="sidebar">
    <div class="sb-inner">
      <div class="sb-scroll">
        <div class="tree-root">
          <div class="tree-row <?=$rel===''?'active':''?>" style="font-weight:500">
            <a href="?path=" class="tree-link">
              <span class="tree-icon">&#128193;</span>
              <span class="tree-name">root</span>
            </a>
          </div>
          <?php render_tree($tree,$rel); ?>
        </div>
      </div>
      <div class="sb-upload">
        <label>Upload in folderul curent</label>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="dir" value="<?=htmlspecialchars($rel)?>">
          <input type="hidden" name="MAX_FILE_SIZE" value="<?=MAX_UPLOAD?>">
          <div class="urow">
            <input type="file" name="file" required>
            <button type="submit">&#8593;</button>
          </div>
        </form>
      </div>
    </div>
    <div class="sb-resize" id="sbResize"></div>
  </div>

  <div class="sb-overlay" id="sbOverlay"></div>

  <!-- MAIN -->
  <div class="main">
    <div id="browse-area">
      <div class="main-inner" id="viewContainer">
        <?php if($msg): ?><div class="msg <?=$msg[0]?>"><?=htmlspecialchars($msg[1])?></div><?php endif ?>
        <div class="msg" id="flash-msg" style="display:none"></div>
        <div class="details-head" id="detailsHead">
          <span>Nume</span><span style="text-align:right">Marime</span><span>Modificat</span>
        </div>
        <?php if($is_trash): ?>
        <!-- ── TRASH VIEW ─────────────────────────────────── -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem .2rem .75rem;border-bottom:1px solid var(--border);margin-bottom:.5rem">
          <span style="font-size:.9rem;font-weight:600;color:var(--text2)">&#128465; Coș de gunoi</span>
          <?php if(!empty($trash_items)): ?>
          <form method="post" onsubmit="return confirm('Golești tot coșul? Ireversibil!')">
            <input type="hidden" name="action" value="trash_empty">
            <button style="background:none;border:1px solid #f87171;color:#f87171;border-radius:6px;padding:.25rem .65rem;font-size:.75rem;cursor:pointer">Golește tot</button>
          </form>
          <?php endif ?>
        </div>
        <?php if(!empty($trash_items)): foreach($trash_items as $ti):
          $tic=$ti['is_dir']?'&#128193;':ficon($ti['ext']); ?>
        <div style="display:flex;align-items:center;gap:.7rem;padding:.38rem .4rem;border-radius:6px;transition:background .1s" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
          <span style="font-size:1rem;flex-shrink:0;width:1.4rem;text-align:center"><?=$tic?></span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.83rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="<?=htmlspecialchars($ti['stored'])?>"><?=htmlspecialchars($ti['name'])?></div>
            <div style="font-size:.7rem;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:.1rem">
              <?=htmlspecialchars($ti['orig'])?>
              <?php if($ti['del']): ?> &nbsp;·&nbsp; <?=htmlspecialchars(str_replace('T',' ',$ti['del']))?><?php endif ?>
              <?php if(!$ti['is_dir']&&$ti['size']>0): ?> &nbsp;·&nbsp; <?=hsize($ti['size'])?><?php endif ?>
            </div>
          </div>
          <div style="display:flex;gap:.3rem;flex-shrink:0">
            <form method="post" style="display:inline">
              <input type="hidden" name="action" value="trash_restore">
              <input type="hidden" name="stored" value="<?=htmlspecialchars($ti['stored'])?>">
              <button style="background:none;border:1px solid var(--border2);color:var(--text2);border-radius:6px;padding:.22rem .55rem;font-size:.73rem;cursor:pointer;white-space:nowrap" title="Restaurează la locul original">&#8635; Restaurează</button>
            </form>
            <form method="post" style="display:inline" onsubmit="return confirm('Ștergi definitiv?')">
              <input type="hidden" name="action" value="trash_delete">
              <input type="hidden" name="stored" value="<?=htmlspecialchars($ti['stored'])?>">
              <button style="background:none;border:1px solid transparent;color:var(--text3);border-radius:6px;padding:.22rem .4rem;font-size:.8rem;cursor:pointer" title="Șterge definitiv">&#10005;</button>
            </form>
          </div>
        </div>
        <?php endforeach; else: ?>
        <p style="color:var(--text3);font-size:.83rem;padding:1.5rem;text-align:center">Coșul de gunoi este gol.</p>
        <?php endif ?>

        <?php else: ?>
        <!-- ── NORMAL VIEW ─────────────────────────────────── -->
        <div class="file-grid" id="fileGrid" data-current-path="<?=htmlspecialchars($rel)?>">
        <?php if($items): foreach($items as $it):
          $icon = $it['is_dir'] ? '&#128193;' : ficon($it['ext']);
          
          if($it['is_dir']): ?>
          <a class="f-item" href="?path=<?=urlencode($it['rel'])?>"
             data-ctx-rel="<?=htmlspecialchars($it['rel'])?>"
             data-ctx-name="<?=htmlspecialchars($it['name'])?>"
             data-ctx-dir="1">
            <div class="f-thumb-icon">&#128193;</div>
            <span class="f-icon">&#128193;</span>
            <span class="f-name"><?=htmlspecialchars($it['name'])?></span>
            <span class="f-size"><?=$it['count']?> elem.</span>
            <span class="f-date"><?=date('d.m.Y H:i',$it['mtime'])?></span>
          </a>

          <?php elseif($it['is_img']): ?>
          <a class="f-item img-link" href="?dl=<?=urlencode($it['rel'])?>" data-img="?dl=<?=urlencode($it['rel'])?>"
             data-ctx-rel="<?=htmlspecialchars($it['rel'])?>"
             data-ctx-name="<?=htmlspecialchars($it['name'])?>"
             data-ctx-dir="0"
             data-ctx-dl="?dl=<?=urlencode($it['rel'])?>">
            <img class="f-thumb" src="?dl=<?=urlencode($it['rel'])?>" alt="" loading="lazy">
            <span class="f-icon"><?=$icon?></span>
            <span class="f-name"><?=htmlspecialchars($it['name'])?></span>
            <span class="f-size"><?=hsize($it['size'])?></span>
            <span class="f-date"><?=date('d.m.Y H:i',$it['mtime'])?></span>
          </a>

          <?php elseif($it['is_aud'] || $it['is_vid']): ?>
          <a class="f-item media-link" 
             href="javascript:void(0)" 
             data-url="?dl=<?=urlencode($it['rel'])?>" 
             data-name="<?=htmlspecialchars($it['name'])?>" 
             data-type="<?=$it['is_vid']?'video':'audio'?>"
             data-ctx-rel="<?=htmlspecialchars($it['rel'])?>"
             data-ctx-name="<?=htmlspecialchars($it['name'])?>"
             data-ctx-dir="0"
             data-ctx-dl="?dl=<?=urlencode($it['rel'])?>">
            <div class="f-thumb-icon"><?=$icon?></div>
            <span class="f-icon"><?=$icon?></span>
            <span class="f-name"><?=htmlspecialchars($it['name'])?></span>
            <span class="f-size"><?=hsize($it['size'])?></span>
            <span class="f-date"><?=date('d.m.Y H:i',$it['mtime'])?></span>
          </a>

          <?php else: ?>
          <a class="f-item" href="?dl=<?=urlencode($it['rel'])?>" target="_blank" rel="noopener"
             data-ctx-rel="<?=htmlspecialchars($it['rel'])?>"
             data-ctx-name="<?=htmlspecialchars($it['name'])?>"
             data-ctx-dir="0"
             data-ctx-dl="?dl=<?=urlencode($it['rel'])?>">
            <div class="f-thumb-icon"><?=$icon?></div>
            <span class="f-icon"><?=$icon?></span>
            <span class="f-name"><?=htmlspecialchars($it['name'])?></span>
            <span class="f-size"><?=hsize($it['size'])?></span>
            <span class="f-date"><?=date('d.m.Y H:i',$it['mtime'])?></span>
          </a>
          <?php endif; endforeach; else: ?>
          <p style="color:var(--text3);font-size:.83rem;padding:.5rem;grid-column:1/-1">Folder gol.</p>
          <?php endif ?>
        </div>
        <?php endif ?>
      </div>
    </div>
  </div>
</div>

<!-- CUSTOM PLAYER AUDIO BAR -->
<div id="player-bar">
  <div id="player-body">
    <div id="player-row1">
      <div id="player-info" title="Click pentru a găsi în listă">
        <div id="pTitle">Nimic în redare</div>
        <div id="pSub">&#127925; Media Player</div>
      </div>
      <button id="pClose" title="Închide">&#10005;</button>
    </div>
    <div id="player-seek-wrap">
      <span class="p-time" id="pCur">0:00</span>
      <input type="range" id="pSeek" value="0" min="0" max="1000" step="1">
      <span class="p-time" id="pDur">0:00</span>
    </div>
    <div id="player-row3">
      <div id="player-controls">
        <button class="p-btn secondary" id="btnRepeat" title="Repetă">&#8635;</button>
        <button class="p-btn" id="btnPrev" title="Anterior">&#9198;</button>
        <button id="btnPlayMain" title="Play/Pause"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style="display:inline-block;vertical-align:-.15em"><polygon points="6,3 20,12 6,21"/></svg></button>
        <button class="p-btn" id="btnNext" title="Următor">&#9197;</button>
        <button class="p-btn secondary" id="btnShuffle" title="Aleatoriu">&#9832;</button>
      </div>
      <div id="player-vol-wrap">
        <span class="vol-icon">&#128266;</span>
        <input type="range" id="pVol" value="100" min="0" max="100" step="1">
      </div>
    </div>
  </div>
</div>

<!-- VIDEO PANEL (MODERN PICTURE-IN-PICTURE LOOK) -->
<div id="vlb">
  <div id="vlb-resize" title="Redimensionează"></div>
  <button id="vlb-fullscreen" class="vlb-top-btn" title="Fullscreen">&#11036;</button>
  <button id="vlb-close" class="vlb-top-btn" title="Închide">&#10005;</button>
  
  <div id="vlb-player">
    <div id="pContainer"></div>
    <div id="vlb-controls">
      <div id="vlb-seek-row">
        <span class="vlb-time" id="vlb-cur">0:00</span>
        <input type="range" id="vlb-seek" min="0" max="1000" value="0" step="1">
        <span class="vlb-time" id="vlb-dur">0:00</span>
      </div>
      <div id="vlb-btn-row">
        <button class="vlb-btn" id="vlb-rew" title="-5s">&#8634;</button>
        <button class="vlb-btn" id="vlb-play">&#9654;</button>
        <button class="vlb-btn" id="vlb-fwd" title="+5s">&#8635;</button>

        <div class="vlb-vol-wrap">
          <button class="vlb-btn" id="vlb-mute" style="font-size:.9rem">&#128266;</button>
          <input type="range" id="vlb-vol" min="0" max="100" value="100" step="1">
        </div>
      </div>
    </div>
  </div>
</div>

<!-- LIGHTBOX -->
<div id="lb">
  <div id="lb-wrap"><img id="lb-img" src="" alt=""></div>
  <button id="lb-close">&#10005;</button>
  <button id="lb-prev">&#8249;</button>
  <button id="lb-next">&#8250;</button>
  <div id="lb-counter"></div>
  <div id="lb-hint">scroll = zoom · drag = pan · dublu-click = reset</div>
</div>

<!-- CONTEXT MENU -->
<div id="ctx-menu">
  <div class="ctx-item" id="ctx-download">&#11123; Descarcă</div>
  <div class="ctx-sep"></div>
  <div class="ctx-item" id="ctx-cut">&#9986; Decupează</div>
  <div class="ctx-item" id="ctx-copy">&#128203; Copiază</div>
  <div class="ctx-item" id="ctx-paste" style="display:none">&#128203; Lipește aici</div>
  <div class="ctx-sep"></div>
  <div class="ctx-item" id="ctx-new-folder">&#128193;+ Folder nou</div>
  <div class="ctx-sep"></div>
  <div class="ctx-item danger" id="ctx-trash">&#128465; Mută în Trash</div>
</div>

<!-- HIDDEN FORMS -->
<form method="post" id="trash-form"  style="display:none"><input type="hidden" name="action" value="trash"><input type="hidden" name="target" id="trash-target"><input type="hidden" name="dir" id="trash-dir" value="<?=htmlspecialchars($rel)?>"></form>
<form method="post" id="copy-form"   style="display:none"><input type="hidden" name="action" value="copy_item"><input type="hidden" name="src" id="copy-src"><input type="hidden" name="dst_dir" id="copy-dst"></form>
<form method="post" id="move-form"   style="display:none"><input type="hidden" name="action" value="move_item"><input type="hidden" name="src" id="move-src"><input type="hidden" name="dst_dir" id="move-dst"></form>
<form method="post" id="nf-form"     style="display:none"><input type="hidden" name="action" value="new_folder"><input type="hidden" name="dir" id="nf-dir" value="<?=htmlspecialchars($rel)?>"><input type="hidden" name="name" id="nf-name"></form>

<!-- NEW FOLDER MODAL -->
<div id="modal-nf" style="display:none;position:fixed;inset:0;z-index:950;background:rgba(0,0,0,.6);align-items:center;justify-content:center">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:1.4rem 1.5rem;min-width:300px;box-shadow:0 16px 48px rgba(0,0,0,.6)">
    <div style="font-size:.93rem;font-weight:600;color:var(--text);margin-bottom:.85rem">&#128193; Folder nou</div>
    <input id="nf-input" type="text" placeholder="Numele folderului" autocomplete="off" maxlength="120"
      style="width:100%;padding:.55rem .75rem;background:var(--bg3);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:.87rem;outline:none;font-family:inherit;box-sizing:border-box">
    <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.9rem">
      <button id="nf-cancel" style="background:none;border:1px solid var(--border2);color:var(--text2);border-radius:7px;padding:.38rem .85rem;font-size:.83rem;cursor:pointer">Anulează</button>
      <button id="nf-ok"     style="background:var(--accent);border:none;color:#fff;border-radius:7px;padding:.38rem .9rem;font-size:.83rem;cursor:pointer">Creează</button>
    </div>
  </div>
</div>

<!-- DROP OVERLAY -->
<div id="drop-overlay" style="display:none;position:fixed;inset:0;z-index:800;background:rgba(10,10,20,.82);backdrop-filter:blur(3px);align-items:center;justify-content:center;pointer-events:none">
  <div style="text-align:center;pointer-events:none">
    <div style="font-size:4rem;color:#fff;animation:mbBounce .7s ease-in-out infinite alternate">&#8679;</div>
    <div style="font-size:1.6rem;font-weight:700;color:#fff;margin-top:.3rem">Lasă fișierele aici</div>
    <div style="font-size:.9rem;color:rgba(255,255,255,.5);margin-top:.25rem">Upload în: /<?=htmlspecialchars($rel)?></div>
  </div>
</div>

<!-- UPLOAD STATUS BAR -->
<div id="usb" style="display:none;position:fixed;bottom:1.1rem;left:50%;transform:translateX(-50%);z-index:700;background:var(--bg2);border:1px solid var(--border2);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.55);min-width:340px;max-width:520px;padding:.7rem 1rem .65rem">
  <button id="usb-close" style="position:absolute;top:.4rem;right:.5rem;background:none;border:none;color:var(--text3);font-size:.8rem;cursor:pointer;padding:.15rem .3rem;border-radius:4px;line-height:1">&#10005;</button>
  <div id="usb-file" style="font-size:.8rem;color:var(--text2);font-weight:500;margin-bottom:.35rem;padding-right:1.4rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
  <div style="display:flex;align-items:center;gap:.6rem">
    <div style="flex:1;height:10px;background:var(--bg3);border-radius:999px;overflow:hidden">
      <div id="usb-fill" style="height:100%;background:linear-gradient(90deg,#7c3aed,#a855f7);border-radius:999px;width:0%;transition:width .18s ease"></div>
    </div>
    <span id="usb-pct" style="font-size:.75rem;font-weight:700;color:#a855f7;white-space:nowrap;min-width:2.8rem;text-align:right;font-family:monospace">0%</span>
  </div>
  <div id="usb-speed" style="font-size:.72rem;color:var(--text3);font-family:monospace;margin-top:.25rem;min-height:.9rem"></div>
</div>

<style>
@keyframes mbBounce{from{transform:translateY(0)}to{transform:translateY(-14px)}}
.f-item.cut-pending{opacity:.35}
</style>

<script src="app.js"></script>
<script src="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.js"></script>
</body>
</html>