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
 const calls=[];const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(...args){calls.push(['fill',this.fillStyle,...args]);},fillText(...args){calls.push(['text',this.textAlign,this.textBaseline,...args]);},drawImage(...args){calls.push(['image',...args]);}};
 drawArt(ctx,row,null,10,20,100,80);
 assert.deepEqual(calls,[['fill','#e4c64f',11,21,98,78],['text','center','middle','이벤트',60,60,82]]);
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
 const calls=[];const ctx={setTransform(){},clearRect(){},drawImage(){calls.push('background');},fillText(){calls.push('date');}};
 const render=new Function('calendarDays','segments','state','bg','drawArt','artImages','GRID','drawCard','holidayName','fitText',body+';return renderMonth;')(
 ()=>['2026-10-13'],()=>[{}],{events:[],art:[row],holidays:[]},{},()=>calls.push('art'),new Map(),{x:0,y:0,cw:100,rh:80},()=>calls.push('card'),()=>'',()=>{});
 render({year:2026,month:10,ctx,offset:1,overlay:{replaceChildren(){}}});
 assert.deepEqual(calls,['background','art','card','date']);
});
