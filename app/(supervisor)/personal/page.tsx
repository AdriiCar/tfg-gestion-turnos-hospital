"use client"

import { CheckIcon, Cross1Icon, Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Box, Heading, IconButton, Table, Text, Flex, Button, Card, Dialog, Grid, TextField, Separator, Callout } from "@radix-ui/themes";
import { BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Cell, Bar } from "recharts";
import { InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";

import { useEffect, useState } from "react";

//INTERFACES
interface Empleado{
    id: string, 
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


export default function DashboardPersonal(){

    const cargarUsuarios = async () => {
        try {
            const respuesta = await fetch("/api/usuarios");
            const datos = await respuesta.json();
            const empleados = datos.map((empleado: any) => ({
                id: empleado._id, 
                nombre: empleado.nombre,
                apellidos: empleado.apellido, 
                correo: empleado.correo,
                rol: empleado.rol,
                contrato: empleado.datosContractuales?.horasContrato || 0,
                previstas: empleado.estadoActual?.horasPrevistas || 0,
                balance: empleado.estadoActual?.balanceAnual || 0,
                actuales: empleado.estadoActual?.horasRealizadas || 0,
                nivel: empleado.nivel,
                fechaInicio: empleado.datosContractuales?.fechaInicio?.split("T")[0]
            })); 
            setListaPersonal(empleados);
        } catch (error) {
            console.error("Error al cargar la lista de personal:", error);
        }
    };

    useEffect(()=> {
        cargarUsuarios();
    }, []);


    //LOGICA DE AÑADIR USUARIO
    const[listaPersonal, setListaPersonal] = useState<Empleado[]>([]);

    const[dialogoUsuario, setDialogoUsuario] = useState<boolean>(false);

    const[datosUsuario, setDatosUsuario] = useState({nombre: "", correo:"", rol: "Enfermero", fechaInicio: "", fechaFin: "", experiencia:"Senior"});

    const abrirCrear =() =>{
        setIdEditado(null);
        setDatosUsuario({nombre: "", correo:"", rol: "Enfermero", fechaInicio: "", fechaFin: "", experiencia:"Senior"});
        setDialogoUsuario(true);
    }

     //LOGICA EDITAR USUARIO
    const [idEditado, setIdEditado] = useState<string | null>(null);

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


     const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);
    //FUNCION PARA AÑADIR Y EDITAR
    const guardarUsuario = async()=> {
        if(!datosUsuario.correo || !datosUsuario.nombre){
            setMensaje({texto: "Por favor, completa el nombre y el correo", tipo: "error"});
            return;
        }

        const nombreCompleto = datosUsuario.nombre.split(" ");
        const nombre = nombreCompleto[0];
        const apellido = nombreCompleto.slice(1).join(" ") || " ";

        try{
             if(idEditado === null){ //usamos post
               const nuevoEmpleado = {
                    nombre: nombre,
                    apellido: apellido,
                    correo: datosUsuario.correo,
                    password: "123456",
                    rol: datosUsuario.rol,
                    nivel: datosUsuario.experiencia,
                    datosContractuales: {
                        horasContrato: 1492,
                        fechaInicio: datosUsuario.fechaInicio || new Date(),
                        fechaFin: datosUsuario.fechaFin || null
                    },
                    estadoActual: {
                        horasPrevistas: 1492,
                        horasRealizadas: 0,
                        balanceAnual: 0,
                        diasLibresRestantes: 6
                    }
                };

                const respuesta = await fetch("/api/usuarios", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(nuevoEmpleado)
                });

                if(respuesta.ok){
                    await cargarUsuarios();
                    setMensaje({ texto: "¡Usuario creado con éxito!", tipo: "exito" });
                }else{
                    setMensaje({texto: "No se pudo añadir el usuario", tipo: "error"});
                }
            }
            else{ //usamos el metodo PUT

                const datosNuevos = {
                    nombre: nombre,
                    apellido: apellido,
                    correo: datosUsuario.correo,
                    rol: datosUsuario.rol,
                    nivel: datosUsuario.experiencia,
                    "datosContractuales.fechaInicio": datosUsuario.fechaInicio,
                    "datosContractuales.fechaFin": datosUsuario.fechaFin
                };

                const respuesta = await fetch(`/api/usuarios?id=${idEditado}`,{
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosNuevos)
                })

                if(respuesta.ok){
                    await cargarUsuarios();
                    setMensaje({ texto: "¡Usuario actualizado correctamente!", tipo: "exito" });
                }else{
                    setMensaje({texto: "No se pudo modificar el usuario", tipo: "error"});
                }
            }
            setDialogoUsuario(false);
        }catch(error){
            setMensaje({texto: "No se pudo establecer la conexion con el servidor", tipo:"error"});
        }
    };

    //LOGICA BORRAR USUARIO
    const[dialogoBorrar, setDialogoBorrar] = useState <boolean>(false);
    const [usuarioBorrar, setUsuarioBorrar] = useState<{id:string, nombre:string} | null> (null);

    const confirmarBorrado = (id: string, nombre: string, apellido: string) => {
        setUsuarioBorrar({id, nombre: `${nombre} ${apellido}`});
        setDialogoBorrar(true);
    }

    const borrarUsuario = async () =>{
        if(!usuarioBorrar) return;

        setMensaje(null);

        try{
            const respuesta = await fetch(`/api/usuarios?id=${usuarioBorrar.id}`,{
                method: "DELETE"
            });

            if(respuesta.ok){
                await cargarUsuarios();
                setDialogoBorrar(false);
                setUsuarioBorrar(null);

                setMensaje({ texto: "¡Empleado eliminado correctamente!", tipo: "exito" }); 
            }else{
                setDialogoBorrar(false);
                setMensaje({texto: "No se puedo completar el borrado en el servidor", tipo:"error"});
            }
        }catch(error){
            setDialogoBorrar(false);
            setMensaje({texto:"Fallo de conexión con el servidor", tipo:"error"});
        }
    }
   

    return(
        <Box p="6">
            <Heading size="6" mb="5" style={{color: "#1F2937"}}>Gestión Personal</Heading>
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
                        <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={300}>
                            <BarChart
                                layout="vertical"
                                data={listaPersonal}
                                margin={{top: 5, right: 30, left: 20, bottom: 5}} 
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" domain={['dataMin - 5', `dataMax + 5`]}/>
                                <YAxis dataKey="nombre" type="category" width={80}/>
                                <Tooltip cursor={{fill:'transparent'}}/>
                                <ReferenceLine x={0} stroke={"#000"}/>
                                
                                <Bar dataKey="balance" fill="#8884d8" barSize={20}>
                                    {listaPersonal.map((persona, indice) => (
                                        <Cell
                                            key={`cell-${indice}`}
                                            fill={persona.balance >= 0 ? "#4ADE80" : "#F87171"}
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
                        <Button size="3" style={{ backgroundColor: "#0088CC", width: "200px", cursor: "pointer" }} onClick={guardarUsuario}>
                            {idEditado === null ? "Añadir" : "Guardar Cambios"}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/*Dialogo borrar usuario*/}
            <Dialog.Root open={dialogoBorrar} onOpenChange={setDialogoBorrar}>
                <Dialog.Content style={{maxWidth: 400}}>
                    <Dialog.Title size="5" mb="2" weight="bold" color="red">Eliminar Empleado</Dialog.Title>
                    <Dialog.Description size="3" mb="6">¿Seguro que quieres eliminar a <strong>{usuarioBorrar?.nombre}</strong>?</Dialog.Description>
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