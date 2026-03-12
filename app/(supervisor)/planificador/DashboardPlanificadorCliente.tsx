"use client";

import { Box, Flex, Heading, Text, Card, Button, Table, Badge, Dialog, RadioGroup, TextField, Switch, Grid, Separator, Checkbox, Slider, Callout } from "@radix-ui/themes";
import { CaretDownIcon, CheckCircledIcon, ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {useState, useTransition} from "react";
import { BackpackIcon, MoonIcon, SunIcon } from "lucide-react";
import { format, startOfDay, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

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


interface PlanificadorProps {
    plantilla: Empleado[];
    listaInconsistencias: Inconsistencia[];
    listaSustitutos: Sustituto[];
    modificarTurno: (usuario_id: string, indiceDia: number, nuevoTurno: string) => Promise<{exito: boolean, mensaje: string}>;
    registrarSustituto: (datos: any) => Promise<{exito: boolean, mensaje: string}>;
}

export default function DashboardPlanificador({
    plantilla: plantilla,
    listaInconsistencias,
    listaSustitutos,
    modificarTurno,
    registrarSustituto
}: PlanificadorProps){


    const[estaPendiente, empezarTransicion] = useTransition();

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
 
    const { diasSemana: diaSemana, textoSemana: semanaMes } = obtenerFechasSemanaActual();



//LOGICA DE CAMBIO DE TURNOS Y BAJAS

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
            toast.error("Selecciona un usuario al que cambiar el turno");
            return;
        } 

        empezarTransicion(async () => {
            try{
                const resultado = await modificarTurno(seleccion.id, seleccion.indiceDia, turnoNuevo);
                if(resultado.exito){
                    toast.success(resultado.mensaje);
                    setOpenDialog(false); 
                }
                else {
                    toast.error(resultado.mensaje);
                }
            }catch(error){
                toast.error("Error al conectar con el servidor para cambiar el turno");
            }
        });
    };

        

    const registrarBaja = async() => {
        if(!seleccion){
            toast.error("Seleccione un usuario al que registrar la baja");
            return;
        }
        
        empezarTransicion(async () => {
            try{
                const resultado = await modificarTurno(seleccion.id, seleccion.indiceDia, "BAJA");
                if(resultado.exito){
                    toast.success(resultado.mensaje);
                    setOpenDialog(false); 
                }
                else {
                    toast.error(resultado.mensaje);
                }
            }catch(error){
                toast.error("Error al conectar con el servidor para cambiar el turno");
            }
        });

        
    }


//LOGICA DE SUSTITUCIONES e INCONSISTENCIAS -> si se registra un sustituto se borra la inconsistencia

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

    const registroSustituto = async() => {
        if(!datosSustituto.nombre || !datosSustituto.correo){
            toast.error("Introduce todos los datos del sustituto");
            return;
        }

        if(inconsistenciaActual){
            empezarTransicion(async () => {
                try {
                    const resultado = await registrarSustituto({
                        fecha: inconsistenciaActual.fecha,
                        turno: inconsistenciaActual.turno,
                        sustituido: inconsistenciaActual.rolAfectado,
                        sustitutoNombre: datosSustituto.nombre,
                        sustitutoCorreo: datosSustituto.correo,
                        incidenciaId: inconsistenciaActual.id
                    });
                    
                    if (resultado.exito) {
                        toast.success(resultado.mensaje);
                        setOpenSustitutoDialog(false);
                    } else {
                        toast.error(resultado.mensaje);
                    }
                } catch(error) {
                    toast.error("Error de conexión con el servidor");
                }
            });
        }
    }


  
    return(
        //Contenedor de la vista
        <Box p="6">
            <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Planificador</Heading>

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
                                                        disabled={estaPendiente}
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
                         <Button onClick={registrarBaja} disabled={estaPendiente} color="red" style={{cursor:"pointer"}}>
                            Registrar ausencia/baja
                         </Button>

                         {/*Botones de cancelar y guardar*/}
                         <Flex gap="3">
                            {/*Boton de cerrar*/}
                            <Dialog.Close>
                                <Button variant="soft" color="gray" disabled={estaPendiente} style={{cursor:"pointer"}}>
                                    Cancelar
                                </Button>
                            </Dialog.Close>

                            {/*Boton de guardar*/}
                            <Button onClick={guardarCambioTurno} disabled={estaPendiente} style={{cursor:"pointer", backgroundColor:"#0088CC"}}>
                               {estaPendiente ? "Guardando..." : "Guardar"}
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
                                disabled= {estaPendiente}
                                size="3"
                                onClick={registroSustituto}
                                style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "150px" }}
                                >
                                {estaPendiente ? "Añadiendo..." : "Añadir"}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>
    )
}