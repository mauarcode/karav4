# app/routes/form.py

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from bson import ObjectId

# Importaciones de tu aplicación
from app.core import gestor_estado
from app.core.maestro_preguntas import maestro_preguntas
from app.core.cargador_recursos import cargar_seccion_entrevista
from app.database import get_evaluacion_collection
from .consent import get_current_candidate # Reutilizamos la dependencia de consentimiento

form_router = APIRouter()

def extraer_nombre_por_idioma(nombre_obj, idioma: str = "ESP") -> str:
    """
    Extrae el nombre en el idioma especificado desde un objeto multiidioma.
    Si el nombre es un string, lo devuelve tal cual.
    """
    if isinstance(nombre_obj, str):
        return nombre_obj
    if isinstance(nombre_obj, dict):
        # Intentar obtener el idioma solicitado, con fallback a ESP
        texto = nombre_obj.get(idioma.upper())
        if not texto:
            texto = nombre_obj.get("ESP")
        if not texto:
            # Si no hay ESP, tomar el primer valor disponible
            texto = next(iter(nombre_obj.values()), None) if nombre_obj else None
        return texto if texto else ""
    return ""

# En app/routes/form.py

@form_router.get("/data")
async def get_form_data(candidate_data: dict = Depends(get_current_candidate)):
    evaluacion_uuid = str(candidate_data["_id"])
    guion_secciones = candidate_data.get("guion_secciones", [])
    
    # Obtener el idioma del estado del usuario
    estado_actual = await gestor_estado.obtener_estado_async(evaluacion_uuid)
    idioma = estado_actual.get("idioma", "ESP")
    
    secciones_ordenadas = []
    for seccion_info in guion_secciones:
        # --- LÓGICA DE FILTRADO ---
        # Solo procesamos las secciones que son de tipo 'entrevista'
        if seccion_info.get("tipo") == "entrevista":
            nombre_archivo = seccion_info.get("archivo")
            if not nombre_archivo: continue
            
            # Obtener la empresa desde la evaluación
            empresa = candidate_data.get("empresa_gestion")
            preguntas = maestro_preguntas.obtener_preguntas(nombre_archivo, empresa)
            
            # Cargar el JSON completo de la sección para extraer nombre_corto
            import logging
            from app.config import get_empresa_secciones_dir, INV_DATOS_SECCIONES_DIR
            from pathlib import Path
            import json
            
            # Normalizar el nombre del archivo
            nombre_archivo_normalizado = nombre_archivo
            if not nombre_archivo_normalizado.endswith('.json'):
                nombre_archivo_normalizado = f"{nombre_archivo_normalizado}.json"
            
            logging.info(f"[FORM] Cargando sección: archivo original='{nombre_archivo}', normalizado='{nombre_archivo_normalizado}', empresa='{empresa}'")
            
            # Intentar cargar el JSON directamente
            seccion_json = None
            secciones_dir = get_empresa_secciones_dir(empresa) if empresa else INV_DATOS_SECCIONES_DIR
            archivo_path = secciones_dir / nombre_archivo_normalizado
            
            logging.info(f"[FORM] Buscando archivo en: {archivo_path}")
            
            if archivo_path.exists():
                try:
                    with open(archivo_path, 'r', encoding='utf-8') as f:
                        seccion_json = json.load(f)
                    logging.info(f"[FORM] Archivo cargado exitosamente desde: {archivo_path}")
                except Exception as e:
                    logging.error(f"[FORM] Error al cargar archivo {archivo_path}: {e}")
            else:
                logging.warning(f"[FORM] Archivo no encontrado en: {archivo_path}")
                # Intentar con cargar_seccion_entrevista como fallback
                seccion_json = cargar_seccion_entrevista(nombre_archivo, empresa)
                if seccion_json:
                    logging.info(f"[FORM] Archivo cargado usando cargar_seccion_entrevista")
                else:
                    logging.warning(f"[FORM] No se pudo cargar el archivo ni con cargar_seccion_entrevista")
            
            # Extraer nombre_corto del JSON
            nombre_seccion = nombre_archivo.replace('.json', '').replace('_', ' ').capitalize()  # Fallback
            if seccion_json and isinstance(seccion_json, dict):
                logging.info(f"[FORM] Estructura del JSON: claves={list(seccion_json.keys())}")
                # El JSON tiene estructura: {"ClaveSeccion": {"nombre_corto": {...}, "grupo_datos": [...]}}
                nombre_corto_obj = None
                
                # Buscar nombre_corto en la estructura anidada
                for key, value in seccion_json.items():
                    logging.info(f"[FORM] Revisando clave '{key}': tipo={type(value)}, es dict={isinstance(value, dict)}")
                    if isinstance(value, dict):
                        logging.info(f"[FORM] Claves dentro de '{key}': {list(value.keys())}")
                        if "nombre_corto" in value:
                            nombre_corto_obj = value.get("nombre_corto")
                            logging.info(f"[FORM] Encontrado nombre_corto en clave '{key}': {nombre_corto_obj}")
                            break
                        else:
                            logging.info(f"[FORM] No hay 'nombre_corto' en la clave '{key}'")
                
                # Si encontramos nombre_corto, extraerlo según el idioma
                if nombre_corto_obj:
                    nombre_seccion = extraer_nombre_por_idioma(nombre_corto_obj, idioma)
                    logging.info(f"[FORM] Nombre de sección extraído: '{nombre_seccion}' (idioma: {idioma})")
                else:
                    logging.warning(f"[FORM] No se encontró nombre_corto en el JSON para {nombre_archivo}. Estructura completa: {list(seccion_json.keys())}")
            else:
                logging.warning(f"[FORM] No se pudo cargar el JSON o no es un dict para {nombre_archivo}, tipo: {type(seccion_json)}")
            
            logging.info(f"[FORM] Nombre final de sección: '{nombre_seccion}'")
            
            # Pre-procesamos las preguntas para el botón de catálogo y nombres
            logging.info(f"[FORM] Procesando {len(preguntas)} preguntas para sección {nombre_archivo}")
            for pregunta in preguntas:
                # Convertir el nombre multiidioma a string según el idioma del usuario
                if "nombre" in pregunta:
                    pregunta["nombre"] = extraer_nombre_por_idioma(pregunta["nombre"], idioma)
                
                # Debug: verificar si el campo tiene validacion_input
                clave_pregunta = pregunta.get('clave', 'SIN_CLAVE')
                validacion = pregunta.get("validacion_input")
                if validacion == "NUMERICO":
                    logging.info(f"[FORM] Campo numérico detectado en backend: {clave_pregunta} - {pregunta.get('nombre')}")
                elif clave_pregunta in ['201', '203', '205', '220', '221', '222', '223']:
                    # Estos campos DEBERÍAN ser numéricos según los JSON
                    logging.warning(f"[FORM] Campo {clave_pregunta} debería ser numérico pero validacion_input={validacion}. Propiedades: {list(pregunta.keys())}")
                
                # Pre-procesar catálogo si existe
                if pregunta.get("tipo") == "CATÁLOGO":
                    catalogo_ref = pregunta.get("catalogo")
                    if catalogo_ref:
                        # Cargar el catálogo desde el archivo JSON
                        from app.config import INV_DATOS_CATALOGOS_DIR
                        import json
                        catalogo_path = INV_DATOS_CATALOGOS_DIR / f"{catalogo_ref}.json"
                        if catalogo_path.exists():
                            try:
                                with open(catalogo_path, 'r', encoding='utf-8') as f:
                                    catalogo_data = json.load(f)
                                    # Extraer los valores según el idioma del usuario
                                    opciones_catalogo = []
                                    if "items" in catalogo_data:
                                        for item in catalogo_data["items"]:
                                            valor_obj = item.get("valor", {})
                                            if isinstance(valor_obj, dict):
                                                # Obtener el valor en el idioma del usuario
                                                valor_texto = valor_obj.get(idioma.upper()) or valor_obj.get("ESP") or str(valor_obj)
                                            else:
                                                valor_texto = str(valor_obj)
                                            opciones_catalogo.append(valor_texto)
                                    pregunta["catalogo"] = opciones_catalogo
                            except Exception as e:
                                print(f"[ERROR] No se pudo cargar el catálogo '{catalogo_ref}': {e}")
                                pregunta["catalogo"] = []
                        else:
                            print(f"[WARNING] No se encontró el archivo de catálogo: {catalogo_path}")
                            pregunta["catalogo"] = []

            secciones_ordenadas.append({
                "key": nombre_archivo,
                "nombre": nombre_seccion,
                "naturaleza": seccion_info.get("naturaleza", "dato_plano"),
                "preguntas": preguntas
            })

    datos_entrevista = await gestor_estado.cargar_datos_entrevista_async(evaluacion_uuid)
    datos_grupo = await gestor_estado.cargar_datos_grupo_async(evaluacion_uuid)
    
    return {
        "success": True,
        "secciones": secciones_ordenadas, # Enviamos la lista ya filtrada
        "datos_guardados": {
            "entrevista": datos_entrevista,
            "grupos": datos_grupo
        }
    }

@form_router.post("/save_section")
async def save_form_section(request: Request, candidate_data: dict = Depends(get_current_candidate)):
    """
    Recibe y guarda los datos de una sección de la entrevista (no de grupo).
    """
    evaluacion_uuid = str(candidate_data["_id"])
    datos_a_guardar = await request.json()
    
    for clave, valor in datos_a_guardar.items():
        await gestor_estado.guardar_datos_entrevista_async(evaluacion_uuid, clave, valor)
    
    return {"success": True, "message": "Sección guardada correctamente."}


@form_router.post("/save_group_item/{clave_grupo}")
async def save_group_item(
    request: Request,
    clave_grupo: str,
    candidate_data: dict = Depends(get_current_candidate)
    ):
    """
    Recibe y guarda un nuevo item en una sección de grupo.
    """
    evaluacion_uuid = str(candidate_data["_id"])
    item_a_guardar = await request.json()
    
    # Se asegura de llamar a la función correcta
    await gestor_estado.guardar_datos_grupo_async(evaluacion_uuid, clave_grupo, item_a_guardar)
    
    return {"success": True, "message": "Registro añadido correctamente."}

@form_router.post("/delete_group_item/{clave_grupo}")
async def delete_group_item(
    request: Request,
    clave_grupo: str,
    candidate_data: dict = Depends(get_current_candidate)
    ):
    """
    Recibe y elimina un item de una sección de grupo usando su registro_id.
    """
    evaluacion_uuid = str(candidate_data["_id"])
    data = await request.json()
    registro_id = data.get("registro_id")

    if not registro_id:
        return JSONResponse(status_code=400, content={"success": False, "message": "Falta el registro_id."})

    await gestor_estado.eliminar_datos_grupo_async(evaluacion_uuid, clave_grupo, registro_id)
    
    return {"success": True, "message": "Registro eliminado correctamente."}

@form_router.post("/visited")
async def mark_form_as_visited(
    request: Request, 
    candidate_data: dict = Depends(get_current_candidate)
    ):
    """
    Marca en el estado del usuario que ha visitado el formulario.
    """
    evaluacion_uuid = str(candidate_data["_id"])
    estado_actual = await gestor_estado.obtener_estado_async(evaluacion_uuid)
    
    # Añadimos la nueva bandera
    estado_actual["ha_visitado_formulario"] = True
    
    await gestor_estado.guardar_estado_async(evaluacion_uuid, estado_actual)
    
    return {"success": True}

# Aquí podrías añadir la ruta para los catálogos si es necesario
# @form_router.get("/catalogo/{clave_catalogo}")
# async def get_catalogo_data(clave_catalogo: str):
#     # Lógica para leer un JSON de catálogo y devolverlo
#     ...