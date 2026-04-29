import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import Solicitud from "@/models/solicitud";
import Plantilla from "@/models/plantilla";
import DashboardResumenVisual from "../../componentes/vistas_compartidas/DashboardResumenCliente"; 
import { cancelarSolicitudAction } from "@/actions/resumenActions";
import { startOfDay, startOfYear, endOfYear, endOfDay, isWithinInterval } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";
import Configuracion from "@/models/configuracion";

const calcularProximoTurno = (plantilla: any, solicitudes: any [], horasM: number, horasN: number) => {
    const hoy = new Date();

    const hayAusencia = solicitudes.find((sol: any) => {
        if(sol.estado !== "Aprobada") return false;
        const inicio = startOfDay(new Date(sol.fechaInicio));
        const fin = endOfDay(new Date(sol.fechaFin));
        return isWithinInterval(hoy, {start: inicio, end: fin});
    });

    if(hayAusencia){
        const esBaja = hayAusencia.tipoDia === "BAJA";
        return {
            texto:`Ausencia: ${hayAusencia.tipoDia}`,
            detalle: "No hay turno asignado para hoy.",
            colorBorde: esBaja ? "#E11D48" : "#D97706",
            colorFondo: esBaja ? "#FFF1F2" : "#FFFBEB"
        };
    }

    if(!plantilla || !plantilla.meses){
        return { texto: "Sin datos", detalle: "No hay turno asignado", colorBorde: "#94A3B8", colorFondo: "#F8FAFC" };
    }

    const mes = hoy.getMonth() + 1;
    const dia = hoy.getDate();
    const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes);
    
    if (mesPlantilla) {
        const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia);
        
        if (diaPlantilla) {
            if (diaPlantilla.turno === "M") {
                return { 
                    texto: "Turno de Mañana (M)", 
                    detalle: `Jornada de ${horasM} horas`, 
                    colorBorde: "#0EA5E9", 
                    colorFondo: "#F0F9FF"  
                }; 
            } else if (diaPlantilla.turno === "N") {
                return { 
                    texto: "Turno de Noche (N)", 
                    detalle: `Jornada de ${horasN} horas`, 
                    colorBorde: "#6366F1", 
                    colorFondo: "#EEF2FF" 
                }; 
            } else if (diaPlantilla.turno === "L") {
                return { 
                    texto: "Día Libre (L)", 
                    detalle: "Día de Descanso", 
                    colorBorde: "#059669", 
                    colorFondo: "#ECFDF5" 
                }; 
            }
        }
    }

    return { texto: "No asignado", detalle: "Revisa tu calendario", colorBorde: "#94A3B8", colorFondo: "#F8FAFC" };
};
  
const calcularHorasTrabajadas = (plantilla: any, horasM: number, horasN: number) => {
    if (!plantilla || !plantilla.meses) return 0;
    
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; 
    const diaActual = hoy.getDate();

    let horasTotales = 0;
    
    for (const mesData of plantilla.meses) {
        if (mesData.mes > mesActual) break;
        
        for (const diaData of mesData.dias) {
            if (mesData.mes === mesActual && diaData.dia > diaActual) break;
            
            // Sumamos las horas correspondientes a cada tipo de turno
            if (diaData.turno === "M") horasTotales += horasM;
            else if (diaData.turno === "N") horasTotales += horasN;
        }
    }

    return horasTotales;
};

export default async function ResumenPage() {
  await conectarDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) redirect("/"); 

    const sesion = await decrypt(token);
    if (!sesion || !sesion.usuarioId) redirect("/");

  
    const usuarioId = sesion.usuarioId as string;
    const usuario = await Usuario.findById(usuarioId).lean();
    
    const yearActual = new Date().getFullYear();

    const hoy = new Date();
    // Obtenemos los datos de mongo
    const solicitudes = await Solicitud.find(
    { 
        usuarioId: usuarioId,
        fechaInicio: { 
            $gte: startOfYear(hoy), 
            $lte: endOfYear(hoy)
        },
        esDeSistema: { $ne: true }
    }).sort({ fechaSolicitud: -1 }).lean();
    const plantilla = await Plantilla.findOne({ usuario: usuarioId, year: yearActual }).lean();

    //obtenemos las horas de la configuracion
    const configuracion = await Configuracion.findOne({ plantaId: usuario.plantaId }).lean();
    const horasM = configuracion?.parametrosGlobales?.horasTurnoM || 12;
    const horasN = configuracion?.parametrosGlobales?.horasTurnoN || 10;
   

    // calculamos el proximo turno con las horas reales 
    const proximoTurno = calcularProximoTurno(plantilla, solicitudes, horasM, horasN);

    //Serializamos los datos para que pasen de BD a React sin errores
    const usuarioSerializado = JSON.parse(JSON.stringify(usuario));
    const solicitudesSerializadas = JSON.parse(JSON.stringify(solicitudes));

   

    const horasTrabajadas = calcularHorasTrabajadas(plantilla, horasM, horasN);

    return (
        <DashboardResumenVisual 
            usuario={usuarioSerializado}
            listaSolicitudes={solicitudesSerializadas}
            proximoTurno={proximoTurno}
            borrar={cancelarSolicitudAction} 
            horasTrabajadas={horasTrabajadas}
        />
    );
}

