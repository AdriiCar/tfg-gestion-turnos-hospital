import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';


export async function middleware(request: NextRequest){
    
    //obtenemos el token de las cookies
    const token = request.cookies.get('auth_token')?.value;

    const isAuthRoot = request.nextUrl.pathname === "/"; //ruta del login

    const isProtectedRoute = request.nextUrl.pathname.startsWith("/resumen") ||
                             request.nextUrl.pathname.startsWith("/calendario") ||
                             request.nextUrl.pathname.startsWith("/solicitarDia") ||
                             request.nextUrl.pathname.startsWith("/vacaciones") ||
                             request.nextUrl.pathname.startsWith("/planificador") ||
                             request.nextUrl.pathname.startsWith("/rotacion") ||
                             request.nextUrl.pathname.startsWith("/solicitudes") ||
                             request.nextUrl.pathname.startsWith("/personal");
    

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    if(isProtectedRoute && !token){
        return NextResponse.redirect(new URL('/', request.url));
    }

    if(token){
        try {
             const {payload} = await jwtVerify(token, secret);

             if(isAuthRoot){
                if (payload.esSupervisor) {
                    return NextResponse.redirect(new URL('/planificador', request.url));
                } else {
                    return NextResponse.redirect(new URL('/resumen', request.url));
                }
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


export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};