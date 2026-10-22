import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BRANCHES,validEvent} from '../calendar.mjs';
import {validArt} from '../event-art.mjs';
import {validHoliday} from '../holidays.mjs';
import {SECTOR_EN,NOTE_EN,BRANCH_EN,HOLIDAY_EN,english,missingEnglish,drawEnglishFooter} from '../translations.mjs';
import {writeEvent,writeHoliday,writeArt,readEvents,readHolidays,readArt} from '../shared-store.mjs';
test('all existing sector choices have the approved English counterpart',()=>{
 const expected={남천점:['RED','WHITE','BROWN 1','BROWN 2','BROWN 1&2'],서면점:['MID NIGHT','CASTLE','ROCK LAND','HAPPY'],부산대점:['BISHOP','ICE BERG','BUTTER MILK']};
 for(const [branch,data] of Object.entries(BRANCHES))assert.deepEqual(data.sectors.map(s=>SECTOR_EN[s]),expected[branch]);
 assert.equal(english({sector:'새 섹터',sector_en:'NEW SECTOR'},'sector',SECTOR_EN),'NEW SECTOR');
 assert.equal(english({sector:'레드'},'sector',SECTOR_EN),'RED');
 assert.equal(english({name:'행사'},'name'),'행사');assert.ok(missingEnglish({name:'행사'},'name'));
 assert.equal(missingEnglish({sector:'레드'},'sector',SECTOR_EN),false);
});
test('optional English fields keep old rows readable and reject invalid new values',()=>{
 const event={id:'test',branch:'남천점',sector:'레드',time:'08:00~18:00',note:'오픈 세팅',start:'2026-11-01',end:'2026-11-02'};
 const holiday={id:'2026-11-01',mode:'custom',name:'행사'};
 const art={id:'2026-11-01',enabled:true,name:'행사',image:''};
 assert.ok(validEvent(event)&&validHoliday(holiday)&&validArt(art));
 assert.ok(!validEvent({...event,sector_en:123}));assert.ok(!validHoliday({...holiday,name_en:'a'.repeat(41)}));
 assert.ok(validArt({...art,name_en:'ONE\nTWO\nTHREE'}));assert.ok(!validArt({...art,name_en:'1\n2\n3\n4'}));
});
test('English and Korean fields round trip together with existing version protection',async()=>{
 const original=globalThis.fetch;const records=new Map();
 globalThis.fetch=async(url,options)=>{
  const u=new URL(url),key=u.pathname;
  if(options.method==='POST'||options.method==='PATCH'){
   const body=JSON.parse(options.body);if(options.method==='PATCH')assert.equal(u.searchParams.get('version'),'eq.1');records.set(key,body);return {ok:true,json:async()=>[body]};
  }
  return {ok:true,json:async()=>Number(u.searchParams.get('offset'))?[]:[records.get(key)]};
 };
 try{
  const entries=[
   [writeEvent,readEvents,{id:'test',branch:'남천점',sector:'레드',sector_en:'RED',time:'08:00~18:00',note:'안내',note_en:'CUSTOM NOTE',start:'2026-11-01',end:'2026-11-02'}],
   [writeHoliday,readHolidays,{id:'2026-11-01',mode:'custom',name:'휴일',name_en:'Holiday'}],
   [writeArt,readArt,{id:'2026-11-01',enabled:true,name:'행사',name_en:'Event\nDay',font_size:20,image:''}]
  ];
  for(const [write,read,row] of entries){await write(row);assert.deepEqual(await read(),[{...row,version:1}]);await write(row,1);assert.deepEqual(await read(),[{...row,version:2}]);}
 }finally{globalThis.fetch=original;}
});
test('English cards handle one-day, multi-day and overlapping cards without changing hit areas',async()=>{
 const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function drawCard(view,piece){'),source.indexOf('\nfunction position('));
 const calls=[];const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},drawImage(){}};
 const marks=Object.fromEntries(['nam','seo','bus'].map(k=>[k,{small:{},large:{}}]));
 const draw=new Function('BRANCHES','GRID','state','holidayName','marks','isEnglish','fitText','BRANCH_EN','english','SECTOR_EN','NOTE_EN',body+';return drawCard;')(BRANCHES,{x:71,y:511,cw:948/7,rh:651/5},{holidays:[]},()=>'',marks,true,(_ctx,text,x,y,width)=>{assert.ok(width>0);calls.push(text);},BRANCH_EN,english,SECTOR_EN,NOTE_EN);
 for(const end of [0,1])for(const lanes of [1,2,3]){
  calls.length=0;
  const pieces=Array.from({length:lanes},(_,lane)=>({event:{branch:'남천점',sector:'브라운1&2',time:'08:00~18:00',note:'오픈 세팅'},row:0,start:0,end,lane}));
  const view={ctx,days:[],pieces,boxes:[]};pieces.forEach(piece=>draw(view,piece));assert.equal(view.boxes.length,lanes);assert.ok(calls.includes('BROWN 1&2'));assert.ok(calls.includes('NAMCHEON'));if(end)assert.ok(calls.includes('OPEN SETTING'));
 }
});
test('separate page entries share Korean editor and export exactly the selected language',async()=>{
 const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
 const [ko,en,page,app]=await Promise.all(['index.html','en.html','page.mjs','app.mjs'].map(read));
 assert.match(ko,/data-output-language="ko"/);assert.match(en,/data-output-language="en"/);
 for(const entry of [ko,en]){assert.match(entry,/lang="ko"/);assert.match(entry,/src="page.mjs"/);}
 for(const id of ['edit-sector-en','edit-note-en','art-name-en','holiday-name-en'])assert.ok(page.includes(id));
 assert.match(app,/\$\{language\}-150dpi\.png/);assert.match(app,/en\.html\?year=\$\{state.year\}&month=\$\{state.month\}/);
 const calls=[];drawEnglishFooter({measureText(text){return {width:text.length*8};},save(){},restore(){},fillRect(){},drawImage(){},fillText(text){calls.push(text);}},Object.fromEntries(['nam','seo','bus'].map(k=>[k,{small:{}}])));
 assert.ok(calls.includes('Busan National University'));assert.ok(calls.includes('The gym opens after route setting is complete.'));
 assert.equal(HOLIDAY_EN['추석'],'Chuseok');
});
