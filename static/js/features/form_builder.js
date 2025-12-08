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
            return { success: true, message: '¡Datos guardados con éxito!' };
        } else {
            return { success: false, message: result.message || 'Error desconocido.' };
        }
    } catch (error) {
        console.error('Error de red al guardar:', error);
        return { success: false, message: 'Error de conexión al intentar guardar los datos.' };
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
    let fieldHtml = `<div class="form-group"><label for="${campo.clave}${suffix}">${campo.nombre}</label>`;

    // Si el campo es de tipo CATÁLOGO, usamos la estructura de 'input-group' para el botón.
    if (campo.tipo === 'CATÁLOGO' && campo.catalogo) {
        fieldHtml += `<div class="input-group">`;
        fieldHtml += `<input type="text" class="form-control" id="${campo.clave}${suffix}" name="${campo.clave}${suffix}" value="${valor || ''}">`;
        fieldHtml += `
            <span class="input-group-btn">
                <button class="btn btn-default btn-catalogo" type="button" 
                        data-target-input="${campo.clave}${suffix}" 
                        data-catalogo='${JSON.stringify(campo.catalogo)}'
                        data-title="Selecciona: ${campo.nombre}">
                    <span class="glyphicon glyphicon-list"></span>
                </button>
            </span>
        `;
        fieldHtml += `</div>`; // Cierra input-group
    } else {
        // Para campos normales, un input simple con 'form-control' es suficiente para que ocupe todo el ancho.
        fieldHtml += `<input type="text" class="form-control" id="${campo.clave}${suffix}" name="${campo.clave}${suffix}" value="${valor || ''}">`;
    }

    fieldHtml += `</div>`; // Cierra form-group
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
                <button type="button" class="btn btn-danger btn-xs btn-delete-group-record" title="Eliminar este registro">
                    <span class="glyphicon glyphicon-trash"></span>
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

// --- Funciones Principales del Módulo con Accordion ---

function renderUI(secciones, datos_guardados, mainContent) {
    // Crear el contenedor del accordion
    const accordionContainer = document.createElement('div');
    accordionContainer.className = 'panel-group';
    accordionContainer.id = 'form-accordion';
    accordionContainer.setAttribute('role', 'tablist');
    accordionContainer.setAttribute('aria-multiselectable', 'true');

    secciones.forEach((seccion, index) => {
        const seccionId = seccion.key.replace(/[^a-zA-Z0-9]/g, '_');
        const headingId = `heading_${seccionId}`;
        const collapseId = `collapse_${seccionId}`;
        const isFirst = index === 0;

        // Crear el panel del accordion
        const panelDiv = document.createElement('div');
        panelDiv.className = 'panel panel-default';
        panelDiv.setAttribute('data-seccion-key', seccion.key);
        panelDiv.setAttribute('data-seccion-index', index);

        // Panel heading
        const panelHeading = document.createElement('div');
        panelHeading.className = 'panel-heading';
        panelHeading.setAttribute('role', 'tab');
        panelHeading.id = headingId;

        const panelTitle = document.createElement('h4');
        panelTitle.className = 'panel-title';

        const titleLink = document.createElement('a');
        titleLink.setAttribute('role', 'button');
        titleLink.setAttribute('data-toggle', 'collapse');
        titleLink.setAttribute('data-parent', '#form-accordion');
        titleLink.href = `#${collapseId}`;
        titleLink.setAttribute('aria-expanded', isFirst ? 'true' : 'false');
        titleLink.setAttribute('aria-controls', collapseId);
        if (!isFirst) {
            titleLink.className = 'collapsed';
        }
        titleLink.textContent = seccion.nombre;

        panelTitle.appendChild(titleLink);
        panelHeading.appendChild(panelTitle);

        // Panel collapse
        const panelCollapse = document.createElement('div');
        panelCollapse.id = collapseId;
        panelCollapse.className = `panel-collapse collapse ${isFirst ? 'in' : ''}`;
        panelCollapse.setAttribute('role', 'tabpanel');
        panelCollapse.setAttribute('aria-labelledby', headingId);

        const panelBody = document.createElement('div');
        panelBody.className = 'panel-body';

        let sectionHtml = '';

        if (seccion.naturaleza === 'grupo') {
            const grupoKey = seccion.key.replace('.json', '');
            const registros_guardados = datos_guardados.grupos[grupoKey] || [];
            sectionHtml += `<div id="grupo-container-${grupoKey}">`;
            if (registros_guardados.length > 0) {
                registros_guardados.forEach((registro, regIndex) => {
                    sectionHtml += renderGroupRecord(seccion.preguntas, registro, regIndex, grupoKey);
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
            sectionHtml += '<button type="button" class="btn btn-primary btn-save-section" data-seccion-index="' + index + '">Guardar Sección</button>';
        }

        panelBody.innerHTML = sectionHtml;
        panelCollapse.appendChild(panelBody);

        // Ensamblar el panel
        panelDiv.appendChild(panelHeading);
        panelDiv.appendChild(panelCollapse);
        accordionContainer.appendChild(panelDiv);
    });

    mainContent.innerHTML = '';
    mainContent.appendChild(accordionContainer);
}

function setupEventListeners(mainContent, secciones) {
    // Listener principal para todos los botones dentro del formulario
    mainContent.addEventListener('click', async (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;

        // Guardar sección de datos planos
        if (targetButton.matches('.btn-save-section')) {
            e.preventDefault();
            const seccionIndex = parseInt(targetButton.getAttribute('data-seccion-index'));
            const panel = targetButton.closest('.panel');
            const panelCollapse = panel.querySelector('.panel-collapse');
            const inputs = panelCollapse.querySelectorAll('input, select, textarea');
            
            const payload = {};
            inputs.forEach(input => { 
                if (input.type !== 'hidden') {
                    payload[input.name] = input.value; 
                }
            });
            
            const result = await saveData(apiUrl('form/save_section'), payload);
            
            if (result.success) {
                // Cerrar el accordion actual
                const collapseId = panelCollapse.id;
                $(`#${collapseId}`).collapse('hide');
                
                // Abrir el siguiente accordion
                const nextPanel = panel.nextElementSibling;
                if (nextPanel) {
                    const nextCollapse = nextPanel.querySelector('.panel-collapse');
                    if (nextCollapse) {
                        const nextCollapseId = nextCollapse.id;
                        $(`#${nextCollapseId}`).collapse('show');
                        // Scroll suave al siguiente panel
                        nextPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    // Si no hay más secciones, mostrar mensaje de completado
                    alert('¡Formulario completado! Todas las secciones han sido guardadas.');
                }
            } else {
                alert(result.message || 'Error al guardar los datos.');
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
                    // Extrae el nombre original del campo
                    const originalName = input.name.substring(0, input.name.lastIndexOf('_'));
                    payload[originalName] = input.value;
                }
            });
            
            const result = await saveData(apiUrl(`form/save_group_item/${grupoKey}`), payload);
            if (result.success) {
                alert(result.message || 'Registro guardado correctamente.');
            } else {
                alert(result.message || 'Error al guardar el registro.');
            }
        }

        // Abrir el modal del catálogo
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
                    optButton.className = 'btn btn-block btn-info btn-catalogo-option';
                    optButton.textContent = opcion;
                    optButton.dataset.targetInput = targetInputId;
                    modalBody.appendChild(optButton);
                });
            }
            $('#catalogo-modal').modal('show');
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
                    const result = await deleteData(apiUrl(`form/delete_group_item/${grupoKey}`), { registro_id: registroId });
                    if (result && result.success) {
                        recordDiv.remove();
                    }
                } else {
                    // Si es un registro nuevo sin guardar, simplemente eliminarlo
                    recordDiv.remove();
                }
            }
        }
    });

    // Listener para las opciones DENTRO del modal
    const modal = document.getElementById('catalogo-modal');
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.btn-catalogo-option')) {
                const targetInputId = e.target.dataset.targetInput;
                const selectedValue = e.target.textContent;
                const targetInput = document.getElementById(targetInputId);
                if (targetInput) {
                    targetInput.value = selectedValue;
                }
                $('#catalogo-modal').modal('hide');
            }
        });
    }
}

/**
 * Función principal y pública de este módulo.
 * Orquesta la creación y activación del formulario con accordion.
 */
export function initializeForm(secciones, datos_guardados, sidebar, mainContent) {
    // Ya no usamos el sidebar, solo el mainContent
    renderUI(secciones, datos_guardados, mainContent);
    setupEventListeners(mainContent, secciones);
}
