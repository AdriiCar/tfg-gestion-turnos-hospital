"use client"

import { CheckIcon, ClockIcon, Cross2Icon, PersonIcon } from "@radix-ui/react-icons";
import {Box, Heading, Table, Text, Card, Badge, Flex, Button, Avatar, Dialog, TextField, Callout } from "@radix-ui/themes";
import { formatDistanceToNow, format, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { es } from "date-fns/locale";
import { InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";

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


export default function DashboardSolicitudes(){

    const[solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

    //cargamos todas las solicitudes iniciales
    useEffect(() => {   
        fetch("/api/solicitudes", {cache: 'no-store'})
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (Array.isArray(datos)) {
                const solicitudesMapeadas = datos.map((sol: any) => ({
                    id: sol._id,
                    tipo: sol.tipoDia,
                    fechas: formatearRangoFechas(sol.fechaInicio, sol.fechaFin),
                    estado: sol.estado,
                    solicitante: `${sol.usuarioId.nombre} ${sol.usuarioId.apellido}`,
                    tiempoRestante: formatDistanceToNow(new Date(sol.fechaSolicitud), { addSuffix: true, locale: es}),
                    sustituto: sol.sustitutoNombre || (sol.estado === "Aprobado" || sol.estado === "Aprobada" ? "Registrar Sustituto" : undefined),
                    fechaInicio: sol.fechaInicio,
                    solicitanteRaw: `${sol.usuarioId.nombre} ${sol.usuarioId.apellido}`
                }));
                
                setSolicitudes(solicitudesMapeadas);
            }
        })
        .catch(error => console.error("Error al cargar solicitudes:", error));
    }, []);

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

    /*
    const formatearRangoFechas = (inicio: string, fin: string) => {
        const fechaIn = new Date(inicio).toLocaleDateString("es-ES", { day: 'numeric', month: 'short' });
        const fechaFi = new Date(fin).toLocaleDateString("es-ES", { day: 'numeric', month: 'short' });
        return fechaIn === fechaFi ? fechaIn : `${fechaIn} - ${fechaFi}`;
    };
    */
    const formatearRangoFechas = (inicio: string, fin: string) => {
        const fechaIn = format(startOfDay(new Date(inicio)), "d MMM", { locale: es });
        const fechaFi = format(startOfDay(new Date(fin)), "d MMM", { locale: es });
        return fechaIn === fechaFi ? fechaIn : `${fechaIn} - ${fechaFi}`;
    };

    //APROBAR O RECHAZAR SOLICITUD
    const gestionarSolicitud = async (id:number | string, accion:string) => {
        try{
            const respuesta = await fetch(`/api/solicitudes?id=${id}`,{
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({estado:accion})
            });

            if(respuesta.ok){
                const nuevasSolicitudes = solicitudes.map(sol => {
                if (sol.id === id) {

                    return{
                        ...sol,
                        estado: accion,
                        tiempoRestante: undefined,
                        sustituto: accion === "Aprobada" || accion === "Aprobado" ? "Registrar Sustituto" : undefined
                    };
                }
                return sol;
                })
                setSolicitudes(nuevasSolicitudes);
                setMensaje({texto:`Solicitud marcada como ${accion} exitosamente.`, tipo: "exito"});
            }else{
                setMensaje({texto: "Error al actualizar el estado de la solicitud", tipo: "error"});
            }
        }catch(error){
            setMensaje({texto:"Error en la conexión",tipo:"error"})
        }
    }
    

    //REGISTRAR SUSTITUTO
    const [dialogoSustituto, setDialogoSustituto] = useState<boolean>(false);
    const[datosSustituto, setDatosSustituto] = useState <{nombre: string, correo:string}> ({nombre:"", correo:""});
    const [solicitudEditada, setSolicitudEditata] = useState<number | string | null>(null);


    const abrirDialogoSustituto =(idSolicitud:number | string) =>{
        setDatosSustituto({nombre:"", correo:""});
        setSolicitudEditata(idSolicitud);
        setDialogoSustituto(true);
    }

    const registrarSustituto = async () =>{
        if(solicitudEditada === null) return;

        if(!datosSustituto.nombre || !datosSustituto.correo){
            setMensaje({texto: "Por favor completa todos los campos", tipo:"error"});
            return;
        }
        try{
            const solicitudActual = solicitudes.find(s => s.id === solicitudEditada);

            const respuesta = await fetch(`/api/sustituciones`,{
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                fecha: solicitudActual?.fechaInicio || new Date().toISOString(),
                turno: "M", 
                sustituido: solicitudActual?.solicitanteRaw,
                sustitutoNombre: datosSustituto.nombre, 
                sustitutoCorreo: datosSustituto.correo,
                solicitudId: solicitudEditada
            })
            });

            if(respuesta.ok){
                const nuevasSolicitudes = solicitudes.map(sol => {
                //si coincide cambiamos los datos del sustituto sino lo dejamos tal cual
                if(sol.id == solicitudEditada){
                    return {
                        ...sol,
                        sustituto: datosSustituto.nombre
                    };
                }
                return sol;
                })
                setSolicitudes(nuevasSolicitudes);
                setMensaje({texto: "Sustituto registrado con éxito", tipo:"exito"});
            }else{
                setMensaje({texto:"El sustituto no puedo ser registrado", tipo:"error"});
            }       
        }catch(error){
            setMensaje({texto: "Fallo al conectar con el servidor", tipo: "error"});
        }finally{
             setDialogoSustituto(false);    
        }
    }

    

    return(
        <Box p="6">
            <Heading size="6" mb="5" style={{color:"#1F2937"}}>Gestor Solicitudes</Heading>
            {mensaje && (
                <Box mb="5">
                    <Callout.Root color={mensaje.tipo === "error" ? "red" : "green"} variant="soft">
                        <Callout.Icon>
                            {mensaje.tipo === "error" ? <InfoCircledIcon /> : <CheckCircledIcon />}
                        </Callout.Icon>
                        <Callout.Text>
                            {mensaje.texto}
                        </Callout.Text>
                    </Callout.Root>
                </Box>
            )}
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
                                                 onClick={() => gestionarSolicitud(solicitud.id, "Aprobada")}
                                                 >
                                                    <CheckIcon/>
                                                 </Button>
                                                
                                                <Button
                                                    size="1"
                                                    variant="solid"
                                                    color="red"
                                                    style={{cursor:"pointer"}}
                                                    onClick={() => gestionarSolicitud(solicitud.id, "Rechazado")}
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

                        {/*Nombre*/}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width: "140px"}}>
                                Nombre y Apellidos:
                            </Text>
                            <TextField.Root 
                                variant="soft"
                                placeholder="Ej: Julio Cañizares Pozo"
                                style={{flex:1}}
                                value={datosSustituto.nombre}
                                onChange={(e) => setDatosSustituto({...datosSustituto, nombre:e.target.value})}
                            />
                        </Flex>

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
                             onClick={registrarSustituto}
                             style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "150px" }}
                            >
                                Añadir
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>


    );

}