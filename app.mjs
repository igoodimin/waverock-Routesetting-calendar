import {BRANCH_EN,SECTOR_EN,NOTE_EN,HOLIDAY_EN,english,missingEnglish,drawEnglishFooter,drawKoreanFooter} from './translations.mjs';
import {validArt,drawArt,prepareArt} from './event-art.mjs';
import {officialHoliday,holidayName,supportedHolidayYear} from './holidays.mjs';
import {configured,readEvents,writeEvent,removeEvent,readHolidays,writeHoliday,readArt,writeArt,readMonthState,writeMonthState} from './shared-store.mjs';
import {BRANCHES,calendarDays,segments,validEvent,withDpi} from './calendar.mjs';
const $=id=>document.getElementById(id);
const isEnglish=document.documentElement.dataset.outputLanguage==='en';
const language=isEnglish?'EN':'KO';
$('export').textContent=`중심 달 ${isEnglish?'영문':'국문'} PNG 다운로드 ↗`;
$(isEnglish?'link-en':'link-ko').setAttribute('aria-current','page');
document.title=`WAVEROCK · ${isEnglish?'영문':'국문'} 세팅 달력`;
const now=new Date();let state={year:now.getFullYear(),month:now.getMonth()+1,branch:'남천점',events:[],holidays:[],art:[]};
const VIEW_KEY='waverock.calendar.view.v1';
try {const saved=JSON.parse(localStorage.getItem(VIEW_KEY)||'null');
 if(saved&&Number.isInteger(saved.year)&&saved.year>=1900&&saved.year<=2200&&Number.isInteger(saved.month)&&saved.month>=1&&saved.month<=12){state.year=saved.year;state.month=saved.month;if(Object.hasOwn(BRANCHES,saved.branch))state.branch=saved.branch;}
}catch{}
const query=new URLSearchParams(location.search),queryYear=Number(query.get('year')),queryMonth=Number(query.get('month'));
if(Number.isInteger(queryYear)&&queryYear>=1900&&queryYear<=2200&&Number.isInteger(queryMonth)&&queryMonth>=1&&queryMonth<=12){state.year=queryYear;state.month=queryMonth;}
function outputHoliday(day){const name=holidayName(day,state.holidays),row=state.holidays.find(r=>r.id===day);return !isEnglish||!name?name:row?.mode==='custom'?english(row,'name'):HOLIDAY_EN[name]||name;}
function status(message){$('status').textContent=message;}
function save(){try{localStorage.setItem(VIEW_KEY,JSON.stringify({year:state.year,month:state.month,branch:state.branch}));}catch{}}
let monthState=null,monthReady=false,monthLoading=false;
const monthId=()=>`${state.year}-${String(state.month).padStart(2,'0')}`;
async function syncMonthState(){
 const id=monthId();if(monthLoading||busy)return;monthLoading=true;renderMonthState();
 try{const row=await readMonthState(id);if(id===monthId()){monthState=row;monthReady=true;}}
 catch{if(id===monthId()){monthReady=false;}}
 finally{monthLoading=false;renderMonthState();if(id!==monthId())void syncMonthState();}
}
function renderMonthState(){
 const row=monthState?.id===monthId()?monthState:null;
 $('month-draft').disabled=!monthReady||busy||monthLoading;$('month-draft').checked=Boolean(row?.is_draft);
 $('month-state').textContent=!monthReady?'월 상태 연결 필요 · 추가 SQL과 연결을 확인해 주세요.':`${state.year}년 ${state.month}월 · ${row?.is_draft?'수정중':'완료'}`;
 $('month-state').classList.toggle('draft',Boolean(row?.is_draft));
}
$('month-draft').onchange=async()=>{
 const id=monthId(),is_draft=$('month-draft').checked,row=monthState?.id===id?monthState:null;busy=true;renderMonthState();
 try{const saved=await writeMonthState({id,is_draft},row?.version);if(id===monthId())monthState=saved;}
 catch(error){status(error.message);}
 finally{busy=false;renderMonthState();await syncMonthState();}
};
let sharedReady=false,syncing=false,busy=false,activeVersion,holidayVersion,holidaysReady=false,artReady=false,artVersion,artImage='';
const artImages=new Map();
async function syncEvents(){
 if(!configured||syncing||busy||drag||views.some(view=>view.gesture)||$('editor').open)return;
 syncing=true;
 void syncMonthState();
 try{
  const [events,holidays,art]=await Promise.allSettled([readEvents(),readHolidays(),readArt()]);
  if(art.status==='fulfilled'){try{await cacheArt(art.value);}catch{art.status='rejected';}}
  if(!busy&&!drag&&!views.some(view=>view.gesture)&&!$('editor').open){
   if(events.status==='fulfilled'){state.events=events.value;sharedReady=true;}
   holidaysReady=holidays.status==='fulfilled';
   if(holidaysReady)state.holidays=holidays.value;
   artReady=art.status==='fulfilled';if(artReady)state.art=art.value;
   render();
   status(events.status==='rejected'?events.reason.message:!holidaysReady?'일정 동기화 완료 · 공휴일 저장 연결이 필요합니다. 공휴일 SQL 적용 또는 연결 상태를 확인해 주세요.':!artReady?'일정 동기화 완료 · 이벤트 SQL 적용 또는 연결 상태를 확인해 주세요.':'공용 일정·공휴일·이벤트 동기화 완료 · 누구나 편집 가능');
  }
 }catch(error){status(error.message);}
 finally{syncing=false;}
}
function editorBusy(value){busy=value;for(const el of $('edit-form').elements)el.disabled=value;if(!value)$('holiday-name').disabled=$('holiday-name-en').disabled=$('holiday-mode').value==='off';}
for(let i=1;i<=12;i++)$('month').add(new Option(`${i}월`,i));
for(const id of ['branch','edit-branch'])for(const branch of Object.keys(BRANCHES))$(id).add(new Option(branch,branch));
$('year').value=state.year;$('month').value=state.month;$('branch').value=state.branch;
function sectors(){const select=$('sector');select.replaceChildren();for(const s of BRANCHES[$('branch').value].sectors)select.add(new Option(s,s));}
sectors();
let views=[];
// Coordinates measured from the supplied 2250 × 2813 background, scaled to the design canvas.
const GRID={x:71,y:511,w:948,h:651};GRID.cw=GRID.w/7;GRID.rh=GRID.h/5;
let active=null,drag=null,ready=false;
const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
let bg;const marks={};
async function cacheArt(rows){
 const sources=new Set(rows.filter(row=>row.enabled&&row.image).map(row=>row.image));
 await Promise.all([...sources].map(async source=>{if(!artImages.has(source))artImages.set(source,await loadImage(source));}));
 for(const source of artImages.keys())if(!sources.has(source))artImages.delete(source);
}
function fitText(ctx,text,x,y,width,font,color='#fff',align='left'){
 ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;
 ctx.save();ctx.translate(x,y);const measured=ctx.measureText(text).width;
 if(measured>width)ctx.font=font.replace(/([\d.]+)px/,(_,size)=>`${Number(size)*width/measured}px`);ctx.fillText(text,0,0);ctx.restore();ctx.textAlign='left';
}
function drawEnglishHoliday(ctx,name,x,y,width){
 ctx.font='700 14px Pretendard';ctx.fillStyle='#ef3117';ctx.textAlign='right';
 const words=name.trim().split(/\s+/);let lines=[words.join(' ')];
 if(ctx.measureText(lines[0]).width>width&&words.length>1){
  let bestWidth=Infinity;
  for(let i=1;i<words.length;i++){
   const candidate=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
   const measured=Math.max(...candidate.map(line=>ctx.measureText(line).width));
   if(measured<bestWidth){lines=candidate;bestWidth=measured;}
  }
 }
 const measured=Math.max(...lines.map(line=>ctx.measureText(line).width));
 const size=Math.min(14,14*width/Math.max(1,measured));
 ctx.font=`700 ${size}px Pretendard`;
 lines.forEach((line,i)=>ctx.fillText(line,x,y+(lines.length===1?49:44+i*16)));
 ctx.textAlign='left';
}
function drawCard(view,piece){
 const {ctx,days,pieces,boxes}=view;
 const {event,row,start,end,lane}=piece;
 const rows=pieces.filter(p=>p.row===row);const lanes=Math.max(...rows.map(p=>p.lane))+1;
 const hasHoliday=rows.some(p=>days.slice(row*7+p.start,row*7+p.end+1).some(day=>holidayName(day,state.holidays)));
 const header=view.artHeaders?.get(row);
 const scale=Math.min(1,(header===undefined?(hasHoliday?66:90):GRID.rh-header)/(lanes*53+(lanes-1)*3));
 const h=53*scale;
 const x=GRID.x+start*GRID.cw,w=(end-start+1)*GRID.cw;
 const y=GRID.y+row*GRID.rh+(lanes===1?Math.max(67,header??0):GRID.rh-h*lanes)+lane*h;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=BRANCHES[event.branch].color;ctx.fillRect(x,y,w,h);
 const narrow=end===start,showLogo=event.show_logo!==false;
 const mark=marks[BRANCHES[event.branch].mark];
 // The supplied SVG supplies the mark; layout and editable text are rendered independently.
 if(isEnglish){
 const textX=x+(showLogo?38:8)*scale,textW=w-(showLogo?45:15)*scale;if(showLogo)ctx.drawImage(mark.small,x+8*scale,y+17*scale,21*scale,21*scale);
 if(narrow){
 fitText(ctx,BRANCH_EN[event.branch],textX,y+15*scale,textW,`700 ${12*scale}px Pretendard`);
 fitText(ctx,english(event,'sector',SECTOR_EN),textX,y+29*scale,textW,`500 ${13*scale}px Pretendard`);
 fitText(ctx,event.time,textX,y+43*scale,textW,`500 ${10*scale}px Pretendard`);
 }else{
 const infoW=82*scale,infoX=x+w-infoW-10*scale,nameW=infoX-textX-8*scale;
 fitText(ctx,BRANCH_EN[event.branch],textX,y+24*scale,nameW,`700 ${17*scale}px Pretendard`);
 fitText(ctx,english(event,'sector',SECTOR_EN),textX,y+41*scale,nameW,`500 ${17*scale}px Pretendard`);
 fitText(ctx,event.time,infoX,y+25*scale,infoW,`500 ${15*scale}px Pretendard`);
 fitText(ctx,english(event,'note',NOTE_EN),infoX,y+39*scale,infoW,`500 ${10*scale}px Pretendard`);
 }
 }else if(narrow){if(showLogo)ctx.drawImage(mark.small,x+8.38*scale,y+9*scale,35*scale,35*scale);
 const textX=x+(showLogo?51.46:7)*scale,textW=w-(showLogo?58.46:14)*scale,centerX=textX+textW/2;
 fitText(ctx,event.sector,centerX,y+26*scale,textW,`700 ${21*scale}px Pretendard`,'#fff','center');
 fitText(ctx,event.time,centerX,y+42.98*scale,textW,`500 ${12*scale}px Pretendard`,'#fff','center');
 }else{
 if(showLogo)ctx.drawImage(mark.large,x+8.38*scale,y+7.35*scale,38*scale,38*scale);
 const infoW=94*scale,infoX=x+w-infoW-7*scale,nameX=x+(showLogo?49:7)*scale,nameW=infoX-nameX-10*scale;
 fitText(ctx,event.sector,nameX+nameW/2,y+34*scale,nameW,`700 ${22*scale}px Pretendard`,'#fff','center');
 fitText(ctx,event.time,infoX,y+25*scale,infoW,`500 ${15*scale}px Pretendard`);
 fitText(ctx,event.note,infoX,y+39*scale,infoW,`500 ${12*scale}px Pretendard`);
 }
 ctx.restore();boxes.push({id:event.id,x,y,w,h});
}
function position(el,{x,y,w,h}){Object.assign(el.style,{left:`${x/10.8}%`,top:`${y/13.5}%`,width:`${w/10.8}%`,height:`${h/13.5}%`});}
function renderMonth(view){
 const {year,month,ctx,overlay}=view;
 const days=view.days=calendarDays(year,month),pieces=view.pieces=segments(state.events,days),boxes=view.boxes=[];
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,1080,1350);ctx.drawImage(bg,0,0,1080,1350);
 const artLayouts=new Map();view.artHeaders=new Map();
 days.forEach((day,i)=>{
  const row=state.art.find(row=>row.id===day),week=Math.floor(i/7);
  if(!row?.enabled||row.image||!pieces.some(p=>p.row===week&&p.start<=i%7&&p.end>=i%7))return;
  const top=outputHoliday(day)?(isEnglish?66:55):33;
  const name=isEnglish?english(row,'name'):row.name;
  const bottom=Math.min(94,top+name.split(/\r\n?|\n/).length*(row.font_size??20)*1.2);
  artLayouts.set(day,{textTop:top,textBottom:bottom});
  view.artHeaders.set(week,Math.max(view.artHeaders.get(week)??67,bottom+5));
 });
 days.forEach((day,i)=>{const row=state.art.find(row=>row.id===day);drawArt(ctx,isEnglish&&row?{...row,name:english(row,'name')}:row,artImages.get(row?.image),GRID.x+i%7*GRID.cw,GRID.y+Math.floor(i/7)*GRID.rh,GRID.cw,GRID.rh,artLayouts.get(day));});
 const monthPrefix=`${year}-${String(month).padStart(2,'0')}-`;
 ctx.save();ctx.fillStyle='rgba(0,0,0,0.08)';
 days.forEach((day,i)=>{if(!day.startsWith(monthPrefix))ctx.fillRect(GRID.x+i%7*GRID.cw,GRID.y+Math.floor(i/7)*GRID.rh,GRID.cw,GRID.rh);});
 ctx.restore();
 pieces.forEach(piece=>drawCard(view,piece));
 days.forEach((day,i)=>{
  const d=new Date(`${day}T00:00:00Z`),name=outputHoliday(day);
  const x=GRID.x+(i%7+1)*GRID.cw-15,y=GRID.y+Math.floor(i/7)*GRID.rh;
  ctx.font='900 20px CalendarDate, Pretendard, sans-serif';ctx.fillStyle=name||i%7===0?'#ef3117':i%7===6?'#3f83c5':'#251d19';ctx.textAlign='right';ctx.fillText(`${d.getUTCMonth()+1}/${d.getUTCDate()}`,x,y+27);
  if(name){
   if(isEnglish)drawEnglishHoliday(ctx,name,x,y,GRID.cw-24);
   else fitText(ctx,name,x,y+49,GRID.cw-24,'700 16px Pretendard','#ef3117','right');
  }
 });ctx.textAlign='left';
 if(isEnglish)drawEnglishFooter(ctx,marks);else drawKoreanFooter(ctx,marks);
 overlay.replaceChildren();view.gesture=null;
 if(view.offset!==0)return;
 days.forEach((day,i)=>{const el=document.createElement('button');el.className='cell';el.dataset.index=i;el.setAttribute('aria-label',`${day} 세팅 일정 추가`);position(el,{x:GRID.x+i%7*GRID.cw,y:GRID.y+Math.floor(i/7)*GRID.rh,w:GRID.cw,h:GRID.rh});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();create(view,i,i);}});overlay.append(el);});
 for(const b of boxes){const e=state.events.find(e=>e.id===b.id),button=document.createElement('button');button.className='card-hit';button.setAttribute('aria-label',`${e.branch} ${e.sector} ${e.start}부터 ${e.end} 일정 수정`);position(button,b);button.onclick=()=>edit(e.id);overlay.append(button);}
}
function render(){
 if(!ready)return;
 const selectedMonth=monthId();if($('month-state').dataset.month!==selectedMonth){$('month-state').dataset.month=selectedMonth;monthReady=false;void syncMonthState();}renderMonthState();
 $('link-ko').href=`index.html?year=${state.year}&month=${state.month}`;
 $('link-en').href=`en.html?year=${state.year}&month=${state.month}`;
 drag=null;
 const months=[-1,0,1].map(offset=>{const date=new Date(Date.UTC(state.year,state.month-1+offset,1));return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,offset};});
 const key=months.map(m=>`${m.year}-${m.month}`).join(',');
 if($('calendar-views').dataset.months!==key){
  $('calendar-views').replaceChildren();
  views=months.map(({year,month,offset})=>{
   const panel=document.createElement('article');panel.className=`month-panel${offset===0?' primary-month':''}`;
   const heading=document.createElement('div');heading.className='month-heading';
   const title=document.createElement('h2');title.textContent=`${year}년 ${month}월${offset===0?' · 중심 달':''}`;
   const download=document.createElement('button');download.textContent=`${isEnglish?'영문':'국문'} PNG ↓`;download.setAttribute('aria-label',`${year}년 ${month}월 PNG 다운로드`);
   heading.append(title,download);
   const paper=document.createElement('div');paper.className='paper';
   const canvas=document.createElement('canvas');canvas.width=2160;canvas.height=2700;canvas.setAttribute('aria-label',`${year}년 ${month}월 세팅 달력 미리보기`);
   const overlay=document.createElement('div');overlay.className='interaction';
   paper.append(canvas,overlay);panel.append(heading,paper);$('calendar-views').append(panel);
   const view={year,month,offset,canvas,ctx:canvas.getContext('2d'),overlay};
   if(offset!==0){
    const allowed=year>=1900&&year<=2200;
    overlay.setAttribute('role','button');overlay.tabIndex=allowed?0:-1;
    overlay.setAttribute('aria-label',`${year}년 ${month}월을 중심 달로 보기`);
    overlay.setAttribute('aria-disabled',String(!allowed));
    title.setAttribute('role','button');title.tabIndex=allowed?0:-1;
    title.setAttribute('aria-disabled',String(!allowed));title.title='클릭하면 중심 달로 이동';
    title.onclick=()=>moveMonth(offset);
    title.onkeydown=overlay.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();moveMonth(offset);}};
    overlay.onclick=e=>{if(e.detail===0)moveMonth(offset);};
   }
   download.onclick=()=>exportMonth(view,download);bindInteraction(view);return view;
  });
  $('calendar-views').dataset.months=key;
 }
 views.forEach(renderMonth);
 const first=views[0].days[0],last=views[2].days[34];
 $('preview-title').textContent=`${state.year}년 ${state.month}월 중심 · 이전 / 다음 달`;
 $('range').textContent=`표시 기간 ${first} ~ ${last} · 월별 5주 고정`;
 $('previous-month').disabled=state.year===1900&&state.month===1;
 $('next-month').disabled=state.year===2200&&state.month===12;
 $('holiday-coverage').textContent=views.some(view=>view.days.some(day=>!supportedHolidayYear(day.slice(0,4))))?'자동 공휴일은 2026·2027년을 지원합니다. 그 외 연도는 날짜 팝업에서 직접 입력하세요.':'한국 공휴일 자동 표시 · 날짜 팝업 하단에서 수정 가능';
 const visible=state.events.filter(e=>views.some(view=>e.start<=view.days[34]&&e.end>=view.days[0])).sort((a,b)=>a.start.localeCompare(b.start));
 const missing=visible.filter(e=>missingEnglish(e,'sector',SECTOR_EN)||missingEnglish(e,'note',NOTE_EN)).length+state.art.filter(r=>r.enabled&&!r.image&&r.id>=first&&r.id<=last&&missingEnglish(r,'name')).length+state.holidays.filter(r=>r.mode==='custom'&&r.id>=first&&r.id<=last&&missingEnglish(r,'name')).length;
 $('translation-warning').textContent=missing?`영문 미입력 ${missing}건 · 영어 출력에서 국문으로 표시됩니다. 편집창에서 영문을 입력하세요.`:'';
 $('count').textContent=visible.length;$('events').replaceChildren();
 if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='아직 일정이 없습니다. 날짜를 드래그해 첫 일정을 추가하세요.';$('events').append(p);}
 for(const e of visible){const b=document.createElement('button');b.className='list-item';const dot=document.createElement('span');dot.className='dot';dot.style.background=BRANCHES[e.branch].color;const title=document.createElement('span');title.textContent=`${e.branch} · ${e.sector}`;const sub=document.createElement('small');sub.textContent=`${e.start.slice(5)} ~ ${e.end.slice(5)}`;b.append(dot,title,sub);b.onclick=()=>edit(e.id);$('events').append(b);}
}
function create(view,a,b){const {days}=view;const branch=$('branch').value;selectRange();openEditor({branch,sector:$('sector').value,time:'08:00~18:00',note:BRANCHES[branch].note,start:days[Math.min(a,b)],end:days[Math.max(a,b)]});}
function indexAt(view,e){const r=view.overlay.getBoundingClientRect(),x=(e.clientX-r.left)*1080/r.width,y=(e.clientY-r.top)*1350/r.height;if(x<GRID.x||x>=GRID.x+GRID.w||y<GRID.y||y>=GRID.y+GRID.h)return null;return Math.floor((y-GRID.y)/GRID.rh)*7+Math.floor((x-GRID.x)/GRID.cw);}
function selectRange(){for(const view of views)view.overlay.querySelectorAll('.cell').forEach((el,i)=>el.classList.toggle('selected',drag?.view===view&&i>=Math.min(drag.start,drag.end)&&i<=Math.max(drag.start,drag.end)));}
function bindInteraction(view){
 const {overlay}=view;
 overlay.onpointerdown=e=>{
  if(!ready||e.button!==0||e.isPrimary===false||drag||view.gesture)return;
  if(view.offset===0&&e.target.classList.contains('card-hit'))return;
  if(view.offset===0&&e.target.classList.contains('cell')){
   const i=indexAt(view,e);if(i===null)return;e.preventDefault();
   drag={view,start:i,end:i,pointer:e.pointerId};overlay.setPointerCapture(e.pointerId);selectRange();return;
  }
  view.gesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,maxX:0,maxY:0};
  overlay.setPointerCapture(e.pointerId);
 };
 function track(e){const g=view.gesture;if(!g||g.pointer!==e.pointerId)return null;g.maxX=Math.max(g.maxX,Math.abs(e.clientX-g.x));g.maxY=Math.max(g.maxY,Math.abs(e.clientY-g.y));if(!g.axis&&Math.max(g.maxX,g.maxY)>=12)g.axis=g.maxX>g.maxY*1.5?'x':'y';return g;}
 overlay.onpointermove=e=>{
  if(drag?.view===view&&drag.pointer===e.pointerId){const i=indexAt(view,e);if(i!==null){drag.end=i;selectRange();}return;}
  track(e);
 };
 overlay.onpointerup=e=>{
  if(drag?.view===view&&drag.pointer===e.pointerId){const {start,end}=drag;drag=null;create(view,start,end);return;}
  const g=track(e);if(!g)return;view.gesture=null;
  const dx=e.clientX-g.x;
  if(g.axis==='x'&&Math.abs(dx)>=55&&Math.abs(dx)>g.maxY*1.5)moveMonth(dx<0?1:-1);
  else if(view.offset!==0&&g.maxX<=8&&g.maxY<=8)moveMonth(view.offset);
 };
 overlay.onpointercancel=overlay.onlostpointercapture=e=>{
  if(view.gesture?.pointer===e.pointerId)view.gesture=null;
  if(drag?.view===view&&drag.pointer===e.pointerId){drag=null;selectRange();}
 };
}
function moveMonth(offset){const date=new Date(Date.UTC(state.year,state.month-1+offset,1));if(date.getUTCFullYear()<1900||date.getUTCFullYear()>2200)return;$('year').value=date.getUTCFullYear();$('month').value=date.getUTCMonth()+1;changeMonth();}
$('previous-month').onclick=()=>moveMonth(-1);$('next-month').onclick=()=>moveMonth(1);
function changeMonth(){const year=Number($('year').value),month=Number($('month').value);if(!Number.isInteger(year)||year<1900||year>2200){status('년도는 1900~2200 사이로 입력해 주세요.');return;}state.year=year;state.month=month;save();render();}
$('year').onchange=changeMonth;$('month').onchange=changeMonth;$('branch').onchange=()=>{state.branch=$('branch').value;sectors();save();};
function editorSectors(){const select=$('edit-sector-choice'),value=$('edit-sector').value;select.replaceChildren();for(const sector of BRANCHES[$('edit-branch').value].sectors)select.add(new Option(sector,sector));select.add(new Option('직접 입력',''));select.value=BRANCHES[$('edit-branch').value].sectors.includes(value)?value:'';}
function openEditor(e){if(!sharedReady){status('공용 서버 연결이 필요합니다. 연결 후 다시 시도해 주세요.');return;}$('edit-show-logo').checked=e.show_logo!==false;activeVersion=e.version;active=e.id??null;for(const key of ['branch','sector','start','end','time','note'])$(`edit-${key}`).value=e[key];$('edit-sector-en').value=e.sector_en||SECTOR_EN[e.sector]||'';$('edit-note-en').value=e.note_en||NOTE_EN[e.note]||'';editorSectors();$('editor-title').textContent=active?'세팅 일정 수정':'세팅 일정 추가';$('editor-save').textContent=active?'수정 저장':'일정 추가';$('delete').hidden=!active;$('form-error').textContent='';$('holiday-date').value=e.start;loadHolidayEditor();$('art-date').value=e.start;loadArtEditor();$('editor').showModal();}
function edit(id){const e=state.events.find(e=>e.id===id);if(e)openEditor(e);}
$('close').onclick=()=>$('editor').close();
$('editor').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('editor').addEventListener('close',()=>void syncEvents());
$('edit-branch').onchange=()=>{$('edit-note').value=BRANCHES[$('edit-branch').value].note;$('edit-note-en').value=NOTE_EN[$('edit-note').value]||'';editorSectors();};
$('edit-sector-choice').onchange=()=>{const value=$('edit-sector-choice').value;if(value){$('edit-sector').value=value;$('edit-sector-en').value=SECTOR_EN[value]||'';}else $('edit-sector').focus();};
$('edit-note').oninput=()=>{$('edit-note-en').value=NOTE_EN[$('edit-note').value]||'';};
$('edit-sector').oninput=()=>{const value=$('edit-sector').value;$('edit-sector-en').value=SECTOR_EN[value]||'';$('edit-sector-choice').value=BRANCHES[$('edit-branch').value].sectors.includes(value)?value:'';};
function previewArt(){
 $('art-preview').hidden=!artImage;if(artImage)$('art-preview').src=artImage;else $('art-preview').removeAttribute('src');
 $('art-remove-image').hidden=!artImage;
}
function loadArtEditor(){
 const row=state.art.find(row=>row.id===$('art-date').value);artVersion=row?.version;
 $('art-font-size').value=row?.font_size??20;
 $('art-background-color').value=row?.background_color??'#e4c64f';
 $('art-name-en').value=row?.enabled?row.name_en||'':'';
 $('art-name').value=row?.enabled?row.name:'';artImage=row?.enabled?row.image:'';$('art-file').value='';
 $('art-delete').hidden=!row?.enabled;previewArt();
 $('art-error').textContent=artReady?'':'이벤트 저장 연결이 필요합니다. Supabase에 이벤트 SQL을 적용한 뒤 다시 열어 주세요.';
}
$('art-date').onchange=loadArtEditor;
$('art-name-en').onkeydown=$('art-name').onkeydown=e=>{if(e.key==='Enter')e.stopPropagation();};
$('art-file').onchange=async()=>{
 const file=$('art-file').files[0];if(!file||busy)return;editorBusy(true);$('art-error').textContent='이미지 준비 중…';
 try{artImage=await prepareArt(file,loadImage);previewArt();$('art-error').textContent='이미지를 준비했습니다. 이벤트 저장을 눌러 적용하세요.';}
 catch(error){$('art-error').textContent=error.message;}
 finally{$('art-file').value='';editorBusy(false);}
};
$('art-remove-image').onclick=()=>{artImage='';previewArt();};
async function saveArt(enabled){
 if(busy)return;
 if(!artReady){$('art-error').textContent='이벤트 SQL 적용 후 팝업을 다시 열어 주세요.';return;}
 const row={id:$('art-date').value,enabled,background_color:$('art-background-color').value,name_en:enabled?$('art-name-en').value.replace(/\r\n?/g,'\n').trim():'',font_size:Number($('art-font-size').value),name:enabled?$('art-name').value.replace(/\r\n?/g,'\n').trim():'',image:enabled?artImage:''};
 if(!validArt(row)){$('art-error').textContent='올바른 날짜, 이벤트명(최대 3줄·40자), 글씨 크기(12~36의 정수)를 입력해 주세요.';return;}
 editorBusy(true);$('art-error').textContent='이벤트 저장 중…';
 try{
  if(row.image&&!artImages.has(row.image))artImages.set(row.image,await loadImage(row.image));
  const saved=await writeArt(row,artVersion);state.art=[...state.art.filter(item=>item.id!==saved.id),saved];artVersion=saved.version;
  if(!enabled){artImage='';$('art-name').value='';$('art-name-en').value='';previewArt();}
  $('art-delete').hidden=!enabled;render();$('art-error').textContent=enabled?'이벤트를 저장했습니다.':'이벤트를 삭제했습니다.';
 }catch(error){$('art-error').textContent=error.message+' 입력 내용은 유지됩니다.';}
 finally{editorBusy(false);}
}
$('art-save').onclick=()=>saveArt(true);
$('art-delete').onclick=()=>saveArt(false);
function loadHolidayEditor(){
 const day=$('holiday-date').value,row=state.holidays.find(row=>row.id===day);
 holidayVersion=row?.version;$('holiday-mode').value=row?.mode??'auto';
 $('holiday-name-en').value=row?.name_en||'';
 $('holiday-name').value=holidayName(day,state.holidays);updateHolidayMode();
 $('holiday-error').textContent=holidaysReady?'':'공휴일 저장 연결이 필요합니다. 공휴일 SQL 적용 또는 연결 상태를 확인해 주세요.';
}
function updateHolidayMode(){
 const mode=$('holiday-mode').value,day=$('holiday-date').value;
 if(mode==='auto'){$('holiday-name').value=officialHoliday(day);$('holiday-name-en').value=HOLIDAY_EN[officialHoliday(day)]||'';}
 if(mode==='off'){$('holiday-name').value='';$('holiday-name-en').value='';}
 $('holiday-name').disabled=$('holiday-name-en').disabled=mode==='off';
 $('holiday-hint').textContent=supportedHolidayYear(day.slice(0,4))?`자동 공휴일: ${officialHoliday(day)||'없음'} · 이름을 고치면 직접 입력으로 전환됩니다.`:'이 연도는 자동 공휴일 자료가 없습니다. 직접 입력해 주세요.';
}
$('holiday-date').onchange=loadHolidayEditor;
$('holiday-mode').onchange=updateHolidayMode;
$('holiday-name').oninput=()=>{$('holiday-mode').value='custom';$('holiday-name-en').value=HOLIDAY_EN[$('holiday-name').value]||'';};
$('holiday-name-en').oninput=()=>{$('holiday-mode').value='custom';};
$('holiday-name-en').onkeydown=$('holiday-name').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('holiday-save').click();}};
$('holiday-save').onclick=async()=>{
 if(busy)return;
 if(!holidaysReady){$('holiday-error').textContent='공휴일 저장 연결이 필요합니다. 공휴일 SQL 적용 후 팝업을 다시 열어 주세요.';return;}
 const row={id:$('holiday-date').value,name_en:$('holiday-mode').value==='custom'?$('holiday-name-en').value.trim():'',mode:$('holiday-mode').value,name:$('holiday-mode').value==='custom'?$('holiday-name').value.trim():''};
 editorBusy(true);$('holiday-error').textContent='공휴일 저장 중…';
 try{const saved=await writeHoliday(row,holidayVersion);state.holidays=[...state.holidays.filter(item=>item.id!==saved.id),saved];holidayVersion=saved.version;render();$('holiday-error').textContent='공휴일을 저장했습니다. 세팅 일정은 변경하지 않았습니다.';}
 catch(error){$('holiday-error').textContent=error.message+' 입력 내용은 유지됩니다. 다른 사용자가 수정했을 수 있으니 창을 다시 열어 확인해 주세요.';}
 finally{editorBusy(false);}
};
$('edit-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const next={id:active??crypto.randomUUID(),show_logo:$('edit-show-logo').checked,sector_en:$('edit-sector-en').value.trim(),note_en:$('edit-note-en').value.trim()};for(const key of ['branch','sector','start','end','time','note'])next[key]=$(`edit-${key}`).value.trim();if(!validEvent(next)||!next.sector||!next.time||!next.note){$('form-error').textContent='내용과 날짜를 확인해 주세요. 종료일은 시작일 이후여야 합니다.';return;}
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
async function exportMonth(view,button){const {canvas,year,month}=view;button.disabled=true;status('고화질 PNG를 만드는 중…');try{await document.fonts.ready;renderMonth(view);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('empty');const bytes=withDpi(new Uint8Array(await blob.arrayBuffer()));const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const a=document.createElement('a');a.href=url;a.download=`WAVEROCK-${year}-${String(month).padStart(2,'0')}-${language}-150dpi.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('2160 × 2700px · 150dpi PNG를 다운로드했습니다.');}catch{status('이미지 추출에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');}finally{button.disabled=false;}};
$('export').onclick=()=>exportMonth(views[1],$('export'));
try{[bg]=await Promise.all([loadImage('assets/background.png'),...Object.values(BRANCHES).map(async({mark})=>{const [small,large]=await Promise.all(['small','large'].map(size=>loadImage(`assets/mark-${mark}-${size}.svg`)));marks[mark]={small,large};}),document.fonts.load('700 22px Pretendard'),document.fonts.load('500 15px Pretendard'),document.fonts.load('900 20px CalendarDate, Pretendard')]);ready=true;render();$('export').disabled=false;status(configured?'공용 일정을 불러오는 중…':'공용 저장 서버가 아직 연결되지 않았습니다.');}catch{status('디자인 소스나 폰트를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 새로고침해 주세요.');}

await syncEvents();
setInterval(()=>{if(!document.hidden)void syncEvents();},10000);
window.addEventListener('focus',()=>void syncEvents());
