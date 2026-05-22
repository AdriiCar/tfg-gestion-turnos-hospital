"use server";

import { decrypt } from "@/lib/auth";
import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Usuario from "@/models/usuario";

interface SolicitudCliente {
    usuarioId: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    comentario: string;
    documentoAdjunto?: string; 
    nombreDocumento?: string;
}


export async function crearSolicitudAction(datosSolicitud: SolicitudCliente){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.usuarioId) return { exito: false, mensaje: "Permiso denegado." };


        //comprobamos que el usuario de la sesion sea el solicitante
        if (String(datosSolicitud.usuarioId) !== String(sesion.usuarioId)) {
             return { exito: false, mensaje: "Esta solicitud no pertenece a tu usuario." };
        }
        await conectarDB();

        //comprobamos si la solicitud es de libre disposición y si le quedan aún días para solicitarlos
        const usuario = await Usuario.findById(datosSolicitud.usuarioId);

        if(datosSolicitud.tipoDia === "Libre Disposición"){
            if(usuario.estadoActual.diasLibresRestantes <= 0){
                return {exito: false, mensaje: "No te quedan días de Libre Disposición"};
            }

            usuario.estadoActual.diasLibresRestantes -= 1;
            await usuario.save();
        }


        //creamos la solicitud
        await Solicitud.create({
            usuarioId: datosSolicitud.usuarioId,
            tipoDia: datosSolicitud.tipoDia,
            fechaInicio: datosSolicitud.fechaInicio,
            fechaFin: datosSolicitud.fechaFin,
            documentoAdjunto: datosSolicitud.documentoAdjunto || "",
            nombreDocumento: datosSolicitud.nombreDocumento || "",
            comentario: datosSolicitud.comentario,
            estado: "Pendiente",
            esDeSistema: false,
            plantaId: sesion.plantaId,
            fechaSolicitud: new Date()
        });

        revalidatePath("/(empleado)/resumen");

        return {exito: true, mensaje: "¡Solicitud enviada con éxito! Ya puedes verla en tu resumen."};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al guardar la solicitud."};
    }
}