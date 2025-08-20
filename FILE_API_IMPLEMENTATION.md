# Google File API Implementation

## Overview
Esta implementación integra la Google File API para mejorar el procesamiento de documentos catastrales, especialmente PDFs y archivos grandes.

## Beneficios de File API

### 1. Mejor rendimiento
- **Archivos grandes**: Maneja archivos hasta 20MB sin problemas de token limits
- **PDFs complejos**: Procesamiento nativo de PDFs sin necesidad de OCR manual
- **Menos chunking**: Reduce la necesidad de dividir documentos en partes

### 2. Mayor precisión
- **OCR integrado**: Google procesa automáticamente el texto de PDFs escaneados
- **Mejor contexto**: Mantiene la estructura completa del documento
- **Análisis de imágenes**: Procesa directamente imágenes sin conversión previa

### 3. Optimizado para Cloud Run
- **Upload resumable**: Maneja interrupciones de red
- **Timeouts optimizados**: Configurado para entornos serverless
- **Fallback robusto**: Si falla File API, usa método tradicional

## Implementación Técnica

### Backend (`/api/gemini.js`)

#### Función principal: `uploadFileToGoogle()`
```javascript
// Sube archivo usando protocolo resumable
// 1. Inicia sesión de upload
// 2. Sube archivo en chunks
// 3. Espera procesamiento
// 4. Retorna URI para usar con Gemini
```

#### Función de monitoreo: `waitForFileProcessing()`
```javascript
// Optimizada para Cloud Run:
// - Máximo 15 intentos (vs 30 original)
// - Backoff exponencial
// - Timeouts escalonados
```

### Frontend (`/app.js`)

#### Función principal: `processFileWithFileAPI()`
```javascript
// Intenta File API primero
// Si falla, usa método tradicional como fallback
```

#### Flujo de procesamiento:
1. **File API**: `processFileWithFileAPI()` - Para archivos compatibles
2. **Fallback**: `processFileTraditional()` - Para casos especiales
3. **Hybrid**: Usa ambos según el tipo de archivo

## Configuración

### Variables de entorno requeridas
- `GEMINI_API_KEY`: API key de Google AI Studio

### Modelos compatibles
- `gemini-2.5-pro`: Análisis principal con File API
- `gemini-2.5-flash`: Fallback y análisis rápido

## Tipos de archivo soportados

### Con File API
- **PDFs**: Hasta 20MB, procesamiento nativo
- **Imágenes**: JPG, PNG, WebP
- **Documentos**: Word, Excel (experimental)

### Sin File API (fallback)
- **PDFs grandes**: Chunking automático
- **Formatos legacy**: Conversión a texto primero

## Debugging y Logs

### Logs importantes a buscar en Cloud Run:
```
📤 Subiendo archivo a Google File API
✅ Archivo subido exitosamente
⏳ Esperando procesamiento del archivo
🔍 Verificando estado del archivo
✅ Archivo procesado y listo para uso
⚠️ File API falló, usando método tradicional
```

### Códigos de error comunes:
- `Upload failed: 413`: Archivo muy grande (>20MB)
- `File processing timeout`: Archivo tardó mucho en procesarse
- `Failed to get file status`: Problema de conectividad

## Monitoreo de rendimiento

### Métricas a observar:
1. **Tiempo de upload**: Debe ser <30 segundos para archivos <10MB
2. **Tiempo de procesamiento**: Generalmente <60 segundos
3. **Tasa de éxito**: >90% para File API
4. **Fallback rate**: <20% debería usar método tradicional

## Solución de problemas

### Si File API no funciona:
1. Verificar API key tiene permisos para File API
2. Confirmar que el modelo soporta fileData
3. Revisar límites de tamaño de archivo
4. Verificar conectividad desde Cloud Run

### Si el fallback falla:
1. Problema con PDF.js en frontend
2. Límites de memoria en Cloud Run
3. Timeout de serverless function

## Próximas mejoras

### Versión futura:
- **Batch processing**: Múltiples archivos en paralelo
- **Streaming**: Procesar archivos mientras se suben
- **Cache**: Almacenar URIs temporalmente
- **Analytics**: Métricas detalladas de uso