import Planta from '@/models/planta';
import mongoose from 'mongoose';

//obtenemos la url del .env
const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  throw new Error('Falta la URL de Mongo en el archivo .env.local');
}

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, seeded: false };
}
//script para inicializar plantas si no existen -> como no tenemos rol administrador evitamos que un supervisor cree plantas entonces las incializamos en caso de que no haya plantas en el sistema
async function inicializarPlantas(){
  try{
    const numPlantas = await Planta.countDocuments();

    if(numPlantas == 0){
      const plantasHospital = [
        { nombre: "Urgencias", descripcion: "Departamento de Urgencias y Emergencias" },
        { nombre: "Cardiología", descripcion: "Planta de cardiología" },
        { nombre: "Pediatría", descripcion: "Planta de atención infantil" },
        { nombre: "Neurología", descripcion: "Planta de neurología" },
        { nombre: "Traumatología", descripcion: "Planta de traumatología y ortopedia" },
        { nombre: "UCI", descripcion: "Unidad de Cuidados Intensivos" },
        { nombre: "Oncología", descripcion: "Planta de tratamiento oncológico" }
      ]
      await Planta.insertMany(plantasHospital);
    }
  }catch(error){

  }
}

export async function conectarDB() {
  if (cached.conn) { //comprobamos si  ya teniamos una conexion establecida con la bd para evitar crear una nueva
    return cached.conn;
  }
  if (!cached.promise) { //si no lo estabamos os conectamos
    cached.promise = mongoose.connect(MONGODB_URL!).then(async (mongoose) => {
      if(!cached.seeded){
        await inicializarPlantas();
        cached.seeded = true;
      }

      return mongoose;
    });
  }//guardamos la conexion y la devolvemos
  cached.conn = await cached.promise;
  return cached.conn;
}