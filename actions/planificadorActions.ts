"use server";

import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import { revalidatePath } from "next/cache";
import { startOfDay} from "date-fns";
import { comprobarReglas } from "@/lib/motorReglas";
import Usuario from "@/models/usuario";
import Solicitud from "@/models/solicitud";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";


export async function modificarTurnoAction(usuarioId: string, fecha: string, nuevoTurno: string){
    try {
        
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
                
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();

        //comprobamos si el usuario existe y luego si pertenece a nuestra planta
        const existenciaUsuario = await Usuario.findById(usuarioId);
        if(!existenciaUsuario || String(existenciaUsuario.plantaId) !== String(sesion.plantaId)) return {exito: false, mensaje: "No tienes permiso de modificar el turno de ese usuario"};

        //obtenemos de la fecha a modificar el pirimer y ultimo minuto del dia y miramos si se tiene alguna solicitud para ese dia ya que puede estar entre medias
        const fechaAModificar = new Date(fecha);
        const inicioDelDia = new Date(fechaAModificar.setHours(0, 0, 0, 0));
        const finDelDia = new Date(fechaAModificar.setHours(23, 59, 59, 999));

        const yearActual = fechaAModificar.getFullYear();
        const mes = fechaAModificar.getMonth() + 1;
        const dia = fechaAModificar.getDate();

        //si tiene una solicitud en esa fecha no se podrá cambiar el turno
        const solicitudExistente = await Solicitud.findOne({
            usuarioId: usuarioId,
            estado: "Aprobada",
            esDeSistema: {$ne: true},
            fechaInicio: { $lte: finDelDia }, // La baja empieza antes de que acabe el día
            fechaFin: { $gte: inicioDelDia }  // La baja acaba despues de que empiece el día
        });
        
        //si tenia una solicitud entonces no tiene sentido que le podamos cambiar manualmente el turno directamente mostramos un mensaje que diga que no
        if (solicitudExistente) {
            return { 
                exito: false, 
                mensaje: `No se puede modificar: el empleado tiene una ${solicitudExistente.tipoDia} aprobada para este día.` 
            };
        }

        //obtenemos la plantilla anual del usuario
        let plantilla = await Plantilla.findOne({usuario: usuarioId, year: yearActual});

        if(!plantilla) return {exito: false, mensaje: "Plantilla no encontrada"};

        const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes); //obtenemos la plantilla del mes que buscamos
        if(mesPlantilla){
            const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia); //obtenemos el dia dentro del mes que buscamos
            if(diaPlantilla){
                //comprobamos que no le vayamos a asignar el turno que ya tiene
                if(diaPlantilla.turno == nuevoTurno) return {exito:false, mensaje: "El usuario ya tenía ese turno asignado"};
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

        await plantilla.save(); //actualizamos la plantilla
        
        //es necesario hacer comprobacion en tres dias por la regla mañana tras noche debido a que si cambio el dia de en medio a M tengo que ver si el anteriir
        //era noche y si cambio el dia del medio a noche tengo que ver que el dia siguiente no sea mñana
        const diaAntes = new Date(inicioDelDia);
        diaAntes.setDate(diaAntes.getDate() - 1);
        const diaDespues = new Date(inicioDelDia);
        diaDespues.setDate(diaDespues.getDate() + 1);

        await comprobarReglas(diaAntes, diaDespues, null, String(sesion.plantaId)); //comprobamos si el cambio de turno genera inconsistencias

        revalidatePath("/(empleado)/calendario");
        revalidatePath("/(supervisor)/planificador");

        return{exito: true, mensaje: "Turno actualizado con éxito"}

    }catch(error){
        return {exito:false, mensaje: "Error en el servidor al actualizar el turno"};
    }
}

export async function registrarSustitutoAction(datos: any){
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        if (!sesion || !sesion.plantaId) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();
        // Extraemos los datos del frontend
        const{fechaInicio, fechaFin, turno, sustituido, sustitutoNombre, sustitutoCorreo, nivel, incidenciaId, solicitudId} = datos;

        //miramos si el correo del sustituto existe -> tiene que estar previamente registrado en el sistema no necesariamente en la misma planta
        const usuarioSustituto = await Usuario.findOne({correo: sustitutoCorreo});
        if(!usuarioSustituto) return {exito: false, mensaje: "El usuario introducido no existe en el sistema"};

        //comprobamos que sea del mismo rol -> no necesaria la msima experiencia
        if(usuarioSustituto.rol != sustituido){
            return {exito: false, mensaje: `El sustituto debe tener el rol ${sustituido}`}
        }

        //comprobamos si tiene una incidencia o solicitud aprobada para ver a que se relaciona
        let solicitudRelacionadaId = solicitudId || null;
        let incidenciaRelacionadaId = incidenciaId || null;
        let incidenciaOriginal = null;

        if(incidenciaId){ //si hay una incidencia relacionada la obtenemos para obtener los datos del usuario solicitante y para pasarla al motor
            incidenciaOriginal = await Incidencia.findById(incidenciaId);
            if(incidenciaOriginal){
                if(incidenciaOriginal.solicitudRelacionada){ 
                    solicitudRelacionadaId = incidenciaOriginal.solicitudRelacionada;
                }
                
                // Borramos las incidencias para que el motor las recalcule de cero
                await Incidencia.deleteMany({
                    plantaId: sesion.plantaId,
                    turno: incidenciaOriginal.turno,
                    rolAfectado: incidenciaOriginal.rolAfectado,
                    resuelta: false,
                    fechaInicio: { $gte: incidenciaOriginal.fechaInicio },
                    fechaFin: { $lte: incidenciaOriginal.fechaFin },
                });
            }
        }

        //obtenemos el nombre y correo del sustituido a partir del id de la solicitud
        let sustituidoNombre = "";
        let sustituidoCorreo = "";
        if(solicitudRelacionadaId){
            const solicitudOrigen = await Solicitud.findById(solicitudRelacionadaId)
                .populate("usuarioId", "nombre apellido correo").lean();

            const usuarioSolicitante = solicitudOrigen?.usuarioId as any; //puede ser que este ligada a un hueco estructural y el usuario ya no exista en el sistema
            
            if(usuarioSolicitante){ //si el usuario sigue en el sistema
                sustituidoNombre = `${usuarioSolicitante.nombre} ${usuarioSolicitante.apellido}`;
                sustituidoCorreo = usuarioSolicitante.correo;
            }else if(solicitudOrigen?.comentario){ //si el usuario no existe la solicitud se relaciono con un hueco estructural y esta contendra la informacion -> guarad de cierta manera el historico
                const nombre = solicitudOrigen.comentario.match(/NOMBRE:(.+)/);
                if(nombre) sustituidoNombre = nombre[1].trim();
            }
        }

        // Creamos el sustituto guardando su nivel
        await Sustitucion.create({
            fechaInicio,
            fechaFin,
            turno,
            sustituido, 
            sustituidoNombre,
            sustituidoCorreo,
            sustitutoNombre, 
            sustitutoCorreo,
            nivel: nivel || "Junior", // Guardamos la experiencia del sustituto
            plantaId: sesion.plantaId,
            incidenciaRelacionada: incidenciaRelacionadaId,
            solicitudRelacionada: solicitudRelacionadaId
        });

        // Llamamos al motor de reglas para todo el bloque de la incidencia original
        if(incidenciaOriginal){
            const inicioInc = startOfDay(new Date(incidenciaOriginal.fechaInicio));
            const finInc = startOfDay(new Date(incidenciaOriginal.fechaFin));
            await comprobarReglas(inicioInc, finInc, solicitudRelacionadaId, String(sesion.plantaId));
        } else {
            // Si no había incidencia previa, comprobamos las fechas del sustituto 
            await comprobarReglas(new Date(fechaInicio), new Date(fechaFin), solicitudRelacionadaId, String(sesion.plantaId));
        }

        revalidatePath("/(supervisor)/planificador");
        return {exito: true, mensaje: "Sustituto registrado correctamente"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al registrar el sustituto"};
    }
}

export async function registrarBajaAction(usuarioId: string, fechaInicio: string, fechaFin: string) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();

        //comprobamos si el usuario el cual vamos a registrar una baja existe y pertenezca a mi planta(a la que superviso)
        const existenciaUsuario = await Usuario.findById(usuarioId);

        if(!existenciaUsuario) return {exito: false, mensaje: "El usuario introducido no existe en el sistema"};

        if(String(existenciaUsuario.plantaId) != String(sesion.plantaId)) return {exito: false, mensaje: "El usuario seleccionado no pertenece a tu planta"};
    
    
        //la baja esta aprobada por defecto
        const nuevaBaja = await Solicitud.create({
            usuarioId: usuarioId,
            tipoDia: "Baja",
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            estado: "Aprobada",//siempre se tienen que aprobar
            comentario: "Baja médica registrada por supervisor",
            plantaId: sesion.plantaId,
            fechaSolicitud: new Date()
        });

        //llamar al motor de reglas para que compruebe la baja
        await comprobarReglas(new Date(fechaInicio), new Date(fechaFin), nuevaBaja._id.toString(), String(sesion.plantaId));

        revalidatePath("/(supervisor)/planificador");
        return { exito: true, mensaje: "Baja registrada y cuadrante actualizado" };
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al registrar la baja"};
    }
}