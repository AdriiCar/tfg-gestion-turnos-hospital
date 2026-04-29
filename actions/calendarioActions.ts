"use server"; 

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import Plantilla from "@/models/plantilla";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { startOfYear, endOfYear } from "date-fns";

export async function obtenerSolicitudesAprobadasAction(usuarioId: string){
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || String(sesion.usuarioId) !== String(usuarioId)) return [];


        await conectarDB();

        //cargamos las solicitudes de este año en orden 
        const hoy = new Date();
        const inicioAno = startOfYear(hoy);
        const finAno = endOfYear(hoy);

        const solicitudes = await Solicitud.find({
            usuarioId: usuarioId,
            estado: "Aprobada",
            esDeSistema: { $ne: true },
            fechaInicio: { $lte: finAno },
            fechaFin: { $gte: inicioAno }
        }).sort({fechaInicio: -1}).lean()

        return JSON.parse(JSON.stringify(solicitudes));
    }catch(error){
        return [];
    }
}


export async function obtenerPlantillaAction(usuarioId: string, year: number){
    try{
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        const sesion = await decrypt(token as string);
        
        if (!sesion || String(sesion.usuarioId) !== String(usuarioId)) return [];

        await conectarDB();
        //obtenemos la plantilla anual del usuario
        const plantilla = await Plantilla.findOne({
            usuario: usuarioId,
            year: year
        }).lean();

        return JSON.parse(JSON.stringify(plantilla));
    }catch(error){
        return {meses: []};
    }
}