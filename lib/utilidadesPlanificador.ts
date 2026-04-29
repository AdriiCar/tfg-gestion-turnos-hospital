import { Types } from "mongoose";
import Solicitud from "@/models/solicitud";
import { startOfDay, endOfYear } from "date-fns";


//esta funcion nos permite llevar un historico a traves de las solicitudes cuando una usuario se cambia de rol planta nivel o se elimina del sistema o rotacion
export default async function crearHuecoEstructural(
    usuarioId: string,
    motivo: string,
    plantaId: string,
    rolAfectado: string,
    nombreAfectado: string,
    nivelAfectado: string,
    rotacionRelacionada?: string | null,
    fechaInicio?: Date
) {
    const hoy = startOfDay(fechaInicio || new Date());
    const finDeAno = endOfYear(new Date()); 

    const nuevaSolicitud = await Solicitud.create({
        usuarioId: usuarioId,
        plantaId: plantaId, 
        tipoDia: "Hueco Estructural", 
        estado: "Aprobada", 
        fechaInicio: hoy,
        fechaFin: finDeAno,
        // El comentario contedra los datos necesarios para el caso de que no exista el usuario o tengamos que comprobar ciertas cosas en el motor
        comentario: `Hueco generado por: ${motivo} | ROL:${rolAfectado} | NIVEL:${nivelAfectado} | NOMBRE:${nombreAfectado}`, 
        esDeSistema: true,
        fechaSolicitud: new Date(),
        rotacionRelacionada: rotacionRelacionada ? new Types.ObjectId(rotacionRelacionada) : null
    });
    return nuevaSolicitud._id;
}