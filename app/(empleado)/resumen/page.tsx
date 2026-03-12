import { Box} from "@radix-ui/themes";
import { conectarDB } from "@/lib/mongodb";
import Usuario from "@/models/usuario";
import Solicitud from "@/models/solicitud";
import Plantilla from "@/models/plantilla";
import DashboardResumenVisual from "./DashboardResumenCliente"; // Asegúrate de que este archivo se llama así
import { cancelarSolicitudAction } from "@/actions/resumenActions"; // Tu archivo de acciones
import { startOfDay, addDays, format } from "date-fns";
import { es } from "date-fns/locale";



const calcularProximoTurno = (plantilla: any) => {
      if (!plantilla || !plantilla.meses) return null;

      let fechaActual = startOfDay(new Date());

      // Buscamos como máximo en los próximos 30 días, es dudoso que haya vacaciones de más tiempo
      for (let i = 0; i < 30; i++) {
          const fechaBuscada = addDays(fechaActual, i);
          const mes = fechaBuscada.getMonth() + 1; //el mes del 1 al 12
          const dia = fechaBuscada.getDate();

          const mesPlantilla = plantilla.meses.find((m: any) => m.mes === mes);
          if (mesPlantilla) {
              const diaPlantilla = mesPlantilla.dias.find((d: any) => d.dia === dia);
              
              // Si tiene turno de Mañana o Noche asignado
              if (diaPlantilla && (diaPlantilla.turno === "M" || diaPlantilla.turno === "N")) {
                  const tipoTexto = diaPlantilla.turno === "M" ? "Mañana (M)" : "Noche (N)";
                  
                  //ajustamos las horas segun el turno
                  const horasTexto = diaPlantilla.turno === "M" ? "8:00 - 20:00" : "20:00 - 8:00"; 
                  
                  // Formatea: "jueves, 5 de febrero"
                  const fechaTexto = format(fechaBuscada, "EEEE, d 'de' MMMM", { locale: es });

                  return {
                      texto: `${tipoTexto}: ${fechaTexto}`,
                      horas: horasTexto
                  };
              }
          }
      }
      return null; // Si no encuentra turno en 30 días
  };


export default async function ResumenPage() {
  await conectarDB();

  //mientras no tengo JWT
  const usuario = await Usuario.findOne({"_id": "69b09469989a266aefb3f134"}).lean();

  if(!usuario){
      return <Box p="6">Cargando datos del empleado...</Box>;
  }

  const usuarioId = usuario._id.toString();
    const añoActual = new Date().getFullYear();

    // Hacemos las consultas directamente a MongoDB de forma súper rápida
    const solicitudes = await Solicitud.find({ usuarioId: usuarioId }).sort({ fechaSolicitud: -1 }).lean();
    const plantilla = await Plantilla.findOne({ usuario: usuarioId, año: añoActual }).lean();

    // Calculamos el próximo turno aquí, para que el cliente no tenga que hacer cálculos pesados
    const proximoTurno = calcularProximoTurno(plantilla);

    //Serializamos los datos para que pasen de BD a React sin errores
    const usuarioSerializado = JSON.parse(JSON.stringify(usuario));
    const solicitudesSerializadas = JSON.parse(JSON.stringify(solicitudes));

    // 3. Renderizamos el hijo (Cliente) pasándole todo por Props, ¡incluyendo la acción!
    return (
        <DashboardResumenVisual 
            usuario={usuarioSerializado}
            listaSolicitudes={solicitudesSerializadas}
            proximoTurno={proximoTurno}
            borrar={cancelarSolicitudAction} 
        />
    );
}

