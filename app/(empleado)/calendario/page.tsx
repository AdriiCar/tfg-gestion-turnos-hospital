import { obtenerSolicitudesAprobadasAction, obtenerPlantillaAction } from "@/actions/calendarioActions";
import DashboardCalendarioVisual from "./DashboardCalendarioCliente";
import Usuario from "@/models/usuario";

export default async function DashboardCalendario(){

    const usuarioId = "69b09469989a266aefb3f134"
    const añoActual = new Date().getFullYear();

    const solicitudes = await obtenerSolicitudesAprobadasAction(usuarioId);
    const plantilla = await obtenerPlantillaAction(usuarioId, añoActual);

    return (
        <DashboardCalendarioVisual
            solicitudesAprobadas={solicitudes}
            plantilla={plantilla}
        />
    )
}