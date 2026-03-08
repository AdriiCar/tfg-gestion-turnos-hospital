import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Incidencia from "@/models/incidencia";


export async function GET(){
    try{
        await conectarDB();

        const incidencias = await Incidencia.find({resuelta: false}).sort({createdAt: -1});

        return NextResponse.json(incidencias);
    }catch(error){
        console.error("Error al obtener incidencias:", error);
        return NextResponse.json({ error: "Fallo al cargar incidencias" }, { status: 500 });
    }
}