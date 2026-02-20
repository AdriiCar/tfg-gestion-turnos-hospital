"use client"

import { Box, Flex, Heading, Text, Card, Button, Table, Badge, Dialog, RadioGroup, TextField, Switch, Grid, Separator, Checkbox, Slider } from "@radix-ui/themes";
import { CaretDownIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {useState} from "react";
import { BackpackIcon, MoonIcon, SunIcon } from "lucide-react";


//INTERFACES
interface Empleado {
    id: number;
    nombre: string;
    turnos: string[];
}

interface Inconsistencia {
    id: number;
    mensaje: string;
    severidad: string;
}

interface Sustituto {
    id: number;
    sustituto: string;
    dia: string;
    turno: string;
    sustituido: string;
}

interface SeleccionTurno {
    id: number;
    nombre: string;
    indiceDia: number;
    turnoActual: string;
}

//MOCK DATA

const diaSemana: string[] = [
    "Lunes 2", "Martes 3", "Miercoles 4", "Jueves 5", "Viernes 6", "Sabado 7", "Domingo 8"
]

const empleadosIniciales: Empleado[] = [
    { id: 1, nombre: "Ana López", turnos: ["N", "L", "M", "M", "L", "L", "M"] },
    { id: 2, nombre: "Beatriz Gil", turnos: ["M", "L", "N", "L", "N", "N", "L"] },
    { id: 3, nombre: "David Ruiz", turnos: ["L", "L", "M", "N", "L", "M", "N"] },
]

const semanaMes = "Semana 2 de Febrero"

const inconsistenciasIniciales: Inconsistencia[] = [
    {
        id: 1,
        mensaje: "Miercoles 4 (Mañana): Beatriz falta de descanso legal (12 horas)",
        severidad: "alta"
    },
    {
        id: 2,
        mensaje: "Viernes 6 (Noche): Turno descubierto (Falta 1 enfermera)",
        severidad: "alta"
    }
];

const sustitutosIniciales: Sustituto[] = [
    { id: 1, sustituto: "Laura Martínez", dia: "4 de Febrero", turno: "Mañana", sustituido: "Ana Lopez" },
    { id: 2, sustituto: "Carlos Fuentes", dia: "12 de Febrero", turno: "Noche", sustituido: "Beatriz Gil" },
];

export default function DashboardPlanificador(){

    //LOGICA DE CAMBIO DE TURNOS Y BAJAS

    //plantilla actual
    const [plantilla, setPlantilla] = useState<Empleado[]>(empleadosIniciales);
    //necesario para saber si la vista del dialogo se abre (la de cambio de turno)
    const [openDialog, setOpenDialog] = useState<boolean>(false); 
    //usuario seleccionado para cambiar el turno
    const [seleccion, setSeleccion] = useState<SeleccionTurno | null> (null);
    //nuevo turno seleccionado
    const [turnoNuevo, setTurnoNuevo] = useState<string>(""); 

    const cambioTurno = (id: number, nombre: string, indiceDia: number, turnoActual: string) => {
        setSeleccion({
            id: id,
            nombre: nombre,
            indiceDia: indiceDia,
            turnoActual: turnoActual
        });
        setTurnoNuevo(turnoActual); //inicializamos con los datos actuales
        setOpenDialog(true);
    }

    const guardarCambioTurno = () => { 
        if(!seleccion) return;

        const nuevaPlantilla = plantilla.map(empleado => {
            if(empleado.id === seleccion.id){
                const nuevosTurnos = [...empleado.turnos]; //hacemos una copia para no modificar el original
                nuevosTurnos[seleccion.indiceDia] = turnoNuevo;
                return {...empleado, turnos:nuevosTurnos};
            }
            return empleado;
        });

        setPlantilla(nuevaPlantilla);
        setOpenDialog(false);
    }

    const registrarBaja = () => {
        if(!seleccion) return;
        const nuevaPlantilla = plantilla.map(empleado => {
            if(empleado.id === seleccion.id){
                const nuevoTurnos = [...empleado.turnos];
                nuevoTurnos[seleccion.indiceDia] = "BAJA";
                return {...empleado, turnos:nuevoTurnos};
            }
            return empleado;
        });
        setPlantilla(nuevaPlantilla);
        setOpenDialog(false);
    }


    //LOGICA DE SUSTITUCIONES e INCONSISTENCIAS -> si se registra un sustituto se borra la inconsistencia
    //Guarda dinamicamente las sustituciones
    const [listaSustitutos, setListaSustitutos] = useState<Sustituto[]>(sustitutosIniciales);
    //Guarda dinamicamente las inconsistencias
    const [listaInconsistencias, setListaInconsistencias] = useState<Inconsistencia[]>(inconsistenciasIniciales);
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
    const registrarSustituto = () => {
        if(!datosSustituto.nombre || !datosSustituto.correo){
            alert("Completa todos los campos antes de continuar");
            return;
        }
        
        const nuevoSustituto:Sustituto = {
            id: Date.now(),
            sustituto: datosSustituto.nombre,
            dia: inconsistenciaActual ? inconsistenciaActual.mensaje.split(":")[0] : "Fecha Pendiente",
            turno: "Extra",
            sustituido: "REFUERZO"
        };
        //añadimos el nuevo sustituto
        setListaSustitutos([...listaSustitutos, nuevoSustituto]);

        if(inconsistenciaActual){
            //creamos una nueva lista sin la inconsistencia
            const nuevasInconsistencias = listaInconsistencias.filter(inc => inc.id !== inconsistenciaActual.id);
            setListaInconsistencias(nuevasInconsistencias);
        }
        setOpenSustitutoDialog(false);
    }


    //LOGICA DE CONFIGURACION REGLAS DEL ALGORITMO

    const [dialogoConfiguracion, setDialogoConfiguracion] = useState <boolean>(false)
    const [reglaDescanso, setReglaDescanso] = useState<boolean>(true)
    const[reglaHoras, setReglaHoras] = useState<boolean>(true)
    const[evitarNuevos, setEvitarNuevos] = useState<boolean>(true)
    const [balanceoAlgoritmo, setBalanceoAlgoritmo] = useState<number[]>([50])

    const [enfermerosM, setEnfermerosM] = useState<string>("2")
    const [enfermerosT, setEnfermerosT] = useState<string>("2")
    const [auxiliaresM, setAuxiliaresM] = useState<string>("2")
    const [auxiliaresT, setAuxiliaresT] = useState<string>("2")

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
                            {/*Plantilla es la que tiene los datos actualizados dinamicamente*/}
                            {plantilla.map((empleado) => (
                                <Table.Row key={empleado.id}>
                                    <Table.RowHeaderCell>{empleado.nombre}</Table.RowHeaderCell>
                                    {empleado.turnos.map((turno, index) => (
                                        <Table.Cell key={index} align="center">
                                            {turno && ( //comprobamos que haya un turno escrito
                                                <Button 
                                                    variant={turno==="BAJA" ? "solid":"ghost"} 
                                                    color={turno==="BAJA" ? "red":"gray"}
                                                    style={{ cursor: "pointer", fontWeight: "bold" }}
                                                    onClick={() => cambioTurno(empleado.id, empleado.nombre, index, turno)} //abrimos el dialogo
                                                >
                                                {turno}
                                                </Button> //aqui haremos la gestion de tunos
                                            )}
                                        </Table.Cell>
                                    ))}
                                </Table.Row>
                            ))}
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
                                        <Table.RowHeaderCell>{sustituto.dia}</Table.RowHeaderCell>
                                        <Table.Cell>{sustituto.turno}</Table.Cell>
                                        <Table.Cell style={{color: "#DC2626"}}>{sustituto.sustituido}</Table.Cell>
                                        <Table.Cell style={{color:"#16A34A"}}>{sustituto.sustituto}</Table.Cell>
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

                {/*Boton para generar plantilla*/}
                <Flex justify="center" mt="4" mb="4">
                    <Button
                        size="3"
                         style={{ 
                            backgroundColor: "#0088CC", 
                            padding: "25px 40px", 
                            height: "auto", 
                            borderRadius: "6px",
                            cursor: "pointer"
                        }}
                        onClick={()=> setDialogoConfiguracion(true)}
                    >
                        <Flex direction="column" align="center">
                            <Text weight="bold" size="3">Generar</Text>
                            <Text weight="bold" size="3">Plantilla</Text>
                        </Flex>
                    </Button>
                </Flex>
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

            

            <Dialog.Root open={dialogoConfiguracion} onOpenChange={setDialogoConfiguracion}>
                <Dialog.Content style={{maxWidth:550, padding:"0"}}>

                    <Box p="5">
                        {/*Titulo y cruz de cierre */}
                        <Flex justify="between" align = "center" mb="4">
                            <Dialog.Title size="5" style={{color:"#6B7280"}}>Reglas Legales y Obligatorias</Dialog.Title>
                            <Dialog.Close>
                                <Cross2Icon color="red" style={{ cursor: "pointer", width: "25px", height: "25px" }} />
                            </Dialog.Close>
                        </Flex>

                        {/*Reglas legales*/}
                        <Flex direction="column" gap="4">
                            {/*Fila 1*/}
                            <Flex align = "center" gap="4">
                                <Text size="2" style={{width: 200}}>Descanso mínimo entre turnos:</Text> {/*Con el width alineamos los componentes*/}
                                <Badge size="3" color="gray" variant="soft">12 horas</Badge>
                                <Switch color="green" checked={reglaDescanso} onCheckedChange={setReglaDescanso}></Switch>
                                <Text size="2" weight="bold">{reglaDescanso ? "ON" : "OFF"}</Text>
                            </Flex>

                            {/*Fila 2*/}
                            <Flex align ="center" gap="4">
                                <Text size="2" style={{width: 200}}>Cómputo anual:</Text>
                                <Badge size="3" color="gray" variant="soft" >1492 horas</Badge>
                                <Switch color="green" checked={reglaHoras} onCheckedChange={setReglaHoras}></Switch>
                                <Text size="2" weight="bold">{reglaHoras ? "ON" : "OFF"}</Text>
                            </Flex>
                            
                            {/*Cobertura minima*/}
                            <Flex align="center" gap="4">
                                <Text size="2" style={{width: 200}}>Cobertura Mínima:</Text>
                                 {/*Tabla con los datos*/}
                                <Box style={{flex:1}}>
                                    {/*Fila 1*/}
                                    <Grid columns="3" gap="2" mb="2" align="center">
                                        <Text></Text>
                                        <Text size="1" weight="bold" color="gray" align="center">Enfermeros</Text>
                                        <Text size="1" weight="bold" color="gray" align="center">Auxiliares</Text>
                                    </Grid>
                                    {/*Fila 2*/}
                                     <Grid columns="3" gap="2" mb="2" align="center" style={{ backgroundColor: "#FEF08A", padding: "8px", borderRadius: "4px" }}>
                                        <Text size="2" weight="bold" style={{color:"#000"}} >Mañana</Text>
                                        <TextField.Root
                                            type="number"
                                            size="1"
                                            variant="surface"
                                            value={enfermerosM}
                                            onChange={(e) => (setEnfermerosM(e.target.value))}
                                            style={{ backgroundColor: "white", textAlign: "center" }} 
                                        />
                                        <TextField.Root
                                            type="number"
                                            size="1"
                                            variant="surface"
                                            value={auxiliaresM}
                                            onChange={(e) => (setAuxiliaresM(e.target.value))}
                                            style={{ backgroundColor: "white", textAlign: "center" }} 
                                        />                                    
                                    </Grid>

                                    {/*Fila 3*/}
                                     <Grid columns="3" gap="2" mb="2" align="center" style={{ backgroundColor: "#4F86D9", padding: "8px", borderRadius: "4px" }}>
                                        <Text size="2" weight="bold" style={{color:"#000"}} >Noche</Text>
                                        <TextField.Root
                                            type="number"
                                            size="1"
                                            variant="surface"
                                            value={enfermerosT}
                                            onChange={(e) => (setEnfermerosT(e.target.value))}
                                            style={{ backgroundColor: "white", textAlign: "center" }} 
                                        />
                                        <TextField.Root
                                            type="number"
                                            size="1"
                                            variant="surface"
                                            value={auxiliaresT}
                                            onChange={(e) => (setAuxiliaresT(e.target.value))}
                                            style={{ backgroundColor: "white", textAlign: "center" }} 
                                        />                                    
                                    </Grid>
                                </Box>
                            </Flex>
                        </Flex>

                        <Separator size="4" my="5"/>

                        {/*Restricciones de la plata*/}
                        <Heading size="5" style={{color:"#6B7280"}}>Restricciones de Planta</Heading>
                        <Flex direction="column"  gap="5">

                            <Flex align="center" gap="4">
                                <Text size="2" style={{width:240}}>Evitar turnos con solo personal nuevo</Text>
                                <Checkbox size="2" checked={evitarNuevos} onCheckedChange={(checked) => setEvitarNuevos(checked===true)}/>
                            </Flex>

                            <Box>
                                <Text size="2" mb="3" as="div">Balanceo del algoritmo:</Text>
                                <Flex align="center" gap="3" mt="2">
                                    <Text size="2" style={{width: "90px", lineHeight: "1.2"}}>Satisfacer Preferencias</Text>
                                    <Box style={{flex:1}}>
                                        <Slider
                                            defaultValue={[50]}
                                            value={balanceoAlgoritmo}
                                            onValueChange={setBalanceoAlgoritmo}
                                            color="gray"
                                        />
                                    </Box>
                                    <Text size="2" style={{ width: "90px", lineHeight: "1.2" }}>Equidad Horas Cómputo</Text>
                                </Flex>
                            </Box>
                        </Flex>

                        {/*Boton de generar*/}
                        <Flex justify="center" mt="6">
                            <Button
                                size="3"
                                style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "160px" }}
                                onClick={()=>setDialogoConfiguracion(false)}
                            >
                                Generar
                            </Button>
                        </Flex>
                        
                    </Box>
                </Dialog.Content>
            </Dialog.Root>

        </Box>
    )
}