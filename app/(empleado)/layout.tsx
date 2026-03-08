"use client";

import { SidebarMenu } from "@/app/componentes/SidebarMenu"; // Importamos el componente
import { Box, Flex, Heading, Text, Avatar } from "@radix-ui/themes";
import { useState, useEffect } from "react";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  
  const [empleado, setEmpleado] = useState <{nombre: string, puesto:string, icono: string}>({nombre: "", puesto: "", icono: ""});

  useEffect(() => {
    const datosGuardados = localStorage.getItem("usuarioLogueado");

    if(datosGuardados){
      const datosUsuario = JSON.parse(datosGuardados);

      const inicialNombre = datosUsuario.nombre.charAt(0).toUpperCase();
      const inicialApellido = datosUsuario.apellido.charAt(0).toUpperCase();

      setEmpleado({
        nombre: `${datosUsuario.nombre} ${datosUsuario.apellido}`,
        puesto: datosUsuario.rol,
        icono: `${inicialNombre}${inicialApellido}`
      });
    }
  }, []);

  return (
    <Flex style={{ height: "100vh", backgroundColor: "#F3F4F6" }}>
      
      <Box 
        style={{ 
          width: "250px", 
          backgroundColor: "white", 
          borderRight: "1px solid #E5E7EB", 
          padding: "20px" 
        }}
      >
        <Heading size="4" mb="5" color="blue">Gestor de turnos</Heading>

        <Box mb="6">
           <SidebarMenu /> 
        </Box>

        <Flex align="center" gap="3" mt="auto" style={{ paddingTop: "20px", borderTop: "1px solid #eee" }}>
            <Avatar fallback={empleado.icono} size="3" radius="full" color="blue" variant="soft"/>
            <Box>
                <Text as="div" size="2" weight="bold">{empleado.nombre}</Text>
                <Text as="div" size="1" color="gray">{empleado.puesto}</Text>
            </Box>
        </Flex>

      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </Box>

    </Flex>
  );
}