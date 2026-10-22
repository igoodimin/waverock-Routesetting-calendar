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
 const line=(text,y)=>{ctx.font='500 14px Pretendard';const width=ctx.measureText(text).width;if(width>300)ctx.font=`500 ${14*300/width}px Pretendard`;ctx.fillText(text,718,y);};line('All areas except the setting zone remain open.',1237);line('The gym opens after route setting is complete.',1297);ctx.restore();
}
export function drawKoreanFooter(ctx,marks){
 const badge=(text,x,w,color,mark)=>{ctx.fillStyle=color;ctx.fillRect(x,1198,w,22);ctx.drawImage(marks[mark].small,x-5,1195,28,28);ctx.fillStyle='#fff';ctx.font='500 12px Pretendard';ctx.fillText(text,x+(mark==='bus'?29:33),1214);};
 ctx.save();ctx.textAlign='left';
 badge('남천점',628,80,'#2b2b2b','nam');badge('서면점',716,83,'#287338','seo');badge('부산대점',938,79,'#245fab','bus');
 ctx.fillStyle='#171717';ctx.font='700 18px Pretendard';ctx.fillText('오픈 세팅',550,1216);ctx.fillText('클로즈 세팅',842,1216);
 ctx.font='500 16px Pretendard';ctx.fillText('세팅 섹터 외 센터 이용 가능',550,1243);ctx.fillText('세팅 완료 후 센터 오픈',842,1243);ctx.restore();
}
