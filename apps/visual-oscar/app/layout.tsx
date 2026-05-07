import type{Metadata}from"next";
import"../styles/globals.css";
import BottomAgenteBar from "./_components/BottomAgenteBar";
export const metadata:Metadata={title:"Politeia Analítica",description:"Inteligencia electoral · Análisis y estimación de comicios en España",icons:{icon:"/politeia-logo.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="es"><body>{children}<BottomAgenteBar/></body></html>;
}
