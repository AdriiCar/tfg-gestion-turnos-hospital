import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Usuario from "@/models/usuario";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import DashboardPlanificadorCliente from "./DashboardPlanificadorCliente";
import { startOfWeek, addDays } from "date-fns";
import { modificarTurnoAction, registrarSustitutoAction } from "@/actions/planificadorActions";

export default async function PlanificadorPage() {
    
    await conectarDB();

    //Cargamos la plantilla semanal
    const hoy = new Date();
    const lunes = startOfWeek(hoy, {weekStartsOn: 1});
    const diasSemana :any = [];

    for(let i = 0; i < 7; i++){
        const d = addDays(lunes, i);
        diasSemana.push({mes: d.getMonth()+1, dia: d.getDate()});
    }

    const plantillas = await Plantilla.find().populate({
        path: "usuario",
        model: Usuario,
        select: "nombre apellido"
    }).lean();


    //ahora necesitamos obtener los turnos de la semana de cada empleado
    const totalTurnos = plantillas.filter((p: any) => p.usuario != null).map((p) => { //recorremos la plantilla de un usuario
    
        const turnosSemana = diasSemana.map((fecha: any) => { //recorremos todos los dias de la semana
            const mes = p.meses.find((m: any) => m.mes === fecha.mes); //obtenemos si el usuario tiene ese mes guardado
            if(mes){  //si tiene el mes recorremos los dias hasta encontrar el dia que queremos
                const dia = mes.dias.find((d: any) => d.dia === fecha.dia) 
                if(dia) return dia.turno; //si tenemos el dia devolvemos el turno para ese dia
            }
            return "L";
            });

            return{
                id: p.usuario._id.toString(),
                nombre: `${p.usuario.nombre} ${p.usuario.apellido}`,
                turnos: turnosSemana
            }
    });

    //obtenemos las incidencias y sustituciones ya que hay que mostrarlas en la pantalla de inciio
    const incidenciasBD = await Incidencia.find({resuelta: false}).sort({createdAt: -1}).lean();
    const sustitucionesBD = await Sustitucion.find().sort({createdAt: -1}).lean();


    //pasamos los id a string
    const incidencias = incidenciasBD.map((inc: any) => ({ ...inc, id: inc._id.toString(), _id: inc._id.toString() }));
    const sustituciones = sustitucionesBD.map((sus: any) => ({ ...sus, id: sus._id.toString(), _id: sus._id.toString() }));
    
    return (
        <DashboardPlanificadorCliente
            plantilla={totalTurnos}
            listaInconsistencias={JSON.parse(JSON.stringify(incidencias))}
            listaSustitutos={JSON.parse(JSON.stringify(sustituciones))}
            modificarTurno={modificarTurnoAction}
            registrarSustituto={registrarSustitutoAction}
        />
    )

}