"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function cerrarSesionAction() {
    
    const cookieStore = await cookies();
    
    // Borramos la cookie 
    cookieStore.delete("auth_token");
    
    // redirigimos al usuario a la pantalla de login
    redirect("/"); 
}