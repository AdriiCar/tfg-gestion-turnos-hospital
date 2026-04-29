import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import DashboardSolicitudesCliente from "./DashboardSolicitudesCliente";
import { gestionarSolicitudAction } from "@/actions/solicitudesActions";
import { formatDistanceToNow, format, startOfDay, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";
import Usuario from "@/models/usuario";
import { comprobarReglas } from "@/lib/motorReglas";


export default async function SolicitudesPage(){
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if(!token) redirect("/"); 

    const sesion = await decrypt(token);
    if(!sesion || !sesion.esSupervisor || !sesion.plantaId) redirect("/");

    await conectarDB();

    //obtengo a los usuarios que han creado las solicitudes y pertenecen a la planta de la sesion
    const usuariosPlanta = await Usuario.find({plantaId: sesion.plantaId}).select("_id").lean();
    const idsUsuariosPlanta = usuariosPlanta.map(u => u._id);

    //si han pasado 5 días desde que se solicito la solicitud se aprueba automáticamente 
    const inicioPeriodo = new Date();
    inicioPeriodo.setDate(inicioPeriodo.getDate() - 5);

    //buscamos las solicitudes que hayan transcurrido 5 días desde que están pendientes
    const caducadas = await Solicitud.find({
        estado: "Pendiente",
        usuarioId: { $in: idsUsuariosPlanta },
        createdAt: {$lte: inicioPeriodo},
        esDeSistema: { $ne: true }
    });
    
    if(caducadas.length > 0){
        for (const solicitud of caducadas){
            solicitud.estado = "Aprobada"; //se apruea automátcamente
            solicitud.comentario = "Aprobada automáticamente por falta de respuesta (5 días).";
            await solicitud.save();

            await comprobarReglas(solicitud.fechaInicio, solicitud.fechaFin, solicitud._id.toString(), String(sesion.plantaId));
        }
    }
    
    const hoy = new Date();
  
    //obtenemos las solicitudes pertenecientes a los usuarios de una planta
    const solicitudes = await Solicitud.find({usuarioId: {$in: idsUsuariosPlanta}, esDeSistema: { $ne: true }, 
    fechaInicio: { 
        $gte: startOfYear(hoy), 
        $lte: endOfYear(hoy) 
    }}).populate("usuarioId", "nombre apellido").sort({fechaSolicitud: -1}).lean();

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
        documentoAdjunto: sol.documentoAdjunto || "",
        nombreDocumento: sol.nombreDocumento || "",
    }));


    return (
        <DashboardSolicitudesCliente 
            solicitudes={solicitudesIniciales}
            gestionarSolicitud={gestionarSolicitudAction}
        />
    );
}