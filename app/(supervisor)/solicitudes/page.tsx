import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import DashboardSolicitudesCliente from "./DashboardSolicitudesCliente";
import { gestionarSolicitudAction, registrarSustitutoSolicitudAction } from "@/actions/solicitudesActions";
import { formatDistanceToNow, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";


export default async function SolicitudesPage(){
    await conectarDB();

    const solicitudes = await Solicitud.find().populate("usuarioId", "nombre apellido").sort({fechaSolicitud: -1}).lean();

    const formatearRangoFechas = (inicio: string, fin: string) => {
        const fechaIn = format(startOfDay(new Date(inicio)), "d MMM", { locale: es });
        const fechaFi = format(startOfDay(new Date(fin)), "d MMM", { locale: es });
        return fechaIn === fechaFi ? fechaIn : `${fechaIn} - ${fechaFi}`;
    };

    const solicitudesIniciales = solicitudes.map((sol: any) => ({
        id: sol._id.toString(),
        tipo: sol.tipoDia,
        fechas: formatearRangoFechas(sol.fechaInicio, sol.fechaFin),
        estado: sol.estado,
        solicitante: `${sol.usuarioId.nombre} ${sol.usuarioId.apellido}`,
        tiempoRestante: formatDistanceToNow(new Date(sol.fechaSolicitud), { addSuffix: true, locale: es }),
        sustituto: sol.sustitutoNombre || (sol.estado === "Aprobado" || sol.estado === "Aprobada" ? "Registrar Sustituto" : undefined),
        fechaInicio: sol.fechaInicio.toISOString(),
        solicitanteRaw: `${sol.usuarioId.nombre} ${sol.usuarioId.apellido}`
    }));

    return (
        <DashboardSolicitudesCliente 
            solicitudes={solicitudesIniciales}
            gestionarSolicitud={gestionarSolicitudAction}
            registrarSustituto={registrarSustitutoSolicitudAction}
        />
    );
}