"use client";
const ORDER=["sumar","psoe","bng","bildu","erc","junts","pnv","cc","pp","vox"];
export default function Hemicycle({parties}:{parties:{id:string;vote:number;color:string}[]}){
  const seats:string[]=[];
  ORDER.forEach(id=>{const p=parties.find(x=>x.id===id);if(!p)return;for(let i=0;i<Math.round(p.vote*350/100);i++)seats.push(p.color);});
  const W=300,H=130,cx=W/2,cy=H*0.92,rBase=26,rStep=12,rows=6;
  const dots:{x:number;y:number;c:string}[]=[];
  let idx=0;
  for(let r=0;r<rows;r++){const radius=rBase+r*rStep,count=Math.round(Math.PI*radius/6.5);for(let i=0;i<count&&idx<seats.length;i++){const t=count===1?0.5:i/(count-1),angle=Math.PI-t*Math.PI;dots.push({x:cx+Math.cos(angle)*radius,y:cy-Math.sin(angle)*radius,c:seats[idx++]});}}
  return <svg className="hemicycle-mini" viewBox={`0 0 ${W} ${H}`}>{dots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r="2.4" fill={d.c}/>)}</svg>;
}
