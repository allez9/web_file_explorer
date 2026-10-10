(function(){
// ── AUDIO PLAYER BAR ─────────────────────────────────────────
var playerBar = document.getElementById('player-bar');
if(!playerBar) return;

var pTitle      = document.getElementById('pTitle');
var pSub        = document.getElementById('pSub');
var pCur        = document.getElementById('pCur');
var pDur        = document.getElementById('pDur');
var pSeek       = document.getElementById('pSeek');
var pVol        = document.getElementById('pVol');
var btnPlayMain = document.getElementById('btnPlayMain');
var btnPrev     = document.getElementById('btnPrev');
var btnNext     = document.getElementById('btnNext');
var btnRepeat   = document.getElementById('btnRepeat');
var btnShuffle  = document.getElementById('btnShuffle');
var pClose      = document.getElementById('pClose');
var pContainer  = document.getElementById('pContainer');

var isRepeat  = false;
var isShuffle = false;
var seeking   = false;

function fmt(s){ s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function updateSeekGrad(pct){ pSeek.style.background='linear-gradient(to right,var(--accent) '+pct+'%,var(--border2) '+pct+'%)'; }
function updateVolGrad(pct){  pVol.style.background ='linear-gradient(to right,var(--accent) '+pct+'%,var(--border2) '+pct+'%)'; }

function playNext(){
  var ml=window._mediaLinks||[]; var ci=window._curIdx||-1;
  if(!ml.length) return;
  if(isShuffle){ window._playMedia(Math.floor(Math.random()*ml.length)); return; }
  if(ci+1<ml.length) window._playMedia(ci+1);
}
function playPrev(){
  var ml=window._mediaLinks||[]; var ci=window._curIdx||-1;
  if(!ml.length) return;
  if(ci-1>=0) window._playMedia(ci-1); else window._playMedia(ml.length-1);
}

// Expunem pentru playMedia din app.js
window._audioFmt         = fmt;
window._audioUpdateSeek  = updateSeekGrad;
window._audioUpdateVol   = updateVolGrad;
window._pSeek            = pSeek;
window._pVol             = pVol;
window._pCur             = pCur;
window._pDur             = pDur;
window._pTitle           = pTitle;
window._pSub             = pSub;
window._btnPlayMain      = btnPlayMain;
window._playerBar        = playerBar;
window._pContainer       = pContainer;
window._isRepeat         = function(){ return isRepeat; };
window._isShuffle        = function(){ return isShuffle; };
window._playNext         = playNext;
window._playPrev         = playPrev;
window._setupMediaSession= setupMediaSession;

// Seek audio
pSeek.addEventListener('mousedown',  function(){ seeking=true; var me=window._mediaEl; if(me) me.pause(); });
pSeek.addEventListener('touchstart', function(){ seeking=true; var me=window._mediaEl; if(me) me.pause(); },{passive:true});
pSeek.addEventListener('input', function(){
  var me=window._mediaEl;
  if(!me||!me.duration) return;
  updateSeekGrad((pSeek.value/1000)*100);
  pCur.textContent=fmt((pSeek.value/1000)*me.duration);
});
function doSeek(){
  var me=window._mediaEl;
  if(!me||!me.duration){ seeking=false; return; }
  me.currentTime=(pSeek.value/1000)*me.duration;
  seeking=false; me.play();
}
pSeek.addEventListener('mouseup',  doSeek);
pSeek.addEventListener('touchend', doSeek);
pSeek.addEventListener('change',   doSeek);

// Expunem seeking pentru playMedia
window._audioSeeking = function(){ return seeking; };

// Volum audio
pVol.addEventListener('input', function(){
  var me=window._mediaEl; if(me) me.volume=pVol.value/100;
  updateVolGrad(pVol.value);
});
updateVolGrad(100);

btnPlayMain.addEventListener('click', function(){
  var me=window._mediaEl; if(!me) return;
  me.paused ? me.play() : me.pause();
});
btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);
btnRepeat.addEventListener('click',  function(){ isRepeat=!isRepeat;  btnRepeat.classList.toggle('active',isRepeat); });
btnShuffle.addEventListener('click', function(){ isShuffle=!isShuffle; btnShuffle.classList.toggle('active',isShuffle); });

pClose.addEventListener('click', function(){
  var me=window._mediaEl;
  if(me){ me.pause(); me.src=''; window._mediaEl=null; }
  pContainer.innerHTML='';
  playerBar.classList.remove('active');
  document.body.classList.remove('has-player');
  var ml=window._mediaLinks||[];
  ml.forEach(function(el){ el.classList.remove('playing'); });
});

document.getElementById('player-info').addEventListener('click', function(){
  var playing=document.querySelector('a.media-link.playing');
  if(!playing) return;
  playing.scrollIntoView({behavior:'smooth',block:'center'});
  playing.style.outline='2px solid var(--accent)';
  playing.style.outlineOffset='2px';
  setTimeout(function(){ playing.style.outline=''; playing.style.outlineOffset=''; },1200);
});

function setupMediaSession(name){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata=new MediaMetadata({title:name,artist:'Media Browser',album:'Folder Playback'});
  navigator.mediaSession.setActionHandler('previoustrack',playPrev);
  navigator.mediaSession.setActionHandler('nexttrack',playNext);
  navigator.mediaSession.setActionHandler('seekbackward',playPrev);
  navigator.mediaSession.setActionHandler('seekforward',playNext);
}

})();
