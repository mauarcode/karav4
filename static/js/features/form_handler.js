// static/js/features/form_handler.js

// Importamos la función principal de nuestro nuevo módulo constructor
import { initializeForm } from './form_builder.js';

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('form-main-content');
    
    if (!mainContent) {
        console.error("Elemento del formulario no encontrado.");
        return;
    }

    // Notificamos al backend que el formulario ha sido visitado
    fetch(apiUrl('form/visited'), { method: 'POST' });

    // Pedimos al backend la estructura y los datos guardados
    try {
        const response = await fetch(apiUrl('form/data'));
        const data = await response.json();

        if (!data.success) {
            mainContent.innerHTML = '<h1>Error al cargar los datos del formulario.</h1>';
            return;
        }

        const { secciones, datos_guardados } = data;

        // Le pasamos el control y los datos al módulo constructor (sidebar ya no se usa)
        initializeForm(secciones, datos_guardados, null, mainContent);

    } catch (error) {
        console.error("Fallo al obtener los datos del formulario:", error);
        mainContent.innerHTML = '<h1>No se pudo conectar con el servidor.</h1>';
    }
});