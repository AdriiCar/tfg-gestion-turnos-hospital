import mongoose, { Schema } from 'mongoose';

const ConfiguracionSchema = new Schema({
    parametrosGlobales: {
        horasTurnoM: { type: Number, default: 12 },
        horasTurnoN: { type: Number, default: 10 }
    },
    coberturaPlanta: {
        mañana: { 
            enfermeros: { type: Number, default: 3 }, 
            auxiliares: { type: Number, default: 2 } 
        },
        noche: { 
            enfermeros: { type: Number, default: 2 }, 
            auxiliares: { type: Number, default: 1 } 
        }
    },
    patronesBase: [{
        _id: false, //evitamos que mongo los cree y lo creamos desde el cliente
        id: {type: String, require: true},
        nombre: { type: String, required: true },
        secuencia: { type: [String], required: true }
    }],
}, { timestamps: true });

const Configuracion = mongoose.models.Configuracion || mongoose.model('Configuracion', ConfiguracionSchema, 'configuracionAlgoritmo');

export default Configuracion;