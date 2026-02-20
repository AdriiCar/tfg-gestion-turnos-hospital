"use client"

import { Box, Flex, Heading, Text, Card, Button, Badge, Separator, Grid, Dialog, TextField } from "@radix-ui/themes";
import { UpdateIcon, PlusIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

type tipoTurno = "M" | "N" | "L";

type colorRadix = "orange" | "blue" | "green";

//INTERFACES

interface Empleado {
    id:number;
    nombre:string;
}

interface GrupoRotacion {
    id:number;
    nombre:string;
    diaInicio: number;
    empleados: Empleado[];
}

//MOCK DATA
const patronInicial: tipoTurno[] = ["N", "N", "L", "M", "L"];

const rotacionesIniciales: GrupoRotacion[] = [
    {   id: 1,
        nombre: "Grupo 1",
        diaInicio: 0, // Empieza tal cual el patrón
        empleados: [
            { id: 1, nombre: "Ana García" },
            { id: 2, nombre: "Luis Paredes" },
            { id: 3, nombre: "Martín Sena" }
        ]
    },
    {
        id: 2,
        nombre: "Grupo 2",
        diaInicio: 1, // Empieza en el segundo día del patrón
        empleados: [
            { id: 4, nombre: "Pablo Perales" },
            { id: 5, nombre: "María Pozo" }
        ]
    },
    {
        id: 3,
        nombre: "Grupo 3",
        diaInicio: 2, // Empieza en el tercer día
        empleados: [
            { id: 6, nombre: "Bea Rubio" },
            { id: 7, nombre: "Marta Colina" }
        ]
    },
    {
        id: 4,
        nombre: "Grupo 4",
        diaInicio: 3, // Empieza en el cuarto día
        empleados: [
            { id: 8, nombre: "Ramón Martínez" },
            { id: 9, nombre: "Alex Ramos" }
        ]
    },
    {
        id: 5, nombre: "Grupo 5", diaInicio: 4,
        empleados: [] // Empieza vacío
    }
];

const getConfiTurno = (turno:tipoTurno): {color: colorRadix, label: string, fondo: string} => {
    if(turno === "M"){
        return{color: "orange", label: "M", fondo: "#FEF3C7"};
    }else if(turno ==="N"){
         return {color: "blue", label: "N", fondo: "#DBEAFE"};
    }
    return { color: "green", label: "L", fondo: "#D1FAE5" };
}


export default function DashboardRotacion(){


    const [patronBase, setPatronBase] = useState<tipoTurno[]>(patronInicial);
    const [grupos, setGrupos] = useState<GrupoRotacion[]>(rotacionesIniciales);

    //A partir del patron actual y del comienzo calculamos el patron rotatorio del grupo
    const calcularPatronRotatorio = (patron: tipoTurno[], diaComienzo: number): tipoTurno[] =>{
        const diaInicioFijo = diaComienzo%patron.length;
        const inicioPatron = patron.slice(diaInicioFijo); 
        const finPatron = patron.slice(0, diaInicioFijo);
        return [...inicioPatron, ...finPatron];
    };


    //AÑADIR NUEVO USUARIO A GRUPO
    const[dialogoAñadir, setDialogoAñadir] = useState<boolean>(false);
    const[datosUsuario, setDatosUsuario] = useState<{nombre:string, correo:string}>({nombre:"", correo:""}); //datos del nuevo usuario
    const[grupoSeleccionado, setGrupoSeleccionado] = useState<number | null> (null); //id del grupo donde se añade

    //funcion que abre el dialogo y asigna el id del grupo donde tenemos que añadir el usuario
    const abrirDialogo = (idGrupo:number) => {
        setGrupoSeleccionado(idGrupo); 
        setDatosUsuario({nombre:"", correo: ""});
        setDialogoAñadir(true);
    }

    //buscamos el grupo que tiene el id deseado y en los empleados añadimos el nuevo lo demas se mantiene
    const añadirUsuario = () => {
        if(!datosUsuario.nombre || !datosUsuario.correo){
            alert("Faltan datos por completar");
            return;
        }

        const nuevoUsuario: Empleado = {
            id: Date.now(),
            nombre: datosUsuario.nombre
        };

        const gruposNuevos  = grupos.map(grupo => {
            if (grupo.id === grupoSeleccionado){
               return{ ...grupo, empleados:[...grupo.empleados, nuevoUsuario]}; //cambiamos solo los empleados
            }
            return grupo; //si no es el grupo lo dejamos tal cual
        })

        setGrupos(gruposNuevos);
        setDialogoAñadir(false);
    } 


    // BORRAR USUARIO DE GRUPO
    const[dialogoEliminar, setDialogoEliminar] = useState<boolean>(false);
    const [usuarioBorrar, setUsuarioBorrar] = useState<{idGrupo: number, idUsuario:number, nombre:string} | null>(null);

    const abrirDialogoEliminar =(idGrupo: number, idUsuario: number, nombre: string) => {
        setUsuarioBorrar({ idGrupo, idUsuario, nombre });
        setDialogoEliminar(true);
    }

    const confirmarBorrado = () =>{
        if(!usuarioBorrar) return;
        
        const nuevosGrupos = grupos.map(grupo => {
            if(grupo.id === usuarioBorrar.idGrupo){
                const empleadosNuevos = grupo.empleados.filter(empleado => empleado.id != usuarioBorrar.idUsuario);
                return{...grupo, empleados: empleadosNuevos};
            }
            return grupo;
        })

        setGrupos(nuevosGrupos);
        setDialogoEliminar(false);
        setUsuarioBorrar(null);
    }

    //MODIFICAR PATRON
    const[dialogoModificar, setDialogoModificar] = useState<boolean>(false);
    const[patronNuevo, setPatronNuevo] = useState<tipoTurno[]>([]);
    const[nombrePatron, setNombrePatron] = useState<string>("Rotación Estándar");
    const [longitudInput, setLongitudInput] = useState<string>(""); 


    const abrirDialogoModificar = () =>{
        setPatronNuevo([...patronBase]);
        setLongitudInput(patronBase.length.toString()); 
        setDialogoModificar(true);
    };

    const actualizarLongitud= (valor: string) =>{
        setLongitudInput(valor);

        const nuevaLongitud = parseInt(valor);
        
        if(!isNaN(nuevaLongitud) && nuevaLongitud>=1 && nuevaLongitud <= 7)
            actualizarDiasPatron(nuevaLongitud)
    }

    const actualizarDiasPatron = (nuevaLongitud:number) => {
        const nuevoPatron = [...patronNuevo]

        if(nuevaLongitud > nuevoPatron.length){
            while(nuevoPatron.length < nuevaLongitud)
                nuevoPatron.push("L");
        }else{
            nuevoPatron.length = nuevaLongitud;
        }
        setPatronNuevo(nuevoPatron);
    }
     

    const ciclarTurno = (indice:number) => {
        const nuevoPatron = [...patronNuevo]
        const actual = nuevoPatron[indice];

        if(actual==="M") nuevoPatron[indice] = "N";
        else if(actual === "N") nuevoPatron[indice] = "L";
        else nuevoPatron[indice] = "M";

        setPatronNuevo(nuevoPatron)
    }

    const guardarNuevoPatron = () =>{
        setPatronBase(patronNuevo);
        setDialogoModificar(false);
    }

    //CUADRAR EL NUMERO DE GRUPOS CON LA LONGITUD DEL PATRON

    useEffect(() => {
        const diasPatron = patronBase.length;
        const gruposActuales = grupos.length;

        if(diasPatron === gruposActuales) return;

        if(diasPatron > gruposActuales){
            const nuevosGrupos: GrupoRotacion[] = []
            for (let i = gruposActuales; i < diasPatron; i++) {
                nuevosGrupos.push({
                    id: Date.now() + i, // ID único temporal
                    nombre: `Grupo ${i + 1}`,
                    diaInicio: i, // Empieza en el día nuevo
                    empleados: [] // Nace vacío
                });
            }
            setGrupos([...grupos, ...nuevosGrupos]);
        }
        else{
            const nuevosGrupos = grupos.slice(0, diasPatron);
            setGrupos(nuevosGrupos);
        }
    },[patronBase])

    return(
        <Box p="6">
            <Heading size="6" mb="5" style={{ color: "#1F2937" }}>Configuración de Rotaciones</Heading>

            {/*Contenedor gigante*/}
            <Card size="4" style={{ padding: "30px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", maxWidth: "1000px" }}>

                {/*Seccion 1: Rotacion Estandar*/}
                <Flex justify="between" align="start" mb="6">
                    {/*Parte izquierda*/}
                    <Box>
                        <Heading size="4" mb="3">Rotación Estándar ({patronBase.length} días)</Heading>
                        <Flex gap="2">
                            {/*Recorremos los dias del horario actual y los pintamos, el indice es necesario para la key*/}
                            {patronBase.map((rotacion, indice) => {
                                const config = getConfiTurno(rotacion);
                                return (
                                    <Badge
                                        key={indice}
                                        variant="solid"
                                        color={config.color}
                                        style={{
                                            width:"40px",
                                            height:"30px",
                                            display:"flex",
                                            justifyContent:"center",
                                            fontSize:"14px"
                                        }}
                                    >
                                        {config.label}
                                    </Badge>

                                );
                            } )}
                        </Flex>
                    </Box>
                    {/*Parte derecha*/}
                    <Button variant="soft" size="3" onClick={abrirDialogoModificar} style={{ backgroundColor: "#A7C7E7", color: "#1F2937", cursor: "pointer" }}>
                        <Pencil1Icon/>Modificar Rotación
                    </Button>
                </Flex>

                    <Separator size="4" my="5"/>

                    {/*LISTA DE GRUPOS*/}
                    <Flex direction="column" gap="6">
                        {grupos.map((grupo) => {
                            const patronGrupo = calcularPatronRotatorio(patronBase, grupo.diaInicio);

                            return(
                                /*Repetimos lo mismo que para mostrar el horario fijo pero con los patrones*/
                                <Box key={grupo.id}>

                                    <Flex align="center" gap="4" mb="3">
                                        {/*Poenmos el nombre*/}
                                        <Text weight="bold" size="3" style={{width:"180px"}}>
                                            {grupo.nombre}: Inicio Día {(grupo.diaInicio % patronBase.length) + 1}
                                        </Text>

                                        <Flex gap="2">
                                            {patronGrupo.map((diaGrupo, indice) => {
                                                const config = getConfiTurno(diaGrupo);
                                                return(
                                                    <Badge
                                                        key={indice}
                                                        variant="soft" //para distingirlo del horario fijo
                                                        color={config.color}
                                                        style={{ 
                                                            width: "35px", 
                                                            justifyContent: "center",
                                                            fontWeight: "bold"
                                                        }}
                                                    >
                                                        {config.label}
                                                    </Badge>
                                                );
                                            })}
                                        </Flex>
                                    </Flex>

                                    {/*Lista de empleados y boton de añadir*/}
                                    <Flex justify="between" align="end">
                                        <Box>
                                            <Text size="2" color="gray" mb="2" as="div">Empleados Asignados:</Text>
                                            <Flex gap="2" wrap="wrap" style={{maxWidth: "600px"}}>
                                                {grupo.empleados.map((usuario) => (
                                                    <Badge 
                                                    key={usuario.id} 
                                                    onClick={() => abrirDialogoEliminar(grupo.id, usuario.id, usuario.nombre)}
                                                    size="3"
                                                    style={{ 
                                                        backgroundColor: "#FDE68A", 
                                                        color: "#78350F", 
                                                        padding: "8px 15px",
                                                        borderRadius: "8px"
                                                    }}
                                                >
                                                    {usuario.nombre}
                                                </Badge>
                                                ))}
                                            </Flex>
                                        </Box>

                                        <Button 
                                            size="3"
                                            style={{
                                                 backgroundColor: "#93C5FD", 
                                                color: "#1E3A8A",           
                                                height: "auto", 
                                                padding: "10px 20px",
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                lineHeight: "1.2"
                                            }}
                                            onClick={() => abrirDialogo(grupo.id)}
                                        >
                                            <Flex align="center" gap="2">
                                                <PlusIcon width="18" height="18" />
                                                <Box>
                                                    <Text as="div" size="2" weight="bold">Añadir</Text>
                                                    <Text as="div" size="2" weight="bold">Usuario</Text>
                                                </Box>
                                            </Flex>
                                        </Button> 

                                    </Flex> 
                                         {/* Separador visual entre grupos (menos el último) */}
                                    {grupo.id !== grupos[grupos.length - 1].id && (
                                        <Separator size="4" my="5" style={{ opacity: 0.5 }} />
                        )}
                        </Box>
                    );
                })}
                </Flex>
            </Card>


            {/*Dialogo de añadir usuario*/}
            <Dialog.Root open={dialogoAñadir} onOpenChange={setDialogoAñadir}>
                <Dialog.Content style={{maxWidth: 450}}>
                    <Dialog.Title size="5" mb="4" align="center" weight="bold">
                        Añadir Usuario a Rotación
                    </Dialog.Title>
                    <Text as="div" size="2" mb="4" weight="bold">
                        Datos Personales
                    </Text>

                    {/*Flex que contendra todos los datos*/}
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width: "140px"}}>Nombre y Apellidos:</Text>
                            <TextField.Root
                                variant="soft"
                                color="gray"
                                placeholder="Ej: Lucas Ramírez Pozo"
                                style={{flex:1}}
                                value={datosUsuario.nombre}
                                onChange={(e) => setDatosUsuario({...datosUsuario, nombre:e.target.value})}
                            />
                        </Flex>
                        <Flex align="center" gap="3">
                            <Text size="2" style={{width: "140px"}}>Correo Coorporativo:</Text>
                            <TextField.Root
                                variant="soft"
                                color="gray"
                                placeholder="Ej:lura@gmail.com"
                                style={{flex:1}}
                                value={datosUsuario.correo}
                                onChange={(e) => setDatosUsuario({...datosUsuario, correo:e.target.value})}
                            />
                        </Flex>
                    </Flex>
                    <Flex justify="center" mt="6">
                        <Button 
                            onClick={añadirUsuario}
                            size="3" 
                            style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "150px" }}
                        >
                            Añadir
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
            

            {/*Dialogo eliminar usuario*/}
            <Dialog.Root open={dialogoEliminar} onOpenChange={setDialogoEliminar}>
                <Dialog.Content style={{maxWidth:"400px"}}>
                    <Dialog.Title size="5" mb="2" weight="bold" color="red">
                        Eliminar Usuario
                    </Dialog.Title>

                    <Text size="3" mb="6" as="p">
                        ¿Estas seguro que quieres eliminar a <strong>{usuarioBorrar?.nombre}</strong>?
                    </Text>

                    <Flex gap="3" justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" style={{ cursor: "pointer" }}>
                                Cancelar
                            </Button>
                        </Dialog.Close>
                        <Button 
                            color="red" 
                            style={{ cursor: "pointer", backgroundColor: "#DC2626" }} 
                            onClick={confirmarBorrado}
                        >
                            Sí, Eliminar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root> 


            {/*Dialogo de modificar patron*/}
            <Dialog.Root open={dialogoModificar} onOpenChange={setDialogoModificar}>
                <Dialog.Content style={{maxWidth:"600px"}}>
                    <Dialog.Title size="5" mb="4" align="center" weight="bold">
                        Configurar Patrón Rotatorio
                    </Dialog.Title>    
                    {/*Columnas que contienen el nuevo nombre y longitud del patron*/}
                    <Grid columns="2" gap="4" mb="5">
                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Nombre Patrón:</Text>
                            <TextField.Root 
                                variant="soft"
                                color="gray"
                                value={nombrePatron}
                                onChange={(e) => setNombrePatron(e.target.value)}
                            />
                        </Box>

                        <Box>
                            <Text size="2" weight="bold" mb="1" as="div">Longitud (días):</Text>
                            <TextField.Root
                             variant="soft"
                                color="gray"
                                value={longitudInput}
                                onChange={(e) => actualizarLongitud(e.target.value)}
                            />
                        </Box>
                    </Grid>


                    <Text size="3" weight="bold" mb="3" as="div">Definir Secuencia (Pulsa para cambiar):</Text>

                    <Flex gap="3" wrap="wrap" mb="6" style={{ backgroundColor: "#F9FAFB", padding: "15px", borderRadius: "8px" }}>
                        {patronNuevo.map((turno, indice) => {
                            const config = getConfiTurno(turno);
                            return(
                                <Flex key={indice} direction="column" align="center" gap="1">
                                    <Text size="1" color="gray">Día {indice+1}</Text>
                                    <Badge
                                    size="3"
                                    variant="solid"
                                    color={config.color}
                                    style={{ width: "40px", height: "40px", display: "flex", justifyContent: "center", cursor: "pointer", userSelect: "none" }}
                                    onClick={() => ciclarTurno(indice)}
                                    >
                                    {config.label}
                                    </Badge> 
                                </Flex>
                            );
                        })}
                    </Flex>
                    <Flex justify="center">
                        <Button size="3"onClick={guardarNuevoPatron} style={{ backgroundColor: "#0088CC", cursor: "pointer", width: "150px" }}>
                            Guardar
                        </Button>
                    </Flex>
                </Dialog.Content>       
            </Dialog.Root> 
        </Box>
    );
}
