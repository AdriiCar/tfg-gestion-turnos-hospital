import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import Sustitucion from "@/models/sustitucion";
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

//necesitamos saber si hizo sustituciones para tener los datos reales
const calcularBalance = async (
    empleado: UsuarioInterfaz,
    sustituciones: any[],
    plantillas: any[],
    horasM: number,
    horasN: number,
    yearActual: number,
    hoy: Date
) => {
    const susSustituciones = sustituciones.filter((s: any) => s.sustitutoCorreo === empleado.correo);
    let horasExtra = 0;

    for (const sust of susSustituciones) {
        if (sust.turno === "M") horasExtra += horasM;
        else if (sust.turno === "N") horasExtra += horasN;
        else if (sust.turno === "BAJA") {
            const usuarioSustituido = await Usuario.findOne({ correo: sust.sustituidoCorreo }).lean();
            if (!usuarioSustituido) continue;

            const plantillaSustituido = plantillas.find((p: any) => 
                p.usuario.toString() === (usuarioSustituido as any)._id.toString()
            ) || await Plantilla.findOne({ usuario: (usuarioSustituido as any)._id, year: yearActual }).lean();
            if (!plantillaSustituido) continue;

            const inicio = new Date(sust.fechaInicio);
            const fin = new Date(sust.fechaFin) > hoy ? hoy : new Date(sust.fechaFin);
            let diaActual = new Date(inicio);

            while (diaActual <= fin) {
                const mes = diaActual.getMonth() + 1;
                const dia = diaActual.getDate();
                const turnoDelDia = (plantillaSustituido as any)?.meses
                    ?.find((m: any) => m.mes === mes)
                    ?.dias?.find((d: any) => d.dia === dia)
                    ?.turno;
                if (turnoDelDia === "M") horasExtra += horasM;
                else if (turnoDelDia === "N") horasExtra += horasN;
                diaActual.setDate(diaActual.getDate() + 1);
            }
        }
    }
    //calculamos el balance como el worker
    const horasPrevistas = empleado.estadoActual?.horasPrevistas || 0;
    const horasContrato = empleado.datosContractuales?.horasContrato || 0;
    const diasLibres = (empleado.datosContractuales as any)?.diasLibresAnuales || 6;
    const horasAusencias = (22 + diasLibres) * 8;

    const balance = (horasPrevistas + horasExtra) - (horasContrato + horasAusencias);
    return {balance, horasExtra};
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

    const hoy = new Date();
    const sustituciones = await Sustitucion.find({
        fechaInicio: { $lte: hoy }
    }).lean();
    
    // Calculamos las horas de cada empleado
    const empleados =await Promise.all(usuarios.map(async (empleado: UsuarioInterfaz) => {
        // Buscamos la plantilla que le corresponde a este empleado concreto
        const suPlantilla = plantillas.find((p: any) => p.usuario.toString() === empleado._id.toString());
        
        // Calculamos sus horas
        const horasCalculadas = calcularHorasTrabajadas(suPlantilla, horasM, horasN);

        const {balance, horasExtra} = await calcularBalance(empleado, sustituciones, plantillas, horasM, horasN, yearActual, hoy);
        
        //devolvemos a cada uno de los empleados con los datos necesarios
        return {
            id: empleado._id.toString(), 
            nombre: empleado.nombre,
            apellidos: empleado.apellido || "", 
            correo: empleado.correo,
            rol: empleado.rol,
            horasContrato: empleado.datosContractuales?.horasContrato || 0,
            previstas: empleado.estadoActual?.horasPrevistas || 0,
            balance: balance,
            actuales: horasCalculadas + horasExtra, 
            
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
    }));

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

