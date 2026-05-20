"use client";
export default function Sparkline({data,color="#0071e3"}:{data:number[];color?:string}){
  if(!data.length)return null;
  const W=200,H=56,pad=4,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const xF=(i:number)=>pad+(i/(data.length-1))*(W-pad*2);
  const yF=(v:number)=>pad+(1-(v-min)/range)*(H-pad*2);
  const path=data.map((v,i)=>`${i===0?"M":"L"}${xF(i)},${yF(v)}`).join(" ");
  const area=`${path} L${xF(data.length-1)},${H} L${xF(0)},${H} Z`;
  const id=`sg${color.replace(/[^a-z0-9]/gi,"")}`;
  return(
 <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
 <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
 <path d={area} fill={`url(#${id})`}/><path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx={xF(data.length-1)} cy={yF(data[data.length-1])} r="2.5" fill={color}/>
 </svg>
  );
}
