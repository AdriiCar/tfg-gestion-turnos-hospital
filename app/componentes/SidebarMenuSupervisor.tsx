"use client";

import { usePathname } from "next/navigation";
import { Flex, Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { 
  TableIcon,   // Para Planificador
  UpdateIcon,     // Para Rotación 
  ClipboardIcon,  // Para Gestor Solicitudes
  PersonIcon,      // Para Personal
  HomeIcon,         //Para Resumen
  CalendarIcon,     //Para Calenadrio
  SunIcon,          //Para Solicitar Dia
  PaperPlaneIcon    //Para Solicitar Vacaciones
} from "@radix-ui/react-icons";

// Definimos las rutas exactas del Supervisor según la imagen
const menuItems = [
  { label: "Planificador", href: "/planificador", icon: <TableIcon width="18" height="18" /> },
  { label: "Rotación Horario", href: "/rotacion", icon: <UpdateIcon width="18" height="18" /> },
  { label: "Gestor Solicitudes", href: "/solicitudes", icon: <ClipboardIcon width="18" height="18" /> },
  { label: "Personal", href: "/personal", icon: <PersonIcon width="18" height="18" /> },
  { label: "Mi Resumen", href: "/resumenSupervisor", icon: <HomeIcon /> },
  { label: "Mi Calendario", href: "/calendarioSupervisor", icon: <CalendarIcon /> },
  { label: "Solicitar Día", href: "/solicitarDiaSupervisor", icon: <SunIcon /> },
  { label: "Solicitar Vacaciones", href: "/solicitarVacacionesSupervisor", icon: <PaperPlaneIcon /> },
];

export function SidebarMenuSupervisor() {
  const pathname = usePathname(); // Aquí guardamos la ruta actual
  return (
    <Flex direction="column" gap="2">
      {menuItems.map((item) => {
        const isActive = (pathname === item.href); 

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