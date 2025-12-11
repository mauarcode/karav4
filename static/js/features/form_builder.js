// static/js/features/form_builder.js

function generarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Función de Ayuda para Enviar Datos ---
async function saveData(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert('¡Datos guardados con éxito!');
        } else {
            alert(`Error al guardar: ${result.message || 'Error desconocido.'}`);
        }
    } catch (error) {
        console.error('Error de red al guardar:', error);
        alert('Error de conexión al intentar guardar los datos.');
    }
}

// --- NUEVA: Función de Ayuda para Eliminar Datos ---
async function deleteData(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            console.log('Registro eliminado del servidor.');
        } else {
            alert(`Error al eliminar: ${result.message || 'Error desconocido.'}`);
        }
    } catch (error) {
        console.error('Error de red al eliminar:', error);
        alert('Error de conexión al intentar eliminar los datos.');
    }
}

function renderFormField(campo, valor, suffix = '') {
    const fieldId = `${campo.clave}${suffix}`;
    const placeholder = campo.nombre || 'Ingrese un valor';
    
    // Debug: verificar si el campo tiene validacion_input
    if (campo.validacion_input === 'NUMERICO') {
        console.log(`[FORM] Campo numérico detectado: ${campo.clave} - ${campo.nombre}`);
    }
    
    // Si el campo es de tipo CATÁLOGO, creamos un select con floating label
    if (campo.tipo === 'CATÁLOGO' && campo.catalogo) {
        // Crear opciones del select desde el catálogo
        let selectOptions = '<option value="">Selecciona una opción</option>';
        if (Array.isArray(campo.catalogo)) {
            campo.catalogo.forEach(opcion => {
                const selected = (valor === opcion) ? 'selected' : '';
                selectOptions += `<option value="${opcion}" ${selected}>${opcion}</option>`;
            });
        }
        
        // Select con floating label según Bootstrap 5
        let fieldHtml = `<div class="form-floating mb-3">`;
        fieldHtml += `<select class="form-select" id="${fieldId}" name="${fieldId}" aria-label="${campo.nombre}">`;
        fieldHtml += selectOptions;
        fieldHtml += `</select>`;
        fieldHtml += `<label for="${fieldId}">${campo.nombre}</label>`;
        fieldHtml += `</div>`;
        return fieldHtml;
    } else {
        // Determinar el tipo de input según validacion_input
        let inputType = 'text';
        let inputAttributes = '';
        
        if (campo.validacion_input === 'NUMERICO') {
            inputType = 'number';
            inputAttributes = 'step="any" inputmode="numeric"';
        }
        
        // Para campos normales, usar floating label
        let fieldHtml = `<div class="form-floating mb-3">`;
        // Agregar atributo data-numeric y clase si es numérico para validación
        if (campo.validacion_input === 'NUMERICO') {
            inputAttributes += ' data-numeric="true"';
            // Agregar clase para identificación adicional
            const classAttr = 'class="form-control campo-numerico"';
            fieldHtml += `<input type="${inputType}" ${classAttr} id="${fieldId}" name="${fieldId}" value="${valor || ''}" placeholder="${placeholder}" ${inputAttributes}>`;
        } else {
            fieldHtml += `<input type="${inputType}" class="form-control" id="${fieldId}" name="${fieldId}" value="${valor || ''}" placeholder="${placeholder}" ${inputAttributes}>`;
        }
        fieldHtml += `<label for="${fieldId}">${campo.nombre}</label>`;
        fieldHtml += `</div>`;
        return fieldHtml;
    }
}

// --- Reemplaza tu función 'renderGroupRecord' existente con esta ---
function renderGroupRecord(preguntas, datos, index, grupoKey) {
    // Genera un ID único si el registro es nuevo, o usa el que ya tiene.
    const idRegistro = datos._id_registro || generarUUID();

    let recordHtml = `
        <div class="group-record" data-grupo-key="${grupoKey}" data-record-index="${index}">
            <div class="group-record-header">
                <h4>Registro ${index + 1}</h4>
            </div>
    `;

    // Añadimos un campo oculto para almacenar el ID único del registro.
    recordHtml += `<input type="hidden" name="_id_registro_${index}" value="${idRegistro}">`;

    preguntas.forEach(campo => {
        const suffix = `_${index}`;
        const valor = datos[campo.clave] || '';
        recordHtml += renderFormField(campo, valor, suffix);
    });

    // Botones de acción al final del registro
    recordHtml += `<div class="d-flex gap-2 mt-3">`;
    recordHtml += `<button type="button" class="btn btn-primary btn-sm btn-save-group-record">Guardar Registro</button>`;
    recordHtml += `<button type="button" class="btn btn-danger btn-sm btn-delete-group-record" title="Eliminar este registro">`;
    recordHtml += `<i class="bi bi-trash"></i> Eliminar Registro`;
    recordHtml += `</button>`;
    recordHtml += `</div></div>`;
    return recordHtml;
}

// --- Funciones Principales del Módulo ---

function renderUI(secciones, datos_guardados, sidebar, mainContent) {
    // Obtener la URL base para el botón "Volver al Chat"
    const baseUrl = window.location.origin;
    const basePath = window.APP_BASE_PATH || '';
    const chatUrl = baseUrl + (basePath ? `${basePath}/chat?from_form=true` : '/chat?from_form=true');

    secciones.forEach(seccion => {
        // Crear link en el sidebar
        const link = document.createElement('a');
        link.href = `#${seccion.key}`;
        link.textContent = seccion.nombre;
        link.className = 'list-group-item list-group-item-action';
        link.dataset.target = seccion.key;
        sidebar.appendChild(link);

        // Crear estructura de sección con header y contenido con scroll independiente
        const sectionDiv = document.createElement('div');
        sectionDiv.id = seccion.key;
        sectionDiv.className = 'section';

        // Header de la sección con título, botón para abrir menú y botón "Volver al Chat"
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        
        // Botón para abrir el offcanvas
        const menuButton = document.createElement('button');
        menuButton.type = 'button';
        menuButton.className = 'btn btn-outline-secondary btn-sm';
        menuButton.setAttribute('data-bs-toggle', 'offcanvas');
        menuButton.setAttribute('data-bs-target', '#offcanvasSecciones');
        menuButton.setAttribute('aria-controls', 'offcanvasSecciones');
        menuButton.innerHTML = '<i class="bi bi-list"></i> Menú';
        menuButton.title = 'Abrir menú de secciones';
        
        const headerTitle = document.createElement('h3');
        headerTitle.textContent = seccion.nombre;
        headerTitle.style.flex = '1';
        headerTitle.style.margin = '0';
        
        const backButton = document.createElement('a');
        backButton.href = chatUrl;
        backButton.className = 'btn btn-outline-info btn-sm';
        backButton.innerHTML = '<i class="bi bi-arrow-left"></i> Volver al Chat';
        
        sectionHeader.appendChild(menuButton);
        sectionHeader.appendChild(headerTitle);
        sectionHeader.appendChild(backButton);

        // Contenedor con scroll independiente
        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content';

        let sectionHtml = '';

        if (seccion.naturaleza === 'grupo') {
            const grupoKey = seccion.key.replace('.json', '');
            const registros_guardados = datos_guardados.grupos[grupoKey] || [];
            sectionHtml += `<div id="grupo-container-${grupoKey}">`;
            if (registros_guardados.length > 0) {
                registros_guardados.forEach((registro, index) => {
                    sectionHtml += renderGroupRecord(seccion.preguntas, registro, index, grupoKey);
                });
            } else {
                sectionHtml += renderGroupRecord(seccion.preguntas, {}, 0, grupoKey);
            }
            sectionHtml += `</div>`;
            sectionHtml += `<button type="button" class="btn btn-success btn-add-group-record" data-grupo-key="${grupoKey}">Añadir otro registro</button>`;
        } else {
            seccion.preguntas.forEach(campo => {
                const valor = datos_guardados.entrevista[campo.clave] || '';
                sectionHtml += renderFormField(campo, valor);
            });
            sectionHtml += '<button type="button" class="btn btn-primary btn-save-section">Guardar Sección</button>';
        }

        sectionContent.innerHTML = sectionHtml;

        // Ensamblar la sección
        sectionDiv.appendChild(sectionHeader);
        sectionDiv.appendChild(sectionContent);
        mainContent.appendChild(sectionDiv);
    });
}

function getBootstrap() {
    // Asegura acceso seguro a la instancia global de Bootstrap
    return window.bootstrap || null;
}

function setupNavigation(sidebar, mainContent) {
    const firstLink = sidebar.querySelector('a');
    const firstSection = mainContent.querySelector('.section');
    if (firstLink && firstSection) {
        firstLink.classList.add('active');
        firstSection.classList.add('active');
    }
    
    // Obtener referencia al offcanvas
    const bs = getBootstrap();
    const offcanvasElement = document.getElementById('offcanvasSecciones');
    const offcanvas = bs && offcanvasElement ? bs.Offcanvas.getOrCreateInstance(offcanvasElement) : null;
    
    sidebar.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLink = e.target.closest('a');
        if (!targetLink) return;
        
        // Actualizar navegación
        sidebar.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        mainContent.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        targetLink.classList.add('active');
        const targetSection = document.getElementById(targetLink.dataset.target);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Cerrar el offcanvas después de seleccionar una sección
        if (offcanvas) {
            offcanvas.hide();
        }
    });
    
    // Abrir el offcanvas automáticamente al cargar por primera vez
    // Si no hay bootstrap, no intentamos mostrar el offcanvas
    if (!offcanvas) return;

    // Usar setTimeout para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
        offcanvas.show();
    }, 150);
}

function setupEventListeners(mainContent, secciones) {
    // Listener principal para todos los botones dentro del formulario
    mainContent.addEventListener('click', async (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;

        // Guardar sección de datos planos
        if (targetButton.matches('.btn-save-section')) {
            e.preventDefault();
            const sectionDiv = targetButton.closest('.section');
            const inputs = sectionDiv.querySelectorAll('input, select, textarea');
            const payload = {};
            inputs.forEach(input => { 
                if (input.type !== 'hidden') {
                    payload[input.name] = input.value; 
                }
            });
            await saveData(apiUrl('form/save_section'), payload);
            
            // Abrir el offcanvas después de guardar
            const bs = getBootstrap();
            const offcanvasElement = document.getElementById('offcanvasSecciones');
            if (bs && offcanvasElement) {
                const offcanvas = bs.Offcanvas.getOrCreateInstance(offcanvasElement);
                offcanvas.show();
            }
        }

        // Guardar un registro de grupo
        if (targetButton.matches('.btn-save-group-record')) {
            e.preventDefault();
            const recordDiv = targetButton.closest('.group-record');
            const grupoKey = recordDiv.dataset.grupoKey;
            const inputs = recordDiv.querySelectorAll('input, select, textarea');
            const payload = {};
            inputs.forEach(input => {
                if (input.type !== 'hidden') {
                    // Extrae el nombre original del campo, incluyendo _id_registro
                    const originalName = input.name.substring(0, input.name.lastIndexOf('_'));
                    payload[originalName] = input.value;
                }
            });
            await saveData(apiUrl(`form/save_group_item/${grupoKey}`), payload);
        }

        // Abrir el modal del catálogo (Bootstrap 5)
        if (targetButton.matches('.btn-catalogo')) {
            e.preventDefault();
            e.stopPropagation();
            const targetInputId = targetButton.dataset.targetInput;
            const catalogoTitle = targetButton.dataset.title || 'Selecciona una opción';
            let opciones = [];
            try {
                const catalogoData = targetButton.dataset.catalogo;
                if (catalogoData) {
                    opciones = JSON.parse(catalogoData);
                }
            } catch (error) {
                console.error('[ERROR] Error al parsear catálogo:', error);
            }
            
            const modalTitle = document.getElementById('catalogo-modal-title');
            const modalBody = document.getElementById('catalogo-modal-body');
            const modalElement = document.getElementById('catalogo-modal');
            
            if (modalTitle) modalTitle.textContent = catalogoTitle;
            if (modalBody) {
                modalBody.innerHTML = '';
                if (Array.isArray(opciones) && opciones.length > 0) {
                    opciones.forEach(opcion => {
                        const optButton = document.createElement('button');
                        optButton.type = 'button';
                        optButton.className = 'btn btn-outline-info w-100 mb-2 btn-catalogo-option';
                        optButton.textContent = opcion;
                        optButton.dataset.targetInput = targetInputId;
                        modalBody.appendChild(optButton);
                    });
                } else {
                    modalBody.innerHTML = '<p class="text-muted">No hay opciones disponibles en el catálogo.</p>';
                }
            }
            
            // Usar Bootstrap 5 modal API
            if (modalElement) {
                const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                modal.show();
            }
        }

        // Añadir un nuevo registro de grupo
        if (targetButton.matches('.btn-add-group-record')) {
            e.preventDefault();
            const grupoKey = targetButton.dataset.grupoKey;
            const seccion = secciones.find(s => s.key.replace('.json', '') === grupoKey);
            const container = document.getElementById(`grupo-container-${grupoKey}`);
            if (container && seccion) {
                const newIndex = container.children.length;
                const newRecordDiv = document.createElement('div');
                newRecordDiv.innerHTML = renderGroupRecord(seccion.preguntas, {}, newIndex, grupoKey);
                container.appendChild(newRecordDiv);
            }
        }

        // Eliminar registro de grupo
        if (targetButton.matches('.btn-delete-group-record')) {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                const recordDiv = targetButton.closest('.group-record');
                const registroId = recordDiv.querySelector('input[type="hidden"]')?.value;
                const grupoKey = recordDiv.dataset.grupoKey;
                
                if (registroId && grupoKey) {
                    await deleteData(apiUrl(`form/delete_group_item/${grupoKey}`), { registro_id: registroId });
                    recordDiv.remove();
                } else {
                    // Si es un registro nuevo sin guardar, simplemente eliminarlo
                    recordDiv.remove();
                }
            }
        }
    });

    // Listener para las opciones DENTRO del modal (Bootstrap 5)
    const modalElement = document.getElementById('catalogo-modal');
    if(modalElement) {
        modalElement.addEventListener('click', (e) => {
            if (e.target.matches('.btn-catalogo-option')) {
                const targetInputId = e.target.dataset.targetInput;
                const selectedValue = e.target.textContent;
                const targetInput = document.getElementById(targetInputId);
                if (targetInput) {
                    targetInput.value = selectedValue;
                    // Disparar evento input para que el floating label se ajuste
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                // Cerrar modal con Bootstrap 5 API
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        });
    }
    
    // Función auxiliar para validar si un input es numérico
    function esCampoNumerico(input) {
        return input && (
            input.type === 'number' || 
            input.hasAttribute('data-numeric') || 
            input.classList.contains('campo-numerico')
        );
    }
    
    // Validación numérica en tiempo real para campos con validacion_input="NUMERICO"
    mainContent.addEventListener('input', (e) => {
        const input = e.target;
        if (esCampoNumerico(input)) {
            // Permitir solo números, punto decimal y signo negativo
            let value = input.value;
            // Remover caracteres no numéricos excepto punto y signo negativo
            value = value.replace(/[^\d.-]/g, '');
            // Asegurar que solo haya un punto decimal
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            // Asegurar que el signo negativo esté solo al inicio
            if (value.includes('-') && value.indexOf('-') !== 0) {
                value = value.replace(/-/g, '');
                if (value.length > 0) {
                    value = '-' + value;
                }
            }
            if (input.value !== value) {
                input.value = value;
            }
        }
    });
    
    // Prevenir entrada de caracteres no numéricos en campos numéricos
    mainContent.addEventListener('keypress', (e) => {
        const input = e.target;
        if (esCampoNumerico(input)) {
            const char = String.fromCharCode(e.which || e.keyCode);
            // Permitir números, punto, signo negativo y teclas de control
            if (!/[0-9.\-]/.test(char) && !e.ctrlKey && !e.metaKey && 
                !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                return false;
            }
        }
    });
    
    // Prevenir pegar texto no numérico en campos numéricos
    mainContent.addEventListener('paste', (e) => {
        const input = e.target;
        if (esCampoNumerico(input)) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            // Limpiar el texto pegado para dejar solo números, punto y signo negativo
            let cleanedValue = pastedText.replace(/[^\d.-]/g, '');
            // Asegurar que solo haya un punto decimal
            const parts = cleanedValue.split('.');
            if (parts.length > 2) {
                cleanedValue = parts[0] + '.' + parts.slice(1).join('');
            }
            // Asegurar que el signo negativo esté solo al inicio
            if (cleanedValue.includes('-') && cleanedValue.indexOf('-') !== 0) {
                cleanedValue = cleanedValue.replace(/-/g, '');
                if (cleanedValue.length > 0) {
                    cleanedValue = '-' + cleanedValue;
                }
            }
            input.value = cleanedValue;
            // Disparar evento input para que se actualice el valor
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    
    // Validar y marcar campos numéricos después de renderizar
    function marcarCamposNumericos() {
        const numericInputs = mainContent.querySelectorAll('input[type="number"], input.campo-numerico, input[data-numeric]');
        console.log(`[FORM] Marcando ${numericInputs.length} campos numéricos`);
        numericInputs.forEach(input => {
            // Marcar como campo numérico
            input.setAttribute('data-numeric', 'true');
            input.classList.add('campo-numerico');
            // Forzar type="number" si no lo tiene
            if (input.type !== 'number') {
                input.type = 'number';
            }
            console.log(`[FORM] Campo marcado como numérico: ${input.id} (type: ${input.type})`);
        });
    }
    
    // Marcar campos numéricos inmediatamente y después de cambios en el DOM
    setTimeout(() => {
        marcarCamposNumericos();
    }, 100);
    
    // Usar MutationObserver para detectar cuando se agregan nuevos campos
    const observer = new MutationObserver(() => {
        marcarCamposNumericos();
    });
    
    observer.observe(mainContent, {
        childList: true,
        subtree: true
    });
}

/**
 * Función principal y pública de este módulo.
 * Orquesta la creación y activación del formulario.
 */
export function initializeForm(secciones, datos_guardados, sidebar, mainContent) {
    renderUI(secciones, datos_guardados, sidebar, mainContent);
    setupNavigation(sidebar, mainContent);
    setupEventListeners(mainContent, secciones);
}
