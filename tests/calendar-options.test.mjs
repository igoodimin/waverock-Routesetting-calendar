import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validMonthState,readMonthState,writeMonthState,writeEvent} from '../shared-store.mjs';
import {validEvent,BRANCHES} from '../calendar.mjs';
import {drawKoreanFooter} from '../translations.mjs';
const event={id:'test',branch:'남천점',sector:'레드',time:'08:00~18:00',note:'오픈 세팅',start:'2026-10-01',end:'2026-10-02'};
test('month defaults, updates and conflicts; logo persists with event',async()=>{
 assert.ok(validEvent(event));assert.ok(validEvent({...event,show_logo:false}));assert.ok(!validEvent({...event,show_logo:'false'}));
 assert.ok(!validMonthState({id:'2026-13',is_draft:true}));
 const original=globalThis.fetch;let stored=null;
 globalThis.fetch=async(url,options)=>({ok:true,json:async()=>{
  if(options.method==='GET')return stored?[stored]:[];
  const body=JSON.parse(options.body);
  if(options.method==='PATCH'){assert.match(url,/version=eq.1/);if(stored.version!==1)return [];}
  stored=body;return [body];
 }});
 try{
  assert.equal(await readMonthState('2026-10'),null);
  await writeMonthState({id:'2026-10',is_draft:true});assert.equal((await readMonthState('2026-10')).is_draft,true);
  await writeMonthState({id:'2026-10',is_draft:false},1);assert.equal(stored.version,2);assert.equal(stored.is_draft,false);
  await assert.rejects(writeMonthState({id:'2026-10',is_draft:true},1),/다른 사용자/);
  await writeEvent({...event,show_logo:false});assert.equal(stored.show_logo,false);
 }finally{globalThis.fetch=original;}
});
test('long text reduces font size without horizontal scaling',async()=>{
 const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function fitText('),source.indexOf('function drawEnglishHoliday('));
 const fit=new Function(body+';return fitText;')();let actual;
 const ctx={save(){},restore(){},translate(){},measureText(){return {width:200};},fillText(text){actual=this.font;},scale(){assert.fail('horizontal scaling');}};
 fit(ctx,'long',0,0,100,'700 20px Pretendard');assert.equal(actual,'700 10px Pretendard');
});
test('logo off reclaims text space for both languages and card widths',async()=>{
 const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function drawCard('),source.indexOf('\nfunction position('));
 for(const en of [false,true])for(const end of [0,1]){
  let images=0,widths=[];
  const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},drawImage(){images++;}};
  const draw=new Function('BRANCHES','GRID','state','holidayName','marks','isEnglish','fitText','BRANCH_EN','english','SECTOR_EN','NOTE_EN',body+';return drawCard;')(BRANCHES,{x:0,y:0,cw:135,rh:130},{holidays:[]},()=>'',{nam:{small:{},large:{}}},en,(_c,_t,_x,_y,w)=>widths.push(w),{'남천점':'NAMCHEON'},(e,k)=>e[k],{},{});
  const piece={event:{...event},row:0,start:0,end,lane:0},view={ctx,days:[],pieces:[piece],boxes:[]};
  draw(view,piece);const original=widths[0];assert.equal(images,1);images=0;widths=[];
  piece.event.show_logo=false;draw(view,piece);assert.equal(images,0);assert.ok(widths[0]>original);
 }
});
test('Korean footer includes reference wording and branch badges',()=>{
 const words=[];drawKoreanFooter({save(){},restore(){},fillRect(){},drawImage(){},fillText(t){words.push(t);}},Object.fromEntries(['nam','seo','bus'].map(k=>[k,{small:{}}])));
 for(const text of ['오픈 세팅','클로즈 세팅','세팅 섹터 외 센터 이용 가능','세팅 완료 후 센터 오픈','남천점','서면점','부산대점'])assert.ok(words.includes(text));
});
