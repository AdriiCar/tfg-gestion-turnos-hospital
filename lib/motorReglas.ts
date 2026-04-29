import { conectarDB } from "@/lib/mongodb";
import Incidencia from "@/models/incidencia";
import Configuracion from "@/models/configuracion";
import Plantilla from "@/models/plantilla";
import Solicitud from "@/models/solicitud";
import Sustitucion from "@/models/sustitucion";
import Usuario from "@/models/usuario";
import { startOfDay, endOfDay, addDays, subDays, isWithinInterval, format } from "date-fns";

export async function comprobarReglas(fechaInicio: Date, fechaFin: Date, solicitudId?: string | null, plantaId?: string | null) {
    await conectarDB();

    //comprobamos que exista un id de planta sobre la que comprobaremos reglas
    if (!plantaId) return;
    //cargamos la configuracion de la misma
    const config = await Configuracion.findOne({ plantaId: plantaId });
    if (!config) return;

    //cargamos los id de los usuarios
    const usuariosPlanta = await Usuario.find({ plantaId: plantaId }).select("_id rol nivel nombre apellido").lean();
    const idsUsuariosPlanta = usuariosPlanta.map(u => u._id);

    //obtenemos el periodo de evaluacion
    let evalInicio = startOfDay(new Date(fechaInicio));
    let evalFin = endOfDay(new Date(fechaFin));

    //obtenemos las solicitude que esten dentro del intervalo aprobadas
    const solicitudesIniciales = await Solicitud.find({
        estado: "Aprobada",
        $and: [
            {
                $or: [
                    { usuarioId: { $in: idsUsuariosPlanta } },
                    { esDeSistema: true, plantaId: plantaId }
                ]
            },
            {
                $or: [
                    { fechaInicio: { $lte: evalFin }, fechaFin: { $gte: evalInicio } }
                ]
            }
        ]
    }).lean();
 
    //mapeamos para obtener los ids
    const idsSolicitudesAfectadas = solicitudesIniciales.map((s: any) => s._id);

    //vemos si extendemos o atrasamos el intervalo esto es importante ya que cambiara el periodo de busqueda
    for (const sol of solicitudesIniciales) {
        if (new Date(sol.fechaInicio) < evalInicio) evalInicio = startOfDay(new Date(sol.fechaInicio));
        if (new Date(sol.fechaFin) > evalFin) evalFin = endOfDay(new Date(sol.fechaFin));
    }

    //obtenemos todas las incidencias dentro de este nuevo intervalo ampliado
    const incidenciasAfectadas = await Incidencia.find({
        plantaId: plantaId,
        $or: [
            { fechaInicio: { $lte: evalFin }, fechaFin: { $gte: evalInicio } }
        ]
    }).lean();

    //obtenemos el id de las mismas
    for (const inc of incidenciasAfectadas) {
        if (new Date(inc.fechaInicio) < evalInicio) evalInicio = startOfDay(new Date(inc.fechaInicio));
        if (new Date(inc.fechaFin) > evalFin) evalFin = endOfDay(new Date(inc.fechaFin));
    }

    //si este comprobarReglas no se debe a un cambio manual, miro si la solicitud que lo correlaciona empezo antes o termina despues que nuestro intervalo
    if (solicitudId) {
        const sol = await Solicitud.findById(solicitudId).lean();
        if (sol) {
            if (new Date(sol.fechaInicio) < evalInicio) evalInicio = startOfDay(new Date(sol.fechaInicio));
            if (new Date(sol.fechaFin) > evalFin) evalFin = endOfDay(new Date(sol.fechaFin));
            idsSolicitudesAfectadas.push(sol._id);
        }
    }

    //borramos las incidencias generadas pos dicha solicitud
    await Incidencia.deleteMany({
        plantaId: plantaId,
        $or: [
            { fechaInicio: { $lte: evalFin }, fechaFin: { $gte: evalInicio } },
            { solicitudRelacionada: { $in: idsSolicitudesAfectadas } }
        ]
    }); 


    //cargo la plantilla de los usuarios
    const plantillas = await Plantilla.find({ usuario: { $in: idsUsuariosPlanta } }).populate('usuario').lean();
    
    //cojo las solicitudesAprobadas dentro del inervalo, de los usuarios de la planta
    const solicitudesAprobadas = await Solicitud.find({
        estado: "Aprobada",
        $or: [
            { usuarioId: { $in: idsUsuariosPlanta } },
            { esDeSistema: true, plantaId: plantaId }
        ],
        fechaInicio: { $lte: evalFin },
        fechaFin: { $gte: startOfDay(subDays(evalInicio, 1)) }
    }).populate('usuarioId').lean();

    //consigo los sustituso que hay registrados en nuestra planta en esa fecha
    const sustitutosRegistrados = await Sustitucion.find({
        plantaId: plantaId,
        fechaInicio: { $lte: evalFin },
        fechaFin: { $gte: evalInicio }
    }).lean();

    //Funcion auxiliar: dada una plantilla y una fecha me devuelve el turno de ese dia 
    const obtenerTurnoBase = (plantilla: any, fechaEvaluar: Date) => {
        const m = fechaEvaluar.getMonth() + 1;
        const d = fechaEvaluar.getDate();
        return plantilla.meses?.find((mi: any) => mi.mes === m)?.dias?.find((di: any) => di.dia === d)?.turno;
    };

    //Comprobamos si es por experiencia
    const esHuecoSoloPorExperiencia = (comentario?: string) => {
        if (!comentario) return false;
        return /P[eé]rdida de Experiencia/i.test(comentario);
    };

    //guardamos por usuario los dais que causan fallos
    const fallosPorUsuario = new Map<string, any>(); 

    //nos almacenan para los cambios manuales, incidencias por cobertura experiencia y descanso
    const incidenciasManualesCob: Record<string, any> = {};
    const incidenciasManualesExp: Record<string, any> = {};
    const incidenciasDescanso: Record<string, any> = {};
    
    //aqui se iran gauradando todas las inciencias para escribirlas al final en la BD
    const incidenciasTerminadas: any[] = [];

    //variable de control del bucle
    let diaEval = new Date(evalInicio);

    while (diaEval <= evalFin) {
        const roles = ["Enfermero", "Auxiliar"];
        const turnos = ["M", "N"];

        //comprobamos por rol y turno
        for (const rol of roles) {
            for (const turno of turnos) {
                
                //reseteamos contadores
                let personalBaseActivo = 0;
                let seniorsBaseActivos = 0;
                const ausentesHoy: any[] = [];

                //por persona de la plantilla
                for (const p of plantillas) {
                    if (!p.usuario || p.usuario.rol !== rol) continue;
                    //si tienen el mismo rol obtenemos el turno y si es el mismo, obtenemos si hoy no viene al trabajo
                    if (obtenerTurnoBase(p, diaEval) === turno) {
                        const solicitudAusencia = solicitudesAprobadas.find((sol: any) => 
                            sol.usuarioId && sol.usuarioId._id.toString() === p.usuario._id.toString() &&
                            sol.tipoDia !== "Hueco Estructural" &&  
                            isWithinInterval(diaEval, { start: startOfDay(new Date(sol.fechaInicio)), end: endOfDay(new Date(sol.fechaFin)) })
                        );
                        //si no viene lo guardamos como ausente del dia actual
                        if (solicitudAusencia) {
                            ausentesHoy.push({ usuario: p.usuario, solicitud: solicitudAusencia });
                        } else {
                            //lo contamos como que si ha venido si no tiene y vemos si es senior
                            personalBaseActivo++;
                            if (p.usuario.nivel !== "Junior") seniorsBaseActivos++;
                        }
                    }
                }
                //una vez contamos todas las personas de la plantilla obtenemos los sustitusos del dia de hoy
                const sustitutosHoy = sustitutosRegistrados.filter((s: any) => {
                    if (s.sustituido !== rol) return false;
                    const enFecha = isWithinInterval(diaEval, { start: startOfDay(new Date(s.fechaInicio)), end: endOfDay(new Date(s.fechaFin)) });
                    if (!enFecha) return false;

                    //comprobamos si el sustitutituto tiene un turno fijo(cambio manual) o turno BAJA significa que sustituye a alguien un largo periodo de tiempo
                    if (s.turno === turno) return true;
                    if (s.turno === "BAJA") {
                        //comprobamos si cubre a una persona en especifico o si es un hueco estructural por borrar a un usuario
                        if (s.solicitudRelacionada) {
                            return ausentesHoy.some((a: any) => a.solicitud._id.toString() === s.solicitudRelacionada.toString()) || 
                                   solicitudesAprobadas.some((sol: any) => sol.esDeSistema && sol._id.toString() === s.solicitudRelacionada.toString());
                        }
                        return true;
                    }
                    return false;
                });
                //contamos el numero de seniors que sean sustitutos
                const sustitutosSeniors = sustitutosHoy.filter((s: any) => s.nivel !== "Junior").length;
                const haySustitutoSeniorEnTurno = sustitutosSeniors > 0;

                //contamos el numero de personal total que hay y de senior contando solicitudes personas en plana y sustitutos
                const personalTotal = personalBaseActivo + sustitutosHoy.length;
                const seniorsTotales = seniorsBaseActivos + sustitutosSeniors;

                //obtenemos la cobertura de planta para ese turno y rol
                const t = turno === "M" ? "turnoM" : "noche";
                const r = rol === "Enfermero" ? "enfermeros" : "auxiliares";
                const demandNum = config.coberturaPlanta[t]?.[r] || 0;

                //comprobamos si falla cobertura o epewriencia00
                const fallaCobertura = personalTotal < demandNum;
                const fallaExperiencia = demandNum > 0 && seniorsTotales < 1;
                const huecosCobReales = Math.max(0, demandNum - personalTotal);

                let manualFallaCob = fallaCobertura;
                let manualFallaExp = fallaExperiencia;

                let huecosOficialesCob = 0;
                let huecosOficialesExp = 0;
                let culpasCobRestantes = huecosCobReales;
                let culpasExpRestantes = fallaExperiencia ? 1 : 0;

                // Si hay personas ausentes significa que hay una baja, solicitud o cambio de experiencia ... es decir algo no manual aprobado
                if (ausentesHoy.length > 0) {
                    for (const ausente of ausentesHoy) {
                        const userIdStr = ausente.usuario._id.toString();
                        const solIdStr = ausente.solicitud._id.toString();

                        //comprobamos si esta baja tiene un sustituto aprobado
                        const haySustitutoCob = sustitutosHoy.some((s: any) => s.solicitudRelacionada && s.solicitudRelacionada.toString() === solIdStr);
                        const haySustitutoExp = sustitutosHoy.some((s: any) => s.solicitudRelacionada && s.solicitudRelacionada.toString() === solIdStr && s.nivel !== "Junior");
                        
                        //si falla la cobertura y no tiene sustituto de cobertura tiene culpa la solicitud que llamo al motor
                        const culpaCob = fallaCobertura && !haySustitutoCob && culpasCobRestantes > 0;
                        //si no hay experiencia ni hay sustitutos con experiencia y el ausente no es junior falla la solicitud que llamo al motor
                        const culpaExp = fallaExperiencia && !haySustitutoExp && ausente.usuario.nivel !== "Junior" && culpasExpRestantes > 0;

                        if (culpaCob) {
                            huecosOficialesCob++; //contamos si esta baja es culpable de la cobertura
                            culpasCobRestantes--;
                        }
                        if (culpaExp) {
                            huecosOficialesExp++; //Contamos si esta baja es culpable de la experiencia
                            culpasExpRestantes--;
                        }

                        //si es la primera vez que falla la baja en todo el periodo, lo añadimos con la solicitud y usuario
                        if (!fallosPorUsuario.has(solIdStr)) {

                            fallosPorUsuario.set(solIdStr, { solicitud: ausente.solicitud, usuario: ausente.usuario, fallosDia: {} });
                        }
                        //obtenemos el dia actual e inicializamos los fallos del dia si no tenia ninguni
                        const dateKey = format(diaEval, 'yyyy-MM-dd');
                        const actual = fallosPorUsuario.get(solIdStr).fallosDia[dateKey] || { fallaCobertura: undefined, fallaExperiencia: undefined };
                        
                        // Lógica de dia neturo (Si no es culpable ni tiene sustituto explícito, se queda undefined para estirarse)
                        let setCob = actual.fallaCobertura;
                        if (culpaCob) setCob = true; //si tiene la culpa se pone a true
                        else if (haySustitutoCob) setCob = false; //si ha sido ssutituido por cobertura se corta el periodo de la incidencia

                        let setExp = actual.fallaExperiencia; //igual que con la cobertura
                        if (culpaExp) setExp = true;
                        else if (haySustitutoExp) setExp = false;
                        else if(!fallaExperiencia && haySustitutoSeniorEnTurno) setExp = false; 
                        //si tiene la culpa de alguna cosa se la añadimos al dia de hoy
                        if (setCob !== undefined || setExp !== undefined) {
                            fallosPorUsuario.get(solIdStr).fallosDia[dateKey] = {
                                fallaCobertura: setCob,
                                fallaExperiencia: setExp
                            };
                        }
                    }
                }

                // Comprobamos si el hueco es creado por el sistema -> borrado de usuario o cambio de planta
                const sistemasHoy = solicitudesAprobadas.filter((sol: any) => 
                    sol.esDeSistema && isWithinInterval(diaEval, { start: startOfDay(new Date(sol.fechaInicio)), end: endOfDay(new Date(sol.fechaFin)) })
                );

                const sistemasHoyOrdenados = [...sistemasHoy].sort(
                    (a: any, b: any) =>
                        new Date(b.fechaSolicitud || b.createdAt || 0).getTime() -
                        new Date(a.fechaSolicitud || a.createdAt || 0).getTime()
                );
                
                const clavesCoberturaConsumidas = new Set<string>();

                //si si lo es
                if (sistemasHoyOrdenados.length > 0) {
                    //reocrremos todas las solicitudes que esten relacionadas y obtenemos los datos del usaurio si sigue existiendo
                    for (const sol of sistemasHoyOrdenados) {
                        const tieneAusenciaRealHoy = !!sol.usuarioId && solicitudesAprobadas.some((aus: any) =>
                            !aus.esDeSistema &&
                            aus.usuarioId &&
                            aus.usuarioId._id.toString() === sol.usuarioId._id.toString() &&
                            isWithinInterval(diaEval, {
                                start: startOfDay(new Date(aus.fechaInicio)),
                                end: endOfDay(new Date(aus.fechaFin))
                            })
                        );

                        let rolHueco = sol.usuarioId?.rol;
                        let nivelHueco = sol.usuarioId?.nivel || "Junior";
                        let nombreUsuario = sol.usuarioId?.nombre || "Un";
                        let apellidoUsuario = sol.usuarioId?.apellido || "Trabajador";

                        // Si el usuario tiene una ausencia real (baja/vacaciones), priorizamos esa causa
                        // para evitar duplicar culpa con un hueco estructural historico.
                        if (tieneAusenciaRealHoy) {
                            const solId = sol._id.toString();
                            if(!fallosPorUsuario.has(solId)){
                                fallosPorUsuario.set(solId, {
                                    solicitud:sol,
                                    usuario: {nombre: nombreUsuario, apellido: apellidoUsuario, rol: rol, nivel: nivelHueco},
                                    fallosDia: {}
                                });
                            }
                            const dataKey = format(diaEval, 'yyyy-MM-dd');

                            fallosPorUsuario.get(solId).fallosDia[dataKey] = {
                                fallaCobertura: false,
                                fallaExperiencia: false
                            };
                            continue;
                        }

                        // Extraemos siempre del comentario para tener rol/nivel antiguos por posible cambio de rol
                        if (sol.comentario) {
                            const matchRol = sol.comentario.match(/ROL:([^|]+)/);
                            if (matchRol) rolHueco = matchRol[1].trim();
                            const matchNivel = sol.comentario.match(/NIVEL:([^|]+)/);
                            if (matchNivel) nivelHueco = matchNivel[1].trim();
                            if (!sol.usuarioId) {
                                const matchNombre = sol.comentario.match(/NOMBRE:(.+)/);
                                if (matchNombre) {
                                    nombreUsuario = matchNombre[1].trim();
                                    apellidoUsuario = "";
                                }
                            }
                        }

                        const plantillaUsuario = sol.usuarioId
                            ? plantillas.find((p: any) => p.usuario && p.usuario._id.toString() === sol.usuarioId._id.toString())
                            : null;
                        const huecoSoloExperiencia = esHuecoSoloPorExperiencia(sol.comentario);

                        // comprobamos si cambio el usuario de rol o de nivel
                        // en ese caso sigue siendo un hueco valido
                        const usuarioCambioIdentidad = !!sol.usuarioId && 
                            (sol.usuarioId.rol !== rolHueco || sol.usuarioId.nivel !== nivelHueco);

                        const usuarioVuelveATenerTurno = !usuarioCambioIdentidad &&
                            !!plantillaUsuario && 
                            obtenerTurnoBase(plantillaUsuario, diaEval) === turno;

                        if (usuarioVuelveATenerTurno && !huecoSoloExperiencia) {
                            continue;
                        }
                        //si el rol del usuario al que se le elimino ya sea de la rotacion o planta... coincide con el actual 
                        if (rolHueco === rol) {
                            const solIdStr = sol._id.toString();
                            const claveCobertura = sol.rotacionRelacionada
                                ? `${sol.rotacionRelacionada.toString()}-${rol}-sol-${solIdStr}` : `sol-${solIdStr}`;
                            const coberturaYaAsignadaEnClave = clavesCoberturaConsumidas.has(claveCobertura);
                            //comprobamos si tiene sustituto de cobertura y si tiene sustituto de experiencia
                            const haySustitutoCob = sustitutosHoy.some((s: any) => s.solicitudRelacionada && s.solicitudRelacionada.toString() === solIdStr);
                            const haySustitutoExp = sustitutosHoy.some((s: any) => s.solicitudRelacionada && s.solicitudRelacionada.toString() === solIdStr && s.nivel !== "Junior");

                            const esteHuecoPuedeAbsorberExp = nivelHueco !== "Junior";

                            //si la planta falta personal y no tiene sustituto este huevo la culpa es de el propip hueco
                            const culpaCob = fallaCobertura && !haySustitutoCob && culpasCobRestantes > 0 && !coberturaYaAsignadaEnClave;
                            //lo mismo para la experiencia
                            const culpaExp = fallaExperiencia && !haySustitutoExp && esteHuecoPuedeAbsorberExp && culpasExpRestantes > 0;

                            //anotamos que el hueco justifica la falta de cobertura y experiencia
                            if (culpaCob) {
                                huecosOficialesCob++;
                                culpasCobRestantes--;
                                clavesCoberturaConsumidas.add(claveCobertura);
                            }
                            if (culpaExp) {
                                huecosOficialesExp++;
                                culpasExpRestantes--;
                            } 

                            //si no teniamos este ueco registrado lo registramos
                            if (!fallosPorUsuario.has(solIdStr)) {
                                fallosPorUsuario.set(solIdStr, {
                                    solicitud: sol,
                                    usuario: { nombre: nombreUsuario, apellido: apellidoUsuario, rol: rolHueco, nivel: nivelHueco },
                                    fallosDia: {} 
                                });
                            }
                            //obtenemos el dia de hoy al que le asignaremos que tipo de fallo tiene
                            const dateKey = format(diaEval, 'yyyy-MM-dd');
                            const actual = fallosPorUsuario.get(solIdStr).fallosDia[dateKey] || { fallaCobertura: undefined, fallaExperiencia: undefined };

                            // Lógica de dia neutro con el objetivo de estirar los dias hasta que se corte el problema
                            let setCob = actual.fallaCobertura;
                            if (culpaCob) setCob = true;
                            else if (haySustitutoCob) setCob = false;

                            let setExp = actual.fallaExperiencia;
                            if (culpaExp) setExp = true;
                            else if (haySustitutoExp) setExp = false;
                            else if(!fallaExperiencia && haySustitutoSeniorEnTurno) setExp = false;

                            //si ha pasado algo lo guardamos
                            if (setCob !== undefined || setExp !== undefined) {
                                fallosPorUsuario.get(solIdStr).fallosDia[dateKey] = {
                                    fallaCobertura: setCob,
                                    fallaExperiencia: setExp
                                };
                            }
                        }
                    }
                }

                // // Una vez hemos comprobado todo, si sigue habiendo problemas es por una asignacion manua
                //comprobamos si queda algo que no cuadra 
                if (fallaCobertura && huecosOficialesCob >= huecosCobReales) {
                    manualFallaCob = false; 
                }
                if (fallaExperiencia && huecosOficialesExp > 0) {
                    manualFallaExp = false; 
                }

                const claveManual = `manual-${rol}-${turno}`;
            
                // comprpbamos cobertura
                if (manualFallaCob) {//si ya existia el problema de cobertura
                    if (incidenciasManualesCob[claveManual]) { //si ya habia incidencia vamos actualizando la fecha de fin y agrupandola
                        incidenciasManualesCob[claveManual].fechaFin = diaEval;
                        incidenciasManualesCob[claveManual].mensaje = `Turno de ${turno} descubierto. Faltan ${huecosCobReales} ${r}.`;
                    } else {
                        incidenciasManualesCob[claveManual] = { //si no existia la creamos
                            fechaInicio: diaEval, fechaFin: diaEval, turno, rolAfectado: rol,
                            tipoIncidencia: "Falta de cobertura en planta",
                            mensaje: `Turno de ${turno} descubierto. Faltan ${huecosCobReales} ${r}.`,
                            plantaId, solicitudRelacionada: null, resuelta: false
                        };
                    }
                } else { // si el problema se ha solucionamo y existia una incidencia manual con esa clave significa que ya ternino el periodo de la incidencia
                    if (incidenciasManualesCob[claveManual]) {
                        incidenciasTerminadas.push(incidenciasManualesCob[claveManual]);
                        delete incidenciasManualesCob[claveManual];
                    }
                }

                //hacemos lo mismo para la experiencia
                if (manualFallaExp) {
                    if (incidenciasManualesExp[claveManual]) { //si ya existia le cambiamos la fecha de fin
                        incidenciasManualesExp[claveManual].fechaFin = diaEval;
                    } else { //si no existia la creamos
                        incidenciasManualesExp[claveManual] = {
                            fechaInicio: diaEval, fechaFin: diaEval, turno, rolAfectado: rol,
                            tipoIncidencia: "Falta de personal con experiencia",
                            mensaje: `Turno de ${turno} sin personal con experiencia (Senior/Mid).`,
                            plantaId, solicitudRelacionada: null, resuelta: false
                        };
                    }
                } else { //si deja de fallas la experienica lo añadimos como incidencia temrinada
                    if (incidenciasManualesExp[claveManual]) {
                        incidenciasTerminadas.push(incidenciasManualesExp[claveManual]);
                        delete incidenciasManualesExp[claveManual];
                    }
                }
            }
        }
        // comprobamos la regla de descanso legal
        const diaAyer = subDays(diaEval, 1);
        for (const p of plantillas) { //recorremos toda la plantilla
            if (!p.usuario) continue;
            //miramos si esta de baha ayer u hoy
            const deBajaHoy = solicitudesAprobadas.some((sol: any) => sol.usuarioId && sol.usuarioId._id.toString() === p.usuario._id.toString() && isWithinInterval(diaEval, { start: startOfDay(new Date(sol.fechaInicio)), end: endOfDay(new Date(sol.fechaFin)) }));
            const deBajaAyer = solicitudesAprobadas.some((sol: any) => sol.usuarioId && sol.usuarioId._id.toString() === p.usuario._id.toString() && isWithinInterval(diaAyer, { start: startOfDay(new Date(sol.fechaInicio)), end: endOfDay(new Date(sol.fechaFin)) }));
            //cojemos el turno de hoy y de ayer teniendo en cuenta que no este de baja -> estar de baja puede ser tener una solicitud aprobada etc
            const turnoHoyM = obtenerTurnoBase(p, diaEval) === "M" && !deBajaHoy;
            const turnoAyerN = obtenerTurnoBase(p, diaAyer) === "N" && !deBajaAyer;
            const claveDescanso = `descanso-${p.usuario._id}`;
            //si el turno de hoy es de mañana y el de ayer es de noche se crea la incidencia
            if (turnoHoyM && turnoAyerN) {
                //si ya existia se alarga(en terminos generales no se va a alargar mas de un dia)
                if (incidenciasDescanso[claveDescanso]) incidenciasDescanso[claveDescanso].fechaFin = diaEval;
                else {
                    //si no existia se crea
                    incidenciasDescanso[claveDescanso] = {
                        fechaInicio: diaEval, fechaFin: diaEval, turno: "M", rolAfectado: p.usuario.rol,
                        tipoIncidencia: "Falta de descanso legal",
                        mensaje: `Descanso ilegal: ${p.usuario.nombre} ${p.usuario.apellido} tiene turnoM tras Noche.`,
                        plantaId, resuelta: false
                    };
                }
                //si ya existia y termino se añade a incidencias terminadas
            } else if (incidenciasDescanso[claveDescanso]) {
                incidenciasTerminadas.push(incidenciasDescanso[claveDescanso]);
                delete incidenciasDescanso[claveDescanso];
            }
        }

        diaEval = addDays(diaEval, 1);
    }

    //añado todas las incidencias mauales de cobertura experiencia y descanso que no se hubieran añadido -> esto pasa debido a que si ahsta el dia de hoy
    //se seguia comprobamdo entonces nunca entro en el else if y por tanto no se añadio
    for (const clave in incidenciasManualesCob) incidenciasTerminadas.push(incidenciasManualesCob[clave]);
    for (const clave in incidenciasManualesExp) incidenciasTerminadas.push(incidenciasManualesExp[clave]);
    for (const clave in incidenciasDescanso) incidenciasTerminadas.push(incidenciasDescanso[clave]);


    // Una vez registrados los problemas manuales pasamos a registrar lo que provienen de solicitud
    //recorremos todas las solicitudes 
    for (const [solId, datos] of fallosPorUsuario.entries()) {
        //miramos cuando empiez y acaban oficialmente
        const inicioSol = startOfDay(new Date(datos.solicitud.fechaInicio));
        const finSol = startOfDay(new Date(datos.solicitud.fechaFin));

        let bloqueCob: any = null;
        let bloqueExp: any = null;
        //obtenemos el usuario que provoca el fallo
        const sujeto = datos.usuario.nombre === "Un" ? "El hueco estructural" : `La ausencia de ${datos.usuario.nombre}`;

        //Creamos una funcion para guardar la incidencia terminada
        const guardarBloque = (tipo: string, inicio: Date, fin: Date) => {
            incidenciasTerminadas.push({
                fechaInicio: startOfDay(inicio),
                fechaFin: startOfDay(fin),
                turno: "BAJA",
                rolAfectado: datos.usuario.rol,
                tipoIncidencia: tipo === "cob" ? "Falta de cobertura en planta" : "Falta de personal con experiencia",
                mensaje: tipo === "cob" 
                    ? `${sujeto} genera falta de personal en su rotación.`
                    : `${sujeto} deja turnos sin personal Senior.`,
                plantaId: plantaId,
                solicitudRelacionada: datos.solicitud._id,
                resuelta: false
            });
        };
        
        //reocrremos cada dia de los datos 
        let d = new Date(inicioSol);
        while (d <= finSol) {
            const dateKey = format(d, 'yyyy-MM-dd');
            const estadoDia = datos.fallosDia[dateKey]; 

            // si se apunto algun problema este dia y falla la cobertura
            if (estadoDia && estadoDia.fallaCobertura !== undefined) { 
                if (estadoDia.fallaCobertura === true) {
                    // Hay fallo -> abrimos o alargamos bloque
                    if (!bloqueCob) bloqueCob = { inicio: new Date(d), fin: new Date(d) };
                    else bloqueCob.fin = new Date(d);
                } else if (estadoDia.fallaCobertura === false) {
                    // Hay Sustituto -> Cerramos el bloque 
                    if (bloqueCob) { guardarBloque("cob", bloqueCob.inicio, bloqueCob.fin); bloqueCob = null; }
                }
            } else {
                // Día Neutro (undefined) -> Si había bloque abierto, lo estiramos ya que no queremos que se fragemnte
                if (bloqueCob) bloqueCob.fin = new Date(d);
            }

            // lo mismo pero para la experiencia
            if (estadoDia && estadoDia.fallaExperiencia !== undefined) {
                if (estadoDia.fallaExperiencia === true) {
                    if (!bloqueExp) bloqueExp = { inicio: new Date(d), fin: new Date(d) };
                    else bloqueExp.fin = new Date(d);
                } else if (estadoDia.fallaExperiencia === false) {
                    if (bloqueExp) { guardarBloque("exp", bloqueExp.inicio, bloqueExp.fin); bloqueExp = null; }
                }
            } else {
                if (bloqueExp) bloqueExp.fin = new Date(d);
            }

            //pasamos al siguiente dia
            d = addDays(d, 1);
        }

        // Si al terminar el periodo sigue habiendo bloque abierto, lo guardamos
        if (bloqueCob) guardarBloque("cob", bloqueCob.inicio, bloqueCob.fin);
        if (bloqueExp) guardarBloque("exp", bloqueExp.inicio, bloqueExp.fin);
    }
    
    //insertamos todas las incdiencias que hayamos detectado en el periodo
    if (incidenciasTerminadas.length > 0) {
        await Incidencia.insertMany(incidenciasTerminadas);
    }
    // Borramos cualquier incidencia de la planta que ya haya terminado
    // para que no ensucien la vista del planificador.
    await Incidencia.deleteMany({
        plantaId: plantaId,
        fechaFin: { $lt: startOfDay(new Date()) }
    });

}