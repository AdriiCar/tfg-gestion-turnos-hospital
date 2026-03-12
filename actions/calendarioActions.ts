"use server"; 

import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import Plantilla from "@/models/plantilla";



export async function obtenerSolicitudesAprobadasAction(usuarioId: string){
    try {
        await conectarDB();

        const solicitudes = await Solicitud.find({
            usuarioId: usuarioId,
            estado: "Aprobada"
        }).lean()

        return JSON.parse(JSON.stringify(solicitudes));
    }catch(error){
        return [];
    }
}


export async function obtenerPlantillaAction(usuarioId: string, año: number){
    try{
        await conectarDB();
        const plantilla = await Plantilla.findOne({
            usuario: usuarioId,
            año: año
        }).lean();

        return JSON.parse(JSON.stringify(plantilla));
    }catch(error){
        return {meses: []};
    }
}