"use client";

import { Box, Flex, Heading, Text, Card, Button, Table, Badge, Dialog, RadioGroup, TextField, Grid, Select } from "@radix-ui/themes";
import { CalendarIcon, ExclamationTriangleIcon, InfoCircledIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {useState, useTransition} from "react";
import { BackpackIcon, MoonIcon, SunIcon } from "lucide-react";
import { format, startOfDay, startOfWeek, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

//INTERFACES
interface Empleado {
    id: string;
    nombre: string;
    turnos: string[];
    rol: string;
}

interface Inconsistencia {
    id: string;
    fechaInicio: string;
    fechaFin: string;
    turno: string;
    rolAfectado: string;
    tipoIncidencia: string;
    mensaje: string;
    solicitudRelacionada? : string | null;
    tipoCausa?: string;
    nombreCausante? :string;
}

interface Sustituto {
    id: string;
    fechaInicio: string;
    fechaFin: string;
    turno: string;
    sustituido: string;
    sustituidoNombre: string; 
    sustituidoCorreo: string;
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
    modificarTurno: (usuario_id: string, fecha: string, nuevoTurno: string) => Promise<{exito: boolean, mensaje: string}>;
    registrarSustituto: (datos: any) => Promise<{exito: boolean, mensaje: string}>;
    registrarBajaMedica: (usuarioId: string, fechaInicio: string, fechaFin: string) => Promise<{exito: boolean, mensaje: string}>; 
    fechaBase: string;
}

export default function DashboardPlanificador({
    plantilla: plantilla,
    listaInconsistencias,
    listaSustitutos,
    modificarTurno,
    registrarSustituto,
    registrarBajaMedica,
    fechaBase
}: PlanificadorProps){


    const[estaPendiente, empezarTransicion] = useTransition();

    //LOGICA DE FECHAS

    const obtenerFechasSemanaActual = () => {
        const fechaInicial = fechaBase ? new Date(fechaBase) : new Date();
        const lunes = startOfWeek(fechaInicial, { weekStartsOn: 1 });
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

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const cambiarSemana = (dias: number) => {
        // Calculamos la nueva fecha
        const actual = fechaBase ? new Date(fechaBase) : new Date();
        const nuevaFecha = dias > 0 ? addDays(actual, dias) : subDays(actual, Math.abs(dias));
        
        // Copiamos los parámetros que ya tuviera la URL 
        const params = new URLSearchParams(searchParams.toString());
        
        // Modificamos solo la fecha
        params.set("fecha", format(nuevaFecha, 'yyyy-MM-dd'));
        
        // Hacemos el push a la ruta actual + los nuevos parámetros
        router.push(`${pathname}?${params.toString()}`);
    }

    const irSemanaAnterior = () => cambiarSemana(-7);
    const irSemanaSiguiente = () => cambiarSemana(7);


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

        const base = fechaBase ? new Date(fechaBase) : new Date();
        const lunes = startOfWeek(base, { weekStartsOn: 1 });
        const fechaReal = addDays(lunes, seleccion.indiceDia);

        empezarTransicion(async () => {
            try{
                const resultado = await modificarTurno(seleccion.id, fechaReal.toISOString(), turnoNuevo);
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

        
    //LOGICA DE BAJAS MEDICAS
    const [dialogoBaja, setDialogoBaja] = useState<boolean>(false);
    const [datosBaja, setDatosBaja] = useState({usuarioId: "", fechaInicio: "", fechaFin: ""});

    const confirmarRegistrarBaja = async () => {
        if(!datosBaja.usuarioId || !datosBaja.fechaInicio || !datosBaja.fechaFin){
            toast.error("Por favor, rellena todos los campos de la baja.");
            return;
        }

        if(datosBaja.fechaInicio > datosBaja.fechaFin){
            toast.error("La fecha de inicio no puede ser posterior a la fecha de fin.");
            return;
        }

        empezarTransicion(async () => {
            try {
                const resultado = await registrarBajaMedica(datosBaja.usuarioId, datosBaja.fechaInicio, datosBaja.fechaFin);
                if(resultado.exito){
                    toast.success(resultado.mensaje);
                    setDialogoBaja(false);
                    setDatosBaja({usuarioId: "", fechaInicio: "", fechaFin: ""}); // Limpiar formulario
                } else {
                    toast.error(resultado.mensaje);
                }
            } catch(error) {
                toast.error("Error al registrar la baja");
            }
        });
    }


//LOGICA DE SUSTITUCIONES e INCONSISTENCIAS -> si se registra un sustituto se borra la inconsistencia

    //inconsistencia actual fundamental para saber cual hay que elimiar
    const[inconsistenciaActual, setInconsistenciaActual] = useState<Inconsistencia| null>(null);
    //guardamos los datos del sustituto
    const[datosSustituto, setDatosSustituto] = useState<{nombre:string, correo:string, fechaInicio:string, fechaFin:string, nivel:string}>({nombre:"", correo:"", fechaInicio:"", fechaFin:"", nivel: ""});
    
   
    //el dialogo inicialmente esta cerrado hasta que no se pulse seleccionar sustituto on se pone a true
    const [openSustitutoDialog, setOpenSustitutoDialog] = useState<boolean>(false);


    const abrirFormularioSustituciones = (inconsistencia:Inconsistencia) => {
        const inicioStr = format(new Date(inconsistencia.fechaInicio), 'yyyy-MM-dd');
        const finStr = format(new Date(inconsistencia.fechaFin), 'yyyy-MM-dd');
        
        setDatosSustituto({nombre:"", correo:"", fechaInicio: inicioStr, fechaFin: finStr, nivel: "Junior"}); 
        setInconsistenciaActual(inconsistencia); 
        setOpenSustitutoDialog(true);

    }

    const registroSustituto = async() => {
        if(!datosSustituto.nombre || !datosSustituto.correo || !datosSustituto.fechaInicio || !datosSustituto.fechaFin){
            toast.error("Introduce todos los datos del sustituto");
            return;
        }
        if(inconsistenciaActual){
            const inicioIncidencia = format(new Date(inconsistenciaActual.fechaInicio), 'yyyy-MM-dd');
            const finIncidencia = format(new Date(inconsistenciaActual.fechaFin), 'yyyy-MM-dd');

            if(datosSustituto.fechaFin < datosSustituto.fechaInicio){
                toast.error("La fecha de inicio no puede ser posterior a la de fin.");
                return;
            }

            if (datosSustituto.fechaInicio < inicioIncidencia || datosSustituto.fechaFin > finIncidencia) {
                toast.error(`Las fechas deben estar dentro del rango de la incidencia (${format(new Date(inicioIncidencia), "dd/MM")} al ${format(new Date(finIncidencia), "dd/MM")}).`);
                return;
            }

            empezarTransicion(async () => {
                try {
                    const resultado = await registrarSustituto({
                        fechaInicio: datosSustituto.fechaInicio,
                        fechaFin: datosSustituto.fechaFin,
                        turno: inconsistenciaActual.turno,
                        sustituido: inconsistenciaActual.rolAfectado,
                        sustitutoNombre: datosSustituto.nombre,
                        sustitutoCorreo: datosSustituto.correo,
                        nivel: datosSustituto.nivel,
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


    //FILTRO POR ROL
    const  [filtroRol, setFiltroRol] = useState<string>("Todos");

    const plantillaFiltrada = plantilla.filter(usuario => filtroRol==="Todos" || usuario.rol === filtroRol);

  
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
                        <Flex gap="4" align="center" justify="center">
                            {/* Botones de navegación izquierda*/}
                            <Button variant="ghost" onClick={irSemanaAnterior} style={{cursor: "pointer"}}>
                                <ChevronLeftIcon width="20" height="20" />
                            </Button>
                            <Text size="3" weight="bold">{semanaMes}</Text>
                            {/* Botones de navegación derecha*/}
                            <Button variant="ghost" onClick={irSemanaSiguiente} style={{cursor: "pointer"}}>
                                <ChevronRightIcon width="20" height="20" />
                            </Button>
                        </Flex>
                        <Flex justify="end">
                            <Button color="red" variant="soft" style={{cursor: "pointer", fontWeight: "bold"}} onClick={() => setDialogoBaja(true)}>
                                + Registrar Baja
                            </Button>
                        </Flex>
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
                            {plantillaFiltrada.length > 0 ? (
                                plantillaFiltrada.map((empleado) => (
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
                    {/*Desplegable de rol*/}
                    <Flex justify="end" mt="4" align="center" gap="3">
                        <Text size="2" weight="bold" color="gray">Mostrar:</Text>
                        <Select.Root value={filtroRol} onValueChange={setFiltroRol}>
                            <Select.Trigger variant="soft" color="gray" style={{ cursor: 'pointer', width: '150px' }} />
                            <Select.Content>
                                <Select.Item value="Todos">Todos</Select.Item>
                                <Select.Item value="Enfermero">Solo Enfermeros</Select.Item>
                                <Select.Item value="Auxiliar">Solo Auxiliares</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Flex>
                </Card>

                {/*Panel de Inconsistencias*/}
                <Card size="4" style={{padding: "25px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Flex direction="column" gap="3">
                        {listaInconsistencias.length > 0 ? (
                            listaInconsistencias.map((inconsistencia) => {
                                // Sacamos de dónde viene el problema para pintarlo de un color u otro
                                const esBaja = inconsistencia.tipoCausa === "Baja";
                                const esVacaciones = inconsistencia.tipoCausa === "Vacaciones" || inconsistencia.tipoCausa?.includes("Permiso");
                                const esHueco = inconsistencia.tipoCausa === "Hueco Estructural";

                                // Valores por defecto (Rojo para cambios manuales)
                                let bgColor = "#FEE2E2"; 
                                let borderColor = "#DC2626"; 
                                let badgeColor: "red" | "orange" | "violet" | "blue" = "red";
                                let tituloBadge = "Turno Descubierto";
                                let IconoUsar = ExclamationTriangleIcon; 
                                let textoColorInfo = "#7F1D1D";

                                // Cambiamos el estilo si el hueco lo ha provocado una solicitud aprobada
                                if (esBaja) {
                                    bgColor = "#F3E8FF"; // rosa para baja
                                    borderColor = "#9333EA"; 
                                    badgeColor = "violet";
                                    tituloBadge = `Baja Médica: ${inconsistencia.nombreCausante}`;
                                    IconoUsar = InfoCircledIcon; 
                                    textoColorInfo = "#581C87";
                                } else if (esVacaciones) {
                                    bgColor = "#FEF3C7"; // naranja para vacaciones
                                    borderColor = "#D97706";
                                    badgeColor = "orange";
                                    tituloBadge = `Vacaciones: ${inconsistencia.nombreCausante}`;
                                    IconoUsar = CalendarIcon;
                                    textoColorInfo = "#92400E";
                                }else if (esHueco){
                                    bgColor = "#DBEAFE"; // azul para huecos estructurales
                                    borderColor = "#2563EB";
                                    badgeColor = "blue";
                                    tituloBadge = `Vacante (Hueco): ${inconsistencia.nombreCausante}`;
                                    IconoUsar = InfoCircledIcon; 
                                    textoColorInfo = "#1E3A8A";
                                }

                                return (
                                    <Box 
                                        key={inconsistencia.id}
                                        p="4"
                                        style={{ 
                                            backgroundColor: bgColor, 
                                            borderRadius: "8px",
                                            borderLeft: `6px solid ${borderColor}`,
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                            transition: "all 0.2s ease-in-out" 
                                        }}
                                    >
                                        <Flex justify="between" align="center" wrap="wrap" gap="3">
                                            
                                            {/* Bloque izquierdo: Etiqueta visual, fechas y el texto del error */}
                                            <Flex direction="column" gap="2">
                                                {/* Cartelito para saber el motivo por qué falta gente */}
                                                <Badge color={badgeColor} variant="solid" size="2" style={{width: 'fit-content'}}>
                                                    <Flex align="center" gap="1">
                                                        <IconoUsar width="14" height="14" />
                                                        {tituloBadge}
                                                    </Flex>
                                                </Badge>
                                                
                                                <Text size="3" weight="bold" style={{ color: "#1F2937" }}>
                                                    [{format(new Date(inconsistencia.fechaInicio), "dd/MM")} al {format(new Date(inconsistencia.fechaFin), "dd/MM")}]
                                                </Text>
                                                
                                                <Text size="2" color="gray" style={{color: textoColorInfo, maxWidth: "500px"}}>
                                                    {inconsistencia.mensaje}
                                                </Text>
                                            </Flex>
                                            
                                            {/* Botón para abrir el modal y asignar al sustituto */}
                                            <Button 
                                                size="3" 
                                                style={{ 
                                                    backgroundColor: borderColor, // mismo color que el borde
                                                    color: "#FFF",
                                                    cursor: "pointer",
                                                    fontWeight: "bold"
                                                }}
                                                onClick={() => abrirFormularioSustituciones(inconsistencia)}
                                            >
                                                Buscar Sustituto
                                            </Button>

                                        </Flex>
                                    </Box>
                                );
                            })

                        ) : (
                            <Text color="gray"> Todo el cuadrante está cubierto. No hay incidencias. </Text>
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
                                        <Table.RowHeaderCell>
                                            {format(startOfDay(new Date(sustituto.fechaInicio)), "dd/MM")} - {format(startOfDay(new Date(sustituto.fechaFin)), "dd/MM")}
                                        </Table.RowHeaderCell>
                                        <Table.Cell>{sustituto.turno}</Table.Cell>
                                        <Table.Cell style={{color: "#DC2626"}}>
                                            <Flex direction="column">
                                                <Text>{sustituto.sustituidoNombre || sustituto.sustituido}</Text>
                                                {sustituto.sustituidoCorreo && (
                                                    <Text size="1" color="gray">{sustituto.sustituidoCorreo}</Text>
                                                )}
                                            </Flex>
                                        </Table.Cell>
                                        <Table.Cell style={{color: "#16A34A"}}>
                                            <Flex direction="column">
                                                <Text>{sustituto.sustitutoNombre}</Text>
                                                {sustituto.sustitutoCorreo && (
                                                    <Text size="1" color="gray">{sustituto.sustitutoCorreo}</Text>
                                                )}
                                            </Flex>
                                        </Table.Cell>
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
                    <Flex justify="between" mt="6">
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
                        {/* Selector de Nivel de Experiencia */}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width:"140px"}}>
                                Nivel Experiencia:
                            </Text>
                            <Box style={{flex: 1}}>
                                <Select.Root 
                                    value={datosSustituto.nivel} 
                                    onValueChange={(valor) => setDatosSustituto({...datosSustituto, nivel: valor})}
                                >
                                    <Select.Trigger variant="soft" color="gray" style={{ width: '100%', cursor: 'pointer' }} />
                                    <Select.Content>
                                        <Select.Item value="Junior">Junior (Sin experiencia requerida)</Select.Item>
                                        <Select.Item value="Senior">Senior (Alta experiencia)</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                        </Flex> 
                        {/*Fecha de inicio y fin */}
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width:"140px"}}>
                                Fecha Inicio:
                            </Text>
                            <TextField.Root
                                type="date"
                                variant="soft"
                                color="gray"
                                style={{flex:1}}
                                value={datosSustituto.fechaInicio}
                                min={inconsistenciaActual ? format(new Date(inconsistenciaActual.fechaInicio), 'yyyy-MM-dd') : undefined}
                                max={inconsistenciaActual ? format(new Date(inconsistenciaActual.fechaFin), 'yyyy-MM-dd') : undefined}
                                onChange={(e) => setDatosSustituto({...datosSustituto, fechaInicio: e.target.value})}
                            />
                        </Flex> 
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width:"140px"}}>
                                Fecha Fin:
                            </Text>
                            <TextField.Root
                                type="date"
                                variant="soft"
                                color="gray"
                                style={{flex:1}}
                                value={datosSustituto.fechaFin}
                                min={inconsistenciaActual ? format(new Date(inconsistenciaActual.fechaInicio), 'yyyy-MM-dd') : undefined}
                                max={inconsistenciaActual ? format(new Date(inconsistenciaActual.fechaFin), 'yyyy-MM-dd') : undefined}
                                onChange={(e) => setDatosSustituto({...datosSustituto, fechaFin: e.target.value})}
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


            {/*dialogo de bajas medicas*/}
           <Dialog.Root open={dialogoBaja} onOpenChange={setDialogoBaja}>
                <Dialog.Content style={{maxWidth: 450}}>
                    <Dialog.Title align="center" size="5" weight="bold" mb="5">
                        Registrar Baja Médica
                    </Dialog.Title>
                    <Text as="div" size="2" mb="4" color="gray">
                        Selecciona al empleado y el periodo de tiempo en el que estará ausente por motivos médicos.
                    </Text>

                    <Flex direction="column" gap="4">
                        {/* Selector de empleado */}
                        <Flex direction="column" gap="2">
                            <Text size="2" weight="bold">Empleado Afectado:</Text>
                            <Select.Root value={datosBaja.usuarioId} onValueChange={(val) => setDatosBaja({...datosBaja, usuarioId: val})}>
                                <Select.Trigger placeholder="Seleccione un empleado..." style={{width: '100%'}} />
                                <Select.Content>
                                    {plantilla.map(emp => (
                                        <Select.Item key={emp.id} value={emp.id}>{emp.nombre}</Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Root>
                        </Flex>

                        {/* Rango de Fechas */}
                        <Grid columns="2" gap="3">
                            <Flex direction="column" gap="2">
                                <Text size="2" weight="bold">Fecha Inicio:</Text>
                                <TextField.Root 
                                    type="date" 
                                    variant="soft"
                                    value={datosBaja.fechaInicio}
                                    onChange={(e) => setDatosBaja({...datosBaja, fechaInicio: e.target.value})}
                                />
                            </Flex>
                            <Flex direction="column" gap="2">
                                <Text size="2" weight="bold">Fecha Fin:</Text>
                                <TextField.Root 
                                    type="date" 
                                    variant="soft"
                                    value={datosBaja.fechaFin}
                                    onChange={(e) => setDatosBaja({...datosBaja, fechaFin: e.target.value})}
                                />
                            </Flex>
                        </Grid>

                        <Flex justify="end" mt="4" gap="3">
                            <Button variant="soft" color="gray" onClick={() => setDialogoBaja(false)} style={{cursor: "pointer"}}>
                                Cancelar
                            </Button>
                            <Button disabled={estaPendiente} onClick={confirmarRegistrarBaja} style={{ backgroundColor: "#DC2626", cursor: "pointer" }}>
                                {estaPendiente ? "Registrando..." : "Registrar Baja"}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>
    )
}