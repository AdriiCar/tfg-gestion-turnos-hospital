"use client"

import { CheckIcon, ClockIcon, Cross2Icon, PersonIcon } from "@radix-ui/react-icons";
import {Box, Heading, Table, Text, Card, Badge, Flex, Button, Avatar, Dialog, TextField } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { toast } from "sonner";

//INTERFACES

type ColorEstado = "orange" | "red" | "green" | "gray";

interface Solicitud{
    id:number | string;
    tipo:string;
    fechas:string;
    estado:string;
    solicitante:string;
    sustituto?:string; //solo hay sustituto cuando se registre
    tiempoRestante?:string; //solo para las pendientes
    fechaInicio?: string;
    solicitanteRaw?: string;
}

interface SolicitudesProps {
    solicitudes: Solicitud[];
    gestionarSolicitud: (id: string, accion: string) => Promise<{exito: boolean; mensaje: string}>;
    registrarSustituto: (solicitudId: string, sustitutoCorreo: string) => Promise<{exito: boolean; mensaje: string}>;
}

export default function DashboardSolicitudesCliente({
    solicitudes,
    gestionarSolicitud,
    registrarSustituto
}: SolicitudesProps){
    
    const [estaPendiente, empezarTransicion] = useTransition();
    
    //ESTILO ESTADO DE LOS TURNOS
    const getConfigEstado = (estado:string): {color: ColorEstado, label: string} => {
        switch(estado){
            case "Pendiente": return {color:"orange", label:"Pendiente"};
            case "Aprobada":
            case "Aprobado": return {color:"green", label: "Aprobado"};
            case "Rechazado": return {color:"red", label: "Rechazado"};
            default: return {color:"gray", label: estado};
        }
    }

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
    

    //REGISTRAR SUSTITUTO
    const [dialogoSustituto, setDialogoSustituto] = useState<boolean>(false);
    const [datosSustituto, setDatosSustituto] = useState <{correo:string}> ({correo:""});
    const [solicitudEditada, setSolicitudEditata] = useState<number | string | null>(null);


    const abrirDialogoSustituto =(idSolicitud:number | string) =>{
        setDatosSustituto({correo:""});
        setSolicitudEditata(idSolicitud);
        setDialogoSustituto(true);
    }

    const confirmarRegistrarSustituto = async () =>{
        if(solicitudEditada === null){
            toast.error("Selecciona una solicitud");
            return;
        }

        if(!datosSustituto.correo){
            toast.error("Por favor, rellena todos los campos");
            return;
        }
        empezarTransicion(async () => {
            try{
                const resultado = await registrarSustituto(solicitudEditada.toString(), datosSustituto.correo);
                if(resultado.exito){
                    setDialogoSustituto(false);
                    toast.success(resultado.mensaje);
                }else{
                    toast.error(resultado.mensaje);
                }
            }catch(error){
                toast.error("Error al registrar el sustituto");
            }
        })
    }

    

    return(
        <Box p="6">
            <Heading size="6" mb="5" style={{color:"#1F2937"}}>Gestor Solicitudes</Heading>
            {/*TABLA DE CONTENIDOS*/}
            <Card size="4" style={{padding: "0", boxShadow:"0 apx 6px -1px rgba(0,0,0,0.1)" }}>

                <Table.Root variant="surface">
                    <Table.Header style={{backgroundColor: "#E0F2FE"}}>
                        <Table.Row>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>TIPO</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>FECHAS</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>ESTADO</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>ACCIONES</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>SOLICITANTE</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>SUSTITUTO</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell style={{color:"#4B5563"}}>TIEMPO RESTANTE</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {solicitudes.map((solicitud => {
                            const config = getConfigEstado(solicitud.estado);
                            return(
                                //FILA POR SOLICITUD
                                <Table.Row key={solicitud.id} align="center">

                                    <Table.Cell>
                                        <Text weight= "medium">{solicitud.tipo}</Text>
                                    </Table.Cell>

                                    <Table.Cell>{solicitud.fechas}</Table.Cell>

                                    <Table.Cell>
                                        <Badge color={config.color} variant="soft">
                                            {config.label}
                                        </Badge>
                                    </Table.Cell>

                                    <Table.Cell>
                                        {solicitud.estado == "Pendiente" ? (
                                            <Flex gap="2">
                                                <Button 
                                                 size="1"
                                                 variant="solid"
                                                 color="green"
                                                 style={{cursor:"pointer"}}
                                                 onClick={() => confirmarGestionarSolicitud(solicitud.id, "Aprobada")}
                                                 disabled={estaPendiente}
                                                 >
                                                    <CheckIcon/>
                                                 </Button>
                                                
                                                <Button
                                                    size="1"
                                                    variant="solid"
                                                    color="red"
                                                    style={{cursor:"pointer"}}
                                                    onClick={() => confirmarGestionarSolicitud(solicitud.id, "Rechazado")}
                                                    disabled={estaPendiente}
                                                >
                                                    <Cross2Icon/>
                                                </Button>
                                            </Flex>
                                        ) : (
                                            <Text size="1" color="gray">-</Text>
                                        )}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Text weight="bold">{solicitud.solicitante}</Text>
                                    </Table.Cell>
                                    

                                    <Table.Cell>
                                        {/*Si esta aprobada bien hay que registrarlo o bien se puede modificar el añadido*/}
                                        {solicitud.estado === "Aprobado" || solicitud.estado === "Aprobada" ? (
                                            <Flex 
                                                align="center"
                                                gap="2" 
                                                style={{cursor:"pointer"}}
                                                onClick={() => abrirDialogoSustituto(solicitud.id)}
                                            >
                                                {solicitud.sustituto === "Registrar Sustituto" ? (
                                                    <Text size="2" color="gray">
                                                        Registrar...
                                                    </Text>
                                                ): (
                                                    <Flex align="center" gap="2">
                                                        <Avatar size="1" radius="full" fallback={<PersonIcon/>} color="indigo" />
                                                        <Text size="2">{solicitud.sustituto}</Text>
                                                    </Flex>
                                                )}
                                            </Flex>
                                        ) : (
                                            <Text size="2" color="gray">N/A</Text>
                                        )}
                                    </Table.Cell>
                                    
                                    <Table.Cell>
                                        {solicitud.estado === "Pendiente" ? (
                                            <Flex align="center" gap="1">
                                                <ClockIcon color="gray"/>
                                                <Text size="2" color="gray">{solicitud.tiempoRestante}</Text>
                                            </Flex>
                                        ): (
                                            <Text color="gray">-</Text>
                                        )}</Table.Cell>
                                </Table.Row>
                            );
                        }))}
                    </Table.Body>
                </Table.Root>
            </Card>

            {/*DIALOGO DE REGISTRAR SUSTITUTO*/}
            <Dialog.Root open={dialogoSustituto} onOpenChange={setDialogoSustituto}>
                <Dialog.Content style={{maxWidth: 500}}>
                    <Dialog.Title align="center" size="5" weight="bold" mb="5">
                        Registrar Sustituto
                    </Dialog.Title>

                    <Text as="div" size="3" weight="bold" mb="4">
                        Datos Personales
                    </Text>

                    {/*Contenedor de nombre y correo*/}
                    <Flex direction="column" gap="4">
                        {/*Correo*/}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width: "140px"}}>
                                Correo Corporativo:
                            </Text>
                            <TextField.Root 
                                variant="soft"
                                placeholder="Ej: julca@gmail.com"
                                style={{flex:1}}
                                value={datosSustituto.correo}
                                onChange={(e) => setDatosSustituto({...datosSustituto, correo:e.target.value})}
                            />
                        </Flex>

                        {/*Boton de añadir*/}
                        <Flex justify="center" mt="4">
                            <Button
                             size="3"
                             onClick={confirmarRegistrarSustituto}
                             style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "150px" }}
                             disabled={estaPendiente}
                            >
                                {estaPendiente ? "Añadiendo..." : "Añadir"}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>


    );

}