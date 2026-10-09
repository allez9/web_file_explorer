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
  if (btnTheme) btnTheme.textContent = t === 'dark' ? '\u2600' : '\u263D';
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
  window.addEventListener('mousemove',function(e){
    if(!resizing) return;
    applyW(startW+(e.clientX-startX));
  });
  window.addEventListener('mouseup',function(){
    if(!resizing) return;
    resizing=false; handle.classList.remove('active');
    sb.classList.remove('resizing'); document.body.style.cursor='';
  });
})();

// ── MEDIA PLAYER SYSTEM ──
var mediaLinks   = Array.from(document.querySelectorAll('a.media-link'));
var playerBar    = document.getElementById('player-bar');

var pTitle       = document.getElementById('pTitle');
var pSub         = document.getElementById('pSub');
var pCur         = document.getElementById('pCur');
var pDur         = document.getElementById('pDur');
var pSeek        = document.getElementById('pSeek');
var pVol         = document.getElementById('pVol');
var btnPlayMain  = document.getElementById('btnPlayMain');
var btnPrev      = document.getElementById('btnPrev');
var btnNext      = document.getElementById('btnNext');
var btnRepeat    = document.getElementById('btnRepeat');
var btnShuffle   = document.getElementById('btnShuffle');
var pClose       = document.getElementById('pClose');
var pContainer   = document.getElementById('pContainer');

var mediaEl      = null;
var plyrInstance = null;
var curIdx       = -1;
var isRepeat     = false;
var isShuffle    = false;
var seeking      = false;

// Elementele Video Box
var vlb = document.getElementById('vlb');
var vlbSeek = document.getElementById('vlb-seek');
var vlbVol  = document.getElementById('vlb-vol');
var vlbPlay = document.getElementById('vlb-play');
var vlbMute = document.getElementById('vlb-mute');
var vlbCur  = document.getElementById('vlb-cur');
var vlbDur  = document.getElementById('vlb-dur');
var vlbRew  = document.getElementById('vlb-rew');
var vlbFwd  = document.getElementById('vlb-fwd');
var vlbSeeking = false;

var PLAY_SVG  = '&#9654;';
var PAUSE_SVG = '&#10074;&#10074;';

function vlbFmt(s){ s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function vlbUpdateSeek(pct){ vlbSeek.style.background='linear-gradient(to right, #fff '+pct+'%, rgba(255,255,255,.3) '+pct+'%)'; }
function vlbUpdateVol(v){ vlbVol.style.background='linear-gradient(to right, #fff '+v+'%, rgba(255,255,255,.3) '+v+'%)'; }

function vlbOpen(){
  vlb.classList.add('on');
  vlbSeek.value = 0; 
  vlbUpdateSeek(0);
  vlbCur.textContent='0:00'; 
  vlbDur.textContent='0:00';
  vlbPlay.innerHTML = PLAY_SVG;
}

vlbPlay.addEventListener('click', function(){
  if(!mediaEl) return;
  if(mediaEl.paused){ mediaEl.play(); }
  else { mediaEl.pause(); }
});

vlbRew.addEventListener('click', function(){
  if(mediaEl) mediaEl.currentTime = Math.max(0, mediaEl.currentTime - 5);
});
vlbFwd.addEventListener('click', function(){
  if(mediaEl) mediaEl.currentTime = Math.min(mediaEl.duration, mediaEl.currentTime + 5);
});

vlbMute.addEventListener('click', function(){
  if(!mediaEl) return;
  mediaEl.muted = !mediaEl.muted;
  vlbMute.textContent = mediaEl.muted ? '🔇' : '🔊';
});

vlbVol.addEventListener('input', function(){
  if(mediaEl){ mediaEl.volume=vlbVol.value/100; mediaEl.muted=false; vlbMute.textContent='🔊'; }
  vlbUpdateVol(vlbVol.value);
});
vlbUpdateVol(100);

// Timeline Video Seek Events
vlbSeek.addEventListener('pointerdown', function(e){
  if(!mediaEl || !Number.isFinite(mediaEl.duration) || mediaEl.duration <= 0) return;
  vlbSeeking = true;
  try { vlbSeek.setPointerCapture(e.pointerId); } catch(_){}
});

vlbSeek.addEventListener('input', function(){
  if(!mediaEl || !Number.isFinite(mediaEl.duration) || mediaEl.duration <= 0) return;
  var pct = (Number(vlbSeek.value) / 1000) * 100;
  vlbUpdateSeek(pct);
  vlbCur.textContent = vlbFmt((pct / 100) * mediaEl.duration);
});

vlbSeek.addEventListener('pointerup', function(e){
  if(!vlbSeeking) return;
  vlbSeeking = false;
  try { vlbSeek.releasePointerCapture(e.pointerId); } catch(_){}
  if(mediaEl && Number.isFinite(mediaEl.duration) && mediaEl.duration > 0){
    var ratio = Number(vlbSeek.value) / 1000;
    mediaEl.currentTime = ratio * mediaEl.duration;
  }
});

vlbSeek.addEventListener('pointercancel', function(){
  vlbSeeking = false;
});

document.getElementById('vlb-fullscreen').addEventListener('click', function(){
  var el = document.getElementById('vlb');
  if(el.requestFullscreen) el.requestFullscreen();
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});

document.getElementById('vlb-close').addEventListener('click', function(){
  if(mediaEl){ mediaEl.pause(); mediaEl.src=''; mediaEl=null; }
  document.getElementById('pContainer').innerHTML='';
  vlb.classList.remove('on');
  mediaLinks.forEach(function(el){ el.classList.remove('playing'); });
});

// Drag & Resize Modern Box
(function(){
  var panel = document.getElementById('vlb');
  var handle = document.getElementById('vlb-resize');

  var resizing=false, dragging=false, pointerId=null;
  var startX=0, startY=0, startW=0, startH=0, startL=0, startT=0;

  handle.addEventListener('pointerdown', function(e){
    resizing=true; pointerId=e.pointerId;
    startX=e.clientX; startY=e.clientY;
    startW=panel.offsetWidth; startH=panel.offsetHeight;
    try { handle.setPointerCapture(pointerId); } catch(_){}
    document.body.style.cursor='nwse-resize';
    e.preventDefault();
    e.stopPropagation();
  });

  panel.addEventListener('pointerdown', function(e){
    if(e.target.closest('#vlb-controls') || e.target.closest('.vlb-top-btn') || e.target.closest('#vlb-resize')) return;
    dragging=true; pointerId=e.pointerId;
    startX=e.clientX; startY=e.clientY;
    var r=panel.getBoundingClientRect();
    startL=r.left; startT=r.top;
    panel.style.left=r.left+'px';
    panel.style.top=r.top+'px';
    panel.style.right='auto';
    panel.style.bottom='auto';
    try { panel.setPointerCapture(pointerId); } catch(_){}
    document.body.style.cursor='move';
    e.preventDefault();
  });

  function move(e){
    if(pointerId!==null && e.pointerId!==pointerId) return;
    if(resizing){
      var w=Math.max(280, startW-(e.clientX-startX));
      var h=Math.max(180, startH-(e.clientY-startY));
      panel.style.width=w+'px';
      panel.style.height=h+'px';
      e.preventDefault();
    } else if(dragging){
      var x=startL+(e.clientX-startX);
      var y=startT+(e.clientY-startY);
      var maxX=window.innerWidth-panel.offsetWidth;
      var maxY=window.innerHeight-panel.offsetHeight;
      panel.style.left=Math.max(0,Math.min(x,maxX))+'px';
      panel.style.top=Math.max(0,Math.min(y,maxY))+'px';
      e.preventDefault();
    }
  }

  function end(e){
    if(pointerId!==null && e.pointerId!==pointerId) return;
    resizing=false; dragging=false; pointerId=null;
    document.body.style.cursor='';
  }

  window.addEventListener('pointermove', move, {passive:false});
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
})();

function fmt(s){ s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }

function updateSeekGrad(pct){
  pSeek.style.background = 'linear-gradient(to right,var(--accent) '+pct+'%,var(--border2) '+pct+'%)';
}
function updateVolGrad(pct){
  pVol.style.background = 'linear-gradient(to right,var(--accent) '+pct+'%,var(--border2) '+pct+'%)';
}

function playMedia(index){
  if(index<0||index>=mediaLinks.length) return;
  curIdx = index;
  var link = mediaLinks[index];
  var url  = link.dataset.url;
  var name = link.dataset.name;
  var type = link.dataset.type;
  var isVid = type==='video';

  mediaLinks.forEach(function(el,i){ el.classList.toggle('playing',i===index); });

  pTitle.textContent = name;
  var typeLabel = isVid ? '&#127916;' : '&#127925;';
  pSub.innerHTML = typeLabel + ' &nbsp;<strong style="color:var(--text2);font-size:.8rem">'+(index+1)+' / '+mediaLinks.length+'</strong>';

  if(plyrInstance){ plyrInstance.destroy(); plyrInstance=null; }
  if(mediaEl){ mediaEl.pause(); mediaEl.src=''; }
  pContainer.innerHTML = '';

  mediaEl = document.createElement(type);
  mediaEl.src = url;
  mediaEl.playsInline = true;
  pContainer.appendChild(mediaEl);

  if(isVid){
    playerBar.classList.remove('active');
    document.body.classList.remove('has-player');

    mediaEl.volume = vlbVol.value/100;
    vlbOpen();

    mediaEl.addEventListener('play', function(){ vlbPlay.innerHTML=PAUSE_SVG; });
    mediaEl.addEventListener('pause', function(){ vlbPlay.innerHTML=PLAY_SVG; });
    
    mediaEl.addEventListener('loadedmetadata', function(){ 
      vlbDur.textContent = vlbFmt(mediaEl.duration); 
    });
    
    mediaEl.addEventListener('timeupdate', function(){
      if(!Number.isFinite(mediaEl.duration) || mediaEl.duration <= 0 || vlbSeeking) return;
      var pct = (mediaEl.currentTime / mediaEl.duration) * 100;
      vlbSeek.value = (pct / 100) * 1000;
      vlbUpdateSeek(pct);
      vlbCur.textContent = vlbFmt(mediaEl.currentTime);
      vlbDur.textContent = vlbFmt(mediaEl.duration);
    });

  } else {
    // AUDIO
    vlb.classList.remove('on');
    playerBar.classList.add('active');
    document.body.classList.add('has-player');

    mediaEl.volume = pVol.value/100;
    pCur.textContent   = '0:00';
    pDur.textContent   = '0:00';
    pSeek.value        = 0;
    updateSeekGrad(0);

    mediaEl.addEventListener('play',     function(){ btnPlayMain.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"currentColor\" style=\"display:inline-block;vertical-align:-.15em\"><rect x=\"5\" y=\"3\" width=\"4\" height=\"18\"/><rect x=\"15\" y=\"3\" width=\"4\" height=\"18\"/></svg>"; });
    mediaEl.addEventListener('pause',    function(){ btnPlayMain.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"currentColor\" style=\"display:inline-block;vertical-align:-.15em\"><polygon points=\"6,3 20,12 6,21\"/></svg>"; });
    mediaEl.addEventListener('loadedmetadata', function(){ pDur.textContent=fmt(mediaEl.duration); });
    mediaEl.addEventListener('timeupdate', function(){
      if(!mediaEl.duration||seeking) return;
      var pct=(mediaEl.currentTime/mediaEl.duration)*100;
      pSeek.value=(pct/100)*1000;
      updateSeekGrad(pct);
      pCur.textContent=fmt(mediaEl.currentTime);
      pDur.textContent=fmt(mediaEl.duration);
    });
  }

  mediaEl.addEventListener('ended', function(){
    if(isRepeat){ mediaEl.currentTime=0; mediaEl.play(); return; }
    var next=isShuffle?Math.floor(Math.random()*mediaLinks.length):curIdx+1;
    if(next<mediaLinks.length) playMedia(next);
  });

  var p = mediaEl.play();
  if(p && p.catch) p.catch(function(){});

  setupMediaSession(name);
}

// Audio seek
pSeek.addEventListener('mousedown',  function(){ seeking=true; if(mediaEl) mediaEl.pause(); });
pSeek.addEventListener('touchstart', function(){ seeking=true; if(mediaEl) mediaEl.pause(); },{passive:true});
pSeek.addEventListener('input', function(){
  if(!mediaEl||!mediaEl.duration) return;
  updateSeekGrad((pSeek.value/1000)*100);
  pCur.textContent=fmt((pSeek.value/1000)*mediaEl.duration);
});
function doSeek(){
  if(!mediaEl||!mediaEl.duration){ seeking=false; return; }
  mediaEl.currentTime=(pSeek.value/1000)*mediaEl.duration;
  seeking=false; mediaEl.play();
}
pSeek.addEventListener('mouseup', doSeek);
pSeek.addEventListener('touchend', doSeek);
pSeek.addEventListener('change',  doSeek);

// Audio volum
pVol.addEventListener('input', function(){
  if(mediaEl) mediaEl.volume=pVol.value/100;
  updateVolGrad(pVol.value);
});
updateVolGrad(100);

btnPlayMain.addEventListener('click', function(){
  if(!mediaEl) return;
  if(mediaEl.paused) mediaEl.play(); else mediaEl.pause();
});

function playNext(){
  if(!mediaLinks.length) return;
  if(isShuffle){ playMedia(Math.floor(Math.random()*mediaLinks.length)); return; }
  if(curIdx+1<mediaLinks.length) playMedia(curIdx+1);
}
function playPrev(){
  if(!mediaLinks.length) return;
  if(curIdx-1>=0) playMedia(curIdx-1); else playMedia(mediaLinks.length-1);
}
btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);
btnRepeat.addEventListener('click',  function(){ isRepeat=!isRepeat; btnRepeat.classList.toggle('active',isRepeat); });
btnShuffle.addEventListener('click', function(){ isShuffle=!isShuffle; btnShuffle.classList.toggle('active',isShuffle); });

pClose.addEventListener('click', function(){
  if(mediaEl){ mediaEl.pause(); mediaEl.src=''; mediaEl=null; }
  pContainer.innerHTML='';
  playerBar.classList.remove('active');
  document.body.classList.remove('has-player');
  mediaLinks.forEach(function(el){ el.classList.remove('playing'); });
});

document.getElementById('player-info').addEventListener('click', function(){
  var playing=document.querySelector('a.media-link.playing');
  if(!playing) return;
  playing.scrollIntoView({behavior:'smooth',block:'center'});
  playing.style.outline='2px solid var(--accent)';
  playing.style.outlineOffset='2px';
  setTimeout(function(){ playing.style.outline=''; playing.style.outlineOffset=''; },1200);
});

mediaLinks.forEach(function(link,idx){
  link.addEventListener('click',function(e){ e.preventDefault(); playMedia(idx); });
});

function setupMediaSession(name){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata=new MediaMetadata({title:name,artist:'Media Browser',album:'Folder Playback'});
  navigator.mediaSession.setActionHandler('previoustrack',playPrev);
  navigator.mediaSession.setActionHandler('nexttrack',playNext);
  navigator.mediaSession.setActionHandler('seekbackward',playPrev);
  navigator.mediaSession.setActionHandler('seekforward',playNext);
}

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
// restore cut highlight dacă fișierul e vizibil
if(_clip&&_clip.mode==='cut'){
  var cutEl=document.querySelector('.f-item[data-ctx-rel]');
  if(cutEl) document.querySelectorAll('.f-item[data-ctx-rel]').forEach(function(el){
    if(el.dataset.ctxRel===_clip.rel) el.classList.add('cut-pending');
  });
}
_clipRefreshPaste();

// ── CONTEXT MENU ─────────────────────────────────────────────
(function(){
  var menu     =document.getElementById('ctx-menu');
  var ctxDown  =document.getElementById('ctx-download');
  var ctxCut   =document.getElementById('ctx-cut');
  var ctxCopy  =document.getElementById('ctx-copy');
  var ctxPaste =document.getElementById('ctx-paste');
  var ctxNF    =document.getElementById('ctx-new-folder');
  var ctxTrash =document.getElementById('ctx-trash');
  var trashForm=document.getElementById('trash-form');
  var trashTgt =document.getElementById('trash-target');
  var trashDir =document.getElementById('trash-dir');
  var grid     =document.getElementById('fileGrid');
  var curPath  =grid?grid.dataset.currentPath:'';
  var cur=null;

  function refit(){
    var r=menu.getBoundingClientRect();
    if(r.right>window.innerWidth)  menu.style.left=(parseFloat(menu.style.left)-r.width)+'px';
    if(r.bottom>window.innerHeight) menu.style.top=(parseFloat(menu.style.top)-r.height)+'px';
  }
  function show(x,y,item){
    cur=item;
    menu.style.left=x+'px'; menu.style.top=y+'px';
    ctxDown.style.display =(item&&!item.isDir)?'flex':'none';
    ctxCut.style.display  =item?'flex':'none';
    ctxCopy.style.display =item?'flex':'none';
    ctxTrash.style.display=item?'flex':'none';
    ctxNF.style.display   ='flex';
    _clipRefreshPaste(); // paste mereu refresh
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
  ctxNF.addEventListener('click',function(){ hide(); window._openNFModal&&window._openNFModal(); });
  ctxTrash.addEventListener('click',function(){
    if(!cur) return;
    if(!confirm('Mută "'+cur.name+'" în Trash?')){ hide(); return; }
    var el=cur.el, rel=cur.rel, name=cur.name;
    hide();

    // Trash prin AJAX — fără reload
    var fd=new FormData();
    fd.append('action','trash');
    fd.append('target',rel);
    fd.append('dir',curPath);
    fd.append('_xhr','1');

    var xhr=new XMLHttpRequest();
    xhr.open('POST',window.location.pathname);
    xhr.addEventListener('load',function(){
      var r; try{ r=JSON.parse(xhr.responseText); }catch(e){ r={ok:false,msg:'Răspuns invalid'}; }
      if(!r.ok){
        alert('Eroare: '+r.msg); return;
      }

      // ── Actualizăm player-ul dacă fișierul era în playlist ──
      var mediaLinkEl=el.classList.contains('media-link')?el:null;
      if(mediaLinkEl&&typeof mediaLinks!=='undefined'){
        var idx=mediaLinks.indexOf(mediaLinkEl);
        if(idx!==-1){
          var wasPlaying=(typeof curIdx!=='undefined'&&curIdx===idx);
          // Scoatem din array
          mediaLinks.splice(idx,1);
          // Ajustăm curIdx
          if(typeof curIdx!=='undefined'){
            if(wasPlaying){
              // Piesa curentă ștearsă → trecem la următoarea (sau oprim dacă nu mai e nimic)
              if(mediaLinks.length===0){
                // Nu mai e nimic — oprim playerul
                if(typeof mediaEl!=='undefined'&&mediaEl){ mediaEl.pause(); mediaEl.src=''; }
                var pb=document.getElementById('playerBar');
                if(pb) pb.classList.remove('active');
                document.body.classList.remove('has-player');
                curIdx=-1;
              } else {
                // Trecem la idx (care acum e următoarea) sau la ultima dacă era la final
                var nextIdx=idx<mediaLinks.length?idx:mediaLinks.length-1;
                curIdx=nextIdx;
                playMedia(nextIdx);
              }
            } else if(idx<curIdx){
              // O piesă dinaintea celei curente a fost ștearsă → ajustăm indexul
              curIdx--;
            }
          }
        }
      }

      // Scoatem elementul din DOM
      if(el&&el.parentNode) el.parentNode.removeChild(el);

      // Mesaj flash fără reload
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
  if(!grid||!overlay) return; // nu pe trash view

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

// ── LIGHTBOX ──
var lb=document.getElementById('lb'), wrap=document.getElementById('lb-wrap');
var img=document.getElementById('lb-img'), hint=document.getElementById('lb-hint');
var ctr=document.getElementById('lb-counter');
var links=Array.from(document.querySelectorAll('a.img-link'));
var lidx=0, scale=1, ox=0, oy=0;
var dragging=false, lastX=0, lastY=0;
var pd0=0, ps0=1, sx0=0, sy0=0, smoved=false;

function clamp(){
  var iw=img.naturalWidth*scale,ih=img.naturalHeight*scale,vw=wrap.clientWidth,vh=wrap.clientHeight;
  ox=Math.max(-Math.max(0,(iw-vw)/2),Math.min(Math.max(0,(iw-vw)/2),ox));
  oy=Math.max(-Math.max(0,(ih-vw)/2),Math.min(Math.max(0,(ih-vw)/2),oy));
}
function applyT(a){ img.style.transition=a?'transform .18s ease':'none'; img.style.transform='translate('+ox+'px,'+oy+'px) scale('+scale+')'; img.classList.toggle('zoomed',scale>1); hint.style.opacity=scale>1?'0':'1'; }
function resetT(a){ scale=1;ox=0;oy=0;applyT(a); }
function lbOpen(i){ lidx=i; img.src=links[lidx].dataset.img; resetT(false); ctr.textContent=(lidx+1)+' / '+links.length; lb.classList.add('on'); document.body.style.overflow='hidden'; }
function lbClose(){ lb.classList.remove('on'); img.src=''; document.body.style.overflow=''; resetT(false); }
function lbPrev(){ if(links.length<2)return; lbOpen((lidx-1+links.length)%links.length); }
function lbNext(){ if(links.length<2)return; lbOpen((lidx+1)%links.length); }

links.forEach(function(a,i){ a.addEventListener('click',function(e){ e.preventDefault(); lbOpen(i); }); });
document.getElementById('lb-close').addEventListener('click',lbClose);
document.getElementById('lb-prev').addEventListener('click',lbPrev);
document.getElementById('lb-next').addEventListener('click',lbNext);
lb.addEventListener('click',function(e){ if(e.target===lb||e.target===wrap)lbClose(); });
document.addEventListener('keydown',function(e){ if(!lb.classList.contains('on'))return; if(e.key==='Escape')lbClose(); if(e.key==='ArrowLeft')lbPrev(); if(e.key==='ArrowRight')lbNext(); });
img.addEventListener('dblclick',function(){ resetT(true); });
wrap.addEventListener('wheel',function(e){ e.preventDefault(); scale=Math.max(1,Math.min(10,scale*(e.deltaY<0?1.15:1/1.15))); clamp(); applyT(false); },{passive:false});
img.addEventListener('mousedown',function(e){ if(scale<=1)return; dragging=true; lastX=e.clientX; lastY=e.clientY; img.classList.add('dragging'); e.preventDefault(); });
window.addEventListener('mousemove',function(e){ if(!dragging)return; ox+=e.clientX-lastX; oy+=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; clamp(); applyT(false); });
window.addEventListener('mouseup',function(){ dragging=false; img.classList.remove('dragging'); });
function tDist(t){ var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
wrap.addEventListener('touchstart',function(e){ if(e.touches.length===2){pd0=tDist(e.touches);ps0=scale;} else if(e.touches.length===1){lastX=sx0=e.touches[0].clientX;lastY=sy0=e.touches[0].clientY;smoved=false;} },{passive:true});
wrap.addEventListener('touchmove',function(e){ e.preventDefault(); if(e.touches.length===2){scale=Math.max(1,Math.min(10,ps0*(tDist(e.touches)/pd0)));clamp();applyT(false);}else if(e.touches.length===1){if(scale>1){ox+=e.touches[0].clientX-lastX;oy+=e.touches[0].clientY-lastY;clamp();applyT(false);}lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;smoved=true;} },{passive:false});
var ltap=0;
wrap.addEventListener('touchend',function(e){ if(e.touches.length!==0)return; var now=Date.now(); if(now-ltap<300){resetT(true);ltap=0;return;}ltap=now; if(scale<=1&&smoved&&Math.abs(lastX-sx0)>30){(lastX-sx0)<0?lbNext():lbPrev();} });

})();
