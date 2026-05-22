"use server"; 

import { decrypt } from "@/lib/auth";
import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Usuario from "@/models/usuario";


export async function cancelarSolicitudAction(idSolicitud: string){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.usuarioId) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();

        //comprobamos que exista la solicitud
        const solicitud = await Solicitud.findById(idSolicitud);
        if(!solicitud){
            return {exito: false, mensaje: "No se encontró la solicitud"};
        }
        //comprobamos que la solicitud pertenezca a la sesion
        if (String(solicitud.usuarioId) !== String(sesion.usuarioId)) {
            return {exito: false, mensaje: "No tienes permiso para borrar la solicitud de otro empleado."};
        }

        //si la solicitud era de libre disposición, le devolvemos el día al usuario
        if (solicitud.tipoDia === "Libre Disposición") {
            await Usuario.findByIdAndUpdate(sesion.usuarioId, {
                $inc: { "estadoActual.diasLibresRestantes": 1 }
            });
        }

        //eliminamos la solicitud
        await Solicitud.findByIdAndDelete(idSolicitud);

        revalidatePath("/(empleado)/resumen");

        return {exito: true, mensaje: "Solicitud cancelada con éxito"};
    }catch(error){
        return {exito: false, mensaje: "Error al cancelar la solicitud en el servidor"};
    }
}