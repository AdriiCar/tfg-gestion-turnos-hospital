

import { Box, Flex, Heading, Text, Avatar } from "@radix-ui/themes";
import { SidebarMenu } from "../componentes/SidebarMenu";
import BotonLogout from "@/app/componentes/BotonLogout";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import Link from "next/link";

export default async function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  
  const sesion = token ? await decrypt(token) : null;

  const iniciales = sesion ? `${(sesion.nombre as string).charAt(0)}${(sesion.apellido as string || "").charAt(0)}`.toUpperCase()
    : "??";

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

        <Flex direction="column" gap="4" mt="auto" style={{ paddingTop: "20px", borderTop: "1px solid #eee" }}>
            <Link href="/perfil" style={{textDecoration: "none", color: "inherit"}}>
                <Flex align="center" gap="3" className="hover:bg-gray-100 transition-colors"
                 style={{ 
                        padding: "8px", 
                        borderRadius: "8px", 
                        cursor: "pointer" 
                    }}>
                  <Avatar fallback={iniciales} size="3" radius="full" color="blue" variant="soft"/>
                  <Box>
                      <Text as="div" size="2" weight="bold">
                          {sesion ? `${sesion.nombre} ${sesion.apellido || ""}` : "Cargando..."}
                      </Text>
                      <Text as="div" size="1" color="gray">
                          {sesion ? (sesion.rol as string) : "Empleado"}
                      </Text>
                  </Box>
             </Flex>
            </Link>

            {/* botón de cierre de sesión */}
            <BotonLogout/>
            
        </Flex>

      </Box> 

      <Box style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </Box>
      
    </Flex>
  );
}