import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardPersonalVista from "./DashboardPersonalCliente";
import { crearEmpleadoAction, eliminarEmpleadoAction, modificarEmpleadoAction } from "@/actions/personalActions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";

interface DatosContractualesBD {
    horasContrato?: number;
    fechaInicio?: string | Date;
    fechaFin?: string | Date;
}

interface EstadoActualBD {
    horasPrevistas?: number;
    horasRealizadas?: number;
    balanceAnual?: number;
}

interface UsuarioInterfaz {
    _id: { toString: () => string }; //toString es método del Object de mongo
    nombre: string;
    apellido?: string;
    correo: string;
    rol: string;
    nivel?: string;
    datosContractuales?: DatosContractualesBD;
    estadoActual?: EstadoActualBD;
}

export default async function PersonalPage() {

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if(!token) redirect("/"); 

    const sesion = await decrypt(token);
    if(!sesion || !sesion.esSupervisor) redirect("/");
 


    await conectarDB();
    
    const usuarios = await Usuario.find({plantaId: sesion.plantaId}).lean();

    const empleados = usuarios.map((empleado: UsuarioInterfaz) => ({
        id: empleado._id.toString(), 
        nombre: empleado.nombre,
        apellidos: empleado.apellido || "", 
        correo: empleado.correo,
        rol: empleado.rol,
        contrato: empleado.datosContractuales?.horasContrato || 0,
        previstas: empleado.estadoActual?.horasPrevistas || 0,
        balance: empleado.estadoActual?.balanceAnual || 0,
        actuales: empleado.estadoActual?.horasRealizadas || 0,
        nivel: empleado.nivel || "Senior",
        fechaInicio: empleado.datosContractuales?.fechaInicio 
            ? new Date(empleado.datosContractuales.fechaInicio).toISOString().split("T")[0] 
            : "",
        fechaFin: empleado.datosContractuales?.fechaFin 
            ? new Date(empleado.datosContractuales.fechaFin).toISOString().split("T")[0] 
            : ""
    }));

    return (
        <DashboardPersonalVista 
            empleados={empleados}
            crear={crearEmpleadoAction}
            modificar={modificarEmpleadoAction}
            borrar={eliminarEmpleadoAction}
        />
    )
} 

