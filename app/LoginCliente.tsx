"use client"

import { useState, useTransition } from "react";
import { Box, Card, Flex, Heading, Text, TextField, Button } from "@radix-ui/themes";
import { LockClosedIcon, EnvelopeClosedIcon, EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface LoginProps {
  hacerLogin: (correo: string, password: string) => Promise<{exito: boolean; mensaje: string; esSupervisor?: boolean; nombre?: string}>;
}

export default function LoginCliente({ hacerLogin }: LoginProps) {
  const router = useRouter();
  
  // Estados para guardar lo que el usuario escribe
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  
  // Estados para mostrar mensajes de error o éxito
  const [estaPendiente, empezarTransicion] = useTransition();

  // FUNCIÓN: INICIAR SESIÓN 
  const confirmarLogin = async () => {
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
          <Heading size="6" style={{ color: "#111827" }}>Plataforma Hospital</Heading>
          <Text color="gray" size="2">Acceso al portal del empleado</Text>
        </Flex>

        <Box pt="3">
          {/*Para permitir darle al enter */}
          <form onSubmit={(e) => { e.preventDefault(); confirmarLogin(); }}>
            <Flex direction="column" gap="4">
              <Box>
                <Text as="div" size="2" mb="1" weight="bold">Correo electrónico</Text>
                <TextField.Root placeholder="jaicu@gmail.com" value={correo} onChange={(e) => setCorreo(e.target.value)}>
                  <TextField.Slot><EnvelopeClosedIcon height="16" width="16" /></TextField.Slot>
                </TextField.Root>
              </Box>
              
              <Box>
                <TextField.Root type={mostrarPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}>
                  <TextField.Slot><LockClosedIcon height="16" width="16" /></TextField.Slot>
                  <TextField.Slot>
                    <div onClick={() => setMostrarPassword(!mostrarPassword)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                      {mostrarPassword ? <EyeOpenIcon height="16" width="16" /> : <EyeNoneIcon height="16" width="16" />}
                    </div>
                  </TextField.Slot>
                </TextField.Root>
              </Box>
              
              <Button size="3" mt="3" type="submit" disabled={estaPendiente} style={{ cursor: "pointer", backgroundColor: "#0284C7" }}>
                {estaPendiente ? "Cargando..." : "Entrar al Sistema"}
              </Button>
            </Flex>
          </form>
        </Box>

      </Card>
    </Box>
  );
}