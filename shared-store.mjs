import {SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY} from './config.mjs';
import {validHoliday} from './holidays.mjs';
import {validEvent} from './calendar.mjs';
export const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
async function request(query, method='GET', body, table='calendar_events') {
  if (!configured) throw Error('공용 저장 서버가 아직 연결되지 않았습니다.');
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
    method, headers: {apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type':'application/json', Prefer:'return=representation'},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000), cache:'no-store'
  });
  if (!response.ok) throw Error('공용 서버 요청에 실패했습니다. 연결과 서버 설정을 확인해 주세요.');
  return response.json();
}
export async function readEvents() {
  const events=[];
  for(let offset=0;;) {
    const page=await request(`select=*&order=id&limit=500&offset=${offset}`);
    if(!Array.isArray(page) || !page.every(e=>validEvent(e)&&Number.isInteger(e.version))) throw Error('공용 일정 데이터 형식을 확인해 주세요.');
    events.push(...page); if(!page.length) return events; offset+=page.length;
  }
}
export async function writeEvent(event, version) {
  const query=version===undefined ? '' : `id=eq.${encodeURIComponent(event.id)}&version=eq.${version}`;
  const rows=await request(query, version===undefined?'POST':'PATCH', {...event,version:version===undefined?1:version+1});
  if(rows.length!==1) throw Error('다른 사용자가 이 일정을 변경하거나 삭제했습니다. 창을 닫고 다시 열어 수정해 주세요.');
  return rows[0];
}
export async function removeEvent(id,version) {
  const rows=await request(`id=eq.${encodeURIComponent(id)}&version=eq.${version}`,'DELETE');
  if(rows.length!==1) throw Error('다른 사용자가 이 일정을 변경하거나 삭제했습니다. 창을 닫고 다시 열어 확인해 주세요.');
}

export async function readHolidays() {
 const result=[];
 for(let offset=0;;){
  const page=await request(`select=*&order=id&limit=500&offset=${offset}`,'GET',undefined,'calendar_holidays');
  if(!Array.isArray(page)||!page.every(row=>validHoliday(row)&&Number.isInteger(row.version)&&row.version>0))throw Error('공용 공휴일 데이터 형식을 확인해 주세요.');
  result.push(...page);if(!page.length)return result;offset+=page.length;
 }
}
export async function writeHoliday(row,version){
 if(!validHoliday(row))throw Error('공휴일 날짜와 이름을 확인해 주세요.');
 const query=version===undefined?'':`id=eq.${encodeURIComponent(row.id)}&version=eq.${version}`;
 const rows=await request(query,version===undefined?'POST':'PATCH',{...row,version:version===undefined?1:version+1},'calendar_holidays');
 if(rows.length!==1)throw Error('다른 사용자가 공휴일을 변경했습니다. 창을 닫고 다시 열어 주세요.');
 return rows[0];
}
