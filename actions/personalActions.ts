"use server";

import { decrypt } from "@/lib/auth";
import { calcularHorasExtraSustituciones } from "@/lib/horasSustituciones";
import { enviarCorreoBienvenida } from "@/lib/mailer";
import { conectarDB } from "@/lib/mongodb";
import { comprobarReglas } from "@/lib/motorReglas";
import crearHuecoEstructural from "@/lib/utilidadesPlanificador";
import Configuracion from "@/models/configuracion";
import Incidencia from "@/models/incidencia";
import Plantilla from "@/models/plantilla";
import Rotacion from "@/models/rotacion";
import Solicitud from "@/models/solicitud";
import Sustitucion from "@/models/sustitucion";
import Usuario from "@/models/usuario";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";


export interface DatosEmpleado {
    nombre: string;
    apellido: string;
    correo: string;
    rol: string;
    nivel: string;
    fechaInicio: string; //admitimos string para cuando creemos o modifiquemos le pasemos los datos del formulario que son string
    fechaFin?:  string;
    horasContrato: number;
    plantaId: string;
    esSupervisor: boolean;
}


const calcularHorasPrevistasTotales = (plantilla: any, horasM: number, horasN: number) => {
    if (!plantilla || !plantilla.meses) return 0;
    let horasTotales = 0;
    for (const mesData of plantilla.meses) {
        for (const diaData of mesData.dias) {
            if (diaData.turno === "M") horasTotales += horasM;
            else if (diaData.turno === "N") horasTotales += horasN;
        }
    }
    return horasTotales;
};

export async function crearEmpleadoAction(datos: DatosEmpleado){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };
        
        //le generamos una contraseña de 8 caracteres aleatorios
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_@#%&$!?';
        let passwordTemporal = "";
        for (let i = 0; i < 8; i++) {
            passwordTemporal += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        const salt = await bcrypt.genSalt();
        const passwordCifrada = await bcrypt.hash(passwordTemporal, salt);


        await conectarDB();

        await Usuario.create({
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            password: passwordCifrada, 
            rol: datos.rol,
            nivel: datos.nivel,
            plantaId: sesion.plantaId,
            datosContractuales: {
                horasContrato: datos.horasContrato,
                fechaInicio: datos.fechaInicio || new Date(),
                fechaFin: datos.fechaFin || null
            },
            estadoActual: {
                horasPrevistas: 0,
                balanceAnual: 0 - (datos.horasContrato + (22 + 6) * 8), //las horas que debe mas las de vacaciones que debe compensar
                diasLibresRestantes: 6
            },
            esNuevoUsuario: true
        });

        //le enviamos el correo con sus datos de usuario
        const resultadoCorreo = await enviarCorreoBienvenida(
            datos.correo, 
            datos.nombre, 
            passwordTemporal
        );
        if (!resultadoCorreo.exito) {
            revalidatePath("/(supervisor)/personal");
            return { exito: true, mensaje: "Usuario creado, pero hubo un error enviando el correo. Sería recomendable asignarle un turno." };
        }

        revalidatePath("/(supervisor)/personal");


        return {exito: true, mensaje: "¡Usuario creado y correo enviado con éxito!. Sería recomendable asignarle un turno."};

    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al crear el usuario"};
    }
}

export async function modificarEmpleadoAction(idUsuario: string, datos:DatosEmpleado){
    try{

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };


        await conectarDB();

        //comprobamos que el usuario que vamos a modificar pertenezca a nuestra planta
        const usuarioAModificar = await Usuario.findById(idUsuario);
        if(!usuarioAModificar || String(usuarioAModificar.plantaId) != String(sesion.plantaId)){
            return {exito: false, mensaje: "No tienes permiso para modificar a un usuario de otra planta"};
        }

        //miramos si se le ha cambiado de planta
        const hayCambioDePlanta = datos.plantaId && String(usuarioAModificar.plantaId) !== datos.plantaId;
        const plantaAntiguaId = usuarioAModificar.plantaId;

        //miramos si se le cambio el rol o la experiencia
        const hayCambioDeRol = datos.rol && usuarioAModificar.rol !== datos.rol;

        const hayCambioDeExperiencia = datos.nivel && usuarioAModificar.nivel !== datos.nivel;

        //comprobamos el nuevo balancecon las horas de sustitucion
        const yearActual = new Date().getFullYear();
        const plantilla = await Plantilla.findOne({ usuario: idUsuario, year: yearActual }).lean();
        const conf = await Configuracion.findOne({ plantaId: sesion.plantaId }).lean();
        const horasM = conf?.parametrosGlobales?.horasTurnoM || 12;
        const horasN = conf?.parametrosGlobales?.horasTurnoN || 10;

        const horasPrevistas = calcularHorasPrevistasTotales(plantilla, horasM, horasN);
        const horasExtra = await calcularHorasExtraSustituciones(usuarioAModificar.correo, horasM, horasN, yearActual);
        const diasLibres = usuarioAModificar.datosContractuales?.diasLibresAnuales || 6;
        const horasAusencias = (22 + diasLibres) * 8;
        const nuevoBalance = (horasPrevistas + horasExtra) - (datos.horasContrato + horasAusencias);
        //actualizamos al usuario con los nuevos datos
        await Usuario.findByIdAndUpdate(idUsuario, {
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            rol: datos.rol,
            nivel: datos.nivel,
            "datosContractuales.fechaInicio": datos.fechaInicio,
            "datosContractuales.fechaFin": datos.fechaFin,
            "datosContractuales.horasContrato": datos.horasContrato,
            "estadoActual.balanceAnual": nuevoBalance,
            plantaId: datos.plantaId || sesion.plantaId,
            esSupervisor: datos.esSupervisor || false
        });

        //comprobamos si hay cambio de planta o de rol o experiencia y lo que provoca eso
        if(hayCambioDePlanta || hayCambioDeRol || hayCambioDeExperiencia){
            //si pierde experiencia -> hay un problema y es que si es el unico senior de su rol en su rotacion crea un hueco estructural
            const hoy = new Date();
            const finDeAno = new Date(hoy.getFullYear(), 11, 31); 
            const perdidaExperiencia = hayCambioDeExperiencia && usuarioAModificar.nivel === "Senior" && datos.nivel === "Junior";
            
            let motivo = "Modificación de datos";
            if (hayCambioDePlanta) motivo = "Traslado a otra planta";
            else if (hayCambioDeRol) motivo = "Cambio de rol";
            else if (perdidaExperiencia) motivo = "Pérdida de Experiencia (Seniority)";
            let huecoId = null;

            if(hayCambioDePlanta || hayCambioDeRol || perdidaExperiencia){
                huecoId = await crearHuecoEstructural(
                idUsuario, 
                motivo, 
                plantaAntiguaId.toString(),
                usuarioAModificar.rol,
                `${usuarioAModificar.nombre} ${usuarioAModificar.apellido || ""}`,
                usuarioAModificar.nivel || "Junior"
                );
            }
           
            
            if(hayCambioDePlanta) await Plantilla.findOneAndDelete({ usuario: idUsuario });

            //comprobamos las reglas desde el dia actual a fin de año para ver si cambios en el usuario causan problemas en la planta
            await comprobarReglas(hoy, finDeAno, huecoId ? String(huecoId) : null, plantaAntiguaId.toString());

        }

        revalidatePath("/(supervisor)/personal");
        return {exito: true, mensaje: "¡Usuario modificado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al modificar el usuario"};
    }
}


export async function eliminarEmpleadoAction(idUsuario: string){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);

        if (!sesion || !sesion.plantaId || !sesion.esSupervisor) return { exito: false, mensaje: "Permiso denegado." };


        await conectarDB();

        //buscamos al usuario
        const usuarioABorrar = await Usuario.findById(idUsuario);
        if(!usuarioABorrar || String(usuarioABorrar.plantaId) != String(sesion.plantaId)){
            return {exito: false, mensaje: "No tienes permiso para eliminar a un usuario de otra planta"};
        }

        //comprobamos si tenia una plantilla o rotacion -> si lo tenia puede causar inconsistencias sino no
        const teniaPlantillaActiva = await Plantilla.exists({ usuario: idUsuario });
        const teniaRotacionActiva = await Rotacion.exists({ empleados: idUsuario, plantaId: sesion.plantaId });

        let huecoId = null;
        //si tenia información ya sea en su rotacion o plantilla -> puede causar incidencia entonces es un hueco estructural
        if (teniaPlantillaActiva || teniaRotacionActiva) {
            const nuevoHuecoId = await crearHuecoEstructural(
                idUsuario, 
                "Usuario borrado del sistema", 
                String(sesion.plantaId),
                usuarioABorrar.rol,
                `${usuarioABorrar.nombre} ${usuarioABorrar.apellido || ""}`,
                usuarioABorrar.nivel || "Junior"
            );
            huecoId = String(nuevoHuecoId);
        }

        const correoEmpleado = usuarioABorrar.correo;
        
        //borramos las sustituciones donde este empleado este implicado pero no las de sistema asociadas a el -> bajas y vaaciones etc ahora son culpa de eliminarlo
        const solicitudesEmpleado = await Solicitud.find({ usuarioId: idUsuario, esDeSistema: false });
        const idsSolicitudes = solicitudesEmpleado.map(sol => sol._id);

        // Si no tenia plantilla activa o rotacion pero si sustituciones para sus sustitutos creamos huecos estructurales para no perder los sustitutos
        if (!huecoId && idsSolicitudes.length > 0) {
            const sustitucionesRelacionadas = await Sustitucion.exists({solicitudRelacionada: {$in: idsSolicitudes}});
            if(sustitucionesRelacionadas){
                const nuevoHuecoId = await crearHuecoEstructural(
                    idUsuario, 
                    "Usuario borrado del sistema", 
                    String(sesion.plantaId),
                    usuarioABorrar.rol,
                    `${usuarioABorrar.nombre} ${usuarioABorrar.apellido || ""}`,
                    usuarioABorrar.nivel || "Junior"
                );
                huecoId = String(nuevoHuecoId);
            }
        }

        //si alguien inba a cubrir a este empleado se creo un hueco estructural
        if(idsSolicitudes.length > 0){ 
            if(huecoId){ //para no perder los datos del empleado en la sustitucion al borrarlo la ligamos al nuevo hueco en vez de a la solicitud antigua
                await Sustitucion.updateMany(
                    {solicitudRelacionada: {$in: idsSolicitudes}},
                    {
                        $set: {
                            solicitudRelacionada: huecoId,
                            sustituidoNombre: `${usuarioABorrar.nombre} ${usuarioABorrar.apellido || ""}`,
                            sustituidoCorreo: usuarioABorrar.correo
                        }
                    }
                );

                //actualizamos la incidencia para que se relacione al hueco en vez de con la solicitud antigua
                await Incidencia.updateMany(
                    {solicitudRelacionada: {$in: idsSolicitudes}},
                    {$set: {solicitudRelacionada: huecoId}}
                )
            }else{// si no tenia nada de lo anterior limpiamos
                await Sustitucion.deleteMany({solicitudRelacionada: {$in: idsSolicitudes}});
                await Incidencia.deleteMany({solicitudRelacionada: {$in: idsSolicitudes}});

            }
        }


        // buscamos en qué plantas iba a hacer sustituciones este empleado -> puede ser sustituto en otras plantas
        const susSustituciones = await Sustitucion.find({ sustitutoCorreo: correoEmpleado }).select('plantaId');
        const plantasAfectadas = new Set<string>();
        //añadimos la planta actual
        plantasAfectadas.add(String(sesion.plantaId)); 
        
        //recorremos las sustituciones que hace y añadimos la planta a la que sustituye en el set
        for(const s of susSustituciones){
            if(s.plantaID) plantasAfectadas.add(s);
        }
        

        //borramos las sustituciones que este empleado cubria
        await Sustitucion.deleteMany({ sustitutoCorreo: correoEmpleado });

        //eliminamos sus solicitudes
        await Solicitud.deleteMany({usuarioId: idUsuario, esDeSistema: {$ne: true}});

        //eliminamos su plantilla
        await Plantilla.deleteMany({ usuario: idUsuario });

        

        //lo eliminamos de la rotacion a la que pertenecía
        await Rotacion.updateMany(
            {empleados: idUsuario},
            {$pull: {empleados:idUsuario}}
        )

        
        //le eliminamos
        await Usuario.findByIdAndDelete(idUsuario);

        //comprobamos las reglas desde el dia actual a fin de año        
        const hoy = new Date();
        const finDeAno = new Date(hoy.getFullYear(), 11, 31);

        //por cada una de las plantas donde su borrado del sistema afecta llamamos a comprobar reglas
        for(const planta of plantasAfectadas)
            await comprobarReglas(hoy, finDeAno, huecoId, planta);

        revalidatePath("/(supervisor)/personal");

        return {exito: true, mensaje: "¡Usuario eliminado con éxito!"};
    }catch(error){
        return {exito: false, mensaje: "Error en el servidor al borrar el usuario"};
    }
}