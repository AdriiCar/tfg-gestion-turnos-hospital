import { Box } from "@radix-ui/themes";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardSolicitudVacacionesVista from "./DashboardSolicitarVacacionesCliente";
import { crearSolicitudAction } from "@/actions/solicitarDiaActions";


export default async function SolicitarVacacionesPage() {
    await conectarDB();

    const usuario = await Usuario.findOne({"_id": "69b09469989a266aefb3f134"}).lean();
    if(!usuario){
        return <Box p="6">Cargando datos del empleado...</Box>;
    }

    const usuarioId = usuario._id.toString();

    return (
        <DashboardSolicitudVacacionesVista 
            usuarioId={usuarioId}
            guardar = {crearSolicitudAction}
        />

    )
}