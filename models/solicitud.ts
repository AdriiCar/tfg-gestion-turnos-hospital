import mongoose, { Schema } from 'mongoose';

const SolicitudSchema = new Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipoDia: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  fechaSolicitud: { type: Date, default: Date.now }, 
  comentario: { type: String, default: "" },
  estado: { type: String, default: "Pendiente" },
  sustitutoNombre: { type: String, default: null },
  sustitutoCorreo: { type: String, default: null }
}, { timestamps: true });

const Solicitud = mongoose.models.Solicitud || mongoose.model('Solicitud', SolicitudSchema, 'solicitudes');

export default Solicitud;