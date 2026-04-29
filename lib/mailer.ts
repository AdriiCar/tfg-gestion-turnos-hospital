import nodemailer from "nodemailer";

export async function enviarCorreoBienvenida(emailDestino: string, nombre: string, passwordTemporal: string) {
    try {
        //configuramos SMTP usando google
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        //definimos el correo que se envia al nuevo usuario
        const opcionesCorreo = {
            from: `"Planificador Hospitalario" <${process.env.EMAIL_USER}>`,
            to: emailDestino,
            subject: "Tus credenciales de acceso al Planificador",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0088CC;">¡Hola, ${nombre}!</h2>
                    <p>Has sido/a dado de alta en el sistema de gestión de turnos del hospital.</p>
                    <p>Tus datos de acceso son:</p>
                    <ul style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; list-style: none;">
                        <li><strong>Usuario:</strong> ${emailDestino}</li>
                        <li><strong>Contraseña temporal:</strong> <span style="font-family: monospace; font-size: 18px;">${passwordTemporal}</span></li>
                    </ul>
                    <p style="color: #DC2626; font-size: 14px;">
                        <em>Por motivos de seguridad, se le recomendaría que modifique la contraseña por defecto.</em>
                    </p>
                    <p>Un saludo,<br>El equipo de Supervisión.</p>
                </div>
            `,
        };
        //lo enviamos
        await transporter.sendMail(opcionesCorreo);
        return { exito: true };
    } catch (error) {
        return { exito: false, error };
    }
}