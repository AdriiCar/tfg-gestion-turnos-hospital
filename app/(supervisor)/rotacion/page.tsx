"use client"

import { Box, Flex, Heading, Text, Card, Button, Badge, Separator, Grid, Dialog, TextField, Callout } from "@radix-ui/themes";
import { PlusIcon, Pencil1Icon, TrashIcon, MixerHorizontalIcon, Cross1Icon, InfoCircledIcon, PlayIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";


type tipoTurno = "M" | "N" | "L";

type colorRadix = "orange" | "blue" | "green";

//INTERFACES

interface Empleado {
    id: string;
    nombre: string;
    correo: string;
}

interface Patron {
    id: string;
    nombre: string;
    secuencia: tipoTurno[];
}

interface GrupoRotacion {
    id: string;
    nombre: string;
    patronId: string; 
    diaInicio: number;
    empleados: Empleado[];
}


const getConfiTurno = (turno: tipoTurno): { color: colorRadix, label: string, fondo: string } => {
    if (turno === "M") return { color: "orange", label: "M", fondo: "#FEF3C7" };
    if (turno === "N") return { color: "blue", label: "N", fondo: "#DBEAFE" };
    return { color: "green", label: "L", fondo: "#D1FAE5" };
}

export default function DashboardRotacion(){

    //contendra los mensajes que salen por la pantalla
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

    //estados principales
    const [patrones, setPatrones] = useState<Patron[]>([]);
    const [grupos, setGrupos] = useState<GrupoRotacion[]>([]);


    //contendra los datos de configuración de personal
    const [duracionM, setDuracionM] = useState("12");
    const [duracionN, setDuracionN] = useState("10");
    const [cobEnfM, setCobEnfM] = useState("3");
    const [cobEnfN, setCobEnfN] = useState("2");
    const [cobAuxM, setCobAuxM] = useState("2");
    const [cobAuxN, setCobAuxN] = useState("1");

    //Añadir, Editar y borrar patrón
    const [dialogoPatron, setDialogoPatron] = useState<boolean>(false);
    const [dialogoBorrarPatron, setDialogoBorrarPatron] = useState<boolean>(false);

    //el id del patron a borrar o editar
    const [patronEditadoId, setPatronEditadoId] = useState<string | null>(null);
    const [patronBorrarId, setPatronBorrarId] = useState<string | null> (null);

    const [datosPatron, setDatosPatron] = useState<{nombre: string, longitud: string, secuencia: tipoTurno[]}>({nombre: "", longitud: "5", secuencia: ["L", "L", "L", "L", "L"]})

    //Logica de grupo de patrones
    const [dialogoAñadir, setDialogoAñadir] = useState<boolean>(false);
    const [datosUsuario, setDatosUsuario] = useState({nombre: "", correo: ""});
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null);


    //para generar el algoritmo
    const [dialogoGenerar, setDialogoGenerar] = useState<boolean>(false);


//CARGAR LAS CONFIGURACIONES DE LA BD
    const cargarConfiguracion = async () => {
        try {
            const respuesta = await fetch("/api/configuracion");
            const datos = await respuesta.json();
            
            if (datos && !datos.error) {
                setDuracionM(datos.parametrosGlobales?.horasTurnoM?.toString() || "12");
                setDuracionN(datos.parametrosGlobales?.horasTurnoN?.toString() || "10");
                
                setCobEnfM(datos.coberturaPlanta?.mañana?.enfermeros?.toString() || "3");
                setCobAuxM(datos.coberturaPlanta?.mañana?.auxiliares?.toString() || "2");
                setCobEnfN(datos.coberturaPlanta?.noche?.enfermeros?.toString() || "2");
                setCobAuxN(datos.coberturaPlanta?.noche?.auxiliares?.toString() || "1");

                if (datos.patronesBase && datos.patronesBase.length > 0) {
                    const patronesCargados = datos.patronesBase.map((p: any) => ({
                        id: p.id, 
                        nombre: p.nombre,
                        secuencia: p.secuencia
                    }));
                    setPatrones(patronesCargados);
                } else {
                    setPatrones([]);
                }
            }
        } catch (err) {
            console.error("Error al cargar configuración:", err);
        }
    };

//CARGAR LAS ROTACIONES DE LA BD
    const cargarRotaciones = async () => {
        try {
            const respuesta = await fetch("/api/rotaciones");
            const datos = await respuesta.json();
            if(Array.isArray(datos)){
                const gruposMapeados = datos.map((grupo: any) => ({
                    id: grupo._id,
                    nombre: grupo.nombre,
                    patronId: grupo.patronBaseId,
                    diaInicio: grupo.diaDesfase,
                    empleados: grupo.empleados.map((empleado: any) => ({
                        id: empleado._id,
                        nombre: `${empleado.nombre} ${empleado.apellido}`,
                        correo: empleado.correo
                    }))
                }));
                setGrupos(gruposMapeados);
            }  
        } catch (err) {
            console.error("Error al cargar rotaciones:", err);
        }
    };

//CARGA INICIAL DE DATOS
    useEffect(() => {
        cargarConfiguracion();
        cargarRotaciones();
    }, []);

//ALMACENA LOS DATOS DE CONFIGURACION NUEVOS
    const guardarConfig = async (patronesActualizados: Patron[], mensajePersonalizado: string) => {
        const datos = {
            parametrosGlobales: {
                horasTurnoM: Number(duracionM),
                horasTurnoN: Number(duracionN)
            },
            coberturaPlanta: {
                mañana: {enfermeros: Number(cobEnfM), auxiliares: Number(cobAuxM)},
                noche: {enfermeros: Number(cobEnfN), auxiliares: Number(cobAuxN)}
            },
            patronesBase: patronesActualizados.map(p => ({
                id: p.id,
                nombre: p.nombre,
                secuencia: p.secuencia
            }))
        };

        try {
            const respuesta = await fetch("/api/configuracion", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            })
            if(respuesta.ok){
                await cargarConfiguracion(); 
                setMensaje({texto:mensajePersonalizado , tipo: "exito"});
            }
            else {
                setMensaje({texto: "Fallo al actualizar los cambios de configuracion", tipo: "error"});
            }
        }catch(error){
            setMensaje({texto: "Error en la conexión con el servidor", tipo: "error"});
        }
    }


//PANEL DE CREACION DEL PATRON
    const abrirCrearPatron = () => {
        setPatronEditadoId(null);
        setDatosPatron({nombre: "", longitud: "5", secuencia: ["L", "L", "L", "L", "L"]})
        setDialogoPatron(true);
    };

//PANEL DE EDICION DE PATRON
    const abrirEditarPatron = (patron:Patron) => {
        setPatronEditadoId(patron.id);
        setDatosPatron({nombre: patron.nombre, longitud: patron.secuencia.length.toString(), secuencia:[...patron.secuencia]});
        setDialogoPatron(true);
    };

//PARA ABRIR EL DIALOGO DE BORRAR PATRON
    const confirmarBorrarPatron = (id:string) => {
        setPatronBorrarId(id);
        setDialogoBorrarPatron(true);
    };

//LOGICA DE BORRAR PATRON
    const borrarPatron = async() => {
         if (patronBorrarId !== null) {
            try{
                const respuesta = await fetch("/api/rotaciones", {
                    method: "DELETE",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({patronId: patronBorrarId})
                });
                if(respuesta.ok){
                    const nuevosPatrones = patrones.filter(p => p.id !== patronBorrarId);
                    await guardarConfig(nuevosPatrones, "Patrón eliminado correctamente");
                    await cargarRotaciones(); 
                }else{
                    setMensaje({texto: "El patron no ha podido eliminarse", tipo:"error"});
                }
            }catch(error){
                setMensaje({texto:"Fallo en el servidor", tipo:"error"});
            }finally{
                setDialogoBorrarPatron(false);
                setPatronBorrarId(null);
            }
        }
    };

//CAMBIO DE LONGITUD DE UN PATRON EN CREACION O EDICION
    const actualizarLongitudPatron = (valor: string) => {
        const nuevaLongitud = parseInt(valor);
        setDatosPatron(prev => {
            const nuevaSecuencia = [...prev.secuencia];
            if (!isNaN(nuevaLongitud) && nuevaLongitud > 0 && nuevaLongitud <= 14) {
                if (nuevaLongitud > nuevaSecuencia.length) {
                    while (nuevaSecuencia.length < nuevaLongitud) nuevaSecuencia.push("L");
                } else {
                    nuevaSecuencia.length = nuevaLongitud;
                }
            }
            return { ...prev, longitud: valor, secuencia: nuevaSecuencia };
        });
    };

//GUARDAMOS LOS CAMBIOS O CREAMOS UN NUEVO PATRON
     const guardarPatron = async () => {
        if (!datosPatron.nombre) {
            setMensaje({texto: "Por favor, dale un nombre al patrón", tipo: "error"});
            return;
        }
        let mensajePersonalizado;
        let nuevosPatrones;
        
        if (patronEditadoId === null) {
            const nuevoPatron: Patron = { id: crypto.randomUUID(), nombre: datosPatron.nombre, secuencia: datosPatron.secuencia };
            nuevosPatrones = [...patrones, nuevoPatron];
            mensajePersonalizado = "Patrón creado correctamente";
        } else {
            nuevosPatrones = patrones.map(p => p.id === patronEditadoId ? { ...p, nombre: datosPatron.nombre, secuencia: datosPatron.secuencia } : p);
            mensajePersonalizado = "Patron modificado con éxito"
        }
        
        await guardarConfig(nuevosPatrones, mensajePersonalizado);
        setDialogoPatron(false);
    };



//PARA ESTABLECER EL PATRON DE UN GRUPO
    const calcularPatronRotatorio = (secuencia: tipoTurno[], diaInicio: number): tipoTurno[] => {
        const inicioFijo = diaInicio % secuencia.length;
        const inicioPatron = secuencia.slice(inicioFijo);
        const finPatron = secuencia.slice(0, inicioFijo);
        return [...inicioPatron, ...finPatron];
    };

//DIALOGO DE AÑADIR USUARIO
    const abrirDialogoUsuario = (idGrupo: string) => {
        setGrupoSeleccionado(idGrupo);
        setDatosUsuario({nombre:"", correo:""});
        setDialogoAñadir(true);
    }

//LOGICA PARA CAMBIAR EL PATRON(si seleccionas una caja va rotando el turno)
    const ciclarTurnoPatron = (indice: number) => {
    setDatosPatron(prev => {
        const nuevaSecuencia = [...prev.secuencia];
        const actual = nuevaSecuencia[indice];
        nuevaSecuencia[indice] = actual === "M" ? "N" : actual === "N" ? "L" : "M";
        return { ...prev, secuencia: nuevaSecuencia };
    });
    }

//AÑADMOS A UN USUARIO A UN GRUPO
    const añadirUsuario = async () => {
        if(!datosUsuario.nombre || !datosUsuario.correo){
            setMensaje({texto: "Completa todos los campos", tipo: "error"});
            return;
        } 
        try{
            const respuesta = await fetch("/api/rotaciones",{
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    grupoId: grupoSeleccionado,
                    correo: datosUsuario.correo
                })
            });
            
            if(respuesta.ok){
                await cargarRotaciones(); 
                setMensaje({texto: "Usuario añadido al grupo con éxito", tipo: "exito"});
            }else{
                setMensaje({texto:"No se pudo añadir el usuario", tipo:"error"});
            }
        }catch(error){
            setMensaje({texto:"El usuario no existe o error de conexión", tipo:"error"});
        }finally{
            setDialogoAñadir(false);
        }
    }


//ELIMINAMOS A UN USUARIO DE UN GRUPO
    const quitarUsuario = async(idGrupo: string, idEmpleado: string) => {
        try{
            const respuesta = await fetch("/api/rotaciones", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({grupoId: idGrupo, empleadoId: idEmpleado})
            });

            if(respuesta.ok){
                await cargarRotaciones(); 
                setMensaje({texto: "Usuario eliminado del grupo", tipo:"exito"});
            }
            else{
                setMensaje({texto: "No se pudo eliminar al usuario", tipo: "error"});
            }
        }catch(error){
            setMensaje({texto: "Fallo en la conexion con el servidor", tipo: "error"});
        }
    }


//COMPROBAMOS SI SE PUEDE EJECUTAR EL ALGORITMO
    const abrirResumenGeneracion = () => {
        if(patrones.length === 0){
            setMensaje({texto: "No hay ningun patron creado", tipo: "error"});
            return;
        }
        setDialogoGenerar(true);
    };




    
    return (
        <Box p= "6">
            <Heading size="6" mb="5" style={{color: "#1F2937"}}>Motor de Rotaciones Anuales</Heading>

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

            {/*Seccion 1: Inputs Algoritmo*/}
            <Grid columns={{initial:"1", md:"2"}} gap="6" mb="6">

                {/*Panel izquierda: Numero de horas y cobertura por turno*/}
                <Card size="3" style={{boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Heading size="4" mb="4" style={{color: "#4B5563"}}>Parámetros y Cobertura</Heading>
                    <Text size="2" color="gray" mb="4" as="div">
                        Define la duración de los turnos y la cobertura diaria de los mismos.
                    </Text>

                    <Flex direction="column" gap="4">
                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="bold" mb="1" as="div" color="gray">Horas Turno (M):</Text>
                                <TextField.Root
                                 type="number"
                                 variant="surface" 
                                 value={duracionM} 
                                 onChange={(e) => setDuracionM(e.target.value)}
                                 onBlur={() => guardarConfig(patrones, "Nuevo horario de mañana confirmado")}
                                />
                            </Box>
                             <Box>
                                <Text size="2" weight="bold" mb="1" as="div" color="gray">Horas Turno (N):</Text>
                                <TextField.Root 
                                type="number" 
                                variant="surface" 
                                value={duracionN} 
                                onChange={(e) => setDuracionN(e.target.value)}
                                onBlur={() => guardarConfig(patrones, "Nuevo horario de noche confirmado")}
                                />
                            </Box>
                        </Grid>


                        <Separator size="4" style={{opacity: 0.5}}/>

                        <Box>
                            <Text size="2" weight="bold" mb="2" as="div" color="gray">Cobertura Mínima Requerida:</Text>
                            <Flex direction="column" gap="2">
                                <Grid columns="3" gap="2" align="center" style={{ backgroundColor: "#FEF08A", padding: "12px", borderRadius: "6px" }}>
                                    <Text size="3" weight="bold" style={{color: "#000"}}>Mañana</Text>
                                    <Flex align="center" gap="2">
                                        <TextField.Root 
                                        size="2" 
                                        value={cobEnfM} 
                                        onChange={(e) => setCobEnfM(e.target.value)}
                                        onBlur={() => guardarConfig(patrones, "Número de enfermeros de mañana actualizado")}
                                        />
                                        <Text size="2" style={{color:"#000"}}>Enf</Text>
                                    </Flex>
                                    <Flex align="center" gap="2">
                                        <TextField.Root 
                                        size="2" 
                                        value={cobAuxM} 
                                        onChange={(e) => setCobAuxM(e.target.value)}
                                        onBlur={() => guardarConfig(patrones, "Número de auxiliares de mañana actualizado")}
                                        />
                                        <Text size="2" style={{color:"#000"}}>Aux</Text>
                                    </Flex>
                                </Grid>

                                 <Grid columns="3" gap="2" align="center" style={{ backgroundColor: "#4F86D9", padding: "12px", borderRadius: "6px" }}>
                                    <Text size="3" weight="bold" style={{color: "#000"}}>Noche</Text>
                                    <Flex align="center" gap="2">
                                        <TextField.Root 
                                        size="2" 
                                        value={cobEnfN} 
                                        onChange={(e) => setCobEnfN(e.target.value)}
                                        onBlur={() => guardarConfig(patrones, "Número de enfermeros de noche actualizado")}
                                        />
                                        <Text size="2" style={{color:"#000"}}>Enf</Text>
                                    </Flex>
                                    <Flex align="center" gap="2">
                                        <TextField.Root 
                                        size="2" 
                                        value={cobAuxN} 
                                        onChange={(e) => setCobAuxN(e.target.value)}
                                        onBlur={() => guardarConfig(patrones, "Número de auxiliares de noche actualizado")}
                                        />
                                        <Text size="2" style={{color:"#000"}}>Aux</Text>
                                    </Flex>
                                </Grid>
                            </Flex>
                        </Box>

                    </Flex>
                </Card>

                {/*Panel derecha: Lista de patrones*/}
                <Card size="3" style={{boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="4" style={{color:"#4B5563"}}>Patrones Horarios</Heading>
                        <Button variant="soft" size="2" style={{cursor: "pointer"}} onClick={abrirCrearPatron}>
                            <PlusIcon/> Nuevo Patrón
                        </Button>
                    </Flex>

                    <Flex direction="column" gap="3">
                        {patrones.length === 0 && <Text size="2" color="gray">No hay patrones definidos.</Text>}
                        {patrones.map((patron) => (
                            <Box key={patron.id} p="3" style={{border: "1px solid #E5E7EB", borderRadius: "6px"}}>
                                <Flex justify="between" align="center" mb="2">
                                    <Text weight="bold">{patron.nombre} ({patron.secuencia.length} días)</Text>
                                    <Flex gap="3">
                                        <Pencil1Icon color="gray" style={{cursor: "pointer"}} onClick={() => abrirEditarPatron(patron)}/>
                                        <TrashIcon color="red" style={{cursor:"pointer"}} onClick={() => confirmarBorrarPatron(patron.id)}/>
                                    </Flex>
                                </Flex>
                                <Flex gap="1">
                                    {patron.secuencia.map((turno, i) => {
                                        const config = getConfiTurno(turno);
                                        return (
                                            <Badge key={i} variant="solid" color={config.color} style={{width: "30px", justifyContent: "center"}}>
                                                {config.label}
                                            </Badge>
                                        )
                                    })}
                                </Flex>
                            </Box>
                        ))}
                    </Flex>
                </Card>
            </Grid>

            {/*Seccion 2: Boton de activacion del algoritmo*/}
            <Flex justify="center" mb="6">
                <Button size="4" onClick={abrirResumenGeneracion} style={{ backgroundColor: "#0284C7", cursor: "pointer", padding: "0 40px" }}>
                    <MixerHorizontalIcon width="20" height="20" />
                    <Text size="4" weight="bold">Ejecutar Motor y Generar Grupos</Text>
                </Button>
            </Flex>

            {/*Seccion 3: Grupos creados por el algoritmo*/}
            <Card size="4" style={{padding: "30px", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                <Heading size="5" mb="2"> Asignación de Personal</Heading>
                <Text size="2" color="gray" mb="5" as="div">
                    El algoritmo ha establecido los siguientes grupo. Pueden modificarse manualmente.
                </Text> 

                <Flex direction="column" gap="5">
                    {grupos.length === 0 && <Text color="gray">Ejecutar el algoritmo para generar los grupos.</Text>}
                    {grupos.map((grupo) => {
                        const patronBase = patrones.find(p => p.id === grupo.patronId)?.secuencia || [];
                        const patronRotado = calcularPatronRotatorio(patronBase, grupo.diaInicio);
                        return (
                            <Box key={grupo.id}>
                                <Flex align="center" gap="4" mb="3">
                                    <Text weight="bold" size="3" style={{width: "220px"}}>
                                        {grupo.nombre} <Text color="gray" size="2">(Día {grupo.diaInicio + 1})</Text>
                                    </Text>
                                    <Flex gap="2">
                                        {patronRotado.map((turno, indice) => {
                                            const config = getConfiTurno(turno);
                                            return(
                                                <Badge key={indice} variant="soft" color={config.color} style={{width:"35px", justifyContent:"center", fontWeight: "bold"}}>
                                                    {config.label}
                                                </Badge>
                                            );
                                        })}
                                    </Flex>
                                </Flex>

                                <Flex justify="between" align="end">
                                    <Box>
                                        <Text size="2" color="gray" mb="2" as="div">Empleados Asignados:</Text>
                                        <Flex gap="2" wrap="wrap" style={{maxWidth: "600px"}}>
                                            {grupo.empleados.map((usuario) => (
                                                <Badge key={usuario.id} size="3" style={{ backgroundColor: "#FDE68A", color: "#78350F", padding: "8px 15px", borderRadius: "8px" }}>
                                                    {usuario.nombre}
                                                    <Cross1Icon 
                                                        style={{ marginLeft: "8px", cursor: "pointer" }} 
                                                        onClick={() => quitarUsuario(grupo.id, usuario.id)} 
                                                    />
                                                </Badge>
                                            ))}
                                            {grupo.empleados.length === 0 && <Text size="2" color="red">Grupo sin asignaciones</Text>}
                                        </Flex>
                                    </Box>

                                    <Button size="3" variant="soft" onClick={() => abrirDialogoUsuario(grupo.id)} style={{cursor: "pointer"}}>
                                        <PlusIcon /> Añadir Empleado
                                    </Button>
                                </Flex>

                                {grupo.id !== grupos[grupos.length-1]?.id && (
                                    <Separator size="4" my="5" style={{opacity: 0.5}}/>
                                )}
                            </Box>

                        );

                    })}
                </Flex>
            </Card>

            {/*DIALOGOS*/}

            {/*Dialogo confirmar datos para el algoritmo*/}
            <Dialog.Root open={dialogoGenerar} onOpenChange={setDialogoGenerar}>
                <Dialog.Content style= {{maxWidth: 400}}>
                    <Dialog.Title size="5" mb="3">Confirmar Ejecución</Dialog.Title>
                    <Text size="3" mb="4" as="div">
                        Se enviarán los siguientes datos al algoritmo:
                    </Text>

                    <Callout.Root color="blue" variant="soft" mb="4">
                        <Callout.Text>
                            <strong>Horas:</strong> Mañana ({duracionM}h) - Noche ({duracionN}h) <br/>
                            <strong>Cobertura Mañana:</strong> {cobEnfM} Enf / {cobAuxM} Aux <br/>
                            <strong>Cobertura Noche:</strong> {cobEnfN} Enf / {cobAuxN} Aux <br/>
                            <strong>Patrones base:</strong> {patrones.length} seleccionados.
                        </Callout.Text>
                    </Callout.Root>

                    <Flex justify="end" gap="3" mt="5">
                        <Button variant="soft" color="gray" onClick={() => setDialogoGenerar(false)} style={{ cursor: "pointer" }}>
                            Cancelar
                        </Button>
                        <Button style={{ backgroundColor: "#0284C7", cursor: "pointer", minWidth: "120px" }} onClick={() => setDialogoGenerar(false)}>
                            <PlayIcon/> Ejecutar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>


            {/*Dialogo crear o modificar patron*/}
            <Dialog.Root open={dialogoPatron} onOpenChange={setDialogoPatron}>
                <Dialog.Content style={{maxWidth: 500}}>
                    <Dialog.Title size="5" mb="4">
                        {patronEditadoId === null ? "Crear Nuevo Patrón" : "Editar Patrón"}
                    </Dialog.Title>

                    <Grid columns="2" gap="4" mb="5">
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Nombre:</Text>
                            <TextField.Root variant="surface" value={datosPatron.nombre} onChange={(e) => setDatosPatron({...datosPatron, nombre: e.target.value})}/>
                        </Box>
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Días de longitud:</Text>
                            <TextField.Root variant="surface" value={datosPatron.longitud}  onChange={(e) => actualizarLongitudPatron(e.target.value)} />
                        </Box>  
                    </Grid>

                    <Text size="2" weight="bold" mb="3" as="div">Define la secuencia (Pulsa para cambiar M/N/L):</Text>
                    <Flex gap="2" wrap="wrap" mb="6" style={{ backgroundColor: "#F9FAFB", padding: "15px", borderRadius: "8px" }}>
                        {datosPatron.secuencia.map((turno, indice) => {
                            const config = getConfiTurno(turno);
                            return(
                                <Flex key={indice} direction="column" align="center" gap="1">
                                    <Text size="1" color="gray">Día {indice + 1}</Text>
                                    <Badge
                                        size="3" variant="solid" color={config.color}
                                        style={{ width: "40px", height: "40px", display: "flex", justifyContent: "center", cursor: "pointer", userSelect: "none" }}
                                        onClick={() => ciclarTurnoPatron(indice)}
                                    >
                                        {config.label}
                                    </Badge> 
                                </Flex>
                            );
                        })}
                    </Flex>
                    <Flex justify="end" gap="3">
                        <Dialog.Close><Button variant="soft" color="gray" style={{cursor: "pointer"}}>Cancelar</Button></Dialog.Close>
                        <Button onClick={guardarPatron} style={{ backgroundColor: "#0088CC", cursor: "pointer" }}>Guardar Patrón</Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo borrar patron*/}
            <Dialog.Root open={dialogoBorrarPatron} onOpenChange={setDialogoBorrarPatron}>
                <Dialog.Content style={{maxWidth: 400}}>
                    <Dialog.Title size="5" mb="2" weight="bold" color="red">Eliminar Patrón</Dialog.Title>
                    <Text size="3" mb="6" as="p">
                        ¿Seguro que quieres eliminar este patrón? Los grupos que lo estén usando también desaparecerán. Esta acción no se puede deshacer.
                    </Text>
                    <Flex gap="3" justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" style={{cursor: "pointer"}}>Cancelar</Button>
                        </Dialog.Close>
                        <Button color="red" style={{ cursor: "pointer", backgroundColor: "#DC2626" }} onClick={borrarPatron}>
                            Sí, Eliminar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo añadir usuario*/}
            <Dialog.Root open={dialogoAñadir} onOpenChange={setDialogoAñadir}>
                <Dialog.Content style={{maxWidth: 400}}>
                    <Dialog.Title size="5" mb="4">Asignar Empleado a Grupo</Dialog.Title>
                     <Flex direction="column" gap="4">
                        <Text size="2">Nombre del empleado:</Text>
                        <TextField.Root variant="surface" placeholder="Ej: Lucas Ramírez" value={datosUsuario.nombre} onChange={(e) => setDatosUsuario({ ...datosUsuario, nombre: e.target.value })} />
                        <Text size="2">Correo del empleado:</Text>
                        <TextField.Root variant="surface" placeholder="Ej: Lucasra@gmail.com" value={datosUsuario.correo} onChange={(e) => setDatosUsuario({ ...datosUsuario, correo: e.target.value })} />
                        <Flex justify="end" gap="3" mt="4">
                            <Dialog.Close><Button variant="soft" color="gray" style={{cursor: "pointer"}}>Cancelar</Button></Dialog.Close>
                            <Button onClick={añadirUsuario} style={{ cursor: "pointer", backgroundColor: "#0088CC" }}>Asignar</Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>


    );
}