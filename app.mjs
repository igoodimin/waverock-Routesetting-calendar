import {configured,readEvents,writeEvent,removeEvent} from './shared-store.mjs';
import {BRANCHES,calendarDays,segments,validEvent,withDpi} from './calendar.mjs';
const $=id=>document.getElementById(id);
const now=new Date();let state={year:now.getFullYear(),month:now.getMonth()+1,branch:'남천점',events:[]};
const VIEW_KEY='waverock.calendar.view.v1';
try {const saved=JSON.parse(localStorage.getItem(VIEW_KEY)||'null');
 if(saved&&Number.isInteger(saved.year)&&saved.year>=1900&&saved.year<=2200&&Number.isInteger(saved.month)&&saved.month>=1&&saved.month<=12){state.year=saved.year;state.month=saved.month;if(Object.hasOwn(BRANCHES,saved.branch))state.branch=saved.branch;}
}catch{}
function status(message){$('status').textContent=message;}
function save(){try{localStorage.setItem(VIEW_KEY,JSON.stringify({year:state.year,month:state.month,branch:state.branch}));}catch{}}
let sharedReady=false,syncing=false,busy=false,activeVersion;
async function syncEvents(){
 if(!configured||syncing||busy||$('editor').open)return;
 syncing=true;
 try{const events=await readEvents();if(!busy&&!$('editor').open){state.events=events;sharedReady=true;render();status('공용 일정 동기화 완료 · 누구나 편집 가능');}}
 catch(error){status(error.message);}
 finally{syncing=false;}
}
function editorBusy(value){busy=value;for(const el of $('edit-form').elements)el.disabled=value;}
for(let i=1;i<=12;i++)$('month').add(new Option(`${i}월`,i));
for(const id of ['branch','edit-branch'])for(const branch of Object.keys(BRANCHES))$(id).add(new Option(branch,branch));
$('year').value=state.year;$('month').value=state.month;$('branch').value=state.branch;
function sectors(){const select=$('sector');select.replaceChildren();for(const s of BRANCHES[$('branch').value].sectors)select.add(new Option(s,s));}
sectors();
const canvas=$('preview'),ctx=canvas.getContext('2d');
// Coordinates measured from the supplied 2250 × 2813 background, scaled to the design canvas.
const GRID={x:71,y:511,w:948,h:651};GRID.cw=GRID.w/7;GRID.rh=GRID.h/5;
let days=[],pieces=[],boxes=[],active=null,drag=null,ready=false;
const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
let bg;const marks={};
function fitText(text,x,y,width,font,color='#fff',align='left'){
 ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;
 ctx.save();ctx.translate(x,y);const measured=ctx.measureText(text).width;
 if(measured>width)ctx.scale(width/measured,1);ctx.fillText(text,0,0);ctx.restore();ctx.textAlign='left';
}
function drawCard(piece){
 const {event,row,start,end,lane}=piece;
 const rows=pieces.filter(p=>p.row===row);const lanes=Math.max(...rows.map(p=>p.lane))+1;
 const scale=Math.min(1,90/(lanes*53+(lanes-1)*3));
 const h=53*scale, gap=3*scale;
 const x=GRID.x+start*GRID.cw,w=(end-start+1)*GRID.cw;
 const y=GRID.y+row*GRID.rh+(lanes===1?67:GRID.rh-10-(h*lanes+gap*(lanes-1)))+lane*(h+gap);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=BRANCHES[event.branch].color;ctx.fillRect(x,y,w,h);
 const narrow=end===start;
 const mark=marks[BRANCHES[event.branch].mark];
 // The supplied SVG supplies the mark; layout and editable text are rendered independently.
 if(narrow){ctx.drawImage(mark.small,x+8.38*scale,y+9*scale,35*scale,35*scale);
 const textX=x+51.46*scale,textW=w-58.46*scale,centerX=textX+textW/2;
 fitText(event.sector,centerX,y+26*scale,textW,`700 ${21*scale}px Pretendard`,'#fff','center');
 fitText(event.time,centerX,y+42.98*scale,textW,`500 ${12*scale}px Pretendard`,'#fff','center');
 }else{
 ctx.drawImage(mark.large,x+8.38*scale,y+7.35*scale,38*scale,38*scale);
 const infoW=94*scale,infoX=x+w-infoW-7*scale,nameX=x+49*scale,nameW=infoX-nameX-10*scale;
 fitText(event.sector,nameX+nameW/2,y+34*scale,nameW,`700 ${22*scale}px Pretendard`,'#fff','center');
 fitText(event.time,infoX,y+25*scale,infoW,`500 ${15*scale}px Pretendard`);
 fitText(event.note,infoX,y+39*scale,infoW,`500 ${12*scale}px Pretendard`);
 }
 ctx.restore();boxes.push({id:event.id,x,y,w,h});
}
function position(el,{x,y,w,h}){Object.assign(el.style,{left:`${x/10.8}%`,top:`${y/13.5}%`,width:`${w/10.8}%`,height:`${h/13.5}%`});}
function render(){
 if(!ready)return;
 days=calendarDays(state.year,state.month);pieces=segments(state.events,days);boxes=[];
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,1080,1350);ctx.drawImage(bg,0,0,1080,1350);
 days.forEach((day,i)=>{const d=new Date(`${day}T00:00:00Z`);ctx.font='900 20px CalendarDate, Pretendard, sans-serif';ctx.fillStyle=i%7===0?'#ef3117':i%7===6?'#3f83c5':'#251d19';ctx.textAlign='right';ctx.fillText(`${d.getUTCMonth()+1}/${d.getUTCDate()}`,GRID.x+(i%7+1)*GRID.cw-15,GRID.y+Math.floor(i/7)*GRID.rh+27);});ctx.textAlign='left';
 pieces.forEach(drawCard);
 const overlay=$('interaction');overlay.replaceChildren();
 days.forEach((day,i)=>{const el=document.createElement('button');el.className='cell';el.dataset.index=i;el.setAttribute('aria-label',`${day} 세팅 일정 추가`);position(el,{x:GRID.x+i%7*GRID.cw,y:GRID.y+Math.floor(i/7)*GRID.rh,w:GRID.cw,h:GRID.rh});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();create(i,i);}});overlay.append(el);});
 for(const b of boxes){const e=state.events.find(e=>e.id===b.id),button=document.createElement('button');button.className='card-hit';button.setAttribute('aria-label',`${e.branch} ${e.sector} ${e.start}부터 ${e.end} 일정 수정`);position(button,b);button.onclick=()=>edit(e.id);overlay.append(button);}
 $('preview-title').textContent=`${state.year}년 ${state.month}월`;$('range').textContent=`표시 기간 ${days[0]} ~ ${days[34]} · 5주 고정`;
 const visible=state.events.filter(e=>e.start<=days[34]&&e.end>=days[0]).sort((a,b)=>a.start.localeCompare(b.start));
 $('count').textContent=visible.length;$('events').replaceChildren();
 if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='아직 일정이 없습니다. 날짜를 드래그해 첫 일정을 추가하세요.';$('events').append(p);}
 for(const e of visible){const b=document.createElement('button');b.className='list-item';const dot=document.createElement('span');dot.className='dot';dot.style.background=BRANCHES[e.branch].color;const title=document.createElement('span');title.textContent=`${e.branch} · ${e.sector}`;const sub=document.createElement('small');sub.textContent=`${e.start.slice(5)} ~ ${e.end.slice(5)}`;b.append(dot,title,sub);b.onclick=()=>edit(e.id);$('events').append(b);}
}
function create(a,b){const branch=$('branch').value;selectRange();openEditor({branch,sector:$('sector').value,time:'08:00~18:00',note:BRANCHES[branch].note,start:days[Math.min(a,b)],end:days[Math.max(a,b)]});}
function indexAt(e){const r=$('interaction').getBoundingClientRect(),x=(e.clientX-r.left)*1080/r.width,y=(e.clientY-r.top)*1350/r.height;if(x<GRID.x||x>=GRID.x+GRID.w||y<GRID.y||y>=GRID.y+GRID.h)return null;return Math.floor((y-GRID.y)/GRID.rh)*7+Math.floor((x-GRID.x)/GRID.cw);}
function selectRange(){document.querySelectorAll('.cell').forEach((el,i)=>el.classList.toggle('selected',drag&&i>=Math.min(drag.start,drag.end)&&i<=Math.max(drag.start,drag.end)));}
$('interaction').onpointerdown=e=>{if(!ready||e.button!==0||!e.target.classList.contains('cell'))return;const i=indexAt(e);if(i===null)return;e.preventDefault();drag={start:i,end:i,pointer:e.pointerId};$('interaction').setPointerCapture(e.pointerId);selectRange();};
$('interaction').onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId)return;const i=indexAt(e);if(i!==null){drag.end=i;selectRange();}};
$('interaction').onpointerup=e=>{if(!drag||drag.pointer!==e.pointerId)return;const {start,end}=drag;drag=null;create(start,end);};
$('interaction').onpointercancel=()=>{drag=null;selectRange();};
$('interaction').onlostpointercapture=()=>{if(drag){drag=null;selectRange();}};
function changeMonth(){const year=Number($('year').value),month=Number($('month').value);if(!Number.isInteger(year)||year<1900||year>2200){status('년도는 1900~2200 사이로 입력해 주세요.');return;}state.year=year;state.month=month;save();render();}
$('year').onchange=changeMonth;$('month').onchange=changeMonth;$('branch').onchange=()=>{state.branch=$('branch').value;sectors();save();};
function editorSectors(){const select=$('edit-sector-choice'),value=$('edit-sector').value;select.replaceChildren();for(const sector of BRANCHES[$('edit-branch').value].sectors)select.add(new Option(sector,sector));select.add(new Option('직접 입력',''));select.value=BRANCHES[$('edit-branch').value].sectors.includes(value)?value:'';}
function openEditor(e){if(!sharedReady){status('공용 서버 연결이 필요합니다. 연결 후 다시 시도해 주세요.');return;}activeVersion=e.version;active=e.id??null;for(const key of ['branch','sector','start','end','time','note'])$(`edit-${key}`).value=e[key];editorSectors();$('editor-title').textContent=active?'세팅 일정 수정':'세팅 일정 추가';$('editor-save').textContent=active?'수정 저장':'일정 추가';$('delete').hidden=!active;$('form-error').textContent='';$('editor').showModal();}
function edit(id){const e=state.events.find(e=>e.id===id);if(e)openEditor(e);}
$('close').onclick=()=>$('editor').close();
$('editor').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('editor').addEventListener('close',()=>void syncEvents());
$('edit-branch').onchange=()=>{$('edit-note').value=BRANCHES[$('edit-branch').value].note;editorSectors();};
$('edit-sector-choice').onchange=()=>{const value=$('edit-sector-choice').value;if(value)$('edit-sector').value=value;else $('edit-sector').focus();};
$('edit-sector').oninput=()=>{const value=$('edit-sector').value;$('edit-sector-choice').value=BRANCHES[$('edit-branch').value].sectors.includes(value)?value:'';};
$('edit-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const next={id:active??crypto.randomUUID()};for(const key of ['branch','sector','start','end','time','note'])next[key]=$(`edit-${key}`).value.trim();if(!validEvent(next)||!next.sector||!next.time||!next.note){$('form-error').textContent='내용과 날짜를 확인해 주세요. 종료일은 시작일 이후여야 합니다.';return;}
 editorBusy(true);$('form-error').textContent='공용 서버에 저장 중…';
 try{const saved=await writeEvent(next,activeVersion);state.events=[...state.events.filter(e=>e.id!==saved.id),saved];render();$('editor').close();status('공용 서버에 저장했습니다.');}
 catch(error){$('form-error').textContent=error.message+' 입력 내용은 유지됩니다.';}
 finally{editorBusy(false);}
};
$('delete').onclick=async()=>{if(!active||busy)return;editorBusy(true);
 try{await removeEvent(active,activeVersion);state.events=state.events.filter(e=>e.id!==active);render();$('editor').close();status('공용 일정을 삭제했습니다.');}
 catch(error){$('form-error').textContent=error.message;}
 finally{editorBusy(false);}
};
$('export').onclick=async()=>{const button=$('export');button.disabled=true;status('고화질 PNG를 만드는 중…');try{await document.fonts.ready;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('empty');const bytes=withDpi(new Uint8Array(await blob.arrayBuffer()));const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const a=document.createElement('a');a.href=url;a.download=`WAVEROCK-${state.year}-${String(state.month).padStart(2,'0')}-150dpi.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('2160 × 2700px · 150dpi PNG를 다운로드했습니다.');}catch{status('이미지 추출에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');}finally{button.disabled=false;}};
try{[bg]=await Promise.all([loadImage('assets/background.png'),...Object.values(BRANCHES).map(async({mark})=>{const [small,large]=await Promise.all(['small','large'].map(size=>loadImage(`assets/mark-${mark}-${size}.svg`)));marks[mark]={small,large};}),document.fonts.load('700 22px Pretendard'),document.fonts.load('500 15px Pretendard'),document.fonts.load('900 20px CalendarDate, Pretendard')]);ready=true;render();$('export').disabled=false;status(configured?'공용 일정을 불러오는 중…':'공용 저장 서버가 아직 연결되지 않았습니다.');}catch{status('디자인 소스나 폰트를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 새로고침해 주세요.');}

await syncEvents();
setInterval(()=>{if(!document.hidden)void syncEvents();},10000);
window.addEventListener('focus',()=>void syncEvents());
