import Usuario from "@/models/usuario";
import Plantilla from "@/models/plantilla";
import Sustitucion from "@/models/sustitucion";

//funcion que calcula las horas extra que hace una persona que suple, util para actualizar los balances
export const calcularHorasExtraSustituciones = async (
    correo: string,
    horasM: number,
    horasN: number,
    year: number
) => {
    const hoy = new Date();

    const sustituciones = await Sustitucion.find({
        sustitutoCorreo: correo,
        fechaInicio: { $lte: hoy }
    }).lean();

    let horasExtra = 0;

    for (const sust of sustituciones) {
        if (sust.turno === "M") horasExtra += horasM;
        else if (sust.turno === "N") horasExtra += horasN;
        else if (sust.turno === "BAJA") {
            const usuarioSustituido = await Usuario.findOne({ correo: sust.sustituidoCorreo }).lean();
            if (!usuarioSustituido) continue;

            const plantillaSustituido = await Plantilla.findOne({ 
                usuario: (usuarioSustituido as any)._id, 
                year 
            }).lean();
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

    return horasExtra;
};