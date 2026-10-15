export const BRANCH_EN={'남천점':'NAMCHEON','서면점':'SEOMYEON','부산대점':'PNU'};
export const SECTOR_EN={'레드':'RED','화이트':'WHITE','브라운1':'BROWN 1','브라운2':'BROWN 2','브라운1&2':'BROWN 1&2','캐슬':'CASTLE','락랜드':'ROCK LAND','해피':'HAPPY','미드나잇':'MID NIGHT','버터밀크':'BUTTER MILK','비숍':'BISHOP','아이스버그':'ICE BERG'};
export const NOTE_EN={'오픈 세팅':'OPEN SETTING','클로즈 세팅':'CLOSE SETTING'};
export const HOLIDAY_EN={'신정':"New Year's Day",'삼일절':'Independence Movement Day','노동절':'Labor Day','어린이날':"Children's Day",'현충일':'Memorial Day','제헌절':'Constitution Day','광복절':'Liberation Day','개천절':'National Foundation Day','한글날':'Hangeul Day','성탄절':'Christmas','설날 연휴':'Seollal Holiday','설날':'Seollal','대체공휴일':'Substitute Holiday','부처님오신날':"Buddha's Birthday",'전국동시지방선거':'Local Election Day','추석 연휴':'Chuseok Holiday','추석':'Chuseok'};
export function english(row,key,map={}){return row?.[key+'_en']?.trim()||map[row?.[key]]||row?.[key]||'';}
export function missingEnglish(row,key,map={}){return Boolean(row?.[key]&&!row?.[key+'_en']?.trim()&&!map[row[key]]);}
export function validEnglish(value,lines=1){return value===undefined||(typeof value==='string'&&value.length<=40&&value.split(/\r\n?|\n/).length<=lines);}
export function drawEnglishFooter(ctx,marks){
 const badge=(text,x,y,w,color,mark)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,24);ctx.drawImage(marks[mark].small,x+5,y+4,16,16);ctx.fillStyle='#fff';ctx.font='700 14px Pretendard';ctx.fillText(text,x+27,y+17);};
 ctx.save();ctx.textAlign='left';
 badge('NAMCHEON',445,1204,122,'#2b2b2b','nam');badge('SEOMYEON',571,1204,120,'#287338','seo');
 badge('Busan National University',445,1264,213,'#245fab','bus');
 ctx.fillStyle='#171717';ctx.font='700 14px Pretendard';ctx.fillText('· OPEN SETTING :',708,1220);ctx.fillText('· CLOSE SETTING :',708,1280);
 ctx.font='500 14px Pretendard';ctx.fillText('All areas except the setting zone remain open.',718,1237,300);ctx.fillText('The gym opens after route setting is complete.',718,1297,300);ctx.restore();
}
