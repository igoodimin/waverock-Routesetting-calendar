import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,segments,DAY,date,withDpi,crc32,validEvent} from '../calendar.mjs';
test('all months are 35 consecutive days starting Sunday; neighboring views cover omitted dates',()=>{
 for(let y=1900;y<=2200;y++)for(let m=1;m<=12;m++){
  const days=calendarDays(y,m);assert.equal(days.length,35);assert.equal(new Date(date(days[0])).getUTCDay(),0);
  days.forEach((d,i)=>assert.equal(date(d),date(days[0])+i*DAY));
  const prev=calendarDays(m===1?y-1:y,m===1?12:m-1),next=calendarDays(m===12?y+1:y,m===12?1:m+1);
  const all=new Set([...prev,...days,...next]);for(let d=Date.UTC(y,m-1,1);d<Date.UTC(y,m,1);d+=DAY)assert.ok(all.has(new Date(d).toISOString().slice(0,10)));
 }
});
test('first-week exclusion takes priority and final-week exclusion pads preceding week',()=>{
 assert.equal(calendarDays(2026,5)[0],'2026-05-03');assert.equal(calendarDays(2026,5)[34],'2026-06-06');
 assert.equal(calendarDays(2026,11)[0],'2026-10-25');assert.equal(calendarDays(2026,11)[34],'2026-11-28');
});
const event=(id,start,end)=>({id,branch:'남천점',sector:'레드',time:'08:00~18:00',note:'오픈 세팅',start,end});
test('Wednesday month-ends retain the boundary week, including year transitions',()=>{
 assert.deepEqual([calendarDays(2026,9)[0],calendarDays(2026,9)[34]],['2026-08-30','2026-10-03']);
 assert.deepEqual([calendarDays(2025,12)[0],calendarDays(2025,12)[34]],['2025-11-30','2026-01-03']);
 assert.equal(calendarDays(2026,1)[0],'2026-01-04');
});
test('cross-week and overlapping events use separate lanes without losing date extent',()=>{
 const days=calendarDays(2026,5),a=event('a','2026-05-08','2026-05-12'),b=event('b','2026-05-09','2026-05-10');
 const p=segments([a,b],days);assert.equal(p.length,4);assert.deepEqual(p.filter(x=>x.event.id==='a').map(x=>[x.row,x.start,x.end]),[[0,5,6],[1,0,2]]);assert.ok(p.filter(x=>x.event.id==='b').every(x=>x.lane===1));
 assert.equal(segments([event('c','2027-01-01','2027-01-02')],days).length,0);
});
test('dates validate leap years and reject invalid or reversed ranges',()=>{
 assert.ok(validEvent(event('a','2024-02-29','2024-03-01')));assert.ok(!validEvent(event('a','2025-02-29','2025-03-01')));assert.ok(!validEvent(event('a','2026-03-02','2026-03-01')));
});
test('PNG density chunk encodes 150 dpi with valid CRC and replaces old density',()=>{
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64'));
 const out=withDpi(png),v=new DataView(out.buffer);assert.equal(v.getUint32(41),5906);assert.equal(v.getUint32(45),5906);assert.equal(out[49],1);assert.equal(v.getUint32(50),crc32(out.subarray(37,50)));assert.deepEqual(withDpi(out),out);
});
