// Sources and update policy: knowledge/HOLIDAYS.md
// Explicit annual data avoids projecting today's holiday rules onto other years.
const common={'01-01':'신정','03-01':'삼일절','05-01':'노동절','05-05':'어린이날','06-06':'현충일','07-17':'제헌절','08-15':'광복절','10-03':'개천절','10-09':'한글날','12-25':'성탄절'};
const annual={
 2026:{'02-16':'설날 연휴','02-17':'설날','02-18':'설날 연휴','03-02':'대체공휴일','05-24':'부처님오신날','05-25':'대체공휴일','06-03':'전국동시지방선거','08-17':'대체공휴일','09-24':'추석 연휴','09-25':'추석','09-26':'추석 연휴','10-05':'대체공휴일'},
 2027:{'02-06':'설날 연휴','02-07':'설날','02-08':'설날 연휴','02-09':'대체공휴일','05-03':'대체공휴일','05-13':'부처님오신날','07-19':'대체공휴일','08-16':'대체공휴일','09-14':'추석 연휴','09-15':'추석','09-16':'추석 연휴','10-04':'대체공휴일','10-11':'대체공휴일','12-27':'대체공휴일'}
};
export const supportedHolidayYear=year=>Object.hasOwn(annual,year);
export function officialHoliday(day){return supportedHolidayYear(day.slice(0,4))?(annual[day.slice(0,4)][day.slice(5)]??common[day.slice(5)]??''):'';}
export function holidayName(day,overrides=[]){const row=overrides.find(row=>row.id===day);return row?.mode==='off'?'':row?.mode==='custom'?row.name:officialHoliday(day);}
export function validHoliday(row){return row&&typeof row.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.id)&&Number.isFinite(Date.parse(`${row.id}T00:00:00Z`))&&new Date(`${row.id}T00:00:00Z`).toISOString().slice(0,10)===row.id&&row.id>='1900-01-01'&&row.id<='2201-12-31'&&['auto','custom','off'].includes(row.mode)&&typeof row.name==='string'&&row.name.length<=40&&(row.mode!=='custom'||row.name.trim().length>0);}
