import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Usuario from "@/models/usuario";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import DashboardPlanificadorCliente from "./DashboardPlanificadorCliente";
import { startOfWeek, addDays } from "date-fns";
import { modificarTurnoAction, registrarBajaAction, registrarSustitutoAction } from "@/actions/planificadorActions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";

export default async function PlanificadorPage({ searchParams }: { searchParams?: { fecha?: string } }) {
    
    //comprobamos la sesion
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if(!token) redirect("/"); 

    const sesion = await decrypt(token);
    if(!sesion || !sesion.esSupervisor || !sesion.plantaId) redirect("/");

    await conectarDB();
    
    const params = await searchParams
    const fechaParam = params?.fecha;
    const fechaBase = fechaParam ? new Date(fechaParam) : new Date();
    


    //Cargamos la plantilla semanal
    const lunes = startOfWeek(fechaBase, {weekStartsOn: 1});
    const diasSemana :any = [];
    //obtenemos el mes y dia de la semana
    for(let i = 0; i < 7; i++){
        const d = addDays(lunes, i);
        diasSemana.push({mes: d.getMonth()+1, dia: d.getDate()});
    }

    //obtenemos el id de los usuarios de nuestra planta
    const usuariosPlanta = await Usuario.find({plantaId: sesion.plantaId}).select("_id").lean();
    const idsUsuariosPlanta = await usuariosPlanta.map(u => u._id);


    //obtenemos la plantilla solo de los usuarios de la planta del supervisor
    const plantillas = await Plantilla.find({usuario: {$in: idsUsuariosPlanta}}).populate({
        path: "usuario",
        model: Usuario,
        select: "nombre apellido rol"
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
                turnos: turnosSemana,
                rol: p.usuario.rol
            }
    });

    //obtenemos las incidencias y sustituciones ya que hay que mostrarlas en la pantalla de inciio
    const incidenciasBD = await Incidencia.find({ plantaId: sesion.plantaId, resuelta: false })
    .populate({
        path: 'solicitudRelacionada',
        populate: { path: 'usuarioId', select: 'nombre apellido' } // Traemos el nombre del empleado -> para mostrar quien esta de baja y demas
    }).lean();
    const sustitucionesBD = await Sustitucion.find({plantaId: sesion.plantaId}).sort({createdAt: -1}).lean();


    //pasamos los id a string
    const listaInconsistencias = incidenciasBD.map((inc: any) => {
        let tipoCausa = "Cambio Manual";
        let nombreCausante = "";

        if (inc.solicitudRelacionada) {
            tipoCausa = inc.solicitudRelacionada.tipoDia; // Será "Baja", "Vacaciones", etc.
            if (inc.solicitudRelacionada.usuarioId) {
                nombreCausante = `${inc.solicitudRelacionada.usuarioId.nombre} ${inc.solicitudRelacionada.usuarioId.apellido}`;
            }
        }
        return {
        id: inc._id.toString(),
        fechaInicio: inc.fechaInicio.toISOString(),
        fechaFin: inc.fechaFin.toISOString(),
        turno: inc.turno,
        rolAfectado: inc.rolAfectado,
        tipoIncidencia: inc.tipoIncidencia,
        mensaje: inc.mensaje,
        tipoCausa: tipoCausa,           
        nombreCausante: nombreCausante  
        };
    });
    const sustituciones = sustitucionesBD.map((sus: any) => ({ ...sus, id: sus._id.toString(), _id: sus._id.toString() }));
    
    return (
        <DashboardPlanificadorCliente
            plantilla={totalTurnos}
            listaInconsistencias={JSON.parse(JSON.stringify(listaInconsistencias))}
            listaSustitutos={JSON.parse(JSON.stringify(sustituciones))}
            modificarTurno={modificarTurnoAction}
            registrarSustituto={registrarSustitutoAction}
            registrarBajaMedica={registrarBajaAction}
            fechaBase={fechaBase.toISOString()}
        />
    )

}