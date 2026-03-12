// app/resumen/page.tsx

"use client";

import { Box, Grid, Card, Text, Heading, Badge, Button, Flex, Separator, Dialog, Callout } from "@radix-ui/themes";
import {useState, useTransition } from "react";
import { startOfDay, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";


//FORMATO
type ColorEstado = "green" | "orange" | "red" | "gray";

type EstadoSolicitud = "Pendiente" | "Aprobada" | "Rechazado";


const getColorEstado = (estado: EstadoSolicitud): ColorEstado =>{
  switch(estado){
    case "Aprobada": return "green";
    case "Pendiente": return "orange";
    case "Rechazado": return "red";
    default: return "gray";
  }
}

const formatearFecha = (fechaISO: string) => {
    if(!fechaISO) return "";
    const fecha = startOfDay(new Date(fechaISO));
    return format(fecha, "dd MMM yyyy", { locale: es });
}

//INTERFACES
interface EstadoActual {
    balanceAnual: number;
    horasRealizadas: number;
    diasLibresRestantes: number;
    horasPrevistas: number;
}

interface Usuario {
    _id: string;
    nombre: string;
    estadoActual: EstadoActual;
}

interface Solicitud {
    _id: string;
    tipoDia: string;
    fechaInicio: string;
    fechaFin: string;
    fechaSolicitud: string;
    estado: "Pendiente" | "Aprobada" | "Rechazado";
}

interface ResumenProps {
    usuario: Usuario; 
    listaSolicitudes: Solicitud[];
    proximoTurno: { texto: string; horas: string } | null;
    borrar: (id: string) => Promise<{ exito: boolean; mensaje: string }>;
}


export default function DashboardResumenVisual({ 
    usuario, 
    listaSolicitudes, 
    proximoTurno, 
    borrar 
}: ResumenProps) {

    const [estaPendiente, empezarTransicion] = useTransition();
    const [abrirDialogo, setAbrirDialogo] = useState(false);
    const [idABorrar, setIdABorrar] = useState<string | null>(null);


    const abrirDialogoBorrar = (id: string) => {
        setIdABorrar(id);
        setAbrirDialogo(true);
    }

    const confirmarBorrado = () => {
        if(!idABorrar) return;
        
        empezarTransicion(async () => {
            try {
                const resultado = await borrar(idABorrar); 
                
                if (resultado.exito) {
                    toast.success(resultado.mensaje);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch (error) {
                toast.error("Error en la conexión con el servidor al borrar la solicitud"); 
            } finally {
                setAbrirDialogo(false);
                setIdABorrar(null);
            }
        });
    }


  return (
    <Box p="6" style={{ maxWidth: "1000px" }}> {/* Contenedor limitado */}
      
      <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Mi Resumen</Heading>

      {/*Seccion Resumen Datos Usuario*/}
      <Grid columns={{ initial: "1", sm: "2", md: "2" }} gap="4" mb="6">      {/*Ajustamos las columnas segun el tamaño de la pantalla */}
        {/* Fila 1 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Balance Actual</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#10B981" }}>+{usuario?.estadoActual?.balanceAnual || 0} h</Text>
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Realizadas (Objetivo)</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario?.estadoActual?.horasRealizadas || 0} h</Text>
        </Card>

        {/* Fila 2 */}
        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Días libres restantes</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#3B82F6" }}>{usuario?.estadoActual?.diasLibresRestantes || 0}</Text>
        </Card>

        <Card style={{ padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <Text as="div" size="4" weight="bold" color="gray" mb="1">Horas Anuales (Objetivo)</Text>
          <Text as="div" size="7" weight="bold" style={{ color: "#1F2937" }}>{usuario?.estadoActual?.horasPrevistas || 0} h</Text>
        </Card>
      </Grid>

      {/* Seccion Proximo Turno */}
      <Heading size="4" mb="3">Próximo Turno</Heading>
      <Card style={{ padding: "25px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", marginBottom: "30px" }}>
        <Text size="3" weight="bold" style={{ color: "#0088D1" }}>
          {proximoTurno?.texto} ({proximoTurno?.horas})
        </Text>
      </Card>

      {/**Seccion Solicitudes */}
      <Heading size="4" mb="3"> Mis Solicitudes Anuales</Heading>
      <Card style={{ padding: "0px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
        {listaSolicitudes.length > 0 ? (

          listaSolicitudes.map((solicitud, index) => (
                <Box key = {solicitud._id}>
                    <Flex justify="between" align="center" p="4">
                        <Box>
                            {/*mostramos el tipo de dia solicitado */}
                            <Text as="div" weight="bold" style={{ color: "#374151", textTransform: "capitalize"}}>
                                {solicitud.tipoDia}
                            </Text>

                            {/*mostramos el rango o el dia pedido*/}
                            <Text as="div" size="2" style={{ color: "#111827", marginTop: "2px" }}>
                                {solicitud.fechaInicio === solicitud.fechaFin 
                                    ? `Día: ${formatearFecha(solicitud.fechaInicio)}` 
                                    : `Del ${formatearFecha(solicitud.fechaInicio)} al ${formatearFecha(solicitud.fechaFin)}`}
                            </Text>

                            {/*dia en el que se realizo la solicitud*/}
                            <Text as="div" size="1" style={{color:"#1fa1b2", marginTop: "4px" }}>
                                Solicitado el: {formatearFecha(solicitud.fechaSolicitud)}
                            </Text>
                        </Box>
                        <Flex align="center" gap="4">
                            <Badge
                             variant="soft"  //color suabe
                             color={getColorEstado(solicitud.estado)} //cambia de color segun el botón
                             size="3" //tamaño
                             radius="full" //para que sea redondeado
                             style={{padding: "5px 15px"}}  
                            >
                                {solicitud.estado}
                            </Badge>
                        {/*Añadimo el boton de poder cancelar si esta solicitud esta pendiente de ser aprobada*/}
                        {solicitud.estado === "Pendiente" &&(
                            <Button
                              variant="soft"
                              style={{color: "#500e0e", backgroundColor: "#CD4444"}}
                              onClick={() => abrirDialogoBorrar(solicitud._id)}
                              >
                                Cancelar
                            </Button>
                        )}
                        </Flex>
                    </Flex>
                    {index < listaSolicitudes.length-1 && <Separator size="4"></Separator>}
                </Box>
            ))
        ) : (
          <Box p="5">
              <Text color="gray" align="center" as="div">No tienes solicitudes pendientes ni aprobadas.</Text>
          </Box>

        )}
            
      </Card>


       {/*Dialogo borrar solicitud*/}
      <Dialog.Root open={abrirDialogo} onOpenChange={setAbrirDialogo}>
          <Dialog.Content style={{maxWidth: 400}}>
              <Dialog.Title size="5" mb="2" weight="bold" color="red">Cancelar Solicitud</Dialog.Title>
              <Text size="3" mb="6" as="p">¿Seguro que quieres eliminar la solicitud? Esta acción no se puede deshacer.</Text>
              <Flex gap="3" justify="end" mt="4">
                  <Dialog.Close>
                      <Button variant="soft" color="gray" style={{cursor:"pointer"}}>Cancelar</Button>
                  </Dialog.Close>
                  <Button onClick={confirmarBorrado} color="red" style={{cursor: "pointer", backgroundColor: "#DC2626"}} disabled={estaPendiente}>
                      {estaPendiente ? "Procesando..." : "Sí, cancelar"}
                  </Button>
              </Flex>
          </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}