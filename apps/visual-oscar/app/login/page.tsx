"use client";
import{useState,FormEvent}from"react";
import{useRouter}from"next/navigation";
import{api}from"@/lib/api";
import{setTokens}from"@/lib/auth";
export default function LoginPage(){
  const router=useRouter();
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  async function onSubmit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");setLoading(true);
    const fd=new FormData(e.currentTarget);
    try{const data=await api.login(fd.get("username")as string,fd.get("password")as string);setTokens(data.access_token,data.refresh_token);router.push("/dashboard");}
    catch{setError("Email o contraseña incorrectos.");}
    finally{setLoading(false);}
  }
  return(<>
    <header className="nav"><div className="nav-inner">
      <a className="logo" href="/" style={{color:'#1F4E8C',fontWeight:600,letterSpacing:'-0.01em'}}>
        <svg width="20" height="18" viewBox="0 0 120 110" fill="currentColor">
          <rect x="8" y="6" width="104" height="6" rx="1"/>
          <path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>
          <circle cx="18" cy="18" r="3.5" fill="#fff"/><circle cx="18" cy="18" r="2"/>
          <circle cx="102" cy="18" r="3.5" fill="#fff"/><circle cx="102" cy="18" r="2"/>
          <rect x="14" y="28" width="92" height="4" rx="1"/>
          <rect x="26" y="58" width="18" height="44" rx="2"/>
          <rect x="52" y="48" width="18" height="54" rx="2"/>
          <rect x="78" y="38" width="18" height="64" rx="2"/>
        </svg>
        <span>POLITEIA <span style={{fontWeight:400,color:'var(--ink-3)'}}>ANALÍTICA</span></span>
      </a>
      <span className="spacer"/><a href="#" style={{fontSize:12,color:"var(--ink-3)"}}>¿Necesitas ayuda?</a>
    </div></header>
    <main className="login-shell"><div className="login-card">
      <div className="login-mark" style={{background:'#1F4E8C',width:64,height:64,borderRadius:16,padding:8}}>
        <svg width="48" height="44" viewBox="0 0 120 110" fill="#fff">
          <rect x="8" y="6" width="104" height="6" rx="1"/>
          <path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>
          <circle cx="18" cy="18" r="3.5" fill="#1F4E8C"/><circle cx="18" cy="18" r="2" fill="#fff"/>
          <circle cx="102" cy="18" r="3.5" fill="#1F4E8C"/><circle cx="102" cy="18" r="2" fill="#fff"/>
          <rect x="14" y="28" width="92" height="4" rx="1"/>
          <rect x="26" y="58" width="18" height="44" rx="2"/>
          <rect x="52" y="48" width="18" height="54" rx="2"/>
          <rect x="78" y="38" width="18" height="64" rx="2"/>
        </svg>
      </div>
      <h1>Politeia Analítica</h1>
      <p className="lead">Inteligencia electoral. <em style={{fontStyle:"italic",color:"var(--ink-2)"}}>Bienvenido de nuevo.</em></p>
      {error&&<div className="error-msg">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field"><label htmlFor="email">Usuario</label><input id="email" name="username" type="text" placeholder="tu usuario" required autoComplete="username"/></div>
        <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password"/></div>
        <div className="field-row"><label><input type="checkbox" defaultChecked/> Recordarme</label><a href="#">¿Olvidaste tu contraseña?</a></div>
        <button type="submit" className="btn-login" disabled={loading}>{loading?"Iniciando sesión…":"Iniciar sesión"}</button>
      </form>
      <div className="lock-note"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 11 V7 a4 4 0 0 1 8 0 V11" stroke="currentColor" strokeWidth="1.6"/></svg>Conexión cifrada · Datos protegidos</div>
    </div></main>
  </>);
}
