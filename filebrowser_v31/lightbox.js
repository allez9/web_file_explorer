(function(){
// ── LIGHTBOX POZE ────────────────────────────────────────────
var lb    = document.getElementById('lb');
var wrap  = document.getElementById('lb-wrap');
var img   = document.getElementById('lb-img');
var hint  = document.getElementById('lb-hint');
var ctr   = document.getElementById('lb-counter');
var links = Array.from(document.querySelectorAll('a.img-link'));

if(!lb||!links.length) return;

var lidx=0, scale=1, ox=0, oy=0;
var dragging=false, lastX=0, lastY=0;
var pd0=0, ps0=1, sx0=0, sy0=0, smoved=false;

function clamp(){
  var iw=img.naturalWidth*scale, ih=img.naturalHeight*scale;
  var vw=wrap.clientWidth,        vh=wrap.clientHeight;
  ox=Math.max(-Math.max(0,(iw-vw)/2), Math.min(Math.max(0,(iw-vw)/2), ox));
  oy=Math.max(-Math.max(0,(ih-vh)/2), Math.min(Math.max(0,(ih-vh)/2), oy));
}
function applyT(a){
  img.style.transition=a?'transform .18s ease':'none';
  img.style.transform='translate('+ox+'px,'+oy+'px) scale('+scale+')';
  img.classList.toggle('zoomed',scale>1);
  hint.style.opacity=scale>1?'0':'1';
}
function resetT(a){ scale=1; ox=0; oy=0; applyT(a); }
function lbOpen(i){
  lidx=i;
  img.src=links[lidx].dataset.img;
  resetT(false);
  ctr.textContent=(lidx+1)+' / '+links.length;
  lb.classList.add('on');
  document.body.style.overflow='hidden';
}
function lbClose(){ lb.classList.remove('on'); img.src=''; document.body.style.overflow=''; resetT(false); }
function lbPrev(){ if(links.length<2) return; lbOpen((lidx-1+links.length)%links.length); }
function lbNext(){ if(links.length<2) return; lbOpen((lidx+1)%links.length); }

links.forEach(function(a,i){ a.addEventListener('click',function(e){ e.preventDefault(); lbOpen(i); }); });

document.getElementById('lb-close').addEventListener('click',lbClose);
document.getElementById('lb-prev').addEventListener('click',lbPrev);
document.getElementById('lb-next').addEventListener('click',lbNext);
lb.addEventListener('click',function(e){ if(e.target===lb||e.target===wrap) lbClose(); });

document.addEventListener('keydown',function(e){
  if(!lb.classList.contains('on')) return;
  if(e.key==='Escape')    lbClose();
  if(e.key==='ArrowLeft') lbPrev();
  if(e.key==='ArrowRight')lbNext();
});

img.addEventListener('dblclick',function(){ resetT(true); });

wrap.addEventListener('wheel',function(e){
  e.preventDefault();
  scale=Math.max(1,Math.min(10,scale*(e.deltaY<0?1.15:1/1.15)));
  clamp(); applyT(false);
},{passive:false});

img.addEventListener('mousedown',function(e){
  if(scale<=1) return;
  dragging=true; lastX=e.clientX; lastY=e.clientY;
  img.classList.add('dragging'); e.preventDefault();
});
window.addEventListener('mousemove',function(e){
  if(!dragging) return;
  ox+=e.clientX-lastX; oy+=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  clamp(); applyT(false);
});
window.addEventListener('mouseup',function(){ dragging=false; img.classList.remove('dragging'); });

function tDist(t){ var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
wrap.addEventListener('touchstart',function(e){
  if(e.touches.length===2){ pd0=tDist(e.touches); ps0=scale; }
  else if(e.touches.length===1){ lastX=sx0=e.touches[0].clientX; lastY=sy0=e.touches[0].clientY; smoved=false; }
},{passive:true});
wrap.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    scale=Math.max(1,Math.min(10,ps0*(tDist(e.touches)/pd0))); clamp(); applyT(false);
  } else if(e.touches.length===1){
    if(scale>1){ ox+=e.touches[0].clientX-lastX; oy+=e.touches[0].clientY-lastY; clamp(); applyT(false); }
    lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; smoved=true;
  }
},{passive:false});
var ltap=0;
wrap.addEventListener('touchend',function(e){
  if(e.touches.length!==0) return;
  var now=Date.now();
  if(now-ltap<300){ resetT(true); ltap=0; return; }
  ltap=now;
  if(scale<=1&&smoved&&Math.abs(lastX-sx0)>30){ (lastX-sx0)<0?lbNext():lbPrev(); }
});

})();
