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
    let fieldHtml = `<div class="mb-3"><label for="${campo.clave}${suffix}" class="form-label">${campo.nombre}</label>`;

    // Si el campo es de tipo CATÁLOGO, usamos la estructura de 'input-group' para el botón.
    if (campo.tipo === 'CATÁLOGO' && campo.catalogo) {
        fieldHtml += `<div class="input-group">`;
        fieldHtml += `<input type="text" class="form-control" id="${campo.clave}${suffix}" name="${campo.clave}${suffix}" value="${valor || ''}">`;
        fieldHtml += `
            <button class="btn btn-outline-secondary btn-catalogo" type="button" 
                    data-target-input="${campo.clave}${suffix}" 
                    data-catalogo='${JSON.stringify(campo.catalogo)}'
                    data-title="Selecciona: ${campo.nombre}">
                <i class="bi bi-list-ul"></i>
            </button>
        `;
        fieldHtml += `</div>`; // Cierra input-group
    } else {
        // Para campos normales, un input simple con 'form-control' es suficiente para que ocupe todo el ancho.
        fieldHtml += `<input type="text" class="form-control" id="${campo.clave}${suffix}" name="${campo.clave}${suffix}" value="${valor || ''}">`;
    }

    fieldHtml += `</div>`; // Cierra mb-3 (form-group en Bootstrap 5)
    return fieldHtml;
}

// --- Reemplaza tu función 'renderGroupRecord' existente con esta ---
function renderGroupRecord(preguntas, datos, index, grupoKey) {
    // Genera un ID único si el registro es nuevo, o usa el que ya tiene.
    const idRegistro = datos._id_registro || generarUUID();

    let recordHtml = `
        <div class="group-record" data-grupo-key="${grupoKey}" data-record-index="${index}">
            <div class="group-record-header">
                <h4>Registro ${index + 1}</h4>
                <button type="button" class="btn btn-danger btn-sm btn-delete-group-record" title="Eliminar este registro">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
    `;

    // Añadimos un campo oculto para almacenar el ID único del registro.
    recordHtml += `<input type="hidden" name="_id_registro_${index}" value="${idRegistro}">`;

    preguntas.forEach(campo => {
        const suffix = `_${index}`;
        const valor = datos[campo.clave] || '';
        recordHtml += renderFormField(campo, valor, suffix);
    });

    recordHtml += `<button type="button" class="btn btn-primary btn-sm btn-save-group-record">Guardar Registro</button></div>`;
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

        // Header de la sección con título y botón "Volver al Chat"
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.innerHTML = `
            <h3>${seccion.nombre}</h3>
            <a href="${chatUrl}" class="btn btn-outline-info btn-sm">
                <i class="bi bi-arrow-left"></i> Volver al Chat
            </a>
        `;

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

function setupNavigation(sidebar, mainContent) {
    const firstLink = sidebar.querySelector('a');
    const firstSection = mainContent.querySelector('.section');
    if (firstLink && firstSection) {
        firstLink.classList.add('active');
        firstSection.classList.add('active');
    }
    sidebar.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLink = e.target.closest('a');
        if (!targetLink) return;
        sidebar.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        mainContent.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        targetLink.classList.add('active');
        const targetSection = document.getElementById(targetLink.dataset.target);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    });
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
            const targetInputId = targetButton.dataset.targetInput;
            const catalogoTitle = targetButton.dataset.title;
            const opciones = JSON.parse(targetButton.dataset.catalogo);
            const modalTitle = document.getElementById('catalogo-modal-title');
            const modalBody = document.getElementById('catalogo-modal-body');
            if (modalTitle) modalTitle.textContent = catalogoTitle;
            if (modalBody) {
                modalBody.innerHTML = '';
                opciones.forEach(opcion => {
                    const optButton = document.createElement('button');
                    optButton.className = 'btn btn-outline-info w-100 mb-2 btn-catalogo-option';
                    optButton.textContent = opcion;
                    optButton.dataset.targetInput = targetInputId;
                    modalBody.appendChild(optButton);
                });
            }
            // Usar Bootstrap 5 modal API
            const modal = new bootstrap.Modal(document.getElementById('catalogo-modal'));
            modal.show();
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
                }
                // Cerrar modal con Bootstrap 5 API
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        });
    }
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
