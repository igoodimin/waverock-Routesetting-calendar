import {validEnglish} from './translations.mjs';
export const ART_WIDTH=632, ART_HEIGHT=608, MAX_IMAGE_LENGTH=700000;
export function validArt(row){
 return row && validEnglish(row.name_en,3) && typeof row.id==='string' && /^\d{4}-\d{2}-\d{2}$/.test(row.id) && row.id>='1900-01-01' && row.id<='2201-12-31' && Number.isFinite(Date.parse(row.id)) && new Date(row.id).toISOString().slice(0,10)===row.id && typeof row.enabled==='boolean' && typeof row.name==='string' && row.name.length<=40 && row.name.split(/\r\n?|\n/).length<=3 && (row.font_size===undefined||(Number.isInteger(row.font_size)&&row.font_size>=12&&row.font_size<=36)) && (!row.enabled||row.name.trim().length>0) && typeof row.image==='string' && row.image.length<=MAX_IMAGE_LENGTH && (!row.image||/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(row.image));
}
export function coverRect(width,height,targetWidth,targetHeight){
 const scale=Math.max(targetWidth/width,targetHeight/height),w=targetWidth/scale,h=targetHeight/scale;
 return [(width-w)/2,(height-h)/2,w,h];
}
export function drawArt(ctx,row,image,x,y,w,h){
 if(!row?.enabled)return;
 // Leave the background grid lines visible on every side of the cell.
 const inset=1;x+=inset;y+=inset;w-=inset*2;h-=inset*2;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 if(row.image&&image)ctx.drawImage(image,...coverRect(image.width,image.height,w,h),x,y,w,h);
 else if(!row.image){
  ctx.fillStyle='#e4c64f';ctx.fillRect(x,y,w,h);ctx.fillStyle='#251d19';ctx.font=`700 ${row.font_size??20}px Pretendard`;ctx.textAlign='center';ctx.textBaseline='middle';
  const lines=row.name.split(/\r\n?|\n/),base=row.font_size??20;
  const measured=Math.max(1,...lines.map(line=>ctx.measureText(line).width));
  const size=base*Math.min(1,(w-16)/measured,(h-16)/(lines.length*base*1.2)),lineHeight=size*1.2;
  ctx.font=`700 ${size}px Pretendard`;
  lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*lineHeight));
 }
 ctx.restore();
}
export async function prepareArt(file,loadImage){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('JPG·PNG·WebP, 10MB 이하 이미지를 선택해 주세요.');
 const url=URL.createObjectURL(file);
 try{
  const image=await loadImage(url),canvas=document.createElement('canvas');canvas.width=ART_WIDTH;canvas.height=ART_HEIGHT;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,ART_WIDTH,ART_HEIGHT);
  ctx.drawImage(image,...coverRect(image.width,image.height,ART_WIDTH,ART_HEIGHT),0,0,ART_WIDTH,ART_HEIGHT);
  const data=canvas.toDataURL('image/jpeg',0.85);
  if(data.length>MAX_IMAGE_LENGTH)throw Error('이미지가 너무 복잡합니다. 더 작은 이미지를 선택해 주세요.');
  return data;
 }finally{URL.revokeObjectURL(url);}
}
