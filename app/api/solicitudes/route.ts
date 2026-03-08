import { NextResponse } from "next/server";
import { conectarDB } from "@/lib/mongodb";
import Solicitud from "@/models/solicitud";
import { comprobarReglas } from "@/lib/motorReglas";


export async function POST(request:Request){
    try{
        await conectarDB();

        //leemos los datos del formulario
        const datos = await request.json();

        //Creamos la solicitud en la base de datos
        const nuevaSolicitud = await Solicitud.create(datos);

        return NextResponse.json({mensaje: "Solicitud generada con éxito", solicitud: nuevaSolicitud});
    } catch (error){
        return NextResponse.json({ error: "Fallo al guardar la solicitud" }, { status: 500 });
    }
}


//esta funcion proporciona las solicitudes de un usuario
export async function GET(request: Request){
    try{
        await conectarDB();

        //extraemos el usuarioId de la URL
        const {searchParams} = new URL(request.url);
        const usuarioId =  searchParams.get("usuarioId");
        let solicitudes;

        if(usuarioId){
            solicitudes = await Solicitud.find({usuarioId: usuarioId}).sort({fechaSolicitud: -1});
        }
        else{//para el supervisor extraemos todas las solicitudes no solo la de un usuario
            solicitudes = await Solicitud.find().populate("usuarioId", "nombre apellido")
                                         .sort({fechaSolicitud: -1});
        }
        
        return NextResponse.json(solicitudes, {status: 200})
    }catch(error){
        return NextResponse.json({error: "Fallo al obtener las solicitudes"}, {status: 500})
    }
}

export async function DELETE(request: Request){
    try{
        await conectarDB();

        const {searchParams} = new URL(request.url);
        const id = searchParams.get("id"); //obtenemos el id de la solicitud a borrar

        if(!id){
            return NextResponse.json({error: "Falta el ID  de la solicitud"}, {status: 400});
        }

        const solicitudBorrada = await Solicitud.findByIdAndDelete(id);

        if(!solicitudBorrada){
            return NextResponse.json({error:"No se encontró la solicitud a borrar"}, {status: 404});
        }

        return NextResponse.json({mensaje: "Solicitud borrada correctamente"});
    }catch(error){
        return NextResponse.json({error: "Fallo al borrar la solicitud"}, {status: 500});
    }
}



export async function PUT(request: Request){
    try{
        await conectarDB();

        const {searchParams} = new URL(request.url);
        const id = searchParams.get("id");

        if(!id){
            return NextResponse.json({error: "No se encontro el id de la solicitud"}, {status: 400});
        }

        const datosNuevos = await request.json();
        const solicitudModificada = await Solicitud.findByIdAndUpdate(id, datosNuevos, {new: true});
        if(!solicitudModificada){
            return NextResponse.json({error: "No se encontró la solicitud a modificar"}, {status: 404})
        }

        if (datosNuevos.estado === "Aprobada") {
            await comprobarReglas(
                solicitudModificada.fechaInicio, 
                solicitudModificada.fechaFin, 
                solicitudModificada._id.toString()
            );
        }

        return NextResponse.json(solicitudModificada,{status: 200});
    }catch(error){
        return NextResponse.json({error: "Fallo al añadir la solicitud"}, {status: 500});
    }
}