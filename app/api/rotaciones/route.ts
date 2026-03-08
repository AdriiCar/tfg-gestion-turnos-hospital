import { NextResponse } from 'next/server';
import { conectarDB } from '../../../lib/mongodb';
import Rotacion from '@/models/rotacion';
import Usuario from '@/models/usuario';

//obtener todos los grupos de las rotaciones
export async function GET(){
    try{
        await conectarDB();

        const rotaciones = await Rotacion.find().populate("empleados", "nombre apellido"); //obtenemos tb los datos de los empleados

        return NextResponse.json(rotaciones);
    }catch(error){
        return NextResponse.json({error: "Fallo al obtener la rotación"}, {status: 500});
    }
}


export async function PUT(request: Request){
    try{
        await conectarDB();

        const{grupoId, correo} = await request.json();

        if(!grupoId || !correo){
            return NextResponse.json({error: "Falta el identificador de grupo o el correo del usuario"}, {status: 400});
        }

        const usuario = await Usuario.findOne({correo: correo});

        if(!usuario){
            return NextResponse.json({error: "No se encontró ningún usuario asociado a ese correo"}, {status: 404});
        }

        //primero le sacamos del grupo en el que estaba
        await Rotacion.updateOne({empleados: usuario._id}, {"$pull": {empleados: usuario._id}});

        await Rotacion.findByIdAndUpdate(grupoId, 
            {"$addToSet": {empleados: usuario._id}});

        const gruposActualizados = await Rotacion.find().populate("empleados", "nombre apellido correo");
        
        return NextResponse.json(gruposActualizados, {status: 200});
    }catch(error){
        return NextResponse.json({error:"Fallo al modificar la rotación"}, {status: 500});
    }
}


export async function DELETE(request: Request) {
    try{
        await conectarDB();
        const datos = await request.json();

       // Borrar un patron
        if (datos.patronId) {
            await Rotacion.deleteMany({ patronBaseId: datos.patronId });
            // Devolvemos los grupos que han sobrevivido
            const gruposRestantes = await Rotacion.find().populate("empleados", "nombre apellido correo");
            return NextResponse.json(gruposRestantes, { status: 200 });
        }

        // Borrar a un usuario de un grupo
        if (datos.grupoId && datos.empleadoId) {
            const grupoActualizado = await Rotacion.findByIdAndUpdate(
                datos.grupoId,
                { "$pull": { empleados: datos.empleadoId } }, 
                { new: true }
            ).populate("empleados", "nombre apellido correo");
            
            return NextResponse.json(grupoActualizado, { status: 200 });
        }
    }catch(errores){
        return NextResponse.json({error: "Fallo al borrar en la rotación"}, {status: 500});
    }
    
}