"use server";

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { revalidatePath } from "next/cache";


interface SolicitudCliente {
    usuarioId: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    comentario: string;
}


export async function crearSolicitudAction(datosSolicitud: SolicitudCliente){
    try{
        await conectarDB();

        await Solicitud.create({
            usuarioId: datosSolicitud.usuarioId,
            tipoDia: datosSolicitud.tipoDia,
            fechaInicio: datosSolicitud.fechaInicio,
            fechaFin: datosSolicitud.fechaFin,
            estado: "Pendiente",
            fechaSolicitud: new Date()
        });

        revalidatePath("/(empleado)/resumen");

        return {exito: true, mensaje: "¡Solicitud enviada con éxito! Ya puedes verla en tu resumen."};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al guardar la solicitud."};
    }
}