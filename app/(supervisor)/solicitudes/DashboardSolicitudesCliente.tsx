"use client"

import { CheckIcon, ClockIcon, Cross2Icon, CalendarIcon, InfoCircledIcon, DownloadIcon } from "@radix-ui/react-icons";
import { Box, Heading, Table, Text, Card, Badge, Flex, Button, Avatar, Tooltip } from "@radix-ui/themes";
import { useTransition } from "react";
import { toast } from "sonner";

//INTERFACES


interface Solicitud {
    id: string;
    tipo: string;
    fechas: string;
    estado: string;
    solicitante: string;
    tiempoRestante?: string;
    documentoAdjunto?: string;
    nombreDocumento?: string;
}

interface SolicitudesProps {
    solicitudes: Solicitud[];
    gestionarSolicitud: (id: string, accion: string) => Promise<{exito: boolean; mensaje: string}>;
}

export default function DashboardSolicitudesCliente({
    solicitudes,
    gestionarSolicitud,
}: SolicitudesProps){
    
    const [estaPendiente, empezarTransicion] = useTransition();
    
    //ESTILO ESTADO DE LOS TURNOS
    const getEstadoEstilo = (estado: string) => {
        switch (estado) {
            case "Pendiente": return { color: "orange" as const, label: "Pendiente" };
            case "Aprobada": return { color: "green" as const, label: "Aprobada" };
            case "Rechazado": return { color: "red" as const, label: "Rechazada" };
            default: return { color: "gray" as const, label: estado };
        }
    };

    const getTipoEstilo = (tipo: string) => {
        if (tipo === "Baja") return { color: "violet" as const, icon: <InfoCircledIcon /> };
        return { color: "orange" as const, icon: <CalendarIcon /> }; // Vacaciones / Permisos
    };

    //APROBAR O RECHAZAR SOLICITUD
    const confirmarGestionarSolicitud = async (id:number | string, accion:string) => {
       empezarTransicion(async () => {
            try {
                const resultado = await gestionarSolicitud(id.toString(), accion);
                if(resultado.exito){
                    toast.success(resultado.mensaje);
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch(error) {
                toast.error("Error en la conexión");
            }
        });
    }
    
  return (
        <Box p="6">
            <Flex justify="between" align="center" mb="5">
                <Heading size="6" style={{ color: "#1F2937" }}>Gestión de Ausencias</Heading>
                <Badge size="2" variant="surface" color="gray">
                    {solicitudes.filter(s => s.estado === "Pendiente").length} Pendientes de revisión
                </Badge>
            </Flex>

             {/*Tabla que contendrá las distintas solicitudes */}
            <Card size="3" style={{ padding: "0", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <Table.Root variant="ghost">
                    <Table.Header style={{ backgroundColor: "#F8FAFC" }}>
                        <Table.Row>
                            <Table.ColumnHeaderCell>SOLICITANTE</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>TIPO Y FECHAS</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>ESTADO</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>DOCUMENTO (OPCIONAL)</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="right">ACCIONES</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {solicitudes.length > 0 ? (
                            solicitudes.map((solicitud) => {
                                const estado = getEstadoEstilo(solicitud.estado);
                                const tipo = getTipoEstilo(solicitud.tipo);
                                return (
                                    <Table.Row key={solicitud.id} align="center">
                                        {/* columna 1: contiene el avatar del usuario */}
                                        <Table.Cell>
                                            <Flex align="center" gap="3">
                                                <Avatar size="2" radius="full" fallback={solicitud.solicitante[0]} color="indigo" />
                                                <Box>
                                                    <Text size="2" weight="bold" as="div">{solicitud.solicitante}</Text>
                                                    <Flex align="center" gap="1">
                                                        <ClockIcon color="gray" width="12" />
                                                        <Text size="1" color="gray">Pedida {solicitud.tiempoRestante}</Text>
                                                    </Flex>
                                                </Box>
                                            </Flex>
                                        </Table.Cell>

                                        {/* columna 2: tipo ausencia y fechas */}
                                        <Table.Cell>
                                            <Flex direction="column" gap="1">
                                                <Badge color={tipo.color} variant="soft" style={{ width: "fit-content" }}>
                                                    <Flex align="center" gap="1">
                                                        {tipo.icon}
                                                        {solicitud.tipo}
                                                    </Flex>
                                                </Badge>
                                                <Text size="2" weight="medium" color="gray">{solicitud.fechas}</Text>
                                            </Flex>
                                        </Table.Cell>

                                        {/* columna 3: el estado */}
                                        <Table.Cell>
                                            <Badge color={estado.color} variant="solid" radius="full">
                                                {estado.label}
                                            </Badge>
                                        </Table.Cell>

                                        {/*colmna 4: Link del documento */}
                                        <Table.Cell>
                                            {/*Boton de descarga del documento*/}
                                            {solicitud.documentoAdjunto && solicitud.documentoAdjunto !== "" ? (
                                                <Box mt="1">
                                                    <Button variant="soft" size="1" color="blue" asChild style={{ cursor: "pointer", padding: "0 8px" }}>
                                                        <a href={solicitud.documentoAdjunto} download={solicitud.nombreDocumento || "justificante"}>
                                                                <DownloadIcon/> {solicitud.nombreDocumento || "Descargar"}
                                                        </a>
                                                    </Button>
                                                </Box>
                                            ): (
                                            <Text size="2" color="gray">
                                                No hay documento adjunto
                                            </Text> 
                                            )}
                                        </Table.Cell>

                                        {/* columna 5: para aprobar o rechazar así como el estado */}
                                        <Table.Cell align="right">
                                            {solicitud.estado === "Pendiente" ? (
                                                <Flex gap="3" justify="end">
                                                    <Tooltip content="Aprobar solicitud">
                                                        <Button 
                                                            size="2" color="green" variant="soft" style={{ cursor: "pointer" }}
                                                            onClick={() => confirmarGestionarSolicitud(solicitud.id.toString(), "Aprobada")}
                                                            disabled={estaPendiente}
                                                        >
                                                            <CheckIcon width="18" height="18" />
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip content="Rechazar solicitud">
                                                        <Button 
                                                            size="2" color="red" variant="soft" style={{ cursor: "pointer" }}
                                                            onClick={() => confirmarGestionarSolicitud(solicitud.id.toString(), "Rechazado")}
                                                            disabled={estaPendiente}
                                                        >
                                                            <Cross2Icon width="18" height="18" />
                                                        </Button>
                                                    </Tooltip>
                                                </Flex>
                                            ) : (
                                                <Text size="1" color="gray">
                                                    {solicitud.estado === "Aprobada" 
                                                        ? "Aprobada, revisar posibles incidencias en planificador" 
                                                        : "Rechazada por el supervisor"}
                                                </Text>
                                            )}
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            })
                        ) : (
                            <Table.Row>
                                <Table.Cell colSpan={5}>
                                    <Text align="center" size="2" color="gray" as="div" style={{ padding: "20px" }}>
                                        No hay solicitudes realizadas
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Card>
        </Box>
    );
}