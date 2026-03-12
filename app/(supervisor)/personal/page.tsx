import { Box } from "@radix-ui/themes";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardPersonalVista from "./DashboardPersonalCliente";
import { crearEmpleadoAction, eliminarEmpleadoAction, modificarEmpleadoAction } from "@/actions/personalActions";

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
    await conectarDB();
    
    const usuarios = await Usuario.find({}).lean();

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

