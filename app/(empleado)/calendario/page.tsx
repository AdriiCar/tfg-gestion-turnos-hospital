"use client";

import { Box, Button, Heading, Card, Flex, Text, Grid, Badge } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, isSameDay, isSameMonth } from "date-fns";
import {useState} from "react";
import {es} from "date-fns/locale";

//COMPONENTES ESTÁTICOS

//tipos de turnos
type tipoTurnos  = "M" | "N" | "L";

//necesario ya que es lo que espera el color del badge
type colorBadge = "orange" | "blue" | "green";

const configTurnos: Record<tipoTurnos, {label: string; color: colorBadge; colorFondo:string}> = {
  M: { label: "M", color: "orange", colorFondo: "#FEF3C7" },
  N: { label: "N", color: "blue", colorFondo: "#DBEAFE" },
  L: { label: "L", color: "green", colorFondo: "#D1FAE5" },
};


export default function DashboardCalenadrio() {

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

    // Esta función decide qué turno toca según el día.
  const calcularTurno = (fecha: Date): tipoTurnos => {
    const diaSemana = getDay(fecha); // 0 es Domingo, 6 es Sábado
    const numeroDia = parseInt(format(fecha, "d")); // El número del día (1, 15, 23...)

    // REGLA 1: Fines de semana siempre LIBRES
    if (diaSemana === 0 || diaSemana === 6) return "L";

    // REGLA 2: Días pares -> MAÑANA
    if (numeroDia % 2 === 0) return "M";

    // REGLA 3: Días impares -> NOCHE
    return "N";

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
                    // 1. Calculamos datos del día
                    const numeroDia = parseInt(format(dia, "d"));
                    const codigoTurno = calcularTurno(dia); // Devuelve "M", "N" o "L"
                    const config = configTurnos[codigoTurno]; // Obtenemos el color y label
                    
                    // 2. Flags booleanos para el estilo
                    const esMismoMes = isSameMonth(dia, fechaActual);
                    const esHoy = isSameDay(dia, new Date());
                    
                    // 3. ¿Es Festivo? (Para cambiar el color de fondo)
                    // Solo marcamos festivo si es del mes actual 
                    const esFestivo = (numeroDia === 16 || numeroDia === 22) && esMismoMes;
                    
                    return (
                        //Contiene la caja en la que ira el dia y turno
                        <Card
                            key = {dia.toISOString()}
                            variant="surface"
                            style={{
                                minHeight: "80px",
                                opacity: esMismoMes ? 1 : 0.4,
                                border: esHoy ? "2px solid #3B82F6" : undefined,
                                backgroundColor: esFestivo ? "#64748B" : (esMismoMes ? "white" : "#F9FAFB")
                                }}
                        >
                        {/*Coloca el texto y el turno */}
                        <Flex direction="column" justify = "between" height="100%">
                            <Text size="2" weight={esMismoMes? "bold": "regular"} align="center" style={{"width": "100%"}}>
                                {numeroDia}
                            </Text>
                            {/**Definimos el color de la letra, el texto y el color de fondo */}
                            <Badge color={config.color} variant="soft" style={{width: "100%", justifyContent:"center", backgroundColor: config.colorFondo}}>
                                {config.label}
                            </Badge>
                        </Flex> 
                        </Card>
                    ); 
                    })}
                </Grid>
            </Card>
        </Box>
    );
}