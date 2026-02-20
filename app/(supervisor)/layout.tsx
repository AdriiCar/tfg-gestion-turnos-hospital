import { Box, Flex, Heading, Text, Avatar } from "@radix-ui/themes";
import { SidebarMenuSupervisor } from "../componentes/SidebarMenuSupervisor";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const supervisor = {
    nombre: "David Ruiz",
    puesto: "Supervisor",
    icono: "DR"
  };

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
           <SidebarMenuSupervisor /> 
        </Box>

        <Flex align="center" gap="3" mt="auto" style={{ paddingTop: "20px", borderTop: "1px solid #eee" }}>
            <Avatar fallback={supervisor.icono} size="3" radius="full" color="blue" variant="soft"/>
            <Box>
                <Text as="div" size="2" weight="bold">{supervisor.nombre}</Text>
                <Text as="div" size="1" color="gray">{supervisor.puesto}</Text>
            </Box>
        </Flex>

      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </Box>

    </Flex>
  );
}