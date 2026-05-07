import{getAccessToken,clearTokens}from"./auth";
const BASE="http://localhost:8000";
async function req<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=getAccessToken();
  const headers:Record<string,string>={"Content-Type":"application/json",...(init.headers as Record<string,string>)};
  if(token)headers["Authorization"]=`Bearer ${token}`;
  const res=await fetch(`${BASE}${path}`,{...init,headers});
  if(res.status===401){clearTokens();window.location.href="/login";throw new Error("Unauthorized");}
  if(!res.ok)throw new Error(`${res.status}`);
  if(res.status===204)return undefined as T;
  return res.json();
}
export const api={
  login:(username:string,password:string)=>req<{access_token:string;refresh_token:string}>("/api/v1/auth/login",{method:"POST",body:JSON.stringify({email:username,password})}),
};
