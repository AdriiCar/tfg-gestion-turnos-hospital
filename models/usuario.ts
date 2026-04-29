import mongoose, { Schema } from 'mongoose';

const UsuarioSchema = new Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  rol: { type: String, default: 'Enfermero' }, 
  nivel: { type: String, default: 'Junior' },
  esSupervisor: {type: Boolean, default: false},
  
  plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', default: null },

  datosContractuales: {
    fechaInicio: { type: Date, default: Date.now },
    fechaFin: { type: Date, default: null },
    horasContrato: { type: Number, default: 1492 },
    diasLibresAnuales: { type: Number, default: 6 }
  },
  
  estadoActual: {
    //horasRealizadas: { type: Number, default: 0 },
    balanceAnual: { type: Number, default: 0 },
    horasPrevistas: { type: Number, default: 0 },
    diasLibresRestantes: { type: Number, default: 6 } 
  },
  esNuevoUsuario: { type: Boolean, default: true } //para saber si debe de cambiar la contraseña

});

UsuarioSchema.index({ plantaId: 1 });

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema, "usuarios");

export default Usuario;