import { obtenerSolicitudesAprobadasAction, obtenerPlantillaAction } from "@/actions/calendarioActions";
import DashboardCalendarioVisual from "../../componentes/vistas_compartidas/DashboardCalendarioCliente";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";

export default async function CalendarioPage(){

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) redirect("/"); 

    const sesion = await decrypt(token);
    if (!sesion || !sesion.usuarioId) redirect("/");

    const usuarioId = sesion.usuarioId as string;
    const yearActual = new Date().getFullYear();

    const solicitudes = await obtenerSolicitudesAprobadasAction(usuarioId);
    const plantilla = await obtenerPlantillaAction(usuarioId, yearActual);

    return (
        <DashboardCalendarioVisual
            solicitudesAprobadas={solicitudes}
            plantilla={plantilla}
        />
    )
}