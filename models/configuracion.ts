import mongoose, { Schema } from 'mongoose';

const ConfiguracionSchema = new Schema({
    parametrosGlobales: {
        horasTurnoM: { type: Number, default: 12 },
        horasTurnoN: { type: Number, default: 10 }
    },
    coberturaPlanta: {
        turnoM: { 
            enfermeros: { type: Number, default: 3 }, 
            auxiliares: { type: Number, default: 2 } 
        },
        noche: { 
            enfermeros: { type: Number, default: 2 }, 
            auxiliares: { type: Number, default: 1 } 
        }
    },
    patronesBase: [{
        nombre: { type: String, required: true },
        secuencia: { type: [String], required: true }
    }],
    plantaId: { type: Schema.Types.ObjectId, ref: 'Planta', required: true }
}, { timestamps: true });

const Configuracion = mongoose.models.Configuracion || mongoose.model('Configuracion', ConfiguracionSchema, 'configuracionAlgoritmo');

export default Configuracion;