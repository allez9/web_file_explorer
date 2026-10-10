(function(){

// ── THUMB SIZE SLIDER ──
(function(){
  var slider = document.getElementById('thumbSize');
  var root   = document.documentElement;
  var saved  = parseInt(localStorage.getItem('mb-thumb-size')||'130');
  slider.value = saved;
  root.style.setProperty('--thumb-size', saved+'px');
  updateThumbGrad(saved);
  function updateThumbGrad(v){
    var pct = ((v-80)/(300-80))*100;
    slider.style.background='linear-gradient(to right,var(--accent) '+pct+'%,var(--border2) '+pct+'%)';
  }
  slider.addEventListener('input', function(){
    var v = parseInt(slider.value);
    root.style.setProperty('--thumb-size', v+'px');
    updateThumbGrad(v);
    localStorage.setItem('mb-thumb-size', v);
  });
})();

// ── TREE TOGGLE ──
window.tgTree = function(el, ev){
  ev.stopPropagation();
  ev.preventDefault();
  var node = el.closest('.tree-node');
  var ch   = node.querySelector('.tree-children');
  if(!ch) return;
  var open = ch.classList.toggle('open');
  el.classList.toggle('open', open);
};

// ── THEME & VIEW CONTROL ──
var html = document.documentElement;
var btnTheme = document.getElementById('btnTheme');
var viewBtns = document.querySelectorAll('[data-view]');

function updateThemeButton(t) {
  if (btnTheme) btnTheme.textContent = t === 'dark' ? '☀' : '☽';
}
function setTheme(t) {
  html.setAttribute('data-theme', t);
  localStorage.setItem('mb-theme', t);
  updateThemeButton(t);
}
function setView(v) {
  html.setAttribute('data-view', v);
  localStorage.setItem('mb-view', v);
  viewBtns.forEach(function(b){ b.classList.toggle('active', b.dataset.view === v); });
}

updateThemeButton(html.getAttribute('data-theme'));
viewBtns.forEach(function(b){
  b.classList.toggle('active', b.dataset.view === html.getAttribute('data-view'));
  b.addEventListener('click', function(){ setView(b.dataset.view); });
});
btnTheme.addEventListener('click', function() {
  setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ── SIDEBAR ──
var sb        = document.getElementById('sidebar');
var btnSb     = document.getElementById('btnSb');
var sbOverlay = document.getElementById('sbOverlay');
var sbOpen = window.innerWidth > 640 ? (localStorage.getItem('mb-sb') !== '0') : false;

function setSb(open){
  sbOpen = open;
  if(window.innerWidth<=640){
    sb.classList.toggle('open', open);
    sbOverlay.classList.toggle('on', open);
  } else {
    sb.classList.toggle('hidden', !open);
    localStorage.setItem('mb-sb', open ? '1' : '0');
  }
}
if(window.innerWidth > 640) setSb(sbOpen);
btnSb.addEventListener('click', function(){ setSb(!sbOpen); });
sbOverlay.addEventListener('click', function(){ setSb(false); });

// Sidebar Resize
(function(){
  var handle=document.getElementById('sbResize');
  var resizing=false, startX=0, startW=0;
  var MIN=120, MAX=500;
  function applyW(w){
    w=Math.max(MIN,Math.min(MAX,w));
    document.documentElement.style.setProperty('--sbw', w+'px');
    localStorage.setItem('mb-sbw',w);
  }
  handle.addEventListener('mousedown',function(e){
    if(window.innerWidth<=640) return;
    resizing=true; startX=e.clientX; startW=sb.offsetWidth;
    handle.classList.add('active'); sb.classList.add('resizing');
    document.body.style.cursor='col-resize'; e.preventDefault();
  });
  window.addEventListener('mousemove',function(e){ if(!resizing) return; applyW(startW+(e.clientX-startX)); });
  window.addEventListener('mouseup',function(){
    if(!resizing) return;
    resizing=false; handle.classList.remove('active');
    sb.classList.remove('resizing'); document.body.style.cursor='';
  });
})();

// ── MEDIA PLAYER — state global ──────────────────────────────
// Expus pe window ca player-audio.js și player-video.js să-l acceseze
window._mediaLinks = Array.from(document.querySelectorAll('a.media-link'));
window._mediaEl    = null;
window._curIdx     = -1;

window._playMedia  = function playMedia(index){
  var ml = window._mediaLinks;
  if(index<0||index>=ml.length) return;
  window._curIdx = index;
  var link = ml[index];
  var url  = link.dataset.url;
  var name = link.dataset.name;
  var type = link.dataset.type;
  var isVid = type==='video';

  ml.forEach(function(el,i){ el.classList.toggle('playing',i===index); });

  // Curăță player anterior
  var plyrInstance = window._plyrInstance;
  if(plyrInstance){ plyrInstance.destroy(); window._plyrInstance=null; }
  var oldEl = window._mediaEl;
  if(oldEl){ oldEl.pause(); oldEl.src=''; }
  var pContainer = document.getElementById('pContainer');
  if(pContainer) pContainer.innerHTML='';

  var mediaEl = document.createElement(type);
  mediaEl.src = url;
  mediaEl.playsInline = true;
  if(pContainer) pContainer.appendChild(mediaEl);
  window._mediaEl = mediaEl;

  if(isVid){
    // Ascundem audio bar, deschidem video box
    var pb = document.getElementById('player-bar');
    if(pb){ pb.classList.remove('active'); document.body.classList.remove('has-player'); }

    var vlbVol = window._vlbVol;
    if(vlbVol) mediaEl.volume = vlbVol.value/100;
    if(window._vlbOpen) window._vlbOpen();

    mediaEl.addEventListener('play',  function(){ if(window._vlbPlay) window._vlbPlay.innerHTML=window._PAUSE_SVG||'⏸'; });
    mediaEl.addEventListener('pause', function(){ if(window._vlbPlay) window._vlbPlay.innerHTML=window._PLAY_SVG||'▶'; });
    mediaEl.addEventListener('loadedmetadata', function(){
      if(window._vlbDur) window._vlbDur.textContent=(window._vlbFmt||function(s){return s;})(mediaEl.duration);
    });
    mediaEl.addEventListener('timeupdate', function(){
      var seek=window._vlbSeek;
      if(!Number.isFinite(mediaEl.duration)||mediaEl.duration<=0||(window._vlbSeeking&&window._vlbSeeking())) return;
      var pct=(mediaEl.currentTime/mediaEl.duration)*100;
      if(seek) seek.value=(pct/100)*1000;
      if(window._vlbUpdateSeek) window._vlbUpdateSeek(pct);
      if(window._vlbCur) window._vlbCur.textContent=(window._vlbFmt||function(s){return s;})(mediaEl.currentTime);
      if(window._vlbDur) window._vlbDur.textContent=(window._vlbFmt||function(s){return s;})(mediaEl.duration);
    });

  } else {
    // AUDIO
    var vlb = document.getElementById('vlb');
    if(vlb) vlb.classList.remove('on');
    var pb2 = document.getElementById('player-bar');
    if(pb2){ pb2.classList.add('active'); document.body.classList.add('has-player'); }

    var pTitle=window._pTitle, pSub=window._pSub;
    var typeLabel = '&#127925;';
    if(pTitle) pTitle.textContent=name;
    if(pSub)   pSub.innerHTML=typeLabel+' &nbsp;<strong style="color:var(--text2);font-size:.8rem">'+(index+1)+' / '+ml.length+'</strong>';

    var pVol=window._pVol;
    if(pVol) mediaEl.volume=pVol.value/100;
    var pCur=window._pCur, pDur=window._pDur, pSeek=window._pSeek;
    if(pCur) pCur.textContent='0:00';
    if(pDur) pDur.textContent='0:00';
    if(pSeek){ pSeek.value=0; if(window._audioUpdateSeek) window._audioUpdateSeek(0); }

    var btnPlayMain=window._btnPlayMain;
    var SVGpause="<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"currentColor\" style=\"display:inline-block;vertical-align:-.15em\"><rect x=\"5\" y=\"3\" width=\"4\" height=\"18\"/><rect x=\"15\" y=\"3\" width=\"4\" height=\"18\"/></svg>";
    var SVGplay ="<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"currentColor\" style=\"display:inline-block;vertical-align:-.15em\"><polygon points=\"6,3 20,12 6,21\"/></svg>";
    mediaEl.addEventListener('play',  function(){ if(btnPlayMain) btnPlayMain.innerHTML=SVGpause; });
    mediaEl.addEventListener('pause', function(){ if(btnPlayMain) btnPlayMain.innerHTML=SVGplay; });
    mediaEl.addEventListener('loadedmetadata', function(){
      if(pDur&&window._audioFmt) pDur.textContent=window._audioFmt(mediaEl.duration);
    });
    mediaEl.addEventListener('timeupdate', function(){
      if(!mediaEl.duration||(window._audioSeeking&&window._audioSeeking())) return;
      var pct=(mediaEl.currentTime/mediaEl.duration)*100;
      if(pSeek) pSeek.value=(pct/100)*1000;
      if(window._audioUpdateSeek) window._audioUpdateSeek(pct);
      if(pCur&&window._audioFmt) pCur.textContent=window._audioFmt(mediaEl.currentTime);
      if(pDur&&window._audioFmt) pDur.textContent=window._audioFmt(mediaEl.duration);
    });
  }

  mediaEl.addEventListener('ended', function(){
    var rep = window._isRepeat&&window._isRepeat();
    var shuf= window._isShuffle&&window._isShuffle();
    if(rep){ mediaEl.currentTime=0; mediaEl.play(); return; }
    var next=shuf?Math.floor(Math.random()*ml.length):window._curIdx+1;
    if(next<ml.length) window._playMedia(next);
  });

  var p = mediaEl.play();
  if(p&&p.catch) p.catch(function(){});

  if(window._setupMediaSession) window._setupMediaSession(name);
};

// Click pe fișiere media → playMedia
window._mediaLinks.forEach(function(link,idx){
  link.addEventListener('click',function(e){ e.preventDefault(); window._playMedia(idx); });
});

// ── NEW FOLDER MODAL ─────────────────────────────────────────
(function(){
  var modal=document.getElementById('modal-nf');
  var input=document.getElementById('nf-input');
  function open(){ modal.style.display='flex'; input.value=''; setTimeout(function(){ input.focus(); },40); }
  function close(){ modal.style.display='none'; }
  function submit(){ var n=input.value.trim(); if(!n) return input.focus(); document.getElementById('nf-name').value=n; document.getElementById('nf-form').submit(); }
  window._openNFModal=open;
  var btn=document.getElementById('btnNewFolder');
  if(btn) btn.addEventListener('click',open);
  document.getElementById('nf-ok').addEventListener('click',submit);
  document.getElementById('nf-cancel').addEventListener('click',close);
  input.addEventListener('keydown',function(e){ if(e.key==='Enter') submit(); if(e.key==='Escape') close(); });
  modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
})();

// ── CLIPBOARD persistent (sessionStorage) ────────────────────
var _clip=null;
try{ var _cs=sessionStorage.getItem('mb_clip'); if(_cs) _clip=JSON.parse(_cs); }catch(e){}

function _clipSet(mode,rel,name,el){
  document.querySelectorAll('.cut-pending').forEach(function(x){ x.classList.remove('cut-pending'); });
  _clip={mode:mode,rel:rel,name:name};
  try{ sessionStorage.setItem('mb_clip',JSON.stringify(_clip)); }catch(e){}
  if(mode==='cut'&&el) el.classList.add('cut-pending');
  _clipRefreshPaste();
}
function _clipRefreshPaste(){
  var btn=document.getElementById('ctx-paste'); if(!btn) return;
  if(_clip){ btn.style.display='flex'; btn.textContent=(_clip.mode==='cut'?'✂ ':'📋 ')+'Lipește "'+_clip.name+'"'; }
  else btn.style.display='none';
}
function _clipDo(dstPath){
  if(!_clip) return;
  if(_clip.mode==='copy'){
    document.getElementById('copy-src').value=_clip.rel;
    document.getElementById('copy-dst').value=dstPath;
    document.getElementById('copy-form').submit();
  } else {
    document.getElementById('move-src').value=_clip.rel;
    document.getElementById('move-dst').value=dstPath;
    try{ sessionStorage.removeItem('mb_clip'); }catch(e){}
    _clip=null;
    document.getElementById('move-form').submit();
  }
}
// Restore cut highlight dacă fișierul e vizibil
if(_clip&&_clip.mode==='cut'){
  document.querySelectorAll('.f-item[data-ctx-rel]').forEach(function(el){
    if(el.dataset.ctxRel===_clip.rel) el.classList.add('cut-pending');
  });
}
_clipRefreshPaste();

// ── CONTEXT MENU ─────────────────────────────────────────────
(function(){
  var menu     =document.getElementById('ctx-menu');
  var ctxDown  =document.getElementById('ctx-download');
  var ctxRename=document.getElementById('ctx-rename');
  var ctxCut   =document.getElementById('ctx-cut');
  var ctxCopy  =document.getElementById('ctx-copy');
  var ctxPaste =document.getElementById('ctx-paste');
  var ctxNF    =document.getElementById('ctx-new-folder');
  var ctxTrash =document.getElementById('ctx-trash');
  var grid     =document.getElementById('fileGrid');
  var curPath  =grid?grid.dataset.currentPath:'';
  var cur=null;

  function refit(){
    var r=menu.getBoundingClientRect();
    if(r.right>window.innerWidth)   menu.style.left=(parseFloat(menu.style.left)-r.width)+'px';
    if(r.bottom>window.innerHeight) menu.style.top =(parseFloat(menu.style.top)-r.height)+'px';
  }
  function show(x,y,item){
    cur=item;
    menu.style.left=x+'px'; menu.style.top=y+'px';
    ctxDown.style.display  =(item&&!item.isDir)?'flex':'none';
    ctxRename.style.display=item?'flex':'none';
    ctxCut.style.display   =item?'flex':'none';
    ctxCopy.style.display  =item?'flex':'none';
    ctxTrash.style.display =item?'flex':'none';
    ctxNF.style.display    ='flex';
    _clipRefreshPaste();
    menu.classList.add('on'); refit();
  }
  function hide(){ menu.classList.remove('on'); cur=null; }

  if(grid){
    grid.querySelectorAll('.f-item[data-ctx-rel]').forEach(function(el){
      el.addEventListener('contextmenu',function(e){
        e.preventDefault(); e.stopPropagation();
        show(e.clientX,e.clientY,{rel:el.dataset.ctxRel,name:el.dataset.ctxName,isDir:el.dataset.ctxDir==='1',dlUrl:el.dataset.ctxDl||'',el:el});
      });
    });
    grid.addEventListener('contextmenu',function(e){
      if(!e.target.closest('.f-item')){ e.preventDefault(); show(e.clientX,e.clientY,null); }
    });
  }

  ctxDown.addEventListener('click',function(){
    if(!cur||cur.isDir) return;
    var a=document.createElement('a'); a.href=cur.dlUrl+'&_dl=1'; a.download=cur.name; a.click(); hide();
  });
  ctxCut.addEventListener('click',function(){
    if(!cur) return; _clipSet('cut',cur.rel,cur.name,cur.el); hide();
  });
  ctxCopy.addEventListener('click',function(){
    if(!cur) return; _clipSet('copy',cur.rel,cur.name,null); hide();
  });
  ctxPaste.addEventListener('click',function(){
    _clipDo(curPath); hide();
  });
  ctxRename.addEventListener('click',function(){
    if(!cur) return;
    var modal=document.getElementById('modal-rename');
    var inp  =document.getElementById('rename-input');
    var okBtn=document.getElementById('rename-ok');
    var cnBtn=document.getElementById('rename-cancel');
    var savedRel=cur.rel, savedName=cur.name, savedEl=cur.el;
    inp.value=savedName;
    modal.style.display='flex';
    hide();
    setTimeout(function(){
      inp.focus();
      var dot=savedName.lastIndexOf('.');
      inp.setSelectionRange(0, dot>0?dot:savedName.length);
    },80);
    function doRename(){
      var newName=inp.value.trim();
      if(!newName||newName===savedName){ modal.style.display='none'; return; }
      var fd=new FormData();
      fd.append('action','rename_item');
      fd.append('src',savedRel);
      fd.append('name',newName);
      var xhr=new XMLHttpRequest();
      xhr.open('POST',window.location.pathname);
      xhr.addEventListener('load',function(){
        var r; try{ r=JSON.parse(xhr.responseText); }catch(e){ r={ok:false,msg:'Răspuns invalid'}; }
        if(!r.ok){ alert('Eroare: '+r.msg); return; }
        modal.style.display='none';
        if(savedEl){
          savedEl.dataset.ctxName=r.name;
          var parts=savedRel.split('/'); parts[parts.length-1]=r.name;
          savedEl.dataset.ctxRel=parts.join('/');
          var nameEl=savedEl.querySelector('.f-name');
          if(nameEl) nameEl.textContent=r.name;
          var nameEl2=savedEl.querySelector('.f-details-name');
          if(nameEl2) nameEl2.textContent=r.name;
        }
      });
      xhr.send(fd);
    }
    okBtn.onclick=doRename;
    cnBtn.onclick=function(){ modal.style.display='none'; };
    inp.onkeydown=function(e){
      if(e.key==='Enter'){ e.preventDefault(); doRename(); }
      if(e.key==='Escape'){ modal.style.display='none'; }
    };
  });
  ctxNF.addEventListener('click',function(){ hide(); window._openNFModal&&window._openNFModal(); });
  ctxTrash.addEventListener('click',function(){
    if(!cur) return;
    if(!confirm('Mută "'+cur.name+'" în Trash?')){ hide(); return; }
    var el=cur.el, rel=cur.rel, name=cur.name;
    hide();

    var fd=new FormData();
    fd.append('action','trash'); fd.append('target',rel);
    fd.append('dir',curPath);   fd.append('_xhr','1');

    var xhr=new XMLHttpRequest();
    xhr.open('POST',window.location.pathname);
    xhr.addEventListener('load',function(){
      var r; try{ r=JSON.parse(xhr.responseText); }catch(e){ r={ok:false,msg:'Răspuns invalid'}; }
      if(!r.ok){ alert('Eroare: '+r.msg); return; }

      // Actualizăm player-ul dacă fișierul era în playlist
      var ml=window._mediaLinks||[];
      var mediaLinkEl=el.classList.contains('media-link')?el:null;
      if(mediaLinkEl){
        var idx=ml.indexOf(mediaLinkEl);
        if(idx!==-1){
          var wasPlaying=(window._curIdx===idx);
          ml.splice(idx,1);
          if(wasPlaying){
            if(ml.length===0){
              var me=window._mediaEl; if(me){ me.pause(); me.src=''; window._mediaEl=null; }
              var pb=document.getElementById('player-bar');
              if(pb){ pb.classList.remove('active'); document.body.classList.remove('has-player'); }
              window._curIdx=-1;
            } else {
              var nextIdx=idx<ml.length?idx:ml.length-1;
              window._curIdx=nextIdx;
              window._playMedia(nextIdx);
            }
          } else if(idx<window._curIdx){ window._curIdx--; }
        }
      }

      if(el&&el.parentNode) el.parentNode.removeChild(el);
      var msgEl=document.getElementById('flash-msg');
      if(msgEl){ msgEl.textContent=name+' → Trash'; msgEl.className='flash ok'; msgEl.style.display='block'; setTimeout(function(){ msgEl.style.display='none'; },2500); }
    });
    xhr.addEventListener('error',function(){ alert('Eroare rețea la trash'); });
    xhr.send(fd);
  });

  document.addEventListener('click',function(e){ if(!menu.contains(e.target)) hide(); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') hide();
    if((e.ctrlKey||e.metaKey)&&e.key==='v'&&!e.target.closest('input,textarea')){
      e.preventDefault(); _clipDo(curPath);
    }
  });
})();

// ── DRAG & DROP UPLOAD ───────────────────────────────────────
(function(){
  var overlay=document.getElementById('drop-overlay');
  var usb    =document.getElementById('usb');
  var fill   =document.getElementById('usb-fill');
  var pct    =document.getElementById('usb-pct');
  var fname  =document.getElementById('usb-file');
  var speed  =document.getElementById('usb-speed');
  var grid   =document.getElementById('fileGrid');
  if(!grid||!overlay) return;

  var curPath=(new URLSearchParams(window.location.search)).get('path')||'';
  var dc=0;

  function showO(){ overlay.style.display='flex'; overlay.style.pointerEvents='all'; }
  function hideO(){ overlay.style.display='none'; overlay.style.pointerEvents='none'; dc=0; }
  function setPct(p){ p=Math.max(0,Math.min(100,p)); fill.style.width=p+'%'; pct.textContent=Math.round(p)+'%'; }
  function fspd(b){ return b>=1048576?(b/1048576).toFixed(1)+' MB/s':b>=1024?Math.round(b/1024)+' KB/s':Math.round(b)+' B/s'; }
  function fsz(b){  return b>=1048576?(b/1048576).toFixed(1)+' MB':b>=1024?Math.round(b/1024)+' KB':b+' B'; }

  document.addEventListener('dragenter',function(e){
    if(!e.dataTransfer||!Array.from(e.dataTransfer.types).includes('Files')) return;
    dc++; showO();
  });
  document.addEventListener('dragleave',function(){ dc--; if(dc<=0) hideO(); });
  document.addEventListener('dragover',function(e){ e.preventDefault(); });
  document.addEventListener('drop',function(e){
    e.preventDefault(); hideO();
    var files=Array.from(e.dataTransfer.files); if(files.length) doQueue(files);
  });

  document.getElementById('usb-close').addEventListener('click',function(){ usb.style.display='none'; });

  function doQueue(files){
    var total=files.length,done=0,q=files.slice();
    usb.style.display='block'; setPct(0); fname.textContent='Pregătesc...'; speed.textContent='';
    function next(){
      if(!q.length){ fname.textContent=total+' fișier'+(total!==1?'e':'')+' încărcate ✓'; speed.textContent=''; setPct(100); setTimeout(function(){ location.reload(); },700); return; }
      doOne(q.shift(),++done,total,next);
    }
    next();
  }
  function doOne(file,idx,total,cb){
    var fd=new FormData();
    fd.append('dir',curPath); fd.append('MAX_FILE_SIZE',524288000); fd.append('file',file);
    var xhr=new XMLHttpRequest(), t1=Date.now(), l0=0;
    fname.textContent='('+idx+'/'+total+') '+file.name;
    xhr.upload.addEventListener('progress',function(e){
      if(!e.lengthComputable) return;
      setPct(((idx-1)/total+(e.loaded/e.total)/total)*100);
      var now=Date.now(),dt=(now-t1)/1000;
      if(dt>0.3){ speed.textContent=fspd((e.loaded-l0)/dt)+'  ·  '+fsz(e.loaded)+' / '+fsz(e.total); l0=e.loaded; t1=now; }
    });
    xhr.addEventListener('load',cb);
    xhr.addEventListener('error',function(){ fname.textContent='Eroare: '+file.name; setTimeout(cb,1000); });
    xhr.open('POST',window.location.pathname+'?path='+encodeURIComponent(curPath));
    xhr.send(fd);
  }
})();

})();
