import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';


export async function middleware(request: NextRequest){
    
    if (!process.env.JWT_SECRET) return NextResponse.redirect(new URL('/', request.url));

    //obtenemos el token de las cookies
    const token = request.cookies.get('auth_token')?.value;
    const pathname = request.nextUrl.pathname;

    const isAuthRoot = pathname === "/"; //ruta del login

    //separamos las rutas por rol
    const rutasSupervisor = ["/planificador", "/rotacion", "/personal", "/solicitudes", "/perfil_supervisor", "/resumenSupervisor", "/calendarioSupervisor", "/solicitarDiaSupervisor", "/solicitarVacacionesSupervisor"];
    const rutasEmpleado = ["/resumen", "/calendario", "/solicitarDia", "/vacaciones", "/perfil"];
    
    //comprobamos a que ruta se quiere acceder
    const esRutaSupervisor = rutasSupervisor.some(ruta => pathname === ruta || pathname.startsWith(`${ruta}/`));
    const esRutaEmpleado = rutasEmpleado.some(ruta => pathname === ruta || pathname.startsWith(`${ruta}/`));
    const esRutaProtegida = esRutaSupervisor || esRutaEmpleado;


    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    //si se quiere acceder a una ruta protegida y no hay token se manda al login
    if(esRutaProtegida && !token){
        return NextResponse.redirect(new URL('/', request.url));
    }

    if(token){
        try {
            //desciframos el token para leer el rol
             const {payload} = await jwtVerify(token, secret);

             if(isAuthRoot){
                if (payload.esSupervisor) {
                    return NextResponse.redirect(new URL('/planificador', request.url));
                } else {
                    return NextResponse.redirect(new URL('/resumen', request.url));
                }
            }

            //protegemos los roles

            //si intenta acceder a una ruta del supervisor y no es supervisor lo mandamos a resumen de la vista de usuario normal
            if(esRutaSupervisor && !payload.esSupervisor){
                return NextResponse.redirect(new URL('/resumen', request.url));
            }

            //si es supervisor e intenta acceder a una ruta de un empleado normal le redirigimos al planificador
            if(esRutaEmpleado && payload.esSupervisor){
                return NextResponse.redirect(new URL('/planificador', request.url));
            }

        }catch(error){
            //o bien el token es falso, esta manipulado o ha caducado, borramos la cookie y redirigimos al login
            const response = NextResponse.redirect(new URL('/', request.url)); 
            response.cookies.delete('auth_token');
            return response;
        }
    }

    return NextResponse.next(); //si todo es correcto se le deja pasar
}

//excluimos la ruta api que solo contiene datos de inicialización
//excluimos rutas estáticas de next
export const config = {
    matcher: ['/((?!api|_next/static|_next/image).*)'],
};