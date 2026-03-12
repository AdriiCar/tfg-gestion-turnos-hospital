import { Box, Heading, Text } from "@radix-ui/themes";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardSolicitudDiaVisual from "./DashboardSolicitarDiaCliente";
import { crearSolicitudAction } from "@/actions/solicitarDiaActions";




export default async function SolicitarDiaCliente(){
    await conectarDB();

    const usuarioId = "69b09469989a266aefb3f134"


    return (
        <DashboardSolicitudDiaVisual
            usuarioId={usuarioId}
            guardar = {crearSolicitudAction}
        />
    )
}