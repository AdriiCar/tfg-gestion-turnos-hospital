"use client"

import { useState, useTransition } from "react";
import { Box, Card, Flex, Heading, Text, TextField, Button, Tabs, Callout, Grid } from "@radix-ui/themes";
import { InfoCircledIcon, LockClosedIcon, EnvelopeClosedIcon, PersonIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";




interface LoginProps {
    hacerLogin: (correo: string, password: string) => Promise<{exito: boolean; mensaje: string; esSupervisor?: boolean; nombre?: string}>;
    hacerRegistro: (datos: { nombre: string, apellido: string, correo: string, password: string }) => Promise<{exito: boolean; mensaje: string}>;
}



export default function LoginCliente({ hacerLogin, hacerRegistro }: LoginProps) {
  const router = useRouter();
  
  // Estados para guardar lo que el usuario escribe
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  
  // Estados para mostrar mensajes de error o éxito
    const [estaPendiente, empezarTransicion] = useTransition();

  // REGISTRAR UN NUEVO USUARIO
  const handleRegistro = async () => {
    if (!nombre || !apellido || !correo || !password) {
      toast.error("Por favor, rellena todos los campos");
      return;
    }

    empezarTransicion(async () => {
      try {
        const resultado = await hacerRegistro({ 
            nombre, 
            apellido, 
            correo, 
            password: password 
        });

        if (resultado.exito) {
          toast.success(resultado.mensaje);
          setNombre(""); setApellido(""); setCorreo(""); setPassword("");
        } else {
          toast.error(resultado.mensaje);
        }
      } catch (error) {
        toast.error("Error de conexión con el servidor");
      }
    });
  };

  // FUNCIÓN 2: INICIAR SESIÓN 
  const handleLogin = async () => {
    if (!correo || !password) {
      toast.error("Por favor, rellena todos los campos");
      return;
    }

    empezarTransicion(async () => {
      try {
        const resultado = await hacerLogin(correo, password);

        if (resultado.exito) {
          toast.success(`Acceso correcto. ¡Bienvenido ${resultado.nombre}!`);
          
          if (resultado.esSupervisor) {
            router.push("/planificador");
          } else {
            router.push("/resumen");
          }
        } else {
          toast.error(resultado.mensaje);
        }
      } catch (error) {
        toast.error("Error de conexión con el servidor");
      }
    });
  };

  return (
    <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", padding: "20px" }}>
      
      <Card size="4" style={{ width: "100%", maxWidth: "450px", padding: "30px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
        <Flex direction="column" align="center" mb="5">
          <Heading size="6" style={{ color: "#111827" }}>Gestor Hospitalario</Heading>
          <Text color="gray" size="2">Acceso al portal del empleado</Text>
        </Flex>

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
                <Button size="3" mt="3" onClick={handleLogin} disabled={estaPendiente} style={{ cursor: "pointer", backgroundColor: "#0284C7" }}>
                  {estaPendiente ? "Cargando..." : "Entrar al Sistema"}
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
                
                <Button size="3" mt="3" onClick={handleRegistro} disabled={estaPendiente} style={{ cursor: "pointer", backgroundColor: "#10B981" }}>
                  {estaPendiente ? "Creando cuenta..." : "Crear Cuenta"}
                </Button>
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>

      </Card>
    </Box>
  );
}
