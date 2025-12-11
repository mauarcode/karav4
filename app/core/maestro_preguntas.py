# en app/core/maestro_preguntas.py

import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

# Importamos nuestras herramientas centrales
from app.config import RESOURCES_PATH, INV_DATOS_DATOS_DIR, INV_DATOS_GRUPOS_DIR, INV_DATOS_GRUPOS_DATOS_DIR, INV_DATOS_SECCIONES_DIR, get_empresa_secciones_dir
from app.core.cargador_recursos import cargar_json, cargar_dato_pregunta

class MaestroDePreguntas:
    """
    Una clase Singleton para cargar y gestionar todas las definiciones de preguntas
    de los archivos JSON de entrevistas, evitando recargas innecesarias.
    """
    _instancia = None
    _preguntas_cargadas: Dict[str, Any] = {}
    _lista_completa_campos: List[Dict[str, Any]] = []

    def __new__(cls):
        if cls._instancia is None:
            print("Inicializando el Maestro de Preguntas por primera vez...")
            cls._instancia = super(MaestroDePreguntas, cls).__new__(cls)
            cls._instancia._cargar_todas_las_preguntas()
        return cls._instancia

    def _cargar_todas_las_preguntas(self):
        """
        Carga todos los archivos .json de la carpeta de recursos que definen preguntas.
        (Aquí asumimos que todos los JSON en /resources son de preguntas, se puede ajustar).
        """
        if self._preguntas_cargadas:
            return

        logging.info("Maestro de Preguntas: Cargando todas las definiciones de entrevistas...")
        # Buscamos todos los archivos .json que definen entrevistas.
        # Primero intentamos en inv_datos, luego en resources como fallback
        archivos_entrevista = []
        if INV_DATOS_SECCIONES_DIR.exists():
            archivos_entrevista = [f for f in INV_DATOS_SECCIONES_DIR.iterdir() if f.suffix == '.json' and f.name not in ["secciones.json", "config_entrevista.json", "frases_entrevista.json"]]
        # Si no hay archivos en inv_datos, buscar en resources como fallback
        if not archivos_entrevista and RESOURCES_PATH.exists():
            archivos_entrevista = [f for f in RESOURCES_PATH.iterdir() if f.suffix == '.json' and f.name not in ["secciones.json", "config_entrevista.json", "frases_entrevista.json"]]

        for archivo_path in archivos_entrevista:
            nombre_archivo = archivo_path.name
            contenido = cargar_json(nombre_archivo)
            if contenido and 'datos' in contenido:
                self._preguntas_cargadas[nombre_archivo] = contenido
                
                # --- LÓGICA MODIFICADA ---
                # Añadimos el 'archivo_origen' a cada pregunta antes de guardarla
                preguntas_con_origen = []
                for pregunta in contenido['datos']:
                    pregunta['archivo_origen'] = nombre_archivo # <-- La línea clave
                    preguntas_con_origen.append(pregunta)
                
                self._lista_completa_campos.extend(preguntas_con_origen)
                # --- FIN DE LA MODIFICACIÓN ---

                logging.info(f" -> '{nombre_archivo}' cargado.")
    
    def obtener_definiciones(self, nombre_archivo: str, empresa: str = None) -> Optional[Dict[str, Any]]:
        """
        Obtiene las definiciones completas de un archivo, buscando en múltiples ubicaciones.
        Si el archivo está en caché pero le falta frase_introduccion, se fuerza una recarga.
        """
        """
        Devuelve la estructura completa de un archivo de preguntas.
        Primero busca en caché, luego en las nuevas ubicaciones si no está en caché.
        """
        # Normalizar el nombre del archivo
        if not nombre_archivo.endswith('.json'):
            nombre_archivo = f"{nombre_archivo}.json"
        
        # Primero intenta desde la caché
        if nombre_archivo in self._preguntas_cargadas:
            contenido_cached = self._preguntas_cargadas[nombre_archivo]
            
            # Verificar si el archivo original tiene frase_introduccion pero el caché no
            # O si los campos en caché no tienen los campos fusionados del grupo_datos
            # Nota: Para verificar el caché, usamos la ruta antigua por compatibilidad
            # El caché se actualizará cuando se busque con empresa
            archivo_path_check = INV_DATOS_SECCIONES_DIR / nombre_archivo
            if archivo_path_check.exists():
                try:
                    with open(archivo_path_check, 'r', encoding='utf-8') as f:
                        seccion_data_check = json.load(f)
                        grupo_datos_check = None
                        if isinstance(seccion_data_check, dict):
                            for key, value in seccion_data_check.items():
                                if isinstance(value, dict):
                                    if 'frase_introduccion' in value and 'frase_introduccion' not in contenido_cached:
                                        logging.info(f"[INFO] Archivo '{nombre_archivo}' tiene frase_introduccion pero el caché no. Recargando...")
                                        del self._preguntas_cargadas[nombre_archivo]
                                        break
                                    if 'grupo_datos' in value:
                                        grupo_datos_check = value['grupo_datos']
                                        break
                        elif isinstance(seccion_data_check, list):
                            grupo_datos_check = seccion_data_check
                        
                        # Verificar si los campos en caché tienen los campos fusionados del grupo_datos
                        if grupo_datos_check and 'datos' in contenido_cached:
                            datos_cached = contenido_cached.get('datos', [])
                            for item_grupo in grupo_datos_check:
                                if isinstance(item_grupo, dict):
                                    clave_grupo = item_grupo.get('clave')
                                    campos_grupo = {k: v for k, v in item_grupo.items() if k != 'clave'}
                                    if clave_grupo and campos_grupo:
                                        # Buscar el campo en caché
                                        campo_cached = next((c for c in datos_cached if c.get('clave') == clave_grupo), None)
                                        if campo_cached:
                                            # Verificar si le faltan campos fusionados
                                            campos_faltantes = [k for k in campos_grupo.keys() if k not in campo_cached]
                                            if campos_faltantes:
                                                logging.info(f"[INFO] Campo '{clave_grupo}' en caché le faltan campos fusionados: {campos_faltantes}. Recargando...")
                                                del self._preguntas_cargadas[nombre_archivo]
                                                break
                except Exception as e:
                    logging.warning(f"[WARNING] Error al verificar caché para '{nombre_archivo}': {e}")
            
            if nombre_archivo in self._preguntas_cargadas:
                logging.info(f"[DEBUG] Archivo '{nombre_archivo}' encontrado en caché. Tiene frase_introduccion: {'frase_introduccion' in contenido_cached}")
                return contenido_cached
        
        # Si no está en caché, busca en las nuevas ubicaciones directamente
        # (sin llamar a obtener_preguntas para evitar recursión)
        
        # 1. Intentar en inv_datos/empresas/{empresa}/secciones/ o inv_datos/secciones/ (archivos que contienen listas de claves)
        # Determinar el directorio de secciones según la empresa
        secciones_dir = get_empresa_secciones_dir(empresa) if empresa else INV_DATOS_SECCIONES_DIR
        archivo_path = secciones_dir / nombre_archivo
        if archivo_path.exists() and archivo_path.is_file():
            try:
                with open(archivo_path, 'r', encoding='utf-8') as f:
                    seccion_data = json.load(f)
                    # El archivo puede tener estructura como {"Generales_01": {"grupo_datos": [...]}}
                    # o ser una lista directamente
                    grupo_datos = None
                    if isinstance(seccion_data, dict):
                        # Buscar el primer grupo_datos en cualquier clave
                        for key, value in seccion_data.items():
                            if isinstance(value, dict) and 'grupo_datos' in value:
                                grupo_datos = value['grupo_datos']
                                break
                    elif isinstance(seccion_data, list):
                        grupo_datos = seccion_data
                    
                    if grupo_datos:
                        # Construir la lista de preguntas desde los archivos individuales
                        preguntas_lista = []
                        for item in grupo_datos:
                            clave = item.get('clave') if isinstance(item, dict) else str(item)
                            if clave:
                                # Cargar el archivo individual desde inv_datos/datos/
                                pregunta_data = cargar_dato_pregunta(clave)
                                if pregunta_data:
                                    # Fusionar campos del grupo_datos (catalogo, anclar, validacion_input, etc.) con los datos del archivo
                                    if isinstance(item, dict):
                                        # Fusionar todos los campos excepto 'clave' y 'nombre' (preservar nombre del archivo JSON)
                                        # El 'nombre' del archivo JSON tiene la estructura multiidioma correcta
                                        campos_fusionados = {k: v for k, v in item.items() if k not in ['clave', 'nombre']}
                                        
                                        # Debug: verificar qué campos se van a fusionar
                                        if 'validacion_input' in campos_fusionados:
                                            logging.info(f"[FUSION] Campo '{clave}': validacion_input={campos_fusionados.get('validacion_input')} encontrado en grupo_datos")
                                        else:
                                            logging.warning(f"[FUSION] Campo '{clave}': NO tiene validacion_input en grupo_datos. Campos disponibles: {list(item.keys())}")
                                        
                                        # IMPORTANTE: Actualizar pregunta_data con campos_fusionados
                                        # Esto sobrescribe cualquier campo existente en pregunta_data con los de grupo_datos
                                        pregunta_data.update(campos_fusionados)
                                        
                                        # Verificar que validacion_input se haya fusionado correctamente DESPUÉS del update
                                        if 'validacion_input' in pregunta_data:
                                            logging.info(f"[FUSION] Campo '{clave}': validacion_input={pregunta_data.get('validacion_input')} fusionado correctamente en pregunta_data final")
                                        else:
                                            logging.error(f"[FUSION] Campo '{clave}': validacion_input NO está en pregunta_data después de fusionar. Propiedades finales: {list(pregunta_data.keys())}")
                                        
                                        logging.info(f"[FUSION] Campo '{clave}': Campos fusionados desde grupo_datos: {list(campos_fusionados.keys())}")
                                    preguntas_lista.append(pregunta_data)
                                elif isinstance(item, dict):
                                    # Si no hay archivo individual, usar el item completo como pregunta
                                    # Esto permite campos definidos solo en grupo_datos
                                    pregunta_data = item.copy()
                                    # Verificar que validacion_input esté presente
                                    if 'validacion_input' in pregunta_data:
                                        logging.info(f"[FUSION] Campo '{clave}': validacion_input={pregunta_data.get('validacion_input')} desde grupo_datos (sin archivo individual)")
                                    preguntas_lista.append(pregunta_data)
                                    logging.info(f"[FUSION] Campo '{clave}': Usando definición completa desde grupo_datos (sin archivo individual)")
                        
                        if preguntas_lista:
                            contenido = {"datos": preguntas_lista}
                            
                            # Preservar frase_introduccion si existe en el objeto anidado
                            # La estructura es: {"Domicilio_01": {"frase_introduccion": {...}, "grupo_datos": [...]}}
                            if isinstance(seccion_data, dict):
                                for key, value in seccion_data.items():
                                    if isinstance(value, dict) and 'frase_introduccion' in value:
                                        contenido['frase_introduccion'] = value['frase_introduccion']
                                        logging.info(f"[INFO] Frase introductoria encontrada en '{nombre_archivo}' para clave '{key}'")
                                        break
                            
                            # Agregar a caché para futuras consultas
                            self._preguntas_cargadas[nombre_archivo] = contenido
                            logging.info(f"[INFO] Archivo '{nombre_archivo}' cargado desde {secciones_dir} con {len(preguntas_lista)} preguntas")
                            if 'frase_introduccion' in contenido:
                                logging.info(f"[INFO] Frase introductoria preservada en contenido: {contenido.get('frase_introduccion')}")
                            return contenido
            except (json.JSONDecodeError, Exception) as e:
                logging.error(f"[ERROR] No se pudo cargar {archivo_path}: {e}")
        
        # Fallback: si se buscó en la carpeta de la empresa y no se encontró, intentar en la ruta antigua
        if empresa and secciones_dir != INV_DATOS_SECCIONES_DIR:
            archivo_path_fallback = INV_DATOS_SECCIONES_DIR / nombre_archivo
            if archivo_path_fallback.exists() and archivo_path_fallback.is_file():
                try:
                    with open(archivo_path_fallback, 'r', encoding='utf-8') as f:
                        seccion_data = json.load(f)
                        grupo_datos = None
                        if isinstance(seccion_data, dict):
                            for key, value in seccion_data.items():
                                if isinstance(value, dict) and 'grupo_datos' in value:
                                    grupo_datos = value['grupo_datos']
                                    break
                        elif isinstance(seccion_data, list):
                            grupo_datos = seccion_data
                        
                        if grupo_datos:
                            preguntas_lista = []
                            for item in grupo_datos:
                                clave = item.get('clave') if isinstance(item, dict) else str(item)
                                if clave:
                                    pregunta_data = cargar_dato_pregunta(clave)
                                    if pregunta_data:
                                        if isinstance(item, dict):
                                            campos_fusionados = {k: v for k, v in item.items() if k not in ['clave', 'nombre']}
                                            pregunta_data.update(campos_fusionados)
                                        preguntas_lista.append(pregunta_data)
                            
                            if preguntas_lista:
                                contenido = {"datos": preguntas_lista}
                                if isinstance(seccion_data, dict):
                                    for key, value in seccion_data.items():
                                        if isinstance(value, dict) and 'frase_introduccion' in value:
                                            contenido['frase_introduccion'] = value['frase_introduccion']
                                            break
                                self._preguntas_cargadas[nombre_archivo] = contenido
                                logging.info(f"[INFO] Archivo '{nombre_archivo}' cargado desde fallback (inv_datos/secciones/) con {len(preguntas_lista)} preguntas")
                                return contenido
                except (json.JSONDecodeError, Exception) as e:
                    logging.error(f"[ERROR] No se pudo cargar {archivo_path_fallback}: {e}")
        
        # 2. Intentar en inv_datos/grupos/ (archivos de sección de grupos como G001_01.json)
        archivo_path = INV_DATOS_GRUPOS_DIR / nombre_archivo
        if archivo_path.exists() and archivo_path.is_file():
            try:
                with open(archivo_path, 'r', encoding='utf-8') as f:
                    seccion_data = json.load(f)
                    # El archivo puede tener estructura como {"Generales_01": {"grupo_datos": [...]}}
                    # o ser una lista directamente
                    grupo_datos = None
                    if isinstance(seccion_data, dict):
                        # Buscar el primer grupo_datos en cualquier clave
                        for key, value in seccion_data.items():
                            if isinstance(value, dict) and 'grupo_datos' in value:
                                grupo_datos = value['grupo_datos']
                                break
                    elif isinstance(seccion_data, list):
                        grupo_datos = seccion_data
                    
                    if grupo_datos:
                        # Extraer el prefijo del grupo (ej: G001 de G001_01)
                        # Y buscar los archivos en inv_datos/grupos/datos/G001/
                        prefijo_grupo = None
                        if nombre_archivo.startswith('G') and '_' in nombre_archivo:
                            prefijo_grupo = nombre_archivo.split('_')[0]  # Ej: "G001" de "G001_01.json"
                        
                        # Construir la lista de preguntas desde los archivos individuales
                        preguntas_lista = []
                        for item in grupo_datos:
                            clave = item.get('clave') if isinstance(item, dict) else str(item)
                            if clave:
                                # Si tenemos un prefijo de grupo, buscar en inv_datos/grupos/datos/{prefijo}/
                                # Si no, buscar en inv_datos/datos/
                                pregunta_data = None
                                if prefijo_grupo:
                                    archivo_pregunta_path = INV_DATOS_GRUPOS_DATOS_DIR / prefijo_grupo / f"{clave}.json"
                                    if archivo_pregunta_path.exists():
                                        try:
                                            with open(archivo_pregunta_path, 'r', encoding='utf-8') as pf:
                                                pregunta_data = json.load(pf)
                                        except (json.JSONDecodeError, Exception) as e:
                                            logging.error(f"[ERROR] No se pudo cargar {archivo_pregunta_path}: {e}")
                                
                                # Si no se encontró en el grupo, intentar en datos/
                                if not pregunta_data:
                                    pregunta_data = cargar_dato_pregunta(clave)
                                
                                if pregunta_data:
                                    # Fusionar campos del grupo_datos (catalogo, anclar, etc.) con los datos del archivo
                                    if isinstance(item, dict):
                                        pregunta_data.update({k: v for k, v in item.items() if k != 'clave'})
                                    preguntas_lista.append(pregunta_data)
                        
                        if preguntas_lista:
                            contenido = {"datos": preguntas_lista}
                            # Agregar a caché para futuras consultas
                            self._preguntas_cargadas[nombre_archivo] = contenido
                            logging.info(f"[INFO] Archivo '{nombre_archivo}' cargado desde inv_datos/grupos/ con {len(preguntas_lista)} preguntas")
                            return contenido
            except (json.JSONDecodeError, Exception) as e:
                logging.error(f"[ERROR] No se pudo cargar {archivo_path}: {e}")
        
        # 3. Intentar en inv_datos/datos/ (archivos que contienen directamente un array de datos)
        archivo_path = INV_DATOS_DATOS_DIR / nombre_archivo
        if archivo_path.exists() and archivo_path.is_file():
            try:
                with open(archivo_path, 'r', encoding='utf-8') as f:
                    contenido = json.load(f)
                    if 'datos' in contenido:
                        # Agregar a caché para futuras consultas
                        self._preguntas_cargadas[nombre_archivo] = contenido
                        logging.info(f"[INFO] Archivo '{nombre_archivo}' cargado desde inv_datos/datos/")
                        return contenido
            except (json.JSONDecodeError, Exception) as e:
                logging.error(f"[ERROR] No se pudo cargar {archivo_path}: {e}")
        
        # 4. Intentar en inv_datos/grupos/datos/*/ (buscando en subdirectorios directamente)
        if INV_DATOS_GRUPOS_DATOS_DIR.exists():
            for subdir in INV_DATOS_GRUPOS_DATOS_DIR.iterdir():
                if subdir.is_dir():
                    archivo_path = subdir / nombre_archivo
                    if archivo_path.exists() and archivo_path.is_file():
                        try:
                            with open(archivo_path, 'r', encoding='utf-8') as f:
                                contenido = json.load(f)
                                if 'datos' in contenido:
                                    # Agregar a caché para futuras consultas
                                    self._preguntas_cargadas[nombre_archivo] = contenido
                                    logging.info(f"[INFO] Archivo '{nombre_archivo}' cargado desde inv_datos/grupos/datos/{subdir.name}/")
                                    return contenido
                        except (json.JSONDecodeError, Exception) as e:
                            logging.error(f"[ERROR] No se pudo cargar {archivo_path}: {e}")
        
        return None

    def obtener_preguntas(self, nombre_archivo: str, empresa: str = None) -> List[Dict[str, Any]]:
        """
        Devuelve solo la lista de preguntas ('datos') de un archivo.
        Busca en múltiples ubicaciones:
        1. inv_datos/empresas/{empresa}/secciones/ o inv_datos/secciones/ (nuevo)
        2. RESOURCES_PATH (archivos legacy, fallback)
        2. inv_datos/empresas/{empresa}/secciones/ o inv_datos/secciones/ (secciones)
        3. inv_datos/datos/ (datos planos)
        4. inv_datos/grupos/datos/*/ (grupos en subdirectorios)
        
        Args:
            nombre_archivo: Nombre del archivo con o sin extensión .json
            empresa: Nombre de la empresa (opcional). Si se proporciona, busca en inv_datos/empresas/{empresa}/secciones/
        """
        # Normalizar el nombre del archivo (agregar .json si no lo tiene)
        if not nombre_archivo.endswith('.json'):
            nombre_archivo = f"{nombre_archivo}.json"
        
        # Usar obtener_definiciones que ya tiene toda la lógica de búsqueda
        # Esto evita duplicar código y recursión
        definiciones = self.obtener_definiciones(nombre_archivo, empresa)
        if definiciones:
            return definiciones.get('datos', [])
        
        # Si no se encuentra en ninguna ubicación, retornar lista vacía
        logging.warning(f"[WARNING] No se encontró el archivo '{nombre_archivo}' en ninguna ubicación conocida.")
        logging.debug(f"[DEBUG] Buscado en: {INV_DATOS_DATOS_DIR} y {INV_DATOS_GRUPOS_DATOS_DIR}")
        return []

    def obtener_todos_los_campos(self) -> List[Dict[str, Any]]:
        """
        Devuelve una lista plana con TODOS los campos de TODAS las entrevistas.
        Ideal para construir el formulario en el frontend.
        """
        return self._lista_completa_campos

# Creamos una única instancia que será usada por toda la aplicación
maestro_preguntas = MaestroDePreguntas()