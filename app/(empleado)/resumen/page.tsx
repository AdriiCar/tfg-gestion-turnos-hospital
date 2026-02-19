// app/resumen/page.tsx
"use client";

import { Box, Grid, Card, Text, Heading, Badge, Button, Flex, Separator } from "@radix-ui/themes";

// --- MOCK DATA (datos de prueba) ---
type ColorEstado = "green" | "orange" | "red" | "blue" | "gray";

interface Solicitud {
    id: number;
    tipoDia: string,
    diaPedido: string,
    fechaSolicitado: string,
    estado: string;
    color: ColorEstado 
}
const usuario = { 
  balance: 8.0, 
  horasRealizadas: 1212, 
  diasLibres: 2, 
  horasAnuales: 1492 
};

const proximoTurno = { 
  texto: "Mañana (M): jueves, 5 de febrero", 
  horas: "8:00 - 20:00" 
};

const solicitudes: Solicitud[] = [
  { 
    id: 1, 
    tipoDia: "Día de Libre Disposición",
    diaPedido: "20 Feb", 
    fechaSolicitado: "Solicitado el 15 Nov", 
    estado: "Aprobado", 
    color: "green" // Si escribes "verde" aquí, te dará error (¡eso es bueno!)
  },
  { 
    id: 2, 
    tipoDia: "Vacaciones",
    diaPedido: "1 Jul - 15 Jul", 
    fechaSolicitado: "Solicitado 1 Feb", 
    estado: "Pendiente", 
    color: "orange" 
  }
];

export default function DashboardResumen() {
  return (
    <Box p="6" style={{ maxWidth: "1000px" }}> {/* Contenedor limitado */}
      
      <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Mi Resumen</Heading>

      {/*Seccion Resumen Datos Usuario*/}
      <Grid columns={{ initial: "1", sm: "2", md: "2" }} gap="4" mb="6">      {/*Ajustamos las columnas segun el tamaño de la pantalla */}
        {/* Fila 1 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Balance Actual</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#10B981" }}>+{usuario.balance} h</Text>
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Realizadas (Objetivo)</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario.horasRealizadas} h</Text>
        </Card>

        {/* Fila 2 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Días libres restantes</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#3B82F6" }}>{usuario.diasLibres}</Text>
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Anuales (Objetivo)</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario.horasAnuales} h</Text>
        </Card>
      </Grid>

      {/* Seccion Proximo Turno */}
      <Heading size="4" mb="3">Próximo Turno</Heading>
      <Card style={{ padding: "25px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", marginBottom: "30px" }}>
        <Text size="3" weight="bold" style={{ color: "#0088D1" }}>
          {proximoTurno.texto} ({proximoTurno.horas})
        </Text>
      </Card>

      {/**Seccion Solicitudes */}
      <Heading size="4" mb="3"> Mis Solicitudes Anuales</Heading>
      <Card style={{ padding: "0px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
            {solicitudes.map((solicitud, index) => (
                <Box key = {solicitud.id}>
                    <Flex justify="between" align="center" p="4">
                        <Box>
                            <Text as="div" weight="bold" style={{ color: "#374151"}}>{solicitud.tipoDia}, {solicitud.diaPedido}</Text>
                            <Text as="div" size="2" color="gray">{solicitud.fechaSolicitado}</Text>
                        </Box>
                        <Flex align="center" gap="4">
                            <Badge
                             variant="soft"  //color suabe
                             color={solicitud.color} //cambia de color segun el botón
                             size="3" //tamaño
                             radius="full" //para que sea redondeado
                             style={{padding: "5px 15px"}}  
                            >
                                {solicitud.estado}
                            </Badge>
                        {/*Añadimo el boton de poder cancelar si esta solicitud esta pendiente de ser aprobada*/}
                        {solicitud.estado === "Pendiente" &&(
                            <Button variant="soft" style={{color: "#500e0e", backgroundColor: "#CD4444"}}>
                                Cancelar
                            </Button>
                        )}
                        </Flex>
                    </Flex>
                    {index < solicitudes.length-1 && <Separator size="4"></Separator>}
                </Box>

            ))}
      </Card>
    </Box>
  );
}