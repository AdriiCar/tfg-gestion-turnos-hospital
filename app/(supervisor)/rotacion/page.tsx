import Usuario from "@/models/usuario";
import DashboardRotacionCliente from "./DashboardRotacionCliente";
import { conectarDB } from "@/lib/mongodb";
import Configuracion from "@/models/configuracion";
import Rotacion from "@/models/rotacion";

import { actualizarParametrosAction, guardarPatronAction, borrarPatronAction, agregarUsuarioGrupoAction, quitarUsuarioGrupoAction, generarTareaRotacioAction, consultarEstadoTareaAction, ejecutarMotorAnualAction } from "@/actions/rotacionActions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";

export default async function RotacionPage() {

    //validamos la sesion
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) redirect("/");

    const sesion = await decrypt(token);
    if (!sesion || !sesion.esSupervisor || !sesion.plantaId) redirect("/");


    await conectarDB();

    //obtenemos la configuracion de la plata del supervisor de la sesión
    const config = await Configuracion.findOne({ plantaId: sesion.plantaId }).lean();

    const configInicial = {
        plantaId: sesion.plantaId.toString(),
        duracionM: config?.parametrosGlobales?.horasTurnoM?.toString() || "12",
        duracionN: config?.parametrosGlobales?.horasTurnoN?.toString() || "10",
        cobEnfM: config?.coberturaPlanta?.turnoM?.enfermeros?.toString() || "3",
        cobEnfN: config?.coberturaPlanta?.noche?.enfermeros?.toString() || "2",
        cobAuxM: config?.coberturaPlanta?.turnoM?.auxiliares?.toString() || "2",
        cobAuxN: config?.coberturaPlanta?.noche?.auxiliares?.toString() || "1",
        patrones: config?.patronesBase?.map((p: any) => ({
            id: p._id.toString(),
            nombre: p.nombre,
            secuencia: p.secuencia
        }))
    };

    //buscamos solo los de la plata
    const grupos = await Rotacion.find({ plantaId: sesion.plantaId }).populate({
        path: "empleados",
        model: Usuario,
        select: "nombre apellido correo"
    }).lean();

    const gruposIniciales = grupos.map((grupo: any) => ({
        id: grupo._id.toString(),
        nombre: grupo.nombre,
        patronId: grupo.patronBaseId,
        diaInicio: grupo.diaDesfase,
        empleados: grupo.empleados.map((emp: any) => ({
            id: emp._id.toString(),
            nombre: `${emp.nombre} ${emp.apellido}`,
            correo: emp.correo
        }))
    }));

    return (
        <DashboardRotacionCliente
            config={configInicial}
            grupos={gruposIniciales}
            actualizarParametros={actualizarParametrosAction}
            guardarPatron={guardarPatronAction}
            borrarPatron={borrarPatronAction}
            agregarUsuario={agregarUsuarioGrupoAction}
            quitarUsuario={quitarUsuarioGrupoAction}
            crearTareaAlgoritmo={generarTareaRotacioAction}
            consultarEstadoTarea={consultarEstadoTareaAction}
            ejecutarMotorAnual={ejecutarMotorAnualAction}
        />
    );
}