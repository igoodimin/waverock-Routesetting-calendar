export const BRANCHES = {
  '남천점': { color:'#2b2b2b', mark:'nam', note:'오픈 세팅', sectors:['레드','화이트','브라운1','브라운2','브라운1&2'] },
  '서면점': { color:'#287338', mark:'seo', note:'오픈 세팅', sectors:['미드나잇','캐슬','락랜드','해피'] },
  '부산대점': { color:'#245fab', mark:'bus', note:'클로즈 세팅', sectors:['비숍','아이스버그','버터밀크'] },
};
export const DAY = 86400000;
export const iso = d => new Date(d).toISOString().slice(0,10);
export const date = s => Date.parse(`${s}T00:00:00Z`);
export function calendarDays(year, month) {
  const first=Date.UTC(year,month-1,1), last=Date.UTC(year,month,0);
  const firstDay=new Date(first).getUTCDay(), lastDay=new Date(last).getUTCDay();
  let start=first-firstDay*DAY;
  if(firstDay>=4) start+=7*DAY;
  // Keep Wednesday month-ends: the following month skips its opening week.
  else if(lastDay<=2) start=last-(lastDay+35)*DAY;
  return Array.from({length:35},(_,i)=>iso(start+i*DAY));
}
export function segments(events, days) {
  const result=[];
  for(let row=0;row<5;row++) {
    const occupied=[];
    const items=events.filter(e=>e.start<=days[row*7+6]&&e.end>=days[row*7])
      .map(e=>({event:e,row,start:Math.max(0,Math.round((date(e.start)-date(days[row*7]))/DAY)),end:Math.min(6,Math.round((date(e.end)-date(days[row*7]))/DAY))}))
      .sort((a,b)=>a.start-b.start||b.end-a.end||a.event.id.localeCompare(b.event.id));
    for(const item of items) {
      let lane=0;
      while(occupied[lane]?.some(([a,b])=>a<=item.end&&b>=item.start)) lane++;
      (occupied[lane]??=[]).push([item.start,item.end]);
      result.push({...item,lane});
    }
  }
  return result;
}
export function validEvent(e) {
  return e && typeof e.id==='string' && Object.hasOwn(BRANCHES,e.branch) &&
    ['sector','time','note','start','end'].every(k=>typeof e[k]==='string') &&
    [e.start,e.end].every(s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(date(s))&&iso(date(s))===s) && e.start<=e.end;
}
export function crc32(bytes) {
  let crc=0xffffffff;
  for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function withDpi(bytes,dpi=150) {
  const chunk=new Uint8Array(21),v=new DataView(chunk.buffer);
  v.setUint32(0,9);chunk.set([112,72,89,115],4);
  v.setUint32(8,Math.round(dpi/0.0254));v.setUint32(12,Math.round(dpi/0.0254));chunk[16]=1;
  v.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts=[bytes.subarray(0,33),chunk];
  for(let pos=33;pos<bytes.length;){const length=new DataView(bytes.buffer,bytes.byteOffset+pos,4).getUint32(0)+12;
    const name=String.fromCharCode(...bytes.subarray(pos+4,pos+8));
    if(name!=='pHYs')parts.push(bytes.subarray(pos,pos+length));pos+=length;}
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
  for(const p of parts){result.set(p,offset);offset+=p.length;}return result;
}
