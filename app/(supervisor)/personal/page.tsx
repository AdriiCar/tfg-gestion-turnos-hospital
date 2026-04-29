import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import DashboardPersonalVista from "./DashboardPersonalCliente";
import { crearEmpleadoAction, eliminarEmpleadoAction, modificarEmpleadoAction } from "@/actions/personalActions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";
import Planta from "@/models/planta";
import Plantilla from "@/models/plantilla";
import Configuracion from "@/models/configuracion";

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
    _id: { toString: () => string }; 
    nombre: string;
    apellido?: string;
    correo: string;
    rol: string;
    nivel?: string;
    datosContractuales?: DatosContractualesBD;
    estadoActual?: EstadoActualBD;
    esSupervisor: boolean;
    plantaId: string;
}

const calcularHorasTrabajadas = (plantilla: any, horasM: number, horasN: number) => {
    if (!plantilla || !plantilla.meses) return 0;
    
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; 
    const diaActual = hoy.getDate();

    let horasTotales = 0;
    
    for (const mesData of plantilla.meses) {
        if (mesData.mes > mesActual) break;
        
        for (const diaData of mesData.dias) {
            if (mesData.mes === mesActual && diaData.dia > diaActual) break;
            
            // Sumamos las horas correspondientes a cada tipo de turno
            if (diaData.turno === "M") horasTotales += horasM;
            else if (diaData.turno === "N") horasTotales += horasN;
        }
    }

    return horasTotales;
};


export default async function PersonalPage() {

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if(!token) redirect("/"); 

    const sesion = await decrypt(token);
    if(!sesion || !sesion.esSupervisor) redirect("/");
 


    await conectarDB();

    //obtenemos la lista de plantas
    const plantas = await Planta.find({}).lean();
    const listaPlantas = plantas.map((p: any) => ({
        id: p._id.toString(),
        nombre: p.nombre
    }));
    
    // Obtenemos los usuarios de esta planta
    const usuarios = await Usuario.find({plantaId: sesion.plantaId}).lean();

    //obtenemos el id de los ususarios de nuestra planta y del yeara ctual
    const yearActual = new Date().getFullYear();
    const idsUsuarios = usuarios.map(u => u._id);
    
    const plantillas = await Plantilla.find({ 
        usuario: { $in: idsUsuarios }, // Solo trae las plantillas de los usuarios cuyo id es de nuestra planta
        year: yearActual 
    }).lean();

    //obtenemos las horas de la configuracion
    const configuracion = await Configuracion.findOne({ plantaId: sesion.plantaId }).lean();
    const horasM = configuracion?.parametrosGlobales?.horasTurnoM || 12;
    const horasN = configuracion?.parametrosGlobales?.horasTurnoN || 10;

    // Calculamos las horas de cada empleado
    const empleados = usuarios.map((empleado: UsuarioInterfaz) => {
        // Buscamos la plantilla que le corresponde a este empleado concreto
        const suPlantilla = plantillas.find((p: any) => p.usuario.toString() === empleado._id.toString());
        
        // Calculamos sus horas
        const horasCalculadas = calcularHorasTrabajadas(suPlantilla, horasM, horasN);
        //devolvemos a cada uno de los empleados con los datos necesarios
        return {
            id: empleado._id.toString(), 
            nombre: empleado.nombre,
            apellidos: empleado.apellido || "", 
            correo: empleado.correo,
            rol: empleado.rol,
            horasContrato: empleado.datosContractuales?.horasContrato || 0,
            previstas: empleado.estadoActual?.horasPrevistas || 0,
            balance: empleado.estadoActual?.balanceAnual || 0,
            actuales: horasCalculadas, 
            
            nivel: empleado.nivel || "Senior",
            fechaInicio: empleado.datosContractuales?.fechaInicio 
                ? new Date(empleado.datosContractuales.fechaInicio).toISOString().split("T")[0] 
                : "",
            fechaFin: empleado.datosContractuales?.fechaFin 
                ? new Date(empleado.datosContractuales.fechaFin).toISOString().split("T")[0] 
                : "",
            esSupervisor: empleado.esSupervisor,
            plantaId: empleado.plantaId.toString()
        };
    });

    return (
        <DashboardPersonalVista 
            empleados={empleados}
            listaPlantas={listaPlantas}
            crear={crearEmpleadoAction}
            modificar={modificarEmpleadoAction}
            borrar={eliminarEmpleadoAction}
        />
    )
} 

