import mongoose from 'mongoose';

//obtenemos la url del .env
const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  throw new Error('Falta la URL de Mongo en el archivo .env.local');
}

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function conectarDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URL!).then((mongoose) => {
      console.log("Conexión establecida");
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}