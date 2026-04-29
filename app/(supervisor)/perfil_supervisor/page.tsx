import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardPerfilVista from "../../componentes/vistas_compartidas/DashboardPerfilCliente";
import { actualizarPerfilAction } from "@/actions/perfilActions";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) redirect("/"); 

    const sesion = await decrypt(token);
    if (!sesion || !sesion.usuarioId) redirect("/");

    await conectarDB();
    const usuario = await Usuario.findById(sesion.usuarioId).lean();

    // Serializamos datos para el cliente
    const usuarioSerializado = JSON.parse(JSON.stringify(usuario));

    return (
        <DashboardPerfilVista 
            usuario={usuarioSerializado} 
            actualizarPerfil={actualizarPerfilAction} 
        />
    );
}