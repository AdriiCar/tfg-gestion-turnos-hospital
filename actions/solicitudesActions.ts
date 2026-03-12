"use server";

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import Sustitucion from "@/models/sustitucion";
import Usuario from "@/models/usuario";
import { comprobarReglas } from "@/lib/motorReglas";
import { revalidatePath } from "next/cache";
import Plantilla from "@/models/plantilla";

// APROBAR O RECHAZAR SOLICITUD
export async function gestionarSolicitudAction(id: string, accion: string) {
    try {
        await conectarDB();
        
        const solicitudModificada = await Solicitud.findByIdAndUpdate(id, { estado: accion }, { new: true });
        
        if (!solicitudModificada) {
            return { exito: false, mensaje: "No se encontró la solicitud" };
        }

        // Si se aprueba, ejecutamos el motor de reglas
        if (accion === "Aprobada" || accion === "Aprobado") {
            await comprobarReglas(
                solicitudModificada.fechaInicio, 
                solicitudModificada.fechaFin, 
                solicitudModificada._id.toString()
            );
        }

        revalidatePath("/(supervisor)/solicitudes");
        return { exito: true, mensaje: `Solicitud marcada como ${accion} exitosamente.` };
    } catch (error) {
        return { exito: false, mensaje: "Error al actualizar el estado de la solicitud" };
    }
}

// REGISTRAR SUSTITUTO DESDE LAS SOLICITUDES
export async function registrarSustitutoSolicitudAction(solicitudId: string, sustitutoCorreo: string) {
    try {
        await conectarDB();

        //Comprobamos si el usuario sustituto existe en el sistema y obtenemos sus datos
        const usuarioSustituto = await Usuario.findOne({ correo: sustitutoCorreo });
        if (!usuarioSustituto) return { exito: false, mensaje: "El usuario introducido no existe" };

        const nombreSustituto = `${usuarioSustituto.nombre} ${usuarioSustituto.apellido}`;

        //Obtenemos la solicitud
        const solicitud = await Solicitud.findById(solicitudId).populate("usuarioId");
        if (!solicitud) return { exito: false, mensaje: "La solicitud no existe" };

        const nombreSustituido = `${solicitud.usuarioId.nombre} ${solicitud.usuarioId.apellido}`;

        //Buscamos en que turno se hará la sustitución -> necesario para el motor de reglas
        const fechaSol = new Date(solicitud.fechaInicio);
        const año = fechaSol.getFullYear();
        const mes = fechaSol.getMonth() + 1;
        const dia = fechaSol.getDate();

        
        let turnoReal = "M";

        const plantilla = await Plantilla.findOne({ usuario: solicitud.usuarioId._id, año: año });
        if (plantilla) {
            const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes);
            if (mesPlantilla) {
                const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia);
                if (diaPlantilla && diaPlantilla.turno) {
                    turnoReal = diaPlantilla.turno;  //obtenemos el turno donde se realiza la suplencia
                }
            }
        }

        //creamos la Sustitucion 
        await Sustitucion.create({
            fecha: solicitud.fechaInicio,
            turno: turnoReal, 
            sustituido: nombreSustituido,
            sustitutoNombre: nombreSustituto,
            sustitutoCorreo: sustitutoCorreo,
            solicitudRelacionada: solicitudId
        });

        //Actualizamos la solicitud
        await Solicitud.findByIdAndUpdate(solicitudId, {
            sustitutoNombre: nombreSustituto,
            sustitutoCorreo: sustitutoCorreo
        });

        //comprobamos las reglas ya que puede que se eliminen inconsistencias
        await comprobarReglas(solicitud.fechaInicio, solicitud.fechaFin, solicitudId);

        revalidatePath("/(supervisor)/solicitudes");
        return { exito: true, mensaje: "Sustituto registrado con éxito" };
    } catch (error) {
        return { exito: false, mensaje: "El sustituto no pudo ser registrado" };
    }
}