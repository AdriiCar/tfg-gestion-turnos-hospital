"use server";

import { decrypt } from "@/lib/auth";
import { conectarDB } from "@/lib/mongodb";
import { comprobarReglas } from "@/lib/motorReglas";
import Configuracion from "@/models/configuracion";
import Plantilla from "@/models/plantilla";
import Rotacion from "@/models/rotacion";
import Tarea from "@/models/tarea";
import Usuario from "@/models/usuario";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crearHuecoEstructural from "../lib/utilidadesPlanificador"
import Solicitud from "@/models/solicitud";
import { addDays, endOfYear, startOfDay } from "date-fns";


//guardar el cambio de la cobertura y las horas
export async function actualizarParametrosAction(datos: any) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };


        await conectarDB();
        let config = await Configuracion.findOne({plantaId: sesion.plantaId});
        if (!config) config = new Configuracion({ plantaId: sesion.plantaId });
        
        //actualizamos los parametros de la configuracion a los nuevos
        config.parametrosGlobales = datos.parametrosGlobales;
        config.coberturaPlanta = datos.coberturaPlanta;
        await config.save(); //los guardamos
        
        revalidatePath("/(supervisor)/rotacion");
        return { exito: true, mensaje: "Parámetros actualizados con éxito" };
    } catch (error) {
        return { exito: false, mensaje: "Error al guardar parámetros" };
    }
}

//funcion para comprobar si el patron no incumple el turnoM tras noche que haría que no se cumplieran las 12 horas de descanso entre turnos
function esPatronLegal(secuencia: string[]){
    const longitud = secuencia.length;

    for(let i = 0; i < longitud; i++){
        const turnoActual = secuencia[i];

        //hay que tener en cuenta que si secuencia[longitud] == "N" y secuencia[0] == "M" entonces lo incumplimos por ello lo compruebo circular
        const turnoSiguiente = secuencia[(i+1) % longitud];

        if(turnoActual === "N" && turnoSiguiente === "M") return false;
    }

    return true;
}


//guardar o editar un patron
export async function guardarPatronAction(patronId: string | null, nombre: string, secuencia: string[]) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();
        let config = await Configuracion.findOne({plantaId: sesion.plantaId});
        if (!config) config = new Configuracion({plantaId: sesion.plantaId, patronesBase: [] });

        //primero comprobamos que no incumpla la relga de mañana tras noche y evitamos pasar al modelo de reglas patrones que vienen mal por defecto
        if(!esPatronLegal(secuencia)) return {exito: false, mensaje: "Un turno de noche no puede ir seguido de un turno de mañana"}

        if (patronId) {
            // Editar existente
            const patron = config.patronesBase.find((p: any) => p._id.toString() === patronId);
            if (patron) {
                patron.nombre = nombre;
                patron.secuencia = secuencia;
            }
        } else {
            // Crear nuevo
            config.patronesBase.push({
                nombre,
                secuencia
            });
        }
        
        await config.save();
        revalidatePath("/(supervisor)/rotacion");
        return { exito: true, mensaje: patronId ? "Patrón editado con éxito" : "Patrón creado con éxito" };
    } catch (error) {
        return { exito: false, mensaje: "Error al guardar el patrón" };
    }
}

export async function borrarPatronAction(patronId: string){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();

        //comprobamos si hay usuarios asociados
        const grupoConGente = await Rotacion.findOne({ 
            patronBaseId: patronId, 
            plantaId: sesion.plantaId,
            "empleados.0": { $exists: true } 
        });

        //si hay personas en el patron primero hay que sacarlas
        if (grupoConGente) {
            return { 
                exito: false, 
                mensaje: "No se puede eliminar: hay empleados asignados a este patrón. Mueve a los trabajadores a otros grupos primero." 
            };
        }
        //en el caso de que  no tenga personas asociadas
        //borramos los grupos que usaban ese patrón
        await Rotacion.deleteMany({ patronBaseId: patronId, plantaId: sesion.plantaId });

        //borramos el patron entero
        await Configuracion.findOneAndUpdate(
            {plantaId: sesion.plantaId}, 
            { $pull: { patronesBase: { _id: patronId } } }
        );
        
        

        revalidatePath("/(supervisor)/rotacion");
        
        return {exito: true, mensaje: "Patron eliminado correctamente"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar el patron"};
    }
}


export async function agregarUsuarioGrupoAction(grupoId: string, correo: string){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();

    
        //verificamos que el grupo de rotacion pertenece a la plata del supervisor
        const grupo = await Rotacion.findById(grupoId);
        if(!grupo || String(grupo.plantaId) !== String(sesion.plantaId)) {
             return { exito: false, mensaje: "No tienes permiso sobre este grupo" };
        }

        //verificamos si el usuario existe
        const usuario = await Usuario.findOne({correo});

        if(!usuario) return {exito: false, mensaje: "El usuario seleccionado no existe"};

        //verificamos si el usuario que vamos a añadir es de nuestra planta
        if(String(usuario.plantaId) !== String(sesion.plantaId)) {
             return {exito: false, mensaje: "No puedes añadir a un usuario de otra planta"};
        }

        //verificamos si el usuario esta en otro grupo -> si lo esta es necesario eliminarlo anteriormente para que se compruebe si genera problemas su eliminacion
        const grupoPrevio = await Rotacion.findOne({
            empleados: usuario._id,
            plantaId: sesion.plantaId
        });
        if(grupoPrevio) return {exito: false, mensaje: "El usuario pertenece a otro grupo. Para asignarle es necesario borrarlo de su grupo anterior"};


        //Obtenemos la configuracion
        const conf = await Configuracion.findOne({plantaId: sesion.plantaId});
        if(!conf) return {exito: false, mensaje: "No se encontró la configuración de la planta"};

        //Obtenemos el patron que se le va a asignar al usuario
        const patron = conf.patronesBase.find((p: any) => p._id.toString() === grupo.patronBaseId);
        if (!patron) return { exito: false, mensaje: "El patrón al que intentas añadir al usuario no existe" };

        const secuencia = patron.secuencia;
        const longitud = secuencia.length;
        const desfase = grupo.diaDesfase;
        const horasM = conf.parametrosGlobales.horasTurnoM;
        const horasN = conf.parametrosGlobales.horasTurnoN;

        //Generamos la plantilla del año para el usuario atendiendo a las nuevas caracteristicas de su patron
        const year = new Date().getFullYear();
        const inicioYear = new Date(year, 0, 1);
        const finYear = new Date(year, 11, 31);

        let fechaActual = new Date(inicioYear);
        let horas_previstas = 0;
        const mesesMap = new Map();
        let diaActual = 0;

        //Hacemos el computo de las hora anuales que va a realizar el usuario en su nuevo grupo
        while(fechaActual <= finYear){
            const mes = fechaActual.getMonth() + 1;
            const dia = fechaActual.getDate();

            //Necesario para evitar modulos negativos 
            const i = ((diaActual - desfase) % longitud + longitud) % longitud;
            const turno = secuencia[i];

            if(turno === "M") horas_previstas += horasM;
            else if(turno === "N") horas_previstas += horasN;

            if(!mesesMap.has(mes)) mesesMap.set(mes, []);

            mesesMap.get(mes).push({dia, turno});

            fechaActual.setDate(fechaActual.getDate() + 1);
            diaActual++;
        }

        const mesesArray = Array.from(mesesMap.entries()).map(([mes, dias]) => ({ mes, dias })); 

        //Guardamos o actualizamos la plantilla del usuario
        await Plantilla.findOneAndUpdate(
            {usuario: usuario._id, year: year},
            {$set: {meses: mesesArray}},
            {upsert: true, new: true}
        );

        //Actualizamos sus horas y balance
        const horasContrato = usuario.datosContractuales?.horasContrato;
        await Usuario.findByIdAndUpdate(usuario._id, {
            $set: {
                "estadoActual.horasPrevistas": horas_previstas,
                "estadoActual.balanceAnual": horas_previstas - horasContrato
            }
        });
        
        //actualizamos la rotacion
        await Rotacion.findByIdAndUpdate(grupoId, {
            $addToSet: {empleados: usuario._id}
        });

        // Obtenemos los huecos estructurales del grupo
        const huecosGrupo = await Solicitud.find({
            plantaId: sesion.plantaId,
            rotacionRelacionada: grupo._id,
            esDeSistema: true,
            tipoDia: "Hueco Estructural",
        }).lean();

        // Filtramos solo los del mismo rol que el nuevo usuario
        const huecosMismoRol: typeof huecosGrupo = [];
        for (const sol of huecosGrupo) {
            let rolHueco: string | null = null;
            const matchRol = sol.comentario?.match(/ROL:([^|]+)/);
            if (matchRol) {
                rolHueco = matchRol[1].trim();
            } else if (sol.usuarioId) {
                const u = await Usuario.findById(sol.usuarioId).select("rol").lean();
                rolHueco = u?.rol ?? null;
            }
            if (rolHueco === usuario.rol) huecosMismoRol.push(sol);
        }

        // Si es Senior → cubre 1 cobertura y toda la experiencia de la rotacion
        // Si es Junior → cubre solo 1 cobertura
        const idsHuecosABorrar = usuario.nivel === "Senior"
            ? huecosMismoRol.map(sol => sol._id)
            : huecosMismoRol.slice(0, 1).map(sol => sol._id);

        if (idsHuecosABorrar.length > 0) {
            await Incidencia.deleteMany({
                plantaId: sesion.plantaId,
                solicitudRelacionada: { $in: idsHuecosABorrar },
            });
            await Sustitucion.deleteMany({
                plantaId: sesion.plantaId,
                solicitudRelacionada: { $in: idsHuecosABorrar },
            });
            await Solicitud.deleteMany({ _id: { $in: idsHuecosABorrar } });
        }
        
        const hoy = new Date();

        //comprobamos las reglas para tapar posibles incidenicas
        await comprobarReglas(hoy, finYear, null, String(sesion.plantaId));

        //refrescamos la pagina con los datos actualizados
        revalidatePath("/(supervisor)/rotacion");
        
        return { exito: true, mensaje: "Usuario añadido al grupo con éxito" };
        
    } catch (error) {
        return { exito: false, mensaje: "Error en el servidor al asignar usuario al grupo" };
    }
}



export async function quitarUsuarioGrupoAction(grupoId: string, empleadoId: string){
    try{

        //validamos la sesion
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };

        await conectarDB();
        
        //verificamos si el grupo pertenece a nuestra planta
        const grupo = await Rotacion.findById(grupoId);
        if(!grupo || String(grupo.plantaId) !== String(sesion.plantaId)) {
             return { exito: false, mensaje: "No tienes permiso sobre este grupo" };
        }

        //comproamos que el usuario que vamos a quitar exista en el sistema y este en nuestra planta
        const existe_usuario = await Usuario.findById(empleadoId);
        
        if(!existe_usuario){
            return {exito: false, mensaje: "El usuario a eliminar no existe en el grupo"};
        }

        if(String(existe_usuario.plantaId) !== String(sesion.plantaId)) {
            return {exito: false, mensaje: "El usuario a eliminar no pertenece a nuestra planta"};
        }

        //lo sacamos del grupo
        await Rotacion.findByIdAndUpdate(grupoId, {
            $pull: {empleados: empleadoId}
        });

        const yearActual = new Date().getFullYear();

        //Reseteamos su balance y horas previstas
        const horasContrato = existe_usuario.datosContractuales.horasContrato;

        //borramos los huecos estructurales que haya creado el usuario
        await Solicitud.deleteMany({
            usuarioId: empleadoId,
            tipoDia: "Hueco Estructural",
            plantaId: sesion.plantaId
        });

        
        //comprobamos si el usuario tenia una ausencia activa anterior a eliminarle del grupo -> por si le añadimos en otro grupo
        const hoy = startOfDay(new Date());
        //la obtenemos con el objetivo de que el hueco estrcutrual no se forme hasta despues de la ausencia porque todo lo que haya antes que esta lo cubre la misma
        const ausenciaActiva = await Solicitud.findOne({
            usuarioId: empleadoId,
            estado: "Aprobada",
            esDeSistema: {$ne: true},
            tipoDia: {$ne: "Hueco Estructural"},
            fechaInicio: {$lte: hoy},
            fechaFin: {$gte: hoy}
        }).sort({fechaFin: -1}).lean();

        if(ausenciaActiva){
            //le mantenemos la plantilla hasta ese dia y ya después de eso le ponemos libre el resto de días
            const plantillaActual = await Plantilla.findOne({usuario: empleadoId, year: yearActual});
            if(plantillaActual){
                const finAusencia = startOfDay(addDays(new Date(ausenciaActiva.fechaFin), 1));
                for(const mes of plantillaActual.meses){
                    for(const dia of mes.dias){
                        const diaActual = startOfDay(new Date(yearActual, mes.mes - 1, dia.dia));
                        if(diaActual >= finAusencia){
                            dia.turno = "L";
                        }
                    }
                }
                await plantillaActual.save();
            }
        }else{
            await Plantilla.findOneAndDelete({usuario: empleadoId, year: yearActual});
        }


        //creamos el nuevo intervalo donde se genera el hueco real -> desde donde termina la ultima incidencia del usuario hasta fin de ño
        const fechaInicio = ausenciaActiva ? startOfDay(addDays(new Date(ausenciaActiva.fechaFin), 1)) : hoy;
        const fechaFin = endOfYear(hoy);

        //creamos el hueco debido a que borramos al usuario
        let huecoId = null;
        if (fechaInicio <= fechaFin) {
            const nuevoHuecoId = await crearHuecoEstructural(
                empleadoId, 
                "Se le ha quitado de su rotación manual", 
                String(sesion.plantaId), 
                existe_usuario.rol, 
                `${existe_usuario.nombre} ${existe_usuario.apellido}`,
                existe_usuario.nivel,
                grupoId,
                fechaInicio
            );
            huecoId = String(nuevoHuecoId);
        }

        //le actualizamos las horas previstas y el balance
        await Usuario.findByIdAndUpdate(empleadoId,
            {
                $set: {
                    "estadoActual.horasPrevistas": 0,
                    "estadoActual.balanceAnual": 0 - horasContrato
                }
            }
        );

        //comprobamos las relgas desde hoy a fin de año
        const finyear = new Date(yearActual, 11, 31);
        await comprobarReglas(hoy, finyear, huecoId, String(sesion.plantaId));

        revalidatePath("/(supervisor)/rotacion");

        return {exito: true, mensaje: "Usuario eliminado del grupo"};
    }catch(error){
        console.log("Error detallado al quitar usuario:", error);
        return {exito: false, mensaje: "Error en el servidor al borrar usuario"};
    } 
}


export async function generarTareaRotacioAction(parametros:any){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if(!sesion || !sesion.plantaId || !sesion.esSupervisor) return {exito: false, mensaje: "Permiso denegado."}

        await conectarDB();
        //obtenemos los empleados de la planta y filtramos con los datos que le pasaremos al solver de reglas
        const empleados = await Usuario.find({plantaId: sesion.plantaId}).select("_id nombre apellido rol nivel datosContractuales").lean();

        const listaEmpleados = empleados.map(emp => ({
            id: emp._id.toString(),
            nombre: `${emp.nombre} ${emp.apellido}`,
            rol: emp.rol,
            nivel: emp.nivel,
            horasContrato: emp.datosContractuales?.horasContrato || 1492
        }));
        //le pasamos tambien el resto de valores de entradas relacionados con la configuracion propia de la planta
        const parametros_algoritmo = {
            horasTurnoM: Number(parametros.horasTurnoM), 
            horasTurnoN: Number(parametros.horasTurnoN), 
            cobertura: parametros.cobertura,
            patrones: parametros.patrones.map((p: any) => ({
                id: p.id, 
                nombre: p.nombre,
                secuencia: p.secuencia
            })),
            empleados: listaEmpleados,
            usarPatrones: parametros.usarPatrones
        }
        //añadimos una nueva tarea a la cola que se encargara de ejecutar el worker
        const nuevaTarea = await Tarea.create({
            tipo: "generar_rotacion",
            estado: "queued",
            plantaId: sesion.plantaId,
            parametros: parametros_algoritmo
        });

        return {exito: true, taskId: nuevaTarea._id.toString(), mensaje: "Calculando turnos en segundo plano..."}
    }catch(error){
        return {exito: false, mensaje: "Error al encolar tarea."}
    }
}

export async function consultarEstadoTareaAction(taskId: string){
    try{
        await conectarDB();
        const tarea = await Tarea.findById(taskId).lean();

        if (!tarea) return { exito: false, estado: "failed", error: "Tarea no encontrada" };
        return {  //consultamos si la tarea cuando se ejecuto se ejecuto correctamente
            exito: true, 
            estado: tarea.estado, 
            resultado: tarea.resultado, 
            error: tarea.error 
        };
    } catch (error) {
        return { exito: false, estado: "failed", error: "Error de conexión" };
    }
}

//funcion para ejecutar el algoritmo cuando se genera una plantilla anual de principio a fin de año
export async function ejecutarMotorAnualAction(plantaId: string) {
    try {
        const yearActual = new Date().getFullYear();
        const inicioyear = new Date(yearActual, 0, 1);
        const finyear = new Date(yearActual, 11, 31);

        await comprobarReglas(inicioyear, finyear, null, plantaId);
        
        return { 
            exito: true, 
            mensaje: "Motor anual ejecutado correctamente" 
        }; 
    } catch (error) {
        return { 
            exito: false, 
            mensaje: "Error al ejecutar el motor de reglas anual" 
        };
    }
}