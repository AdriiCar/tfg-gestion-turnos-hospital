"use server";

import { conectarDB } from "@/lib/mongodb";
import Plantilla from "@/models/plantilla";
import Incidencia from "@/models/incidencia";
import Sustitucion from "@/models/sustitucion";
import { revalidatePath } from "next/cache";


export async function modificarTurno(usuarioId: string, indiceDia: number, nuevoTurno: string){
    try {
        await conectarDB();

        revalidatePath("/planificador");
    }catch(error){
        
    }
}