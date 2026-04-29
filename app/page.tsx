import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginCliente from "./LoginCliente";
import { loginAction } from "@/actions/loginActions";
import { decrypt } from "@/lib/auth";



export default async function LoginPage(){
  
  const cookieStore = await cookies(); 
  const token = cookieStore.get("auth_token")?.value;

  if(token){
    const user = await decrypt(token);

    if(user){
      if(user.esSupervisor){
        redirect("/planificador");
      }else{
        redirect("/resumen");
      }
    }
  }
  return (
    <LoginCliente
      hacerLogin={loginAction}
    />
  )
}