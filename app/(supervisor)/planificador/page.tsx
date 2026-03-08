"use client"

import { Box, Flex, Heading, Text, Card, Button, Table, Badge, Dialog, RadioGroup, TextField, Switch, Grid, Separator, Checkbox, Slider, Callout } from "@radix-ui/themes";
import { CaretDownIcon, CheckCircledIcon, ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {useEffect, useState} from "react";
import { BackpackIcon, MoonIcon, SunIcon } from "lucide-react";
import { format, startOfDay, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";

//INTERFACES
interface Empleado {
    id: string;
    nombre: string;
    turnos: string[];
}

interface Inconsistencia {
    id: string;
    fecha: string;
    turno: string;
    rolAfectado: string;
    tipoIncidencia: string;
    mensaje: string;
}

interface Sustituto {
    id: string;
    fecha: string;
    turno: string;
    sustituido: string;
    sustitutoNombre: string;
    sustitutoCorreo: string;
}

interface SeleccionTurno {
    id: string;
    nombre: string;
    indiceDia: number;
    turnoActual: string;
}


export default function DashboardPlanificador(){


    const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);

    //LOGICA DE FECHAS

    const obtenerFechasSemanaActual = () => {
        const hoy = new Date();
        const lunes = startOfWeek(hoy, { weekStartsOn: 1 });
        const domingo = addDays(lunes, 6); //seis dias mas da al domingo
        
        const diasSemana = []

        for(let i = 0; i < 7; i++){
            const dia = addDays(lunes, i);
            const nombreFormateado = format(dia, "E d", {locale: es}); // E: conseguimos el nombre del dia abreviado a tres letras, lun,  d: el numero del dia del mes
            const nombreCapitalizado = nombreFormateado.charAt(0).toUpperCase() + nombreFormateado.slice(1); // ponemos la primera letra en mayusculo y el resto igual -> Lun 2
            diasSemana.push(nombreCapitalizado);
        }

        let textoSemana = `Semana del ${format(lunes, "d")} al ${format(domingo, "d")} de ${format(domingo, "MMMM", {locale: es})}`;
        if (lunes.getMonth() !== domingo.getMonth()) {
             textoSemana = `Semana del ${format(lunes, "d")} de ${format(lunes, "MMMM", {locale: es})} al ${format(domingo, "d")} de ${format(domingo, "MMMM", {locale: es})}`;
        }

        return { diasSemana, textoSemana };
    }
 /*
    const obtenerFechasSemanaActual = () => {
        const hoy = new Date;
        const diaSemana = hoy.getDay();
        const diferenciaAlLunes = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
        
        const lunes = new Date(hoy.setDate(diferenciaAlLunes));
        
        const nombreDias=["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        const diasSemana = []

        for(let i = 0; i < 7; i++){
            const dia = new Date(lunes);
            dia.setDate(dia.getDate() + i);
            diasSemana.push(`${nombreDias[dia.getDay()]} ${dia.getDate()}`);
        }

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        let textoSemana = `Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${nombresMeses[domingo.getMonth()]}`;
        if (lunes.getMonth() !== domingo.getMonth()) {
             textoSemana = `Semana del ${lunes.getDate()} de ${nombresMeses[lunes.getMonth()]} al ${domingo.getDate()} de ${nombresMeses[domingo.getMonth()]}`;
        }

        return { diasSemana, textoSemana };
    }
*/
    const { diasSemana: diaSemana, textoSemana: semanaMes } = obtenerFechasSemanaActual();

//CARGA INICIAL DE DATOS

    const cargarPlantillas = async () => {
        try {
            fetch("/api/plantillas")
            .then(res => res.json())
            .then(datos => {
                setPlantilla(datos);
            });
        } catch (error) {
            console.error("Error cargando plantillas:", error);
        }
    };

    const cargarIncidencias = async() => {
        try{
            const res = await fetch("/api/incidencias");
            const datos = await res.json();
            if (Array.isArray(datos)) {
                const incidenciasConId = datos.map(inc => ({
                    ...inc,
                    id: inc._id 
                }));
                setListaInconsistencias(incidenciasConId);
            }
        }catch(error){
            console.log("Error cargando lista de incidencias con el servidor", error);
        }
    }

    const cargarSustitutos = async() => {
        try {
            const res = await fetch("/api/sustituciones");
            if (res.ok) {
                const datos = await res.json();
                if (Array.isArray(datos)) {
                     const sustitutosConId = datos.map(sus => ({
                        ...sus,
                        id: sus._id 
                    }));
                    setListaSustitutos(sustitutosConId);
                }
            }
        } catch(error) {
            console.error("Error cargando lista de sustitutos:", error);
        }
    }

    useEffect(() => {
        cargarPlantillas();
        cargarIncidencias();
        cargarSustitutos();
    }, [])

//LOGICA DE CAMBIO DE TURNOS Y BAJAS

    //plantilla actual
    const [plantilla, setPlantilla] = useState<Empleado[]>([]);
    //necesario para saber si la vista del dialogo se abre (la de cambio de turno)
    const [openDialog, setOpenDialog] = useState<boolean>(false); 
    //usuario seleccionado para cambiar el turno
    const [seleccion, setSeleccion] = useState<SeleccionTurno | null> (null);
    //nuevo turno seleccionado
    const [turnoNuevo, setTurnoNuevo] = useState<string>(""); 

    const cambioTurno = (id: string, nombre: string, indiceDia: number, turnoActual: string) => {
        setSeleccion({
            id: id,
            nombre: nombre,
            indiceDia: indiceDia,
            turnoActual: turnoActual
        }); 
        setTurnoNuevo(turnoActual); //inicializamos con los datos actuales
        setOpenDialog(true);
    }

    const guardarCambioTurno = async() => { 
        if(!seleccion){
            setMensaje({texto: "Selecciona un turno para poder cambiar", tipo:"error"});
            return;
        } 

        try{
            const respuesta = await fetch("/api/plantillas", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ //pasamos los datos para modificarlo en la BD
                    usuario_id: seleccion.id,
                    indiceDia: seleccion.indiceDia,
                    nuevoTurno: turnoNuevo
                })
            });

            if(respuesta.ok){
                setMensaje({texto: "Turno actualizado con éxito", tipo:"exito"});
                await cargarPlantillas();
                setOpenDialog(false); 
                await cargarIncidencias(); // Recargamos incidencias porque el motor de reglas puede haber generado una
            }
            else {
                const dataError = await respuesta.json();
                setMensaje({texto: dataError.error || "El turno no ha podido ser actualizao", tipo:"error"});
                setOpenDialog(false);
            }
        }catch(error){
            console.error("Error de conexion", error);
            setMensaje({texto: "Error de conexión con el servidor", tipo:"error"});
        }
    }

    const registrarBaja = async() => {
        if(!seleccion){
            setMensaje({texto: "Selecciona un turno para poder registrar la baja", tipo:"error"});
            return;
        }
        try{
            const respuesta = await fetch("/api/plantillas", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    usuario_id: seleccion.id,
                    indiceDia: seleccion.indiceDia,
                    nuevoTurno: "BAJA"
                })
            });

            if(respuesta.ok){
                setMensaje({texto: "Baja registrada con éxito", tipo:"exito"});
                await cargarPlantillas();
                setOpenDialog(false);
                await cargarIncidencias();
            }
            else {
                const dataError = await respuesta.json();
                setOpenDialog(false);
                setMensaje({texto: dataError.error || "La baja no se pudo registrar", tipo:"error"});
            }
        }catch(error){
            console.error("Error en la conexion", error);
            setMensaje({texto: "Error de conexión con el servidor", tipo:"error"});
        }       
    }


//LOGICA DE SUSTITUCIONES e INCONSISTENCIAS -> si se registra un sustituto se borra la inconsistencia

    //Guarda dinamicamente las sustituciones
    const [listaSustitutos, setListaSustitutos] = useState<Sustituto[]>([]);
    //Guarda dinamicamente las inconsistencias
    const [listaInconsistencias, setListaInconsistencias] = useState<Inconsistencia[]>([]);
    //inconsistencia actual fundamental para saber cual hay que elimiar
    const[inconsistenciaActual, setInconsistenciaActual] = useState<Inconsistencia| null>(null);
    //guardamos los datos del sustituto
    const[datosSustituto, setDatosSustituto] = useState<{nombre:string, correo:string}>({nombre:"", correo:""});
    
   
    //el dialogo inicialmente esta cerrado hasta que no se pulse seleccionar sustituto on se pone a true
    const [openSustitutoDialog, setOpenSustitutoDialog] = useState<boolean>(false);


    const abrirFormularioSustituciones = (inconsistencia:Inconsistencia) => {
        setDatosSustituto({nombre:"" , correo:""}); //reseteamos los datos del sustituto
        setInconsistenciaActual(inconsistencia); //guardamos la inconsistencia
        setOpenSustitutoDialog(true);

    }

    const registrarSustituto = async() => {
        if(!datosSustituto.nombre || !datosSustituto.correo){
            setMensaje({texto: "Introduce todos los datos para poder registrar un sustituto", tipo: "error"});
            return;
        }

        if(inconsistenciaActual){
            try {
                const respuesta = await fetch("/api/sustituciones", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        fecha: inconsistenciaActual.fecha,
                        turno: inconsistenciaActual.turno,
                        sustituido: inconsistenciaActual.rolAfectado || "Personal",
                        sustitutoNombre: datosSustituto.nombre,
                        sustitutoCorreo: datosSustituto.correo,
                        incidenciaId: inconsistenciaActual.id // Aquí enlazamos la incidencia con la API
                    })
                });
                
                if (respuesta.ok) {
                    setOpenSustitutoDialog(false);
                    setMensaje({texto: "Sustituto registrado con éxito", tipo:"exito"});
                    
                    // Al recargar, la incidencia ya no saldrá y el sustituto aparecerá en la tabla
                    await cargarIncidencias();
                    await cargarSustitutos();
                } else {
                    const dataError = await respuesta.json();
                    setOpenSustitutoDialog(false);
                    setMensaje({texto: dataError.error || "El sustituto no se pudo registrar, revisa los datos introducidos", tipo:"error"});
                }
            } catch(error) {
                console.error("Error al registrar sustituto:", error);
                setMensaje({texto: "Error de conexión con el servidor", tipo: "error"});
            }
        }
    }


  
    return(
        //Contenedor de la vista
        <Box p="6">
            <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Planificador</Heading>
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

            {/*Colocamos todos los elementos de la vista en vertical */}
            <Flex direction="column" gap="6" style={{maxWidth: "1100px", margin: "0 auto"}}>

                {/*Lo primero es el calendario*/}
                <Card size="4" style={{padding: "25px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>

                    {/**Cabecera calendario */}
                    <Flex justify="between" align="center" mb="5">
                        <Heading size="4" weight="bold">Plantilla de Personal</Heading>
                        <Text size="3" weight="bold">{semanaMes}</Text>
                    </Flex>

                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Empleado</Table.ColumnHeaderCell>
                                {diaSemana.map((dia) => (
                                    <Table.ColumnHeaderCell key={dia} align="center">{dia}</Table.ColumnHeaderCell>
                                ))}
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {/* Solo mapeamos si plantilla es realmente un Array */}
                            {Array.isArray(plantilla) && plantilla.length > 0 ? (
                                plantilla.map((empleado) => (
                                    <Table.Row key={empleado.id}>
                                        <Table.RowHeaderCell>{empleado.nombre}</Table.RowHeaderCell>
                                        {empleado.turnos.map((turno, index) => (
                                            <Table.Cell key={index} align="center">
                                                {turno && ( 
                                                    <Button 
                                                        variant={turno==="BAJA" ? "solid":"ghost"} 
                                                        color={turno==="BAJA" ? "red":"gray"}
                                                        style={{ cursor: "pointer", fontWeight: "bold" }}
                                                        onClick={() => cambioTurno(empleado.id, empleado.nombre, index, turno)} 
                                                    >
                                                        {turno}
                                                    </Button> 
                                                )}
                                            </Table.Cell>
                                        ))}
                                    </Table.Row>
                                ))
                            ) : (
                                <Table.Row>
                                    <Table.Cell colSpan={8} align="center">
                                        <Text color="gray">Cargando datos o no hay plantillas disponibles...</Text>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                    <Flex justify="end" mt="4">
                        <Button variant="soft" color="gray" style={{ cursor: 'pointer', color: "#374151" }}>
                            Mostrar: [Todos] <CaretDownIcon/> {/*Me falta poner la funcionalidad*/}
                        </Button>
                    </Flex>
                </Card>

                {/*Panel de Inconsistencias*/}
                <Card size="4" style={{padding: "25px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="4" weight="bold">Panel de Inconsistencias</Heading>
                        {/*Numero de errores*/}
                        {listaInconsistencias.length > 0 && (
                            <Badge color="red" variant="solid" radius="full">{listaInconsistencias.length}</Badge> 
                        )}
                    </Flex>

                    <Flex direction="column" gap="3">
                        {listaInconsistencias.length > 0 ? (
                            listaInconsistencias.map((inconsistencia) => (
                               //Un box por cada inconsistencia 
                                <Box 
                                    key={inconsistencia.id}
                                    p="3"
                                    style={{ 
                                        backgroundColor: "#FCA5A5", 
                                        borderRadius: "6px",
                                        borderLeft: "5px solid #DC2626" 
                                    }}
                                >
                                    <Flex justify="between" align="center" wrap="wrap" gap="3">
                                        {/*Texto y el icono*/}
                                        <Flex align="center" gap="2">
                                            <ExclamationTriangleIcon color="#7F1D1D" /> 
                                            <Text weight="bold" style={{ color: "#7F1D1D" }}>
                                                {inconsistencia.mensaje}
                                            </Text>
                                        </Flex>
                                        {/*Boton que permite registrar a un sustituto*/}
                                        <Button 
                                            size="2" 
                                            style={{ 
                                                backgroundColor: "#FCD34D", 
                                                color: "#000",
                                                cursor: "pointer",
                                                fontWeight: "bold"
                                            }}
                                            onClick={() => abrirFormularioSustituciones(inconsistencia)}
                                        >
                                            Registrar Sustituto
                                        </Button>
                                    </Flex>
                                </Box>
                            ))

                        ) : (
                            <Text color="gray"> No se detectaron inconsistencias </Text>
                        )}
                    </Flex>
                </Card>

                {/*Panel donde se registran los sustitutos*/}
                <Card size="4" style={{padding: "25px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Heading size="4" mb="4" weight="bold">Panel de Sustitutos</Heading>

                    {listaSustitutos.length > 0 ? (
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.RowHeaderCell>Día</Table.RowHeaderCell>
                                    <Table.RowHeaderCell>Turno</Table.RowHeaderCell>
                                    <Table.RowHeaderCell>Sustituido (Original)</Table.RowHeaderCell>
                                    <Table.RowHeaderCell>Sustituto (Nuevo)</Table.RowHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {listaSustitutos.map((sustituto) => (
                                    <Table.Row key={sustituto.id}>
                                        <Table.RowHeaderCell>{format(startOfDay(new Date(sustituto.fecha)) , "dd/MM/yyyy")}</Table.RowHeaderCell>
                                        <Table.Cell>{sustituto.turno}</Table.Cell>
                                        <Table.Cell style={{color: "#DC2626"}}>{sustituto.sustituido}</Table.Cell>
                                        <Table.Cell style={{color:"#16A34A"}}>{sustituto.sustitutoNombre}</Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    ) : (
                        <Text color="gray">
                            No se han registrado sustituciones esta semana.
                        </Text>
                    )}
                </Card>
            </Flex>

            <Dialog.Root open={openDialog} onOpenChange={setOpenDialog}>
                    <Dialog.Content style={{maxWidth: 450}}>
                        {/*Titulo dialogo */}
                        <Dialog.Title size="5" mb="4" align="center">
                            {seleccion?.nombre} - {seleccion ? diaSemana[seleccion.indiceDia] : ""} {/*seleccion puede ser null*/}
                        </Dialog.Title>

                        <Text as="div" size="2" mb="4" weight="bold" color="gray">
                            Editar Turno:
                        </Text>
                    
                        <RadioGroup.Root
                            value={turnoNuevo}
                            onValueChange={setTurnoNuevo}
                            style={{marginBottom: "20px"}}
                        >
                            {/*Flex que contendra las opciones*/}
                            <Flex direction="column" gap="3">
                                {/*Primera opcion*/}
                                <Flex align="center" gap="3">
                                    <RadioGroup.Item value="M"/>
                                    <SunIcon color="orange" width="18" height="18"/>
                                    <Text>Mañana</Text>
                                </Flex>
                                 {/*Segunda opcion*/}
                                <Flex align="center" gap="3">
                                    <RadioGroup.Item value="N"/>
                                    <MoonIcon color="blue" width="18" height="18"/>
                                    <Text>Noche</Text>
                                </Flex>
                                 {/*Tercera opcion*/}
                                <Flex align="center" gap="3">
                                    <RadioGroup.Item value="L"/>
                                    <BackpackIcon color="green" width="18" height="18"/>
                                    <Text>Libre</Text>
                                </Flex>
                            </Flex>
                        </RadioGroup.Root>
                    
                    {/*Botones de asignar una baja, guardar o cancelar*/}
                    <Flex justify="between" align="center" mt="6">
                        {/*Boton de baja*/}
                         <Button onClick={registrarBaja} color="red" style={{cursor:"pointer"}}>
                            Registrar ausencia/baja
                         </Button>

                         {/*Botones de cancelar y guardar*/}
                         <Flex gap="3">
                            {/*Boton de cerrar*/}
                            <Dialog.Close>
                                <Button variant="soft" color="gray" style={{cursor:"pointer"}}>
                                    Cancelar
                                </Button>
                            </Dialog.Close>

                            {/*Boton de guardar*/}
                            <Button onClick={guardarCambioTurno} style={{cursor:"pointer", backgroundColor:"#0088CC"}}>
                                Guardar
                            </Button>
                         </Flex>
                    </Flex>
                    
                    </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo de registro de sustituto*/}
            <Dialog.Root open={openSustitutoDialog} onOpenChange={setOpenSustitutoDialog}>
                <Dialog.Content style={{maxWidth: 500}}>
                    <Dialog.Title align="center" size="5" weight="bold" mb="5">
                        Sustituto Inconsistencia
                    </Dialog.Title>

                    <Text as="div" size="3" weight="bold" mb="4">
                        Datos Personales
                    </Text>
                    
                    {/*Contenedor de nombre y email */}
                    <Flex direction="column" gap="4">
                        {/*Contendra el nombre y el texto para escribirlo*/}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width:"140px"}}>
                                Nombre y Apellidos:
                            </Text>
                            <TextField.Root
                                variant = "soft"
                                color="gray"
                                placeholder="Ej: David Santos Ponce"
                                style={{flex:1}}
                                //para que mantenga el valor del nombre del sustituto
                                value={datosSustituto.nombre}
                                //si se escribe queremos que actualice el campo de nombre y el email lo mantenga con una copia
                                onChange={(e) => setDatosSustituto({...datosSustituto, nombre: e.target.value})}
                            />
                        </Flex> 
                        {/*Contendra el email y el texto para escribirlo*/}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width:"140px"}}>
                                Correo corporativo:
                            </Text>
                            <TextField.Root
                                variant = "soft"
                                color="gray"
                                placeholder="Ej:dasant@gmail.com"
                                style={{flex:1}}
                                //para que mantenga el valor del nombre del sustituto
                                value={datosSustituto.correo}
                                //si se escribe queremos que actualice el campo de nombre y el email lo mantenga con una copia
                                onChange={(e) => setDatosSustituto({...datosSustituto, correo: e.target.value})}
                            />
                        </Flex> 
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
    )
}