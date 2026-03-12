"use server";

import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import { revalidatePath } from "next/cache";
import { addDays, startOfWeek } from "date-fns";
import { comprobarReglas } from "@/lib/motorReglas";
import Usuario from "@/models/usuario";
import Solicitud from "@/models/solicitud";


export async function modificarTurnoAction(usuarioId: string, indiceDia: number, nuevoTurno: string){
    try {
        await conectarDB();

        const hoy = new Date();
        const lunes = startOfWeek(hoy, {weekStartsOn: 1});
        const fechaAModificar = addDays(lunes, indiceDia);

        const añoActual = fechaAModificar.getFullYear();
        const mes = fechaAModificar.getMonth() + 1;//almaceno los meses de 1 a 12 y js usa de 0 a 11
        const dia = fechaAModificar.getDate();

        let plantilla = await Plantilla.findOne({usuario: usuarioId, año: añoActual});

        if(!plantilla) return {exito: false, mensaje: "Plantilla no encontrada"};

        const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes); //obtenemos la plantilla del mes que buscamos
        if(mesPlantilla){
            const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia); //obtenemos el dia dentro del mes que buscamos
            if(diaPlantilla){
                diaPlantilla.turno = nuevoTurno; //actulizamos con el nuevo turno
            }else{
                mesPlantilla.dias.push({dia: dia, turno: nuevoTurno}); //si no habia ningun turno se añade este nuevo turno
            }
        }else{
            plantilla.meses.push({
                mes: mes,
                dias:[{dia:dia, turno: nuevoTurno}]
            });
        }

        await plantilla.save();
        await comprobarReglas(fechaAModificar, fechaAModificar, null); //comprobamos si el cambio de turno genera inconsistencias

        revalidatePath("/(supervisor)/planificador");

        return{exito: true, mensaje: "Turno actualizado con éxito"}

    }catch(error){
        return {exito:false, mensaje: "Error en el servidor al actualizar el turno"};
    }
}


export async function registrarSustitutoAction(datos: any){
    try {
        await conectarDB();

        const{fecha, turno, sustituido, sustitutoNombre, sustitutoCorreo, incidenciaId, solicitudId} = datos;

        const existenciaUsuario = await Usuario.exists({correo: sustitutoCorreo});

        if(!existenciaUsuario) return {exito: false, mensaje: "El usuario introducido no existe en el sistema"};



        //hay que comprobar ya que el sustituto puede registrarse desde el panel de inconsistencias o desde la solicitud
        let solicitudRelacionadaId = solicitudId || null;
        let incidenciaRelacionadaId = incidenciaId || null;


        if(incidenciaId && !solicitudRelacionadaId){
            const incidencia = await Incidencia.findById(incidenciaId);
            if(incidencia && incidencia.solicitudRelacionada){
                solicitudRelacionadaId = incidencia.solicitudRelacionada;
            }
        }

        await Sustitucion.create({
            fecha,
            turno,
            sustituido, 
            sustitutoNombre, 
            sustitutoCorreo,
            incidenciaRelacionada: incidenciaRelacionadaId,
            solicitudRelacionada: solicitudRelacionadaId
        });
        
        //si tenia una incidencia entonces la marcamos como resuleta
        if(incidenciaRelacionadaId) await Incidencia.findByIdAndUpdate(incidenciaRelacionadaId, { resuelta: true });

        //si tenia una solicitud pasa a estar aprobada y a tener sustituto
        if(solicitudRelacionadaId) await Solicitud.findByIdAndUpdate(solicitudRelacionadaId, {
            sustitutoNombre: sustitutoNombre,
            sustitutoCorreo: sustitutoCorreo 
        });


        //recargamos la página del planificador
        revalidatePath("/(supervisor)/planificador");

        return {exito: true, mensaje: "Sustituto registrado correctamente"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al registrar el sustituto"};
    }
}