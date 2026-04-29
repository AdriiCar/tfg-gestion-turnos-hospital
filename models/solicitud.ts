import mongoose, { Schema } from 'mongoose';

const SolicitudSchema = new Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipoDia: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  fechaSolicitud: { type: Date, default: Date.now }, 
  comentario: { type: String, default: "" },
  estado: { type: String, default: "Pendiente" },
  esDeSistema: { type: Boolean, default: false },
  plantaId: { type: Schema.Types.ObjectId, ref: 'Planta' },
  rotacionRelacionada: { type: Schema.Types.ObjectId, ref: 'Rotacion', default: null },
  documentoAdjunto: { type: String, default: "" }, 
  nombreDocumento: { type: String, default: "" }
}, { timestamps: true });


SolicitudSchema.index({ estado: 1, fechaInicio: 1, fechaFin: 1 });
SolicitudSchema.index({ plantaId: 1, esDeSistema: 1, fechaInicio: 1, fechaFin: 1 });
SolicitudSchema.index({ usuarioId: 1, estado: 1, fechaInicio: 1, fechaFin: 1 });
SolicitudSchema.index({ rotacionRelacionada: 1, estado: 1, esDeSistema: 1 });

const Solicitud = mongoose.models.Solicitud || mongoose.model('Solicitud', SolicitudSchema, 'solicitudes');

export default Solicitud;