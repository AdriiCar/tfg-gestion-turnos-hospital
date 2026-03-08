"use client"
//anaga@gmail.com  
//ana

import { useState } from "react";
import { Box, Card, Flex, Heading, Text, TextField, Button, Tabs, Callout, Grid } from "@radix-ui/themes";
import { InfoCircledIcon, LockClosedIcon, EnvelopeClosedIcon, PersonIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  
  // Estados para guardar lo que el usuario escribe
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  
  // Estados para mostrar mensajes de error o éxito
  const [mensaje, setMensaje] = useState<{ texto: string, tipo: "error" | "exito" } | null>(null);
  const [cargando, setCargando] = useState(false);

  // FUNCIÓN 1: REGISTRAR UN NUEVO USUARIO
  const handleRegistro = async () => {
    setMensaje(null);
    setCargando(true);

    try {
     
      const respuesta = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, correo, password })
      });

      if (respuesta.ok) {
        setMensaje({ texto: "¡Usuario registrado con éxito! Ya puedes iniciar sesión.", tipo: "exito" });
        // Limpiamos el formulario
        setNombre(""); setApellido(""); setCorreo(""); setPassword("");
      } else {
        const errorData = await respuesta.json();
        setMensaje({ texto: errorData.error || "Error al registrar el usuario", tipo: "error" });
      }
    } catch (error) {
      setMensaje({ texto: "Error de conexión con el servidor", tipo: "error" });
    } finally {
      setCargando(false);
    }
  };

  // FUNCIÓN 2: INICIAR SESIÓN 
  const handleLogin = async () => {
    setMensaje(null);
    setCargando(true);

    try{
      //enviamos los datos introducidos por el usuario al servidor
      const respuesta = await fetch("/api/login",{
        method: "POST",
        headers: {"Content-Type": "aplication/json"},
        body: JSON.stringify({correo, password})
      });

      if(respuesta.ok){
        const datos = await respuesta.json(); //mandamos el usuario desde el servidor

        setMensaje({texto: `Acceso correcto. ¡Bienvenido ${datos.usuario.nombre}`, tipo:"exito"});
        localStorage.setItem("usuarioLogueado", JSON.stringify(datos.usuario)); //almacenamos el usuario para usarlo en las siguientes vistas

        if(datos.usuario.rol === 'Supervisor'){
          router.push("/admin");
        }
        else router.push("/resumen");

      }else{
        const error = await respuesta.json();
        setMensaje({texto: error.error, tipo: "error"});
      }
    }catch (error){
      setMensaje({texto: "Error de conexión con el servidor", tipo: "error"});
    }finally{
      setCargando(false);
    }
  };

  return (
    <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", padding: "20px" }}>
      
      <Card size="4" style={{ width: "100%", maxWidth: "450px", padding: "30px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
        <Flex direction="column" align="center" mb="5">
          <Heading size="6" style={{ color: "#111827" }}>Gestor Hospitalario</Heading>
          <Text color="gray" size="2">Acceso al portal del empleado</Text>
        </Flex>

        {/* Mensajes de Error o Éxito */}
        {mensaje && (
          <Callout.Root color={mensaje.tipo === "error" ? "red" : "green"} variant="soft" mb="4">
            <Callout.Icon><InfoCircledIcon /></Callout.Icon>
            <Callout.Text>{mensaje.texto}</Callout.Text>
          </Callout.Root>
        )}

        <Tabs.Root defaultValue="login">
          <Tabs.List style={{ marginBottom: "20px" }}>
            <Tabs.Trigger value="login" style={{ flex: 1, cursor: "pointer" }}>Iniciar Sesión</Tabs.Trigger>
            <Tabs.Trigger value="registro" style={{ flex: 1, cursor: "pointer" }}>Registrarse</Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            {/*Login */}
            <Tabs.Content value="login">
              <Flex direction="column" gap="4">
                <Box>
                  <Text as="div" size="2" mb="1" weight="bold">Correo electrónico</Text>
                  <TextField.Root placeholder="ejemplo@hospital.com" value={correo} onChange={(e) => setCorreo(e.target.value)}>
                    <TextField.Slot><EnvelopeClosedIcon height="16" width="16" /></TextField.Slot>
                  </TextField.Root>
                </Box>
                <Box>
                  <Text as="div" size="2" mb="1" weight="bold">Contraseña</Text>
                  <TextField.Root type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}>
                    <TextField.Slot><LockClosedIcon height="16" width="16" /></TextField.Slot>
                  </TextField.Root>
                </Box>
                <Button size="3" mt="3" onClick={handleLogin} disabled={cargando} style={{ cursor: "pointer", backgroundColor: "#0284C7" }}>
                  {cargando ? "Cargando..." : "Entrar al Sistema"}
                </Button>
              </Flex>
            </Tabs.Content>

            {/*Registro */}
            <Tabs.Content value="registro">
              <Flex direction="column" gap="4">
                <Grid columns="2" gap="3">
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">Nombre</Text>
                    <TextField.Root placeholder="Ej: Ana" value={nombre} onChange={(e) => setNombre(e.target.value)}>
                      <TextField.Slot><PersonIcon height="16" width="16" /></TextField.Slot>
                    </TextField.Root>
                  </Box>
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">Apellidos</Text>
                    <TextField.Root placeholder="Ej: García" value={apellido} onChange={(e) => setApellido(e.target.value)} />
                  </Box>
                </Grid>
                
                <Box>
                  <Text as="div" size="2" mb="1" weight="bold">Correo electrónico</Text>
                  <TextField.Root placeholder="ejemplo@hospital.com" value={correo} onChange={(e) => setCorreo(e.target.value)}>
                    <TextField.Slot><EnvelopeClosedIcon height="16" width="16" /></TextField.Slot>
                  </TextField.Root>
                </Box>
                
                <Box>
                  <Text as="div" size="2" mb="1" weight="bold">Contraseña</Text>
                  <TextField.Root type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}>
                    <TextField.Slot><LockClosedIcon height="16" width="16" /></TextField.Slot>
                  </TextField.Root>
                </Box>
                
                <Button size="3" mt="3" onClick={handleRegistro} disabled={cargando} style={{ cursor: "pointer", backgroundColor: "#10B981" }}>
                  {cargando ? "Creando cuenta..." : "Crear Cuenta"}
                </Button>
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>

      </Card>
    </Box>
  );
}
