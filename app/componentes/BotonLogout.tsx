"use client";

import { ExitIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { cerrarSesionAction } from "@/actions/logoutAction"; // Ajusta la ruta a donde hayas puesto la acción
import { useTransition } from "react";

export default function BotonLogout() {
    const [estaPendiente, empezarTransicion] = useTransition();

    const handleLogout = () => {
        empezarTransicion(async () => {
            await cerrarSesionAction();
        });
    };

    return (
        <Button 
            variant="soft" 
            color="red" 
            onClick={handleLogout} 
            disabled={estaPendiente}
            style={{ cursor: "pointer", width: "100%", justifyContent: "center" }}
        >
            <ExitIcon />
            {estaPendiente ? "Saliendo..." : "Cerrar Sesión"}
        </Button>
    );
}