"use client";

import { Box, Button, Heading, Card, Flex, Text, Grid, Badge } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { addMonths,startOfDay, endOfDay, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, isSameDay, isSameMonth, isWithinInterval } from "date-fns";
import {useEffect, useState} from "react";
import {es} from "date-fns/locale";
import { useRouter } from "next/navigation";


//COMPONENTES ESTÁTICOS

//tipos de turnos
type tipoTurnos  = "M" | "N" | "L" | "BAJA";

//necesario ya que es lo que espera el color del badge
type colorBadge = "orange" | "blue" | "green" | "red";

const configTurnos: Record<tipoTurnos, {label: string; color: colorBadge; colorFondo:string}> = {
  M: { label: "M", color: "orange", colorFondo: "#FEF3C7" },
  N: { label: "N", color: "blue", colorFondo: "#DBEAFE" },
  L: { label: "L", color: "green", colorFondo: "#D1FAE5" },
  BAJA: { label: "Baja", color: "red", colorFondo: "#FEE2E2" },
};

interface Solicitud {
    _id: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
}

export default function DashboardCalenadrio() {


    const router = useRouter();

    //COMPONENTES DINÁMICOS

    //Obtenemos la fecha actual, a partir de ella podemos obtener el mes siguiente y el anterior
    const [fechaActual, setFechaActual] = useState(new Date());
    const mesAnterior = () => setFechaActual(subMonths(fechaActual,1));
    const mesSiguiente = () => setFechaActual(addMonths(fechaActual, 1));

    const primerDiaMes = startOfMonth(fechaActual);
    const ultimoDiaMes = endOfMonth(fechaActual);

    //Será el intervalo de días que se printean en el grid
    const primerDiaSemana = startOfWeek(primerDiaMes, {weekStartsOn: 1});
    const ultimoDiaSemana = endOfWeek(ultimoDiaMes, {weekStartsOn: 1});

    const diasIntervalo = eachDayOfInterval({start: primerDiaSemana, end: ultimoDiaSemana})

    const [solicitudesAprobadas, setSolicitudesAprobadas] = useState<Solicitud[]>([]);
    const [plantilla, setPlantilla] = useState<any>(null);

    useEffect (() => {
        const usuarioGuardado = localStorage.getItem("usuarioLogueado");
        if(usuarioGuardado){
            const usuario = JSON.parse(usuarioGuardado);
            if(!usuario){
                router.push("/login");
                return;
            }
            fetch(`/api/solicitudes?usuarioId=${usuario._id}`)
            .then(respuesta => respuesta.json())
            .then((datos: Solicitud[]) => {
                const aprobadas = datos.filter(sol=> sol.estado === "Aprobada");
                setSolicitudesAprobadas(aprobadas);
            });

            const añoActual = fechaActual.getFullYear();
            fetch(`/api/plantillas?usuarioId=${usuario._id}&año=${añoActual}`)
            .then(respuesta => respuesta.json())
            .then((datos) => {
                setPlantilla(datos);
            });
        }else{
            router.push("/login")
        }
    }, [router, fechaActual]);


    // Esta función decide qué turno toca según el día.
  const calcularTurno = (fecha: Date): tipoTurnos => {
    if (!plantilla || !plantilla.meses) return "L";

    const mesBuscado = fecha.getMonth() + 1;
    const diaBuscado = fecha.getDate();

    const mesEnPlantilla = plantilla.meses.find((m: any) => m.mes === mesBuscado);
    
    if (mesEnPlantilla) {
        const diaEnPlantilla = mesEnPlantilla.dias.find((d: any) => d.dia === diaBuscado);
        if (diaEnPlantilla && diaEnPlantilla.turno) {
            return diaEnPlantilla.turno as tipoTurnos;
        }
    }

    return "L";
  };

  const comprobarSolicitudDia = (dia: Date) => {
    for (const sol of solicitudesAprobadas) {
        //abarcamos todo el dia
        const inicio = startOfDay(new Date(sol.fechaInicio));
        const fin = endOfDay(new Date(sol.fechaFin));

        if(isWithinInterval(dia, {start: inicio, end: fin}) || isSameDay(dia, fin)){
            return sol;
        }
    }
    return null;
  };
 


  return (
    //Cuadro principal de la vista
    <Box p="6">
        <Heading size="6" mb="5">Mi Calendario</Heading>
        
        {/**Caja contenedora del calendario */}
        <Card size="4"  style={{minHeight: "600px", padding:"20px"}}>

            {/*Cabecera calendario*/}
            <Flex justify="center" align="center" gap="5" mb="6">
                {/*Flecha del mes anterior */}
                <Button variant="ghost" onClick={mesAnterior} >
                    <ChevronLeftIcon width="20" height="20"/>
                </Button>
                
                {/*Mes actual seleccionado*/}
                <Text size="5" weight="bold" style={{ width: "250px", textAlign: "center", textTransform: "capitalize"}}>
                    {format(fechaActual, "MMMM yyyy", {locale: es})}
                </Text>
                 {/*Flecha del mes siguiente */}
                <Button variant="ghost" onClick={mesSiguiente} >
                    <ChevronRightIcon width="20" height="20"/>
                </Button>
            </Flex>
            {/**Cabecera de los dias de la semana */}
            <Grid columns="7" gap="2" mb="2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
                    <Text key={dia} align="center" weight="bold" size="2" color="gray">{dia}</Text>
                ))}
            </Grid>

            {/* Parrilla de días */}
                <Grid columns="7" gap="2">
                {diasIntervalo.map((dia) => {
                    // Calculamos datos del día
                    const numeroDia = parseInt(format(dia, "d"));
                    const codigoTurno = calcularTurno(dia); // Devuelve "M", "N" o "L"
                    const config = configTurnos[codigoTurno]; // Obtenemos el color y label
                    
                    // Flags booleanos para el estilo
                    const esMismoMes = isSameMonth(dia, fechaActual);
                    const esHoy = isSameDay(dia, new Date());
                    
                   
                    // Solo marcamos festivo si es del mes actual 
                    const solicitudAprobada = comprobarSolicitudDia(dia);
                    
                    return (
                        //Contiene la caja en la que ira el dia y turno
                        <Card
                            key = {format(dia, "yyyy-MM-dd")}
                            variant="surface"
                            style={{
                                minHeight: "80px",
                                opacity: esMismoMes ? 1 : 0.4,
                                border: esHoy ? "2px solid #3B82F6" : 
                                        solicitudAprobada ? "2px solid #8B5CF6" : undefined, // Borde morado si está aprobado
                                backgroundColor: solicitudAprobada ? "#c6bef2" : // Fondo morado
                                                (esMismoMes ? "white" : "#F9FAFB")
                            }}
                        >
                        {/*Coloca el texto y el turno */}
                        <Flex direction="column" justify = "between" height="100%">
                            <Text size="2" weight={esMismoMes? "bold": "regular"} align="center" style={{"width": "100%"}}>
                                {numeroDia}
                            </Text>
                            {/**Definimos el color de la letra, el texto y el color de fondo */}
                            {solicitudAprobada ? (
                                    <Badge color="purple" variant="soft" style={{width: "100%", justifyContent:"center", textTransform: "capitalize"}}>
                                        {solicitudAprobada.tipoDia === "Vacaciones" ? "Vac." : "Libre"}
                                    </Badge>
                                ) : (
                                    <Badge color={config.color} variant="soft" style={{width: "100%", justifyContent:"center", backgroundColor: config.colorFondo}}>
                                        {config.label}
                                    </Badge>
                                )}
                        </Flex> 
                        </Card>
                    ); 
                    })}
                </Grid>
            </Card>
        </Box>
    );
}