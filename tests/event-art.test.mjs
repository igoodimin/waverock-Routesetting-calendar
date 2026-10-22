import test from 'node:test';
import assert from 'node:assert/strict';
import {validArt,coverRect,drawArt,prepareArt} from '../event-art.mjs';
import {readArt,writeArt} from '../shared-store.mjs';
const row={id:'2026-10-13',enabled:true,name:'이벤트',image:''};
test('event dates, names and safe image payloads',()=>{
 assert.ok(validArt(row));assert.ok(validArt({...row,enabled:false,name:''}));
 for(const patch of [{id:'2026-02-30'},{name:' '},{image:'https://example.com/a.jpg'},{image:'data:image/svg+xml;base64,AAAA'},{image:'data:image/jpeg;base64,'+'A'.repeat(700000)}])assert.ok(!validArt({...row,...patch}));
 assert.ok(validArt({...row,image:'data:image/jpeg;base64,AAAA'}));
});
test('portrait and landscape crops stay centered without distortion',()=>{
 assert.deepEqual(coverRect(1000,500,200,200),[250,0,500,500]);
 assert.deepEqual(coverRect(500,1000,200,200),[0,250,500,500]);
});
test('text event uses requested color and center; image events only draw image',()=>{
 const calls=[];const ctx={measureText(text){return {width:text.length*10};},save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(...args){calls.push(['fill',this.fillStyle,...args]);},fillText(...args){calls.push(['text',this.textAlign,this.textBaseline,...args]);},drawImage(...args){calls.push(['image',...args]);}};
 drawArt(ctx,row,null,10,20,100,80);
 assert.deepEqual(calls,[['fill','#e4c64f',11,21,98,78],['text','center','middle','이벤트',60,60]]);
 calls.length=0;drawArt(ctx,{...row,image:'data:image/jpeg;base64,AAAA'},{width:200,height:100},10,20,100,80);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'image');
 calls.length=0;drawArt(ctx,{...row,enabled:false},null,0,0,100,80);assert.equal(calls.length,0);
});
test('unsupported or oversized files rejected before decode',async()=>{
 await assert.rejects(prepareArt({type:'image/svg+xml',size:10},()=>{}));
 await assert.rejects(prepareArt({type:'image/png',size:11*1024*1024},()=>{}));
});
test('shared event creation, reload, update and version conflict',async()=>{
 const original=globalThis.fetch;const requests=[];let response=[{...row,version:1}];
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>response};};
 try{
  await writeArt(row);assert.equal(requests[0].options.method,'POST');assert.equal(JSON.parse(requests[0].options.body).version,1);
  await writeArt({...row,enabled:false,name:''},1);assert.match(requests[1].url,/version=eq.1/);assert.equal(requests[1].options.method,'PATCH');assert.equal(JSON.parse(requests[1].options.body).version,2);
  response=[];await assert.rejects(writeArt(row,1),/다른 사용자/);
  let page=0;globalThis.fetch=async()=>({ok:true,json:async()=>page++===0?[{...row,version:1}]:[]});
  assert.deepEqual(await readArt(),[{...row,version:1}]);
 }finally{globalThis.fetch=original;}
});
test('calendar renders background, event art, setting cards, then dates',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function renderMonth(view){'),source.indexOf('\nfunction render(){'));
 const calls=[];const ctx={measureText(text){return {width:text.length*10};},save(){},restore(){},setTransform(){},clearRect(){},drawImage(){calls.push('background');},fillText(){calls.push('date');}};
 const render=new Function('calendarDays','segments','state','bg','drawArt','artImages','GRID','drawCard','holidayName','fitText','isEnglish','outputHoliday','drawKoreanFooter','marks',body+';return renderMonth;')(
 ()=>['2026-10-13'],()=>[{}],{events:[],art:[row],holidays:[]},{},()=>calls.push('art'),new Map(),{x:0,y:0,cw:100,rh:80},()=>calls.push('card'),()=>'',()=>{},false,()=> '',()=>{},{});
 render({year:2026,month:10,ctx,offset:1,overlay:{replaceChildren(){}}});
 assert.deepEqual(calls,['background','art','card','date']);
});

test('event text supports three centered lines and saved font sizes',async()=>{
 assert.ok(validArt({...row,name:'첫 줄\n둘째 줄\n셋째 줄',font_size:36}));
 for(const patch of [{name:'1\n2\n3\n4'},{font_size:11},{font_size:37},{font_size:20.5},{font_size:null}])assert.ok(!validArt({...row,...patch}));
 const calls=[];const ctx={measureText(text){return {width:text.length*10};},save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},fillText(text,x,y){calls.push({text,x,y,font:this.font});}};
 drawArt(ctx,{...row,name:'첫 줄\n둘째 줄\n셋째 줄',font_size:30},null,0,0,160,152);
 assert.deepEqual(calls,[{text:'첫 줄',x:80,y:40,font:'700 30px Pretendard'},{text:'둘째 줄',x:80,y:76,font:'700 30px Pretendard'},{text:'셋째 줄',x:80,y:112,font:'700 30px Pretendard'}]);
 const original=globalThis.fetch;const saved={...row,name:'첫 줄\n둘째 줄\n셋째 줄',font_size:30,version:1};let body;
 globalThis.fetch=async(url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>[saved]};};
 try{assert.deepEqual(await writeArt(saved),saved);assert.equal(body.font_size,30);assert.equal(body.name,saved.name);}finally{globalThis.fetch=original;}
});

test('background color validates and survives shared storage',async()=>{
 for(const color of ['#123abc','#ABCDEF'])assert.ok(validArt({...row,background_color:color}));
 for(const color of ['',null,'red','#123','123abc'])assert.ok(!validArt({...row,background_color:color}));
 const original=globalThis.fetch;let saved;
 globalThis.fetch=async(url,options)=>({ok:true,json:async()=>{
  if(options.method==='GET')return url.includes('offset=0')&&saved?[saved]:[];
  saved=JSON.parse(options.body);return [saved];
 }});
 try{await writeArt({...row,background_color:'#123abc'});assert.equal((await readArt())[0].background_color,'#123abc');}
 finally{globalThis.fetch=original;}
});
test('scheduled event lines fit below holidays, align with date, and keep selected background',()=>{
 const calls=[];let fill;
 const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){fill=this.fillStyle;},measureText(t){return {width:t.length*20};},fillText(text,x,y){calls.push({x,y,align:this.textAlign,size:parseFloat(this.font.slice(4))});}};
 for(const top of [33,55,66]){
  calls.length=0;
  drawArt(ctx,{...row,name:'첫째\n둘째\n셋째',font_size:36,background_color:'#123abc'},null,0,0,135,130,{textTop:top,textBottom:94});
  assert.equal(fill,'#123abc');assert.equal(calls.length,3);
  for(const c of calls){assert.equal(c.align,'right');assert.equal(c.x,120);assert.ok(c.y-c.size/2>=top);assert.ok(c.y+c.size/2<=95);}
 }
});
test('setting cards stay below reserved event text in single and stacked rows',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function drawCard('),source.indexOf('\nfunction position('));
 const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){}};
 const draw=new Function('GRID','state','holidayName','BRANCHES','marks','isEnglish','fitText',body+';return drawCard;')({x:0,y:0,cw:135,rh:130},{holidays:[]},()=>'',{test:{color:'#fff',mark:'test'}},{test:{}},false,()=>{});
 for(const lanes of [1,2,3]){
  const pieces=Array.from({length:lanes},(_,lane)=>({event:{id:String(lane),branch:'test',show_logo:false},row:0,start:0,end:0,lane}));
  const view={ctx,days:['2026-10-13'],pieces,boxes:[],artHeaders:new Map([[0,99]])};
  pieces.forEach(p=>draw(view,p));
  for(const b of view.boxes){assert.ok(b.y>=99);assert.ok(b.y+b.h<=130.00001);}
 }
});
