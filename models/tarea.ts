import mongoose, { Schema } from 'mongoose';

const TareaSchema = new Schema({
    tipo: {type: String, required: true},
    estado: {
        type: String, 
        enum: ["queued", "in-progress", "completed", "failed"],
        default: "queued"
    },
    plantaId: {type: Schema.Types.ObjectId, ref: 'Planta', required: true},
    parametros: {type: Schema.Types.Mixed},
    resultado: {type: Schema.Types.Mixed},
    error: {type: String}
}, {timestamps: true});

TareaSchema.index({ estado: 1 });

const Tarea = mongoose.models.Tarea || mongoose.model('Tarea', TareaSchema, 'tareas');
export default Tarea;
