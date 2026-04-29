"use server";

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { comprobarReglas } from "@/lib/motorReglas";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

// APROBAR O RECHAZAR SOLICITUD
export async function gestionarSolicitudAction(id: string, accion: string) {
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) {
            return { exito: false, mensaje: "Permiso denegado." };
        }

        await conectarDB();
        
        //comprobamos que exista la solicitud
        const solicitud = await Solicitud.findById(id).populate("usuarioId");
        
        if (!solicitud) {
            return { exito: false, mensaje: "No se encontró la solicitud" };
        }

        // Verificamos si el usuario de la solicitud pertenece a la planta del supervisor
        if (String(solicitud.usuarioId.plantaId) !== String(sesion.plantaId)) {
            return { exito: false, mensaje: "No tienes permiso para gestionar solicitudes de otras plantas." };
        }
        //actualizamos el estado de la solcitud
        solicitud.estado = accion;
        await solicitud.save();
        

        // Si se aprueba, ejecutamos el motor de reglas -> puede ser necesario registrar un sustituto
        if (accion === "Aprobada") {
            await comprobarReglas(
                solicitud.fechaInicio, 
                solicitud.fechaFin, 
                solicitud._id.toString(),
                String(sesion.plantaId)
            );
        }

        revalidatePath("/(supervisor)/solicitudes");
        return { exito: true, mensaje: `Solicitud marcada como ${accion} exitosamente.` };
    } catch (error) {
        return { exito: false, mensaje: "Error al actualizar el estado de la solicitud" };
    }
}

