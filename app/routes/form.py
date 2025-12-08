# app/routes/form.py

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from bson import ObjectId

# Importaciones de tu aplicación
from app.core import gestor_estado
from app.core.maestro_preguntas import maestro_preguntas
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
            
            # Pre-procesamos las preguntas para el botón de catálogo y nombres
            for pregunta in preguntas:
                # Convertir el nombre multiidioma a string según el idioma del usuario
                if "nombre" in pregunta:
                    pregunta["nombre"] = extraer_nombre_por_idioma(pregunta["nombre"], idioma)
                
                # Pre-procesar catálogo si existe
                if pregunta.get("tipo") == "CATÁLOGO" and "Catálogo" in pregunta:
                    pregunta["opciones_catalogo"] = [opt.strip() for opt in pregunta["Catálogo"].split(',')]
                    # También convertir el nombre del catálogo si es necesario
                    if "catalogo" in pregunta and isinstance(pregunta.get("catalogo"), dict):
                        pregunta["catalogo"] = pregunta["catalogo"].get(idioma.upper()) or pregunta["catalogo"].get("ESP", "")

            secciones_ordenadas.append({
                "key": nombre_archivo,
                "nombre": nombre_archivo.replace('.json', '').replace('_', ' ').capitalize(),
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