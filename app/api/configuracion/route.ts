import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Configuracion from "@/models/configuracion";
//export const dynamic = 'force-dynamic';  ns si es necesario para que NextJs no cache la respuesta

// OBTENER LA CONFIGURACIÓN (GET)
export async function GET() {
    try {
        await conectarDB();
        
        // Buscamos el único documento de configuración que debería existir
        let config = await Configuracion.findOne();

        // Si es la primera vez y no hay nada en la BD, creamos uno con los defaults de tu Schema
        if (!config) {
            config = await Configuracion.create({});
        }

        return NextResponse.json(config, { status: 200 });
    } catch (error) {
        console.error("Error en GET /api/configuracion:", error);
        return NextResponse.json({ error: "Error al cargar la configuración" }, { status: 500 });
    }
}

// ACTUALIZAR LA CONFIGURACIÓN (PUT)
export async function PUT(request: Request) {
    try {
        await conectarDB();
        const datosNuevos = await request.json();

       
        const configActualizada = await Configuracion.findOneAndUpdate(
            {}, 
            datosNuevos, 
            { new: true, upsert: true }
        );

        return NextResponse.json(
            { mensaje: "Configuración guardada con éxito", configuracion: configActualizada }, 
            { status: 200 }
        );

    } catch (error) {
        console.error("Error en PUT /api/configuracion:", error);
        return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 });
    }
}