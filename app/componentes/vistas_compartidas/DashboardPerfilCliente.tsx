"use client";

import { Box, Card, Flex, Heading, Text, TextField, Button, Grid, Callout, Separator } from "@radix-ui/themes";
import { EyeNoneIcon, EyeOpenIcon, InfoCircledIcon, LockClosedIcon, PersonIcon } from "@radix-ui/react-icons";
import { useState, useTransition } from "react";
import { toast } from "sonner";


export default function DashboardPerfilVista({ usuario, actualizarPerfil }: { usuario: any, actualizarPerfil: any }) {
    const [estaPendiente, empezarTransicion] = useTransition();

    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarRepetir, setMostrarRepetir] = useState(false);

    const [datos, setDatos] = useState({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        passwordActual: "",
        passwordNueva: "",
        passwordRepetir: ""
    });

    const guardarCambios = () => {
        if(datos.passwordNueva && datos.passwordNueva !== datos.passwordRepetir){
            toast.error("No coinciden las contraseñas");
            return;
        }

        if(datos.passwordNueva && !datos.passwordActual){
            toast.error("Debes introducir la contraseña actual para poder cambiarla");
            return;
        }

        empezarTransicion(async () => {
            const resultado = await actualizarPerfil(usuario._id, datos);

            if(resultado.exito){
                toast.success(resultado.mensaje);
                setDatos({...datos, passwordActual: "", passwordNueva: "", passwordRepetir: ""});
                setMostrarActual(false);
                setMostrarNueva(false);
                setMostrarRepetir(false);
            }
            else {
                toast.error(resultado.error);
            }
        });
    };


    return (
        <Box p="6" style ={{maxWidth: "900px", margin: "0 auto"}}>
            <Heading size="6" mb="5" style={{color: "#1F2937"}}>Perfil de Usuario</Heading>

            {/*Advertencia de nuevo usuario para cambiar la password*/}
            {usuario.esNuevoUsuario && (
                <Callout.Root color="red" mb="5" variant="soft">
                    <Callout.Icon><InfoCircledIcon/></Callout.Icon>
                    <Callout.Text>
                        Por motivos de seguridad, <b>debes de cambiar la contraseña</b>
                    </Callout.Text>
                </Callout.Root>
            )}

            <Grid columns={{initial: "1", md:"2"}} gap="6">

                {/*Datos personales*/}
                <Card size="3" style={{boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1"}}>
                    <Heading size="4" mb="4">Información Personal</Heading>
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Nombre</Text>
                            <TextField.Root 
                                value={datos.nombre}
                                onChange={e => setDatos({...datos, nombre: e.target.value})}
                            >
                                <TextField.Slot><PersonIcon/></TextField.Slot>
                            </TextField.Root>
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Apellidos</Text>
                            <TextField.Root 
                                value={datos.apellido} 
                                onChange={e => setDatos({ ...datos, apellido: e.target.value })} 
                            />
                        </Box>    
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold" color="gray">Correo Corporativo</Text>
                            <TextField.Root value={usuario.correo} disabled />
                            <Text size="1" color="gray">Contacta con el supervisor para modificar el correo.</Text>
                        </Box>
                    </Flex>
                </Card>

                {/*Contraseñas*/}
                <Card size="3" style={{boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
                    <Heading size="4" mb="4">Información Contraseñas</Heading>
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Contraseña Actual</Text>
                            <TextField.Root 
                                type={mostrarActual ? "text" : "password"} 
                                placeholder="••••••••"
                                value={datos.passwordActual} 
                                onChange={e => setDatos({ ...datos, passwordActual: e.target.value })}
                            >
                                <TextField.Slot><LockClosedIcon /></TextField.Slot>

                                <TextField.Slot>
                                    <div 
                                        onClick={() => setMostrarActual(!mostrarActual)} 
                                        style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                    >
                                        {mostrarActual ? <EyeOpenIcon /> : <EyeNoneIcon />}
                                    </div>
                                </TextField.Slot>
                            </TextField.Root>
                        </Box>
                        <Separator size="4" my="1" />
                        
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Nueva Contraseña</Text>
                            <TextField.Root 
                                type={mostrarNueva ? "text" : "password"} 
                                placeholder="••••••••"
                                value={datos.passwordNueva} 
                                onChange={e => setDatos({ ...datos, passwordNueva: e.target.value })} 
                            >
                                <TextField.Slot><LockClosedIcon /></TextField.Slot>
                                <TextField.Slot>
                                    <div onClick={() => setMostrarNueva(!mostrarNueva)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        {mostrarNueva ? <EyeOpenIcon /> : <EyeNoneIcon />}
                                    </div>
                                </TextField.Slot>
                            </TextField.Root>
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Repetir Nueva Contraseña</Text>
                            <TextField.Root 
                                type={mostrarRepetir ? "text" : "password"} 
                                placeholder="••••••••"
                                value={datos.passwordRepetir} 
                                onChange={e => setDatos({ ...datos, passwordRepetir: e.target.value })} 
                            >
                                <TextField.Slot><LockClosedIcon /></TextField.Slot>
                                <TextField.Slot>
                                    <div onClick={() => setMostrarRepetir(!mostrarRepetir)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        {mostrarRepetir ? <EyeOpenIcon /> : <EyeNoneIcon />}
                                    </div>
                                </TextField.Slot>
                            </TextField.Root>
                        </Box>
                    </Flex>
                </Card>
            </Grid>

            {/* Botón de Guardado */}
            <Flex justify="end" mt="6">
                <Button 
                    size="3" 
                    onClick={guardarCambios} 
                    disabled={estaPendiente} 
                    style={{ backgroundColor: "#0284C7", cursor: "pointer", padding: "0 40px" }}
                >
                    {estaPendiente ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </Flex>
        </Box>
    );


}