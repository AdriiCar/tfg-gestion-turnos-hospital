"use client"; 

import { usePathname } from "next/navigation";
import { Flex, Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { 
  HomeIcon, 
  CalendarIcon, 
  SunIcon, 
  PaperPlaneIcon 
} from "@radix-ui/react-icons";


const menuItems = [
    { label: "Mi Resumen", href: "/resumen", icon: <HomeIcon /> },
    { label: "Mi Calendario", href: "/calendario", icon: <CalendarIcon /> },
    { label: "Solicitar Día", href: "/solicitarDia", icon: <SunIcon /> },
    { label: "Solicitar Vacaciones", href: "/vacaciones", icon: <PaperPlaneIcon /> },
  ];

export function SidebarMenu() {
  const pathname = usePathname(); // Aquí guardamos la ruta actual
  return (
    <Flex direction="column" gap="2">
      {menuItems.map((item) => {
        const isActive = pathname === item.href; 

        return (
          <Link href={item.href} key={item.href} style={{ textDecoration: 'none' }}>
            <Button 
              size="3" 
              variant= "ghost"
              style={{ 
                width: "100%", 
                justifyContent: "flex-start",
                backgroundColor: isActive ? "#0284C7" : "transparent", // Azul si activo
                color: isActive ? "white" : "#4B5563", // Blanco si activo, gris si no
                cursor: "pointer"
              }}
            >
              {item.icon}
              <Text weight={isActive ? "bold" : "regular"}>
                {item.label}
              </Text>
            </Button>
          </Link>
        );
      })}
    </Flex>
  );
}