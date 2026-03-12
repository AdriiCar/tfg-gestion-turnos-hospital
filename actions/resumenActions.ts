"use server"; 

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { revalidatePath } from "next/cache";

export async function cancelarSolicitudAction(idSolicitud: string){
    try{
        await conectarDB();

        const solicitudBorrada = await Solicitud.findByIdAndDelete(idSolicitud);
        if(!solicitudBorrada){
            return {exito: false, mensaje: "No se encontró la solicitud"};
        }

        revalidatePath("/(empleado)/resumen");

        return {exito: true, mensaje: "Solicitud cancelada con éxito"};
    }catch(error){
        return {exito: false, mensaje: "Error al cancelar la solicitud en el servidor"};
    }
}