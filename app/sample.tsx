export const ComponentePrueba = ({ numero, onClick }: { numero: number; onClick: () => void }) => {
    return (
        <div>
            <h1>Componente de Prueba: {numero}</h1>
            <p>Este es un componente de prueba para mostrar cómo se pueden comparar snippets de código.</p>
            <button onClick={onClick}>Hacer clic</button>
        </div>
    );
}

export const ComponentePrueba2 = () => {
    // server action
    return (
        <div>
            <ComponentePrueba numero={2} onClick={()=>console.log("Botón presionado")} />
            <h1>Componente de Prueba 2</h1>
            <p>Este es otro componente de prueba para mostrar cómo se pueden comparar snippets de código.</p>
        </div>
    );
}