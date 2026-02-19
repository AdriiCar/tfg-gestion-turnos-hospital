"use client"

import { CheckIcon, Cross1Icon, Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Box, Heading, IconButton, Table, Text, Flex, Button, Card, Dialog, Grid, TextField, Separator } from "@radix-ui/themes";
import { BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Cell, Bar } from "recharts";

import { useState } from "react";

//INTERFACES
interface Empleado{
    id: number,
    nombre: string,
    apellidos: string,
    correo:string,
    rol: string,
    contrato: number,
    previstas: number,
    balance: number,
    actuales: number,
    nivel: string,
    fechaInicio?: string,
    fechaFin?: string
}

//MOCK DATA

const lista_personal:Empleado[] = [
    { id: 1, nombre: "Ana", apellidos: "López Olmo", correo: "analo@gmail.com", rol: "Enfermero", contrato: 1492, previstas: 1492, balance: 0, actuales: 1190, nivel: "Senior" },
    { id: 2, nombre: "Bea", apellidos: "Gil Gómez",correo: "beagi@gmail.com", rol: "Enfermero", contrato: 1492, previstas: 1500, balance: 8, actuales: 1250, nivel: "Junior" },
    { id: 3, nombre: "David", apellidos: "Ruíz Sanchez", correo: "darui@gmail.com", rol: "Auxiliar", contrato: 1492, previstas: 1470, balance: -22, actuales: 1175, nivel: "Senior" },
    { id: 4, nombre: "Elena", apellidos: "Mayor",correo: "elenma@gmail.com", rol: "Enfermero", contrato: 1492, previstas: 1492, balance: 0, actuales: 1200, nivel: "Senior" },
    { id: 5, nombre: "Francisca", apellidos: "Pérez", correo: "franpe@gmail.com", rol: "Auxiliar", contrato: 1492, previstas: 1505, balance: 13, actuales: 1300, nivel: "Junior" },
    { id: 6, nombre: "Carlos", apellidos: "Vega", correo: "carlve@gmail.com", rol: "Auxiliar", contrato: 1492, previstas: 1480, balance: -12, actuales: 1100, nivel: "Medio" },
    { id: 7, nombre: "Laura", apellidos: "Mendiola", correo: "laume@gmail.com", rol: "Enfermero", contrato: 1492, previstas: 1498, balance: 6, actuales: 1210, nivel: "Senior" },
    { id: 8, nombre: "Marcos", apellidos: "Sanz", correo: "marcsa@gmail.com", rol: "Auxiliar", contrato: 1492, previstas: 1490, balance: -2, actuales: 1150, nivel: "Junior" },
];


export default function DashboardPersonal(){

    //LOGICA DE AÑADIR USUARIO
    const[listaPersonal, setListaPersonal] = useState<Empleado[]>(lista_personal);
    const[dialogoUsuario, setDialogoUsuario] = useState<boolean>(false);

    const[datosUsuario, setDatosUsuario] = useState({nombre: "", correo:"", rol: "Enfermero", fechaInicio: "", fechaFin: "", experiencia:"Senior"});

    const abrirCrear =() =>{
        setIdEditado(null);
        setDatosUsuario({nombre: "", correo:"", rol: "Enfermero", fechaInicio: "", fechaFin: "", experiencia:"Senior"});
        setDialogoUsuario(true);
    }

     //LOGICA EDITAR USUARIO
    const [idEditado, setIdEditado] = useState<number | null>(null);
    const abrirEditar = (empleado:Empleado) => {
        setIdEditado(empleado.id);
        setDatosUsuario({
            nombre: `${empleado.nombre} ${empleado.apellidos}`,
            correo: empleado.correo,
            rol: empleado.rol,
            fechaInicio: empleado.fechaInicio || "",
            fechaFin: empleado.fechaFin || "",
            experiencia: empleado.nivel
        })

        setDialogoUsuario(true);
    }


    //FUNCION PARA AÑADIR Y EDITAR
    const guardarUsuario = ()=> {
        if(!datosUsuario.correo || !datosUsuario.nombre){
            alert("Completar los campos faltantes");
            return;
        }

        const nombreCompleto = datosUsuario.nombre.split(" ");
        const nombre = nombreCompleto[0];
        const apellido = nombreCompleto.slice(1).join(" ") || " ";


        if(idEditado === null){
            const nuevoEmpleado: Empleado = {
                id: Date.now(),
                nombre: nombre,
                apellidos: apellido,
                correo: datosUsuario.correo,
                rol: datosUsuario.rol,
                contrato: 1492,
                actuales: 0,
                balance: 0,
                previstas: 1492,
                fechaInicio: datosUsuario.fechaInicio,
                fechaFin: datosUsuario.fechaFin,
                nivel: datosUsuario.experiencia
            }
            setListaPersonal([...listaPersonal, nuevoEmpleado]);

        }else{
            const listaEmpleados = listaPersonal.map(empleado => {      
                if(empleado.id === idEditado){
                    return{
                    ...empleado,
                    nombre: nombre,
                    apellidos: apellido,
                    correo: datosUsuario.correo,
                    rol: datosUsuario.rol,
                    nivel: datosUsuario.experiencia
                    };
                }
                return empleado;
            });
            setListaPersonal(listaEmpleados);
        }

        setDialogoUsuario(false);
    }

    //LOGICA BORRAR USUARIO
    const[dialogoBorrar, setDialogoBorrar] = useState <boolean>(false);
    const [usuarioBorrar, setUsuarioBorrar] = useState<{id:Number, nombre:string} | null> (null);

    const confirmarBorrado = (id: number, nombre: string, apellido: string) => {
        setUsuarioBorrar({id, nombre: `${nombre} ${apellido}`});
        setDialogoBorrar(true);
    }

    const borrarUsuario = () =>{
        if(!usuarioBorrar) return;
        setListaPersonal(listaPersonal.filter(emp => emp.id != usuarioBorrar.id))
        setDialogoBorrar(false);
        setUsuarioBorrar(null);
    }
   

    return(
        <Box p="6">
            <Heading size="6" mb="5" style={{color: "#1F2937"}}>Gestión Personal</Heading>

            {/*TABLA DE EMPLEADOS*/}
            <Table.Root variant="surface">
                <Table.Header style={{backgroundColor: "#E0F2FE"}}>
                    <Table.Row>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Nombre</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Apellidos</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Correo</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Rol</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Contrato</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Previstas</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Balance</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Actuales</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Nivel</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{color:"#4B5563"}}>Acciones</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {listaPersonal.map((empleado) => (
                        <Table.Row key={empleado.id} align="center">
                            <Table.Cell>{empleado.nombre}</Table.Cell>
                            <Table.Cell>{empleado.apellidos}</Table.Cell>
                            <Table.Cell>{empleado.correo}</Table.Cell>
                            <Table.Cell>{empleado.rol}</Table.Cell>
                            <Table.Cell>{empleado.contrato}</Table.Cell>
                            <Table.Cell>{empleado.previstas}</Table.Cell>
                            <Table.Cell>
                                <Text weight="bold" 
                                    style={{color: empleado.balance > 0 ? 
                                        "green" : empleado.balance < 0 ? "red" : "gray"
                                }}>
                                    {empleado.balance > 0 ? 
                                    `+${empleado.balance}` :  empleado.balance}
                                </Text>
                            </Table.Cell>
                            <Table.Cell>{empleado.actuales}</Table.Cell>
                            <Table.Cell>{empleado.nivel}</Table.Cell>
                            <Table.Cell>
                                <Flex gap="2">
                                    <IconButton variant="ghost" color="gray" onClick= {() => abrirEditar(empleado)} style={{cursor: "pointer"}}>
                                        <Pencil1Icon width="18" height="18"/>
                                    </IconButton>
                                    <IconButton variant="ghost" color="red" onClick={() => confirmarBorrado(empleado.id, empleado.nombre, empleado.apellidos)} style={{cursor:"pointer"}}>
                                        <TrashIcon width="18" height="18"/>
                                    </IconButton>
                                </Flex>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            {/*Boton de añadir usuario*/}
            <Flex justify="center" py="5">
                    <Button size="3" onClick={abrirCrear} style={{ backgroundColor: "#64748B", cursor: "pointer", padding: "10px 20px" }}>
                        <PlusIcon/> Añadir Usuario
                    </Button>
            </Flex>

            {/*GRÁFICA BALANCE DE HORAS*/}
            <Flex justify="center">
                <Card size="4" style={{ width: "100%", maxWidth: "800px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                    <Heading size="4" mb="4" align="center">Balance de Horas del Equipo</Heading>

                    <div style={{width: "100%", height:400}}>
                        <ResponsiveContainer width="100%" height="100%"> {/*adaptamos la gráfica al tamaño del contenedor*/}
                            <BarChart
                                layout="vertical" //creamos las arras horizontales
                                data={listaPersonal} //la informacion sale de esta lista
                                margin={{top: 5, right: 30, left: 20, bottom: 5}} 
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" domain={['dataMin - 5', `dataMax + 5`]}/> {/*Definimos el valor de los datos mas grandes y pequeños*/}
                                <YAxis dataKey="nombre" type="category" width={80}/> {/*Indicamos que se debe pintar el nombre y reservamos espacio para aquellos nombres mas largos*/}
                                <Tooltip cursor={{fill:'transparent'}}/> {/*Diseño al pasar el raton*/}
                                <ReferenceLine x={0} stroke={"#000"}/> {/*Linea que divide la gráfica en positivos y negativos*/}
                                
                                <Bar dataKey="balance" fill="#8884d8" barSize={20}> {/*La longitud depende del balacne y el grosor de 20px */}
                                    {lista_personal.map((persona, indice) => (
                                        <Cell
                                            key={`cell-${indice}`}
                                            fill={persona.balance >= 0 ? "#4ADE80" : "#F87171"} //de un color u otro si es positivo o negativo
                                        />

                                    ))}
                                </Bar>

                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Flex>
            
            {/*Dialogo añadir/modificar nuevo usuario*/}
            <Dialog.Root open={dialogoUsuario} onOpenChange={setDialogoUsuario}>
                <Dialog.Content style={{maxWidth: 600}}>
                    <Flex justify="between" align="center" mb="5">
                        <Dialog.Title size="6" weight="bold">
                            {idEditado === null ? "Alta Nuevo Empleado" : "Editar Empleado"}
                        </Dialog.Title>
                        <Dialog.Close>
                            <IconButton variant="ghost" color="gray" style={{cursor:"pointer"}}>
                                <Cross1Icon color="red"/>
                            </IconButton>
                        </Dialog.Close>
                    </Flex>
                    
                    {/*Contenido formulario*/}
                    <Flex direction="column" gap="5">
                        {/*Seccion datos personales*/}
                        <Box>
                            <Text size="4" weight="bold" mb="3" as="div">Datos Personales</Text>
                            <Grid columns="2" gap="4" align="center">
                                  <Text size="2">Nombre y Apellidos:</Text>
                                  <TextField.Root
                                        placeholder="Ej: Manuel Pozo Pinar"
                                        variant="soft"
                                        color="gray"
                                        value={datosUsuario.nombre}
                                        onChange={(e) => setDatosUsuario({...datosUsuario, nombre: e.target.value})}
                                    /> 

                                    <Text size="2">Correo:</Text> 
                                    <TextField.Root
                                        placeholder="Ej: manpoz@gmail.com"
                                        variant="soft"
                                        color="gray"
                                        value={datosUsuario.correo}
                                        onChange={(e) => setDatosUsuario({...datosUsuario, correo: e.target.value})}
                                    />
                            </Grid> 
                        </Box>

                        <Separator size="4"/>

                        {/*Seccion datos contractuales*/}
                        <Box>
                            <Text size="4" weight ="bold" mb="3" as="div">Datos Contractuales</Text>
                            <Grid columns="2" gap="4" align="center" mb="3">
                                {/*Columna Izquierda*/}
                                <Text size="2">Rol:</Text>
                                {/*Columna Derecha*/}
                                <Flex gap="4">
                                    {/*Opcion Enfermero*/}
                                    <Flex gap="2" align="center" style={{cursor:"pointer"}} onClick={() => setDatosUsuario({...datosUsuario, rol:"Enfermero"})}>
                                        <Box style={{ width: 20, height: 20, backgroundColor: datosUsuario.rol === "Enfermero" ? "#A7C7E7" : "#E5E7EB", borderRadius: 4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                            {datosUsuario.rol === "Enfermero" && <CheckIcon/>}
                                        </Box>
                                        <Text size="2">Enfermero</Text>
                                    </Flex>
                                    {/*Opcion Auxiliar*/}
                                     <Flex gap="2" align="center" style={{cursor:"pointer"}} onClick={() => setDatosUsuario({...datosUsuario, rol:"Auxiliar"})}>
                                        <Box style={{ width: 20, height: 20, backgroundColor: datosUsuario.rol === "Auxiliar" ? "#A7C7E7" : "#E5E7EB", borderRadius: 4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                            {datosUsuario.rol === "Auxiliar" && <CheckIcon/>}
                                        </Box>
                                        <Text size="2">Auxiliar</Text>
                                    </Flex>
                                </Flex>

                                <Text size="2">Fecha de inicio:</Text>
                                <TextField.Root
                                    variant="soft"
                                    color="gray"
                                    type="date"
                                    value={datosUsuario.fechaInicio}
                                    onChange={(e) => setDatosUsuario({...datosUsuario, fechaInicio: e.target.value})}
                                />
                                
                                <Text size="2">Fecha de fin (opcional):</Text>
                                <TextField.Root
                                    variant="soft"
                                    color="gray"
                                    type="date"
                                    value={datosUsuario.fechaFin}
                                    onChange={(e) => setDatosUsuario({...datosUsuario, fechaFin: e.target.value})}
                                />

                                     {/*Columna Izquierda*/}
                                <Text size="2">Experiencia:</Text>
                                {/*Columna Derecha*/}
                                <Flex gap="4">
                                    {/*Opcion Senior*/}
                                    <Flex gap="2" align="center" style={{cursor:"pointer"}} onClick={() => setDatosUsuario({...datosUsuario, experiencia:"Senior"})}>
                                        <Box style={{ width: 20, height: 20, backgroundColor: datosUsuario.experiencia === "Senior" ? "#A7C7E7" : "#E5E7EB", borderRadius: 4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                            {datosUsuario.experiencia === "Senior" && <CheckIcon/>}
                                        </Box>
                                        <Text size="2">Senior</Text>
                                    </Flex>
                                    {/*Opcion Junior*/}
                                     <Flex gap="2" align="center" style={{cursor:"pointer"}} onClick={() => setDatosUsuario({...datosUsuario, experiencia:"Junior"})}>
                                        <Box style={{ width: 20, height: 20, backgroundColor: datosUsuario.experiencia === "Junior" ? "#A7C7E7" : "#E5E7EB", borderRadius: 4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                            {datosUsuario.experiencia === "Junior" && <CheckIcon/>}
                                        </Box>
                                        <Text size="2">Junior</Text>
                                    </Flex>
                                </Flex>
                            </Grid>
                        </Box>
                    </Flex>

                    <Flex justify="center" mt="6">
                        <Button size="3" style={{ backgroundColor: "#0088CC", width: "150px", cursor: "pointer" }} onClick={guardarUsuario}>
                            Añadir
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo borrar usuario*/}
            <Dialog.Root open={dialogoBorrar} onOpenChange={setDialogoBorrar}>
                <Dialog.Content style={{maxWidth: 400}}>
                    <Dialog.Title size="5" mb="2" weight="bold" color="red">Eliminar Empleado</Dialog.Title>
                    <Text size="3" mb="6" as="p">¿Seguro que quieres eliminar a <strong>{usuarioBorrar?.nombre}</strong>?</Text>
                    <Flex gap="3" justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" style={{cursor:"pointer"}}>Cancelar</Button>
                        </Dialog.Close>
                        <Button onClick={borrarUsuario} color="red" style={{cursor: "pointer", backgroundColor: "#DC2626"}}>
                            Sí, Eliminar
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

        </Box>

    );
}