import type{Metadata,Viewport}from"next";
import"../styles/globals.css";
import BottomAgenteBar from "./_components/BottomAgenteBar";
export const metadata:Metadata={title:"Politeia Analítica",description:"Inteligencia electoral · Análisis y estimación de comicios en España",icons:{icon:"/politeia-logo.svg"}};
// Forzar modo claro a nivel de navegador · ignora prefers-color-scheme del SO
export const viewport:Viewport={colorScheme:"light",themeColor:"#fbfbfd"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="es" style={{colorScheme:"light"}}><body>{children}<BottomAgenteBar/></body></html>;
}
