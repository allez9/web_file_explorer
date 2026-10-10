(function(){
// ── VIDEO PLAYER (floating vlb) ──────────────────────────────
var vlb    = document.getElementById('vlb');
if(!vlb) return;

var vlbSeek    = document.getElementById('vlb-seek');
var vlbVol     = document.getElementById('vlb-vol');
var vlbPlay    = document.getElementById('vlb-play');
var vlbMute    = document.getElementById('vlb-mute');
var vlbCur     = document.getElementById('vlb-cur');
var vlbDur     = document.getElementById('vlb-dur');
var vlbRew     = document.getElementById('vlb-rew');
var vlbFwd     = document.getElementById('vlb-fwd');
var vlbSeeking = false;

var PLAY_SVG  = '&#9654;';
var PAUSE_SVG = '&#10074;&#10074;';

function vlbFmt(s){ s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function vlbUpdateSeek(pct){ vlbSeek.style.background='linear-gradient(to right, #fff '+pct+'%, rgba(255,255,255,.3) '+pct+'%)'; }
function vlbUpdateVol(v){   vlbVol.style.background ='linear-gradient(to right, #fff '+v+'%, rgba(255,255,255,.3) '+v+'%)'; }

function vlbOpen(){
  vlb.classList.add('on');
  vlbSeek.value=0; vlbUpdateSeek(0);
  vlbCur.textContent='0:00'; vlbDur.textContent='0:00';
  vlbPlay.innerHTML=PLAY_SVG;
}

// Expunem pentru playMedia din app.js
window._vlbOpen        = vlbOpen;
window._vlbUpdateSeek  = vlbUpdateSeek;
window._vlbUpdateVol   = vlbUpdateVol;
window._vlbFmt         = vlbFmt;
window._vlbPlay        = vlbPlay;
window._vlbSeek        = vlbSeek;
window._vlbVol         = vlbVol;
window._vlbSeeking     = function(){ return vlbSeeking; };
window._vlbCur         = vlbCur;
window._vlbDur         = vlbDur;
window._PLAY_SVG       = PLAY_SVG;
window._PAUSE_SVG      = PAUSE_SVG;

vlbPlay.addEventListener('click', function(){
  var me=window._mediaEl; if(!me) return;
  me.paused ? me.play() : me.pause();
});

vlbRew.addEventListener('click', function(){
  var me=window._mediaEl; if(me) me.currentTime=Math.max(0,me.currentTime-5);
});
vlbFwd.addEventListener('click', function(){
  var me=window._mediaEl; if(me) me.currentTime=Math.min(me.duration,me.currentTime+5);
});

vlbMute.addEventListener('click', function(){
  var me=window._mediaEl; if(!me) return;
  me.muted=!me.muted;
  vlbMute.textContent=me.muted?'🔇':'🔊';
});

vlbVol.addEventListener('input', function(){
  var me=window._mediaEl;
  if(me){ me.volume=vlbVol.value/100; me.muted=false; vlbMute.textContent='🔊'; }
  vlbUpdateVol(vlbVol.value);
});
vlbUpdateVol(100);

// Seek video
vlbSeek.addEventListener('pointerdown', function(e){
  var me=window._mediaEl;
  if(!me||!Number.isFinite(me.duration)||me.duration<=0) return;
  vlbSeeking=true;
  try{ vlbSeek.setPointerCapture(e.pointerId); }catch(_){}
});
vlbSeek.addEventListener('input', function(){
  var me=window._mediaEl;
  if(!me||!Number.isFinite(me.duration)||me.duration<=0) return;
  var pct=(Number(vlbSeek.value)/1000)*100;
  vlbUpdateSeek(pct);
  vlbCur.textContent=vlbFmt((pct/100)*me.duration);
});
vlbSeek.addEventListener('pointerup', function(e){
  if(!vlbSeeking) return;
  vlbSeeking=false;
  try{ vlbSeek.releasePointerCapture(e.pointerId); }catch(_){}
  var me=window._mediaEl;
  if(me&&Number.isFinite(me.duration)&&me.duration>0){
    me.currentTime=(Number(vlbSeek.value)/1000)*me.duration;
  }
});
vlbSeek.addEventListener('pointercancel', function(){ vlbSeeking=false; });

document.getElementById('vlb-fullscreen').addEventListener('click', function(){
  var el=document.getElementById('vlb');
  if(el.requestFullscreen) el.requestFullscreen();
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});

document.getElementById('vlb-close').addEventListener('click', function(){
  var me=window._mediaEl;
  if(me){ me.pause(); me.src=''; window._mediaEl=null; }
  document.getElementById('pContainer').innerHTML='';
  vlb.classList.remove('on');
  var ml=window._mediaLinks||[];
  ml.forEach(function(el){ el.classList.remove('playing'); });
});

// Drag & Resize
(function(){
  var panel=document.getElementById('vlb');
  var handle=document.getElementById('vlb-resize');
  var resizing=false,dragging=false,pointerId=null;
  var startX=0,startY=0,startW=0,startH=0,startL=0,startT=0;

  handle.addEventListener('pointerdown',function(e){
    resizing=true; pointerId=e.pointerId;
    startX=e.clientX; startY=e.clientY;
    startW=panel.offsetWidth; startH=panel.offsetHeight;
    try{ handle.setPointerCapture(pointerId); }catch(_){}
    document.body.style.cursor='nwse-resize';
    e.preventDefault(); e.stopPropagation();
  });
  panel.addEventListener('pointerdown',function(e){
    if(e.target.closest('#vlb-controls')||e.target.closest('.vlb-top-btn')||e.target.closest('#vlb-resize')) return;
    dragging=true; pointerId=e.pointerId;
    startX=e.clientX; startY=e.clientY;
    var r=panel.getBoundingClientRect();
    startL=r.left; startT=r.top;
    panel.style.left=r.left+'px'; panel.style.top=r.top+'px';
    panel.style.right='auto'; panel.style.bottom='auto';
    try{ panel.setPointerCapture(pointerId); }catch(_){}
    document.body.style.cursor='move';
    e.preventDefault();
  });
  function move(e){
    if(pointerId!==null&&e.pointerId!==pointerId) return;
    if(resizing){
      panel.style.width =Math.max(280,startW-(e.clientX-startX))+'px';
      panel.style.height=Math.max(180,startH-(e.clientY-startY))+'px';
      e.preventDefault();
    } else if(dragging){
      var x=startL+(e.clientX-startX), y=startT+(e.clientY-startY);
      panel.style.left=Math.max(0,Math.min(x,window.innerWidth -panel.offsetWidth ))+'px';
      panel.style.top =Math.max(0,Math.min(y,window.innerHeight-panel.offsetHeight))+'px';
      e.preventDefault();
    }
  }
  function end(e){
    if(pointerId!==null&&e.pointerId!==pointerId) return;
    resizing=false; dragging=false; pointerId=null;
    document.body.style.cursor='';
  }
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',end);
})();

})();
