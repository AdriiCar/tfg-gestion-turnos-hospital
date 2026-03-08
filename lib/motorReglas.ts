import { conectarDB } from "@/lib/mongodb";
import Incidencia from "@/models/incidencia";
import Configuracion from "@/models/configuracion";
import Plantilla from "@/models/plantilla";
import Solicitud from "@/models/solicitud";
import Sustitucion from "@/models/sustitucion";

/**
 * Motor de reglas para comprobar inconsistencias en la plantilla médica.
 * Evalúa cobertura, experiencia y descanso legal.
 */

/*
export async function comprobarReglas(fechaInicio: Date, fechaFin: Date, solicitudId?: string | null) {
    await conectarDB();

    const config = await Configuracion.findOne();
    const plantillas = await Plantilla.find().populate('usuario');

    if (!config) {
        console.error("No se encontró configuración de cobertura.");
        return;
    }

    //Ponemos la hora al inicio del dia en UTC
    const inicio = new Date(fechaInicio);
    inicio.setUTCHours(0, 0, 0, 0);

    //guardamos el fin real de la solicitud para la cobertura
    const finReal = new Date(fechaFin);
    finReal.setUTCHours(23, 59, 59, 999);

    //obtenemos el dia siguiente para revisar el descanso legal
    const fin = new Date(fechaFin);
    fin.setUTCDate(fin.getUTCDate() + 1); 
    fin.setUTCHours(23, 59, 59, 999);

    //Buscamos las solicitudes y sustituciones incluyendo el dia anterior
    const fechaAyer = new Date(inicio);
    fechaAyer.setUTCDate(fechaAyer.getUTCDate() - 1);

    const solicitudesAprobadas = await Solicitud.find({
        estado:  "Aprobada",
        fechaInicio: { $lte: fin },
        fechaFin: { $gte: fechaAyer }
    });

    const sustitutosRegistrados = await Sustitucion.find({
        fecha: { $gte: fechaAyer, $lte: fin }
    });

    //funcion para comprobar si un usuario esta de vacaciones un dia exacto
    const usuarioDeVacaciones = (idUsuario: string, fechaDia: Date) => {
        return solicitudesAprobadas.some(sol => {
            if (sol.usuarioId.toString() !== idUsuario) return false;
            
            const ini = new Date(sol.fechaInicio); ini.setUTCHours(0,0,0,0);
            const f = new Date(sol.fechaFin); f.setUTCHours(23,59,59,999);
            
            return fechaDia >= ini && fechaDia <= f;
        });
    };

    // Iteramos por cada día en el rango de fechas
    for (let fechaActual = new Date(inicio); fechaActual <= fin; fechaActual.setUTCDate(fechaActual.getUTCDate() + 1)) {
        
        const fechaAModificar = new Date(fechaActual);
        fechaAModificar.setUTCHours(0, 0, 0, 0);
        
        //Formateamos la fecha en UTC por si es necesario para una incidencia
        const fechaStr = fechaAModificar.toLocaleDateString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' 
        });
        
        //comprobamos si hay que mirar la cobertura o solo el descanso
        const comprobarCobertura = fechaAModificar <= finReal;

        const roles = ["Enfermero", "Auxiliar"];
        const turnos = ["M", "N"];

        //REVISAMOS SI SE INCUMPLE COBERTURA POR TURNO Y ROL
        if (comprobarCobertura) {
            for (const rol of roles) {
                for (const turno of turnos) {
                    
                    //filtramos el personal que realmente va a trabajar hoy
                    const personalEnTurnoArray = plantillas.filter((p: any) => {
                        if (!p.usuario || p.usuario.rol !== rol) return false;
                        
                        //si tiene solicitud aprobada lo descontamos
                        if (usuarioDeVacaciones(p.usuario._id.toString(), fechaAModificar)) return false;
                        
                        const mItem = p.meses?.find((m: any) => m.mes === (fechaAModificar.getUTCMonth() + 1)); //+1 porq nuestra BD va de 1 al 12
                        const dItem = mItem?.dias?.find((d: any) => d.dia === fechaAModificar.getUTCDate());
                        return dItem?.turno === turno;
                    });

                    //sumamos los sustitutos asignados a ese turno
                    const numeroSustitutos = sustitutosRegistrados.filter(s => 
                        s.turno === turno && 
                        s.sustituido === rol &&
                        new Date(s.fecha).getUTCDate() === fechaAModificar.getUTCDate()
                    ).length;

                    const personalEnTurno = personalEnTurnoArray.length + numeroSustitutos;
                    const t = turno === "M" ? "mañana" : "noche";
                    const r = rol === "Enfermero" ? "enfermeros" : "auxiliares";
                    
                    const necesarios = config.coberturaPlanta[t][r];

                    //Miramos si existia una incidencia previa
                    const incidenciaPreviaCobertura = { 
                        fecha: fechaAModificar, 
                        turno: turno, 
                        rolAfectado: rol, 
                        tipoIncidencia: "Falta de cobertura en planta", 
                        resuelta: false 
                    };
                    
                    //si no hay suficiente personal creamos una incidencia o modificamos la existente
                    if (personalEnTurno < necesarios) {
                        const existe = await Incidencia.findOne(incidenciaPreviaCobertura);
                        const nuevoMensaje = `[${fechaStr}] Faltan ${r} (${turno}): Hay ${personalEnTurno}/${necesarios}.`;
                        if (!existe) {
                            await Incidencia.create({ 
                                ...incidenciaPreviaCobertura, 
                                mensaje: nuevoMensaje,
                                solicitudRelacionada: solicitudId || null 
                            });
                        }else{ //si existe puede ser necesario modificar la incidencia (si pasa de haber 1/3 a 2/3 es necesrio que el usuario lo sepa)
                            existe.mensaje = nuevoMensaje;
                            if (solicitudId) existe.solicitudRelacionada = solicitudId;

                            await existe.save();
                        }
                    } else {
                        // Si ya hay personal, marcamos la incidencia como resuelta
                        await Incidencia.findOneAndUpdate(incidenciaPreviaCobertura, { resuelta: true });
                    }

                    //Regla de no solo personal nuevo
                    const veteranosDelGrupo = personalEnTurnoArray.filter((p: any) => p.usuario?.nivel !== 'Junior').length + numeroSustitutos;
                    const incExperiencia = { 
                        fecha: fechaAModificar, 
                        turno: turno, 
                        rolAfectado: rol, 
                        tipoIncidencia: "Falta de personal con experiencia", 
                        resuelta: false 
                    };

                    if (personalEnTurno > 0 && veteranosDelGrupo < 1) {
                        const existe = await Incidencia.findOne(incExperiencia);
                        const msgExperiencia =  `[${fechaStr}] Riesgo: El equipo de ${rol}s en el turno de ${turno === "M" ? 'Mañana' : 'Noche'} no tiene personal con experiencia.`; 
                        if (!existe) {
                            await Incidencia.create({ 
                                ...incExperiencia, 
                                mensaje: msgExperiencia,
                                solicitudRelacionada: solicitudId || null 
                            });
                        }else{
                            existe.mensaje = msgExperiencia;
                            if(solicitudId) existe.solicitudRelacionada = solicitudId;

                            await existe.save();
                        }
                    } else {
                        await Incidencia.findOneAndUpdate(incExperiencia, { resuelta: true });
                    }
                }
            }
        }

        //DESCANSO LEGAL, No se puede N y M teniendo en cuenta las vacaciones
        for (const plantilla of plantillas) {
            if (!plantilla.usuario) continue;

            const ayer = new Date(fechaAModificar);
            ayer.setUTCDate(ayer.getUTCDate() - 1);
            
            //funcion para ver si realmente hace un turno o esta de vacaciones
            const tieneTurnoAsignado = (fechaEvaluar: Date, turnoBuscado: string) => {
                if (usuarioDeVacaciones(plantilla.usuario._id.toString(), fechaEvaluar)) return false;

                const m = fechaEvaluar.getUTCMonth() + 1;
                const d = fechaEvaluar.getUTCDate();
                return plantilla.meses?.find((mi: any) => mi.mes === m)?.dias?.find((di: any) => di.dia === d)?.turno === turnoBuscado;
            };

            const turnoHoy = tieneTurnoAsignado(fechaAModificar, "M");
            const turnoAyer = tieneTurnoAsignado(ayer, "N");
           
            const msgDescanso = `[${fechaStr}] Descanso ilegal: ${plantilla.usuario.nombre} ${plantilla.usuario.apellido} tiene Mañana tras Noche.`;
            
            const existeInc = { 
                fecha: fechaAModificar, 
                rolAfectado: plantilla.usuario.rol, 
                tipoIncidencia: "Falta de descanso legal", 
                resuelta: false, 
                mensaje: { $regex: new RegExp(plantilla.usuario.nombre) } 
            };

            if (turnoHoy && turnoAyer) {
                const existe = await Incidencia.findOne(existeInc);
                if (!existe) {
                    await Incidencia.create({ 
                        ...existeInc, 
                        turno: "M", 
                        mensaje: msgDescanso, 
                        solicitudRelacionada: solicitudId || null 
                    });
                }
            } else {
                //si hemos cambiado un turno hay que comprobar si hemos solucionado la incidencia
                await Incidencia.findOneAndUpdate(existeInc, { resuelta: true });
            }
        }
    }
}
    */


import { startOfDay, endOfDay, addDays, subDays, format, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

/*
 Motor de reglas para comprobar inconsistencias en la plantilla médica.
 Evalúa cobertura, experiencia y descanso legal.
 */
export async function comprobarReglas(fechaInicio: Date, fechaFin: Date, solicitudId?: string | null) {
    await conectarDB();

    const config = await Configuracion.findOne();
    const plantillas = await Plantilla.find().populate('usuario');

    if (!config) {
        console.error("No se encontró configuración de cobertura.");
        return;
    }

    //obtenemos las horas de inicio y fin del dia
    const inicio = startOfDay(new Date(fechaInicio));
    const finReal = endOfDay(new Date(fechaFin));
    
    // Obtenemos el día siguiente para revisar el descanso legal y el día anterior para búsquedas
    const fin = endOfDay(addDays(finReal, 1)); 
    const fechaAyer = startOfDay(subDays(inicio, 1));

    //buscamos todas las solicitudes 
    const solicitudesAprobadas = await Solicitud.find({
        estado: "Aprobada", 
        fechaInicio: { $lte: fin }, //que comienze antes del dia siguiente al que evaluamos
        fechaFin: { $gte: fechaAyer } //tiene que ser mayor al día de ayer pero da igual cuando termine porque significa que esta en el intervalo
    });

    const sustitutosRegistrados = await Sustitucion.find({
        fecha: { $gte: fechaAyer, $lte: fin }
    });

    // Función para comprobar si un usuario esta de vacaciones un dia exacto
    const usuarioDeVacaciones = (idUsuario: string, fechaDia: Date) => {
        return solicitudesAprobadas.some(sol => {
            if (sol.usuarioId.toString() !== idUsuario) return false;
            
            const ini = startOfDay(new Date(sol.fechaInicio));
            const f = endOfDay(new Date(sol.fechaFin));
            
            return isWithinInterval(fechaDia, { start: ini, end: f });
        });
    };

    
    
    let diaActualBucle = startOfDay(inicio);

    //iteramos hasta llegar al último día, es necesario comprobar este por la restriccion N M
    while (diaActualBucle <= fin) {
        
        // Formateamos la fecha en formato local para el mensaje de la incidencia
        const fechaStr = format(diaActualBucle, "dd/MM/yyyy", { locale: es });
        
        // Comprobamos si hay que mirar la cobertura o solo el descanso, finReal < fin por ello fin solo sirve para la regla de descanso
        const comprobarCobertura = diaActualBucle <= finReal;

        const roles = ["Enfermero", "Auxiliar"];
        const turnos = ["M", "N"];

        // 4. REVISAMOS SI SE INCUMPLE COBERTURA POR TURNO Y ROL
        if (comprobarCobertura) {
            for (const rol of roles) {
                for (const turno of turnos) {
                    
                    // Filtramos el personal que realmente va a trabajar hoy
                    const personalEnTurnoArray = plantillas.filter((p: any) => {
                        if (!p.usuario || p.usuario.rol !== rol) return false;
                        
                        // Si tiene solicitud aprobada lo quitamos
                        if (usuarioDeVacaciones(p.usuario._id.toString(), diaActualBucle)) return false;
                        
                        // Buscamos en el array usando los meses (1-12) y días (1-31)
                        const mesBuscado = diaActualBucle.getMonth() + 1;
                        const diaBuscado = diaActualBucle.getDate();

                        const mItem = p.meses?.find((m: any) => m.mes === mesBuscado);
                        const dItem = mItem?.dias?.find((d: any) => d.dia === diaBuscado);
                        return dItem?.turno === turno;
                    });

                    // Sumamos los sustitutos asignados a ese turno
                    const numeroSustitutos = sustitutosRegistrados.filter(s => {
                        const fechaSustituto = startOfDay(new Date(s.fecha));
                        return s.turno === turno && 
                               s.sustituido === rol &&
                               fechaSustituto.getTime() === diaActualBucle.getTime();
                    }).length;

                    const personalEnTurno = personalEnTurnoArray.length + numeroSustitutos;
                    const t = turno === "M" ? "mañana" : "noche";
                    const r = rol === "Enfermero" ? "enfermeros" : "auxiliares";
                    
                    const necesarios = config.coberturaPlanta[t]?.[r] || 0;

                    // Miramos si existia una incidencia previa
                    const incidenciaPreviaCobertura = { 
                        fecha: diaActualBucle, 
                        turno: turno, 
                        rolAfectado: rol, 
                        tipoIncidencia: "Falta de cobertura en planta", 
                        resuelta: false 
                    };
                    
                    // Si no hay suficiente personal creamos una incidencia o modificamos la existente
                    if (personalEnTurno < necesarios) {
                        const existe = await Incidencia.findOne(incidenciaPreviaCobertura);
                        const nuevoMensaje = `[${fechaStr}] Faltan ${r} (${turno}): Hay ${personalEnTurno}/${necesarios}.`;
                        
                        if (!existe) {
                            await Incidencia.create({ 
                                ...incidenciaPreviaCobertura, 
                                mensaje: nuevoMensaje,
                                solicitudRelacionada: solicitudId || null 
                            });
                        } else { 
                            // Si existe puede ser necesario modificar la incidencia 
                            existe.mensaje = nuevoMensaje;
                            if (solicitudId) existe.solicitudRelacionada = solicitudId;
                            await existe.save();
                        }
                    } else {
                        // Si ya hay personal, marcamos la incidencia como resuelta
                        await Incidencia.findOneAndUpdate(incidenciaPreviaCobertura, { resuelta: true });
                    }

                    // Regla de no solo personal nuevo
                    const veteranosDelGrupo = personalEnTurnoArray.filter((p: any) => p.usuario?.nivel !== 'Junior').length + numeroSustitutos;
                    const incExperiencia = { 
                        fecha: diaActualBucle, 
                        turno: turno, 
                        rolAfectado: rol, 
                        tipoIncidencia: "Falta de personal con experiencia", 
                        resuelta: false 
                    };

                    if (personalEnTurno > 0 && veteranosDelGrupo < 1) {
                        const existe = await Incidencia.findOne(incExperiencia);
                        const msgExperiencia = `[${fechaStr}] Riesgo: El equipo de ${rol}s en el turno de ${turno === "M" ? 'Mañana' : 'Noche'} no tiene personal con experiencia.`; 
                        
                        if (!existe) {
                            await Incidencia.create({ 
                                ...incExperiencia, 
                                mensaje: msgExperiencia,
                                solicitudRelacionada: solicitudId || null 
                            });
                        } else {
                            existe.mensaje = msgExperiencia;
                            if(solicitudId) existe.solicitudRelacionada = solicitudId;
                            await existe.save();
                        }
                    } else {
                        await Incidencia.findOneAndUpdate(incExperiencia, { resuelta: true });
                    }
                }
            }
        }

        // descanso legal, No se puede N y M teniendo en cuenta las vacaciones
        for (const plantilla of plantillas) {
            if (!plantilla.usuario) continue;

            const diaAyer = subDays(diaActualBucle, 1);
            
            // Función para ver si realmente hace un turno o esta de vacaciones
            const tieneTurnoAsignado = (fechaEvaluar: Date, turnoBuscado: string) => {
                if (usuarioDeVacaciones(plantilla.usuario._id.toString(), fechaEvaluar)) return false;

                const m = fechaEvaluar.getMonth() + 1;
                const d = fechaEvaluar.getDate();
                return plantilla.meses?.find((mi: any) => mi.mes === m)?.dias?.find((di: any) => di.dia === d)?.turno === turnoBuscado;
            };

            const turnoHoy = tieneTurnoAsignado(diaActualBucle, "M");
            const turnoAyer = tieneTurnoAsignado(diaAyer, "N");
           
            const msgDescanso = `[${fechaStr}] Descanso ilegal: ${plantilla.usuario.nombre} ${plantilla.usuario.apellido} tiene Mañana tras Noche.`;
            
            const existeInc = { 
                fecha: diaActualBucle, 
                rolAfectado: plantilla.usuario.rol, 
                tipoIncidencia: "Falta de descanso legal", 
                resuelta: false, 
                mensaje: { $regex: new RegExp(plantilla.usuario.nombre) } 
            };

            if (turnoHoy && turnoAyer) {
                const existe = await Incidencia.findOne(existeInc);
                if (!existe) {
                    await Incidencia.create({ 
                        ...existeInc, 
                        turno: "M", 
                        mensaje: msgDescanso, 
                        solicitudRelacionada: solicitudId || null 
                    });
                }
            } else {
                // Si hemos cambiado un turno hay que comprobar si hemos solucionado la incidencia
                await Incidencia.findOneAndUpdate(existeInc, { resuelta: true });
            }
        }

        // Sumamos un día para la siguiente vuelta del bucle
        diaActualBucle = addDays(diaActualBucle, 1);
    }
}