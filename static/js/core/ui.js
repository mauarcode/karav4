let recordingTimerInterval;

// Variable global para almacenar la función sendMessage (se asignará desde events.js)
let globalSendMessage = null;

export function setSendMessageFunction(fn) {
    globalSendMessage = fn;
    if (typeof window !== 'undefined') {
        window.globalSendMessage = fn;
    }
}

/**
 * Actualiza el nombre de usuario en la UI.
 * @param {string} username - El nombre de usuario a mostrar.
 */
export function setUsername(username) {
    window.currentUsername = username;
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    }
}

/**
 * Añade un mensaje a la lista de mensajes en la pantalla.
 * @param {object} msg - El objeto del mensaje.
 * @param {string} msg.username - El nombre del remitente.
 * @param {string} msg.content - El contenido del mensaje.
 * @param {'image'|'video'} [msg.mediaType] - El tipo de medio.
 * @param {object} [msg.opciones_catalogo] - Opciones de catálogo para mostrar como botones.
 */
// En ui.js
export function addMessageToUI(msg) {
    const messageList = document.getElementById('message-list');
    if (!messageList || !msg) return;

    // Verifica que haya contenido de texto o un medio para mostrar
    if (!msg.content && !msg.mediaUrl && !msg.opciones_catalogo && !msg.validacion_curp_metadata && !msg.validacion_rfc_metadata && !msg.validacion_localidad_metadata && !msg.validacion_geolocaliza_metadata && !msg.confirmacion_metadata) return;

    // Determinar si es un mensaje enviado (del usuario) o recibido (del bot)
    // Los mensajes de KARA/Kara siempre son recibidos, cualquier otro es enviado
    const isUserMessage = msg.username && 
                          msg.username !== 'KARA' && 
                          msg.username !== 'Kara' && 
                          msg.username !== 'Sistema';
    const messageClass = isUserMessage ? 'sent' : 'received';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageClass}`;

    let contentHtml = (messageClass === 'received') 
        ? `<div class="message-sender">${msg.username}</div>` 
        : '';

    // Si hay una URL de un medio, crea la etiqueta correspondiente
    if (msg.mediaUrl && msg.mediaType) {
        if (msg.mediaType === 'image') {
            contentHtml += `<img src="${msg.mediaUrl}" class="chat-image" alt="Imagen enviada">`;
        } else if (msg.mediaType === 'video') {
            contentHtml += `<video src="${msg.mediaUrl}" class="chat-video" controls></video>`;
        }
    }

    // Si hay texto, añadirlo
    if (msg.content) {
        contentHtml += `<p>${msg.content.replace(/\n/g, '<br>')}</p>`;
    }

    // Si hay opciones de catálogo, crear botones
    if (msg.opciones_catalogo && msg.opciones_catalogo.opciones) {
        const opciones = msg.opciones_catalogo.opciones;
        contentHtml += `<div class="opciones-catalogo-container">`;
        opciones.forEach((opcion, index) => {
            const botonClass = opcion.es_otro ? 'opcion-catalogo-boton opcion-otro' : 'opcion-catalogo-boton';
            contentHtml += `<button class="${botonClass}" data-valor="${opcion.texto}" data-clave="${opcion.clave}">${opcion.texto}</button>`;
        });
        contentHtml += `</div>`;
    }
    
    // Si hay confirmación, crear botones SI/NO
    if (msg.confirmacion_metadata && msg.confirmacion_metadata.opciones) {
        const opciones_conf = msg.confirmacion_metadata.opciones;
        contentHtml += `<div class="opciones-catalogo-container">`;
        opciones_conf.forEach((opcion) => {
            const botonClass = opcion.accion === "confirmar" ? 'opcion-catalogo-boton opcion-si' : 'opcion-catalogo-boton opcion-no';
            contentHtml += `<button class="${botonClass}" data-accion="${opcion.accion}" data-texto="${opcion.texto}">${opcion.texto}</button>`;
        });
        contentHtml += `</div>`;
    }
    
    // Si hay validación CURP, crear botones de aceptar/corregir
    if (msg.validacion_curp_metadata && msg.validacion_curp_metadata.opciones) {
        console.log('[DEBUG] Renderizando botones de validación CURP:', msg.validacion_curp_metadata);
        const opciones_curp = msg.validacion_curp_metadata.opciones;
        contentHtml += `<div class="opciones-catalogo-container">`;
        opciones_curp.forEach((opcion) => {
            const botonClass = opcion.accion === "aceptar_curp" ? 'opcion-catalogo-boton opcion-si' : 'opcion-catalogo-boton opcion-no';
            contentHtml += `<button class="${botonClass}" data-accion="${opcion.accion}" data-valor="${opcion.valor || ''}" data-texto="${opcion.texto}">${opcion.texto}</button>`;
        });
        contentHtml += `</div>`;
    } else {
        console.log('[DEBUG] No hay validacion_curp_metadata o no tiene opciones:', msg);
    }
    
    // Si hay validación RFC, crear botones de aceptar/corregir
    if (msg.validacion_rfc_metadata && msg.validacion_rfc_metadata.opciones) {
        console.log('[DEBUG] Renderizando botones de validación RFC:', msg.validacion_rfc_metadata);
        const opciones_rfc = msg.validacion_rfc_metadata.opciones;
        contentHtml += `<div class="opciones-catalogo-container">`;
        opciones_rfc.forEach((opcion) => {
            const botonClass = opcion.accion === "aceptar_rfc" ? 'opcion-catalogo-boton opcion-si' : 'opcion-catalogo-boton opcion-no';
            contentHtml += `<button class="${botonClass}" data-accion="${opcion.accion}" data-valor="${opcion.valor || ''}" data-texto="${opcion.texto}">${opcion.texto}</button>`;
        });
        contentHtml += `</div>`;
    } else {
        console.log('[DEBUG] No hay validacion_rfc_metadata o no tiene opciones:', msg);
    }
    
    // Si hay validación Localidad, crear botones
    console.log('[DEBUG] Verificando validacion_localidad_metadata:', msg.validacion_localidad_metadata);
    if (msg.validacion_localidad_metadata) {
        console.log('[DEBUG] validacion_localidad_metadata existe:', msg.validacion_localidad_metadata);
        console.log('[DEBUG] Tiene opciones?', msg.validacion_localidad_metadata.opciones);
        if (msg.validacion_localidad_metadata.opciones) {
            console.log('[DEBUG] Renderizando botones de validación Localidad:', msg.validacion_localidad_metadata);
            const opciones_localidad = msg.validacion_localidad_metadata.opciones;
            console.log('[DEBUG] Número de opciones:', opciones_localidad.length);
            contentHtml += `<div class="opciones-catalogo-container">`;
            opciones_localidad.forEach((opcion, index) => {
                console.log(`[DEBUG] Procesando opción ${index}:`, opcion);
                let botonClass = 'opcion-catalogo-boton';
                if (opcion.accion === "aceptar_localidad") {
                    botonClass += ' opcion-si';
                } else if (opcion.accion === "otro_localidad") {
                    botonClass += ' opcion-no';
                } else {
                    botonClass += ' opcion-no';
                }
                contentHtml += `<button class="${botonClass}" data-accion="${opcion.accion}" data-valor="${opcion.valor || ''}" data-texto="${opcion.texto}">${opcion.texto}</button>`;
            });
            contentHtml += `</div>`;
            console.log('[DEBUG] HTML de botones agregado a contentHtml');
        } else {
            console.log('[DEBUG] validacion_localidad_metadata existe pero no tiene opciones:', msg.validacion_localidad_metadata);
        }
    } else {
        console.log('[DEBUG] No hay validacion_localidad_metadata en msg:', msg);
    }
    
    // Si hay validación Geolocalización, crear botones
    console.log('[DEBUG] Verificando validacion_geolocaliza_metadata:', msg.validacion_geolocaliza_metadata);
    if (msg.validacion_geolocaliza_metadata) {
        console.log('[DEBUG] validacion_geolocaliza_metadata existe:', msg.validacion_geolocaliza_metadata);
        console.log('[DEBUG] Tiene opciones?', msg.validacion_geolocaliza_metadata.opciones);
        if (msg.validacion_geolocaliza_metadata.opciones) {
            console.log('[DEBUG] Renderizando botones de validación Geolocalización:', msg.validacion_geolocaliza_metadata);
            const opciones_geolocaliza = msg.validacion_geolocaliza_metadata.opciones;
            console.log('[DEBUG] Número de opciones:', opciones_geolocaliza.length);
            contentHtml += `<div class="opciones-catalogo-container">`;
            opciones_geolocaliza.forEach((opcion, index) => {
                console.log(`[DEBUG] Procesando opción ${index}:`, opcion);
                let botonClass = 'opcion-catalogo-boton';
                if (opcion.accion === "geolocalizar_ahora" || opcion.accion === "aceptar_geolocaliza") {
                    botonClass += ' opcion-si';
                } else {
                    botonClass += ' opcion-no';
                }
                contentHtml += `<button class="${botonClass}" data-accion="${opcion.accion}" data-valor="${opcion.valor || ''}" data-texto="${opcion.texto}">${opcion.texto}</button>`;
            });
            contentHtml += `</div>`;
            console.log('[DEBUG] HTML de botones de geolocalización agregado a contentHtml');
        } else {
            console.log('[DEBUG] validacion_geolocaliza_metadata existe pero no tiene opciones:', msg.validacion_geolocaliza_metadata);
        }
    } else {
        console.log('[DEBUG] No hay validacion_geolocaliza_metadata en msg:', msg);
    }

    messageDiv.innerHTML = `<div class="message-bubble">${contentHtml}</div>`;
    messageList.appendChild(messageDiv);
    
    // Agregar event listeners a los botones de validación Localidad
    if (msg.validacion_localidad_metadata && msg.validacion_localidad_metadata.opciones) {
        console.log('[DEBUG] Buscando botones de validación Localidad en el DOM');
        const botones = messageDiv.querySelectorAll('button[data-accion^="aceptar_localidad"], button[data-accion="otro_localidad"], button[data-accion="corregir_localidad"]');
        console.log('[DEBUG] Botones encontrados:', botones.length);
        botones.forEach(boton => {
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const accion = this.getAttribute('data-accion');
                const valor = this.getAttribute('data-valor') || '';
                const texto = this.getAttribute('data-texto') || this.textContent;
                
                addMessageToUI({ username: window.currentUsername || 'Tú', content: texto });
                
                if (globalSendMessage) {
                    if (accion === "aceptar_localidad") {
                        globalSendMessage({ type: "user_message", message: `|||ACEPTAR_LOCALIDAD:${valor}` });
                    } else if (accion === "otro_localidad") {
                        globalSendMessage({ type: "user_message", message: "|||OTRO_LOCALIDAD" });
                    } else if (accion === "corregir_localidad") {
                        globalSendMessage({ type: "user_message", message: "|||CORREGIR_LOCALIDAD" });
                    } else {
                        globalSendMessage({ type: "user_message", message: texto });
                    }
                    lockInputs(true);
                } else {
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        if (accion === "aceptar_localidad") {
                            messageInput.value = `|||ACEPTAR_LOCALIDAD:${valor}`;
                        } else if (accion === "otro_localidad") {
                            messageInput.value = "|||OTRO_LOCALIDAD";
                        } else if (accion === "corregir_localidad") {
                            messageInput.value = "|||CORREGIR_LOCALIDAD";
                        } else {
                            messageInput.value = texto;
                        }
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const form = messageInput.closest('form');
                        if (form) {
                            form.dispatchEvent(submitEvent);
                        }
                    }
                }
            }, { once: true });
        });
    }
    
    // Agregar event listeners a los botones de validación Geolocalización
    if (msg.validacion_geolocaliza_metadata && msg.validacion_geolocaliza_metadata.opciones) {
        console.log('[DEBUG] Buscando botones de validación Geolocalización en el DOM');
        const botones = messageDiv.querySelectorAll('button[data-accion^="geolocalizar_ahora"], button[data-accion^="señalar_en_mapa"], button[data-accion="ingreso_manual"], button[data-accion="aceptar_geolocaliza"], button[data-accion="corregir_geolocaliza"]');
        console.log('[DEBUG] Botones encontrados:', botones.length);
        botones.forEach(boton => {
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const accion = this.getAttribute('data-accion');
                const valor = this.getAttribute('data-valor') || '';
                const texto = this.getAttribute('data-texto') || this.textContent;
                
                console.log('[DEBUG] Botón clickeado - Acción:', accion, 'Texto:', texto);
                
                addMessageToUI({ username: window.currentUsername || 'Tú', content: texto });
                
                if (accion === "geolocalizar_ahora") {
                    // Obtener coordenadas del navegador
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            function(position) {
                                const lat = position.coords.latitude;
                                const lon = position.coords.longitude;
                                const coordenadas = `${lat},${lon}`;
                                if (globalSendMessage) {
                                    globalSendMessage({ type: "user_message", message: `|||GEOLOCALIZAR_AHORA:${coordenadas}` });
                                    lockInputs(true);
                                } else {
                                    const messageInput = document.getElementById('message-input');
                                    if (messageInput) {
                                        messageInput.value = `|||GEOLOCALIZAR_AHORA:${coordenadas}`;
                                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                                        const form = messageInput.closest('form');
                                        if (form) {
                                            form.dispatchEvent(submitEvent);
                                        }
                                    }
                                }
                            },
                            function(error) {
                                alert('Error al obtener la ubicación: ' + error.message);
                                unlockInputs();
                            }
                        );
                    } else {
                        alert('Tu navegador no soporta geolocalización.');
                        unlockInputs();
                    }
                } else if (accion === "señalar_en_mapa") {
                    console.log('[DEBUG] Botón señalar_en_mapa presionado');
                    // Abrir el mapa interactivo en nueva pestaña/ventana
                    // Usar ruta absoluta basada en la ubicación actual con el prefijo base
                    const baseUrl = window.location.origin;
                    const basePath = window.APP_BASE_PATH || '';
                    const urlMapa = baseUrl + (basePath ? `${basePath}/static/selector-mapa.html` : '/static/selector-mapa.html');
                    console.log('[DEBUG] Abriendo mapa en:', urlMapa);
                    
                    // Intentar abrir el mapa
                    const mapaWindow = window.open(urlMapa, '_blank');
                    if (!mapaWindow) {
                        console.error('[ERROR] No se pudo abrir la ventana del mapa. Puede estar bloqueada por el navegador.');
                        alert('Por favor, permite que se abran ventanas emergentes para este sitio y vuelve a intentar.');
                    }
                    
                    // Enviar mensaje al servidor para activar el modo señalar_mapa
                    if (globalSendMessage) {
                        globalSendMessage({ type: "user_message", message: "|||SEÑALAR_MAPA:" });
                        lockInputs(true);
                    } else {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.value = "|||SEÑALAR_MAPA:";
                            unlockInputs(); // Desbloquear para que el usuario pueda pegar las coordenadas
                        }
                    }
                } else if (accion === "ingreso_manual") {
                    // Abrir el formulario manual directamente
                    const baseUrl = window.location.origin;
                    const basePath = window.APP_BASE_PATH || '';
                    const urlForm = baseUrl + (basePath ? `${basePath}/form` : '/form');
                    console.log('[DEBUG] Abriendo formulario manual en:', urlForm);
                    window.location.href = urlForm;
                } else if (accion === "aceptar_geolocaliza") {
                    if (globalSendMessage) {
                        globalSendMessage({ type: "user_message", message: `|||ACEPTAR_GEOLOCALIZA:${valor}` });
                        lockInputs(true);
                    } else {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.value = `|||ACEPTAR_GEOLOCALIZA:${valor}`;
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            const form = messageInput.closest('form');
                            if (form) {
                                form.dispatchEvent(submitEvent);
                            }
                        }
                    }
                } else if (accion === "corregir_geolocaliza") {
                    if (globalSendMessage) {
                        globalSendMessage({ type: "user_message", message: "|||CORREGIR_GEOLOCALIZA" });
                        lockInputs(true);
                    } else {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.value = "|||CORREGIR_GEOLOCALIZA";
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            const form = messageInput.closest('form');
                            if (form) {
                                form.dispatchEvent(submitEvent);
                            }
                        }
                    }
                } else {
                    if (globalSendMessage) {
                        globalSendMessage({ type: "user_message", message: texto });
                        lockInputs(true);
                    } else {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.value = texto;
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            const form = messageInput.closest('form');
                            if (form) {
                                form.dispatchEvent(submitEvent);
                            }
                        }
                    }
                }
            }, { once: true });
        });
    }
    
    // Si hay botones visibles (catálogo, confirmación, CURP, RFC, Localidad o Geolocalización) en ESTE mensaje, bloquear inputs
    // Si NO hay botones, desbloquear (ej: modo entrada libre después de "OTRO")
    const tieneBotonesVisibles = (msg.opciones_catalogo && msg.opciones_catalogo.opciones) ||
                                  (msg.confirmacion_metadata && msg.confirmacion_metadata.opciones) ||
        (msg.validacion_curp_metadata && msg.validacion_curp_metadata.opciones) ||
        (msg.validacion_rfc_metadata && msg.validacion_rfc_metadata.opciones) ||
        (msg.validacion_localidad_metadata && msg.validacion_localidad_metadata.opciones) ||
        (msg.validacion_geolocaliza_metadata && msg.validacion_geolocaliza_metadata.opciones);
    
    if (tieneBotonesVisibles) {
        // Bloquear inputs pero SIN mostrar indicador de "pensando" (solo botones visibles)
        lockInputs(false);
        console.log('[DEBUG] Inputs bloqueados al renderizar mensaje con botones (sin indicador)');
    } else {
        // Si este mensaje no tiene botones, desbloquear (permite entrada libre)
        unlockInputs();
        console.log('[DEBUG] Inputs desbloqueados - mensaje sin botones (permite entrada libre)');
    }
    
    // Agregar event listeners a los botones de opciones
    if (msg.opciones_catalogo && msg.opciones_catalogo.opciones) {
        const botones = messageDiv.querySelectorAll('.opcion-catalogo-boton');
        botones.forEach(boton => {
            // Remover listeners anteriores para evitar duplicación
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Deshabilitar el botón para evitar múltiples clicks
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const valor = this.getAttribute('data-valor');
                // Agregar mensaje del usuario a la UI solo una vez
                addMessageToUI({ username: window.currentUsername || 'Tú', content: valor });
                
                // Enviar el valor seleccionado al servidor
                if (globalSendMessage) {
                    globalSendMessage({ type: "user_message", message: valor });
                    lockInputs(true); // Mostrar indicador porque se está procesando respuesta
                } else {
                    // Fallback: usar el input normal
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        messageInput.value = valor;
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const form = messageInput.closest('form');
                        if (form) {
                            form.dispatchEvent(submitEvent);
                        }
                    }
                }
            }, { once: true }); // Usar { once: true } para que el listener se ejecute solo una vez
        });
    }
    
    // Agregar event listeners a los botones de validación CURP
    if (msg.validacion_curp_metadata && msg.validacion_curp_metadata.opciones) {
        console.log('[DEBUG] Buscando botones de validación CURP en el DOM');
        // Buscar todos los botones con data-accion de validación CURP
        const botones = messageDiv.querySelectorAll('button[data-accion="aceptar_curp"], button[data-accion="corregir_curp"]');
        console.log('[DEBUG] Botones encontrados:', botones.length);
        botones.forEach(boton => {
            // Remover listeners anteriores para evitar duplicación
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Deshabilitar el botón para evitar múltiples clicks
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const accion = this.getAttribute('data-accion');
                const valor = this.getAttribute('data-valor') || '';
                const texto = this.getAttribute('data-texto') || this.textContent;
                
                // Agregar mensaje del usuario a la UI
                addMessageToUI({ username: window.currentUsername || 'Tú', content: texto });
                
                // Enviar mensaje especial al servidor con la acción
                if (globalSendMessage) {
                    if (accion === "aceptar_curp") {
                        // Si acepta, enviar el valor de la CURP
                        globalSendMessage({ type: "user_message", message: `|||ACEPTAR_CURP:${valor}` });
                    } else if (accion === "corregir_curp") {
                        // Si corrige, enviar mensaje especial
                        globalSendMessage({ type: "user_message", message: "|||CORREGIR_CURP" });
                    } else {
                        // Fallback: enviar texto normal
                        globalSendMessage({ type: "user_message", message: texto });
                    }
                    lockInputs(true); // Mostrar indicador porque se está procesando respuesta
                } else {
                    // Fallback: usar el input normal
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        if (accion === "aceptar_curp") {
                            messageInput.value = `|||ACEPTAR_CURP:${valor}`;
                        } else if (accion === "corregir_curp") {
                            messageInput.value = "|||CORREGIR_CURP";
                        } else {
                            messageInput.value = texto;
                        }
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const form = messageInput.closest('form');
                        if (form) {
                            form.dispatchEvent(submitEvent);
                        }
                    }
                }
            }, { once: true });
        });
    }
    
    // Agregar event listeners a los botones de validación RFC
    if (msg.validacion_rfc_metadata && msg.validacion_rfc_metadata.opciones) {
        console.log('[DEBUG] Buscando botones de validación RFC en el DOM');
        // Buscar todos los botones con data-accion de validación RFC
        const botones = messageDiv.querySelectorAll('button[data-accion="aceptar_rfc"], button[data-accion="corregir_rfc"]');
        console.log('[DEBUG] Botones encontrados:', botones.length);
        botones.forEach(boton => {
            // Remover listeners anteriores para evitar duplicación
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Deshabilitar el botón para evitar múltiples clicks
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const accion = this.getAttribute('data-accion');
                const valor = this.getAttribute('data-valor') || '';
                const texto = this.getAttribute('data-texto') || this.textContent;
                
                // Agregar mensaje del usuario a la UI
                addMessageToUI({ username: window.currentUsername || 'Tú', content: texto });
                
                // Enviar mensaje especial al servidor con la acción
                if (globalSendMessage) {
                    if (accion === "aceptar_rfc") {
                        // Si acepta, enviar el valor del RFC
                        globalSendMessage({ type: "user_message", message: `|||ACEPTAR_RFC:${valor}` });
                    } else if (accion === "corregir_rfc") {
                        // Si corrige, enviar mensaje especial
                        globalSendMessage({ type: "user_message", message: "|||CORREGIR_RFC" });
                    } else {
                        // Fallback: enviar texto normal
                        globalSendMessage({ type: "user_message", message: texto });
                    }
                    lockInputs(true); // Mostrar indicador porque se está procesando respuesta
                } else {
                    // Fallback: usar el input normal
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        if (accion === "aceptar_rfc") {
                            messageInput.value = `|||ACEPTAR_RFC:${valor}`;
                        } else if (accion === "corregir_rfc") {
                            messageInput.value = "|||CORREGIR_RFC";
                        } else {
                            messageInput.value = texto;
                        }
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const form = messageInput.closest('form');
                        if (form) {
                            form.dispatchEvent(submitEvent);
                        }
                    }
                }
            }, { once: true });
        });
    }
    
    // Agregar event listeners a los botones de confirmación (SI/NO)
    if (msg.confirmacion_metadata && msg.confirmacion_metadata.opciones) {
        const botones = messageDiv.querySelectorAll('.opcion-si, .opcion-no');
        botones.forEach(boton => {
            // Remover listeners anteriores para evitar duplicación
            const nuevoBoton = boton.cloneNode(true);
            boton.parentNode.replaceChild(nuevoBoton, boton);
            
            nuevoBoton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Deshabilitar el botón para evitar múltiples clicks
                this.disabled = true;
                this.style.opacity = '0.6';
                
                const texto = this.getAttribute('data-texto');
                const accion = this.getAttribute('data-accion');
                // Agregar mensaje del usuario a la UI solo una vez
                addMessageToUI({ username: window.currentUsername || 'Tú', content: texto });
                
                // Enviar la respuesta de confirmación al servidor
                if (globalSendMessage) {
                    globalSendMessage({ type: "user_message", message: texto });
                    lockInputs(true); // Mostrar indicador porque se está procesando respuesta
                } else {
                    // Fallback: usar el input normal
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        messageInput.value = texto;
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const form = messageInput.closest('form');
                        if (form) {
                            form.dispatchEvent(submitEvent);
                        }
                    }
                }
            }, { once: true }); // Usar { once: true } para que el listener se ejecute solo una vez
        });
    }
    
    scrollToBottom();
}

/**
 * Bloquea los inputs y opcionalmente muestra el indicador de "escribiendo".
 * @param {boolean} showTypingIndicator - Si es true, muestra el indicador de "pensando". 
 *                                        Si es false, solo bloquea sin mostrar indicador (para cuando hay botones visibles).
 */
export function lockInputs(showTypingIndicator = true) {
    const inputArea = document.getElementById('input-area');
    const messageInput = document.getElementById('message-input');
    const typingIndicator = document.getElementById('typing-indicator');
    
    if (inputArea) inputArea.classList.add('disabled');
    if (messageInput) messageInput.disabled = true;
    
    // Solo mostrar el indicador si se solicita explícitamente (al procesar respuesta)
    if (showTypingIndicator && typingIndicator) {
        typingIndicator.style.display = 'flex';
    } else if (typingIndicator) {
        // Asegurarse de ocultarlo cuando no se debe mostrar (botones visibles)
        typingIndicator.style.display = 'none';
    }
    
    scrollToBottom();
}

/**
 * Desbloquea los inputs y oculta el indicador de "escribiendo".
 */
export function unlockInputs() {
    const inputArea = document.getElementById('input-area');
    const messageInput = document.getElementById('message-input');
    const typingIndicator = document.getElementById('typing-indicator');

    if (inputArea) inputArea.classList.remove('disabled');
    if (typingIndicator) typingIndicator.style.display = 'none';
    
    if (messageInput) {
        messageInput.disabled = false;
        // --- LÍNEA AÑADIDA ---
        messageInput.focus(); // Coloca el cursor en el campo de texto
        // ---------------------
    }
}

/**
 * Muestra u oculta la interfaz de grabación.
 * @param {boolean} isRecording - True para mostrar la UI de grabación, false para la normal.
 */
export function showRecordingUI(isRecording) {
    document.getElementById('main-input-ui').style.display = isRecording ? 'none' : 'flex';
    document.getElementById('recording-ui').style.display = isRecording ? 'flex' : 'none';
}

/**
 * Limpia el campo de texto.
 */
export function clearInput() {
    document.getElementById('message-input').value = '';
}

/**
 * Hace scroll hasta el final de la lista de mensajes.
 */
export function scrollToBottom() {
    const messageList = document.getElementById('message-list');
    if (messageList) {
        setTimeout(() => { messageList.scrollTop = messageList.scrollHeight; }, 100);
    }
}

// Exponer addMessageToUI globalmente para uso desde index.html (después de la definición)
if (typeof window !== 'undefined') {
    window.addMessageToUI = addMessageToUI;
}

/**
 * Inicia el temporizador de grabación en la UI.
 */
export function startTimer() {
    const displayElement = document.getElementById('recording-timer');
    if (!displayElement) return;

    let seconds = 0;
    displayElement.textContent = "0:00";
    recordingTimerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        displayElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

/**
 * Detiene el temporizador de grabación en la UI.
 */
export function stopTimer() {
    clearInterval(recordingTimerInterval);
}

/**
 * Gestiona la visibilidad de los elementos en la interfaz de la cámara.
 * @param {'live' | 'recording' | 'previewPhoto' | 'previewVideo'} state - El estado a mostrar.
 */
export function setCameraState(state) {
    const liveContainer = document.getElementById('live-capture-controls');
    const previewContainer = document.getElementById('media-preview-controls');
    const cameraPreview = document.getElementById('camera-preview');
    const photoPreview = document.getElementById('photo-preview');
    const videoPreview = document.getElementById('video-preview');
    const recordBtn = document.getElementById('record-video-btn');
    // ▼▼▼ CAMBIO CLAVE: Apuntamos al contenedor principal del indicador ▼▼▼
    const recordingIndicator = document.getElementById('recording-indicator');

    // Ocultar todo por defecto para empezar desde un estado limpio
    liveContainer.style.display = 'none';
    previewContainer.style.display = 'none';
    cameraPreview.style.display = 'none';
    photoPreview.style.display = 'none';
    videoPreview.style.display = 'none';
    // Ocultamos el indicador por defecto
    if (recordingIndicator) recordingIndicator.style.display = 'none';
    recordBtn.classList.remove('is-recording');

    switch (state) {
        case 'recording':
            cameraPreview.style.display = 'block';
            liveContainer.style.display = 'flex';
            recordBtn.classList.add('is-recording');
            // ▼▼▼ CAMBIO CLAVE: Mostramos el contenedor principal ▼▼▼
            if (recordingIndicator) recordingIndicator.style.display = 'flex';
            break;

        case 'previewPhoto':
            photoPreview.style.display = 'block';
            previewContainer.style.display = 'flex';
            break;

        case 'previewVideo':
            videoPreview.style.display = 'block';
            previewContainer.style.display = 'flex';
            break;

        case 'live':
        default:
            cameraPreview.style.display = 'block';
            liveContainer.style.display = 'flex';
            break;
    }
}

// En /static/js/core/ui.js

/**
 * Controla la visibilidad de los elementos de la UI según la etapa de la conversación.
 * @param {string} stage - El nombre de la etapa actual (ej: 'informes', 'entrevista', etc.).
 * @param {string} botonTexto - El texto del botón según el idioma (opcional).
 */
export function setStageUI(stage, botonTexto = null, botonOmitirTexto = null) {
    console.log(`Cambiando la UI a la etapa: ${stage}`);

    // Obtenemos referencias a todos los botones que vamos a controlar
    const advanceBtnContainer = document.getElementById('quick-reply-container');
    const advanceBtn = document.getElementById('advance-btn');
    const cancelGroupBtn = document.getElementById('cancel-group-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const attachBtn = document.getElementById('attach-btn');
    const omitBtn = document.getElementById('omit-btn');
    
    // --- Reseteamos la visibilidad de TODOS los botones de forma segura ---
    if (advanceBtn) advanceBtn.style.display = 'none';
    if (cancelGroupBtn) cancelGroupBtn.style.display = 'none';
    if (cameraBtn) cameraBtn.style.display = 'none';
    if (attachBtn) attachBtn.style.display = 'none';
    if (omitBtn) omitBtn.style.display = 'none';

    // --- Si hay botón "Avanzar" (informes o modo espera), mostrarlo primero ---
    if (botonTexto && stage !== 'revision') {
        const textoAvanzar = botonTexto;
        advanceBtn.innerHTML = `${textoAvanzar} <i class="fas fa-arrow-right"></i>`;
        if (advanceBtn) advanceBtn.setAttribute('data-texto-boton', textoAvanzar);
        advanceBtn.style.display = 'flex';
    }

    // --- 2. Configuramos qué mostrar para la etapa actual ---
    switch (stage) {
        case 'informes':
            // El botón "Avanzar" ya se mostró arriba si botonTexto existe
            break;

        case 'entrevista':
        case 'entrevista_grupo':
            // Mostrar botón Omitir en entrevista y entrevista_grupo (si no estamos en espera con botón Avanzar)
            if (!botonTexto && omitBtn) {
                const textoOmitir = botonOmitirTexto || 'Omitir';
                omitBtn.querySelector('#omit-label').textContent = textoOmitir;
                omitBtn.setAttribute('data-texto-boton', textoOmitir);
                omitBtn.style.display = 'flex';
            }
            if (stage === 'entrevista_grupo') {
                cancelGroupBtn.style.display = 'flex'; // Muestra el botón de cancelar
            }
            break;

        case 'revision':
            // Usar el texto del botón recibido del servidor, o el default si no viene
            const textoConfirmado = botonTexto || 'Confirmado';
            advanceBtn.innerHTML = `${textoConfirmado} <i class="fas fa-check"></i>`;
            // Guardar el texto del botón en un atributo data para usarlo cuando se haga clic
            if (advanceBtn) advanceBtn.setAttribute('data-texto-boton', textoConfirmado);
            advanceBtn.style.display = 'flex'; // Muestra el botón de confirmar
            break;

        case 'archivos':
            // Habilita los botones de cámara y adjuntar
            //cameraBtn.style.display = 'flex';
            attachBtn.style.display = 'flex';
            break;

        case 'conductual':
            // En esta etapa, no se muestra ningún botón de acción rápido
            break;

        default:
            console.warn(`Etapa desconocida: '${stage}'. No se mostrarán botones de acción.`);
            break;
    }
    
    // --- 3. Lógica final para mostrar el contenedor principal ---
}

/**
 * Muestra el botón de descarga de PDF cuando la evaluación está completada.
 */
export function mostrarBotonDescarga() {
    const downloadBtn = document.getElementById('download-pdf-btn');
    
    if (downloadBtn) {
        downloadBtn.style.display = 'flex';
        
        // Agregar event listener si no existe
        if (!downloadBtn.hasAttribute('data-listener-added')) {
            downloadBtn.setAttribute('data-listener-added', 'true');
            downloadBtn.addEventListener('click', async function() {
                const uuid = window.EVALUACION_UUID;
                if (!uuid) {
                    console.error('No se encontró el UUID de la evaluación');
                    return;
                }
                
                // Deshabilitar el botón mientras se genera el PDF
                const textoOriginal = this.innerHTML;
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                
                try {
                    const response = await fetch(apiUrl(`api/evaluaciones/${uuid}/pdf`));
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Error al generar PDF: ${response.statusText} - ${errorText}`);
                    }
                    
                    // Descargar el PDF
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Reporte_${uuid.substring(0, 8)}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    // Restaurar el botón
                    this.disabled = false;
                    this.innerHTML = textoOriginal;
                } catch (error) {
                    console.error('Error al descargar PDF:', error);
                    alert('Error al generar el PDF. Por favor, intenta de nuevo.');
                    
                    // Restaurar el botón
                    this.disabled = false;
                    this.innerHTML = textoOriginal;
                }
            });
        }
    } else {
        console.error('Botón de descarga no encontrado en el DOM');
    }
    // Si alguno de los botones de acción está visible, mostramos su contenedor.
    if (advanceBtn.style.display !== 'none' || cancelGroupBtn.style.display !== 'none') {
        advanceBtnContainer.style.display = 'flex';
    } else {
        advanceBtnContainer.style.display = 'none';
    }
}