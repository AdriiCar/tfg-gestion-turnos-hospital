import { conectarDB } from "@/lib/mongodb";
import DashboardSolicitudDiaVisual from "../../componentes/vistas_compartidas/DashboardSolicitarDiaCliente";
import { crearSolicitudAction } from "@/actions/solicitarDiaActions";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SolicitarDiaCliente() {
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) redirect("/"); 

    const sesion = await decrypt(token);
    if (!sesion || !sesion.usuarioId) redirect("/");

    await conectarDB();
    const usuarioId = sesion.usuarioId as string;

    return (
        <DashboardSolicitudDiaVisual
            usuarioId={usuarioId}
            guardar={crearSolicitudAction}
        />
    )
}