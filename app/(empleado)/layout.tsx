import { SidebarMenu } from "@/app/componentes/SidebarMenu"; // Importamos el componente
import { Box, Flex, Heading, Text, Avatar } from "@radix-ui/themes";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const empleado = {
    nombre: "Ana López",
    puesto: "Enfermera",
    icono: "AL"
  };

  return (
    <Flex style={{ height: "100vh", backgroundColor: "#F3F4F6" }}>
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <Box 
        style={{ 
          width: "250px", 
          backgroundColor: "white", 
          borderRight: "1px solid #E5E7EB", 
          padding: "20px" 
        }}
      >
        <Heading size="4" mb="5" color="blue">Gestor de turnos</Heading>

        {/* AQUÍ VA TU NUEVO MENÚ INTELIGENTE */}
        <Box mb="6">
           <SidebarMenu /> 
        </Box>

        {/* ... resto del sidebar (Avatar, nombre, etc) ... */}
        <Flex align="center" gap="3" mt="auto" style={{ paddingTop: "20px", borderTop: "1px solid #eee" }}>
            <Avatar fallback={empleado.icono} size="3" radius="full" color="blue" variant="soft"/>
            <Box>
                <Text as="div" size="2" weight="bold">{empleado.nombre}</Text>
                <Text as="div" size="1" color="gray">{empleado.puesto}</Text>
            </Box>
        </Flex>

      </Box>

      {/* CONTENIDO PRINCIPAL */}
      <Box style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </Box>

    </Flex>
  );
}