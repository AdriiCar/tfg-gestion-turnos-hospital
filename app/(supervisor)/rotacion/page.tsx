import Usuario from "@/models/usuario";
import DashboardRotacionCliente from "./DashboardRotacionCliente";
import { conectarDB } from "@/lib/mongodb";
import Configuracion from "@/models/configuracion";
import Rotacion from "@/models/rotacion";

import { actualizarParametrosAction, guardarPatronAction, borrarPatronAction, añadirUsuarioGrupoAction, quitarUsuarioGrupoAction } from "@/actions/rotacionActions";

export default async function RotacionPage() {
    await conectarDB();

    const config = await Configuracion.findOne().lean();

    const configInicial = {
        duracionM: config?.parametrosGlobales?.horasTurnoM?.toString() || "12",
        duracionN: config?.parametrosGlobales?.horasTurnoN?.toString() || "10",
        cobEnfM: config?.coberturaPlanta?.mañana?.enfermeros?.toString() || "3",
        cobEnfN: config?.coberturaPlanta?.noche?.enfermeros?.toString() || "2",
        cobAuxM: config?.coberturaPlanta?.mañana?.auxiliares?.toString() || "2",
        cobAuxN: config?.coberturaPlanta?.noche?.auxiliares?.toString() || "1",
        patrones: config?.patronesBase?.map((p: any) => ({
            id: p._id.toString(),
            nombre: p.nombre,
            secuencia: p.secuencia
        }))
    };

    const grupos = await Rotacion.find().populate({
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
            añadirUsuario={añadirUsuarioGrupoAction}
            quitarUsuario={quitarUsuarioGrupoAction}
        />
    );
}