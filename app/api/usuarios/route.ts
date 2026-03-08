import { NextResponse } from 'next/server';
import { conectarDB } from '../../../lib/mongodb';
import Usuario from '../../../models/usuario';

// GET: Devuelve todos los usuarios

export async function GET() {
    try{
      await conectarDB();

      //buscamos los usuarios en la BD
      const usuarios = await Usuario.find({});

      return NextResponse.json(usuarios);
    }catch(error){
      return NextResponse.json({error: "Error al obtener la lista de usuarios"}, {status: 500})
    }
}

// POST: Crea un usuario nuevo en la base de datos
export async function POST(request: Request) {
  try {
    await conectarDB();
    
    // Leemos los datos que nos manda el formulario de la web
    const datosDelFrontend = await request.json(); 
    
    // Le decimos a Mongoose que use el "Molde" para guardar el nuevo usuario
    const nuevoUsuario = await Usuario.create(datosDelFrontend);
    
    // Devolvemos un OK y los datos del usuario recién creado
    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "No se pudo completar el registro del usuario" }, { status: 500 });
  }
}


//PUT: Modificar un usuario existente en la base de datos
export async function PUT(request: Request) {
  try{
    await conectarDB();

    //leemos los datos que nos manda el frontend
    const {searchParams} = new URL(request.url);
    const id = searchParams.get("id");

    if(!id){
      return NextResponse.json({error: "No se ha encontrado el ID del usuario"}, {status: 400});
    }
    const datosNuevos = await request.json();

    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, datosNuevos, { new: true });  
    if(!usuarioActualizado){
      return NextResponse.json({error: "No se pudo modifcar el usuario"}, {status: 404});
    }

    return NextResponse.json(usuarioActualizado);
  }catch(error){
    return NextResponse.json({error: "No se pudo completar la modificacion del usuario"}, {status: 500})
  }
}

//Delete: Borrar un usuario existente en la base de datos
export async function DELETE(request: Request){
  try{
    await conectarDB();

    const {searchParams} = new URL(request.url);
    const id = searchParams.get("id");
    if(!id){
      return NextResponse.json({error: "No se ha encontrado el ID del usuario"}, {status: 400});
    }

    const usuarioBorrado = await Usuario.findByIdAndDelete(id);

    if(!usuarioBorrado){
      return NextResponse.json({error: "No se puedo borrar el usuario"}, {status: 404});
    }

    return NextResponse.json({mensaje: "Usuario borrado correctamente"});
  }catch(error){
      return NextResponse.json({error: "No se pudo completar el borrado del usuario"}, {status: 500})
  }
}