# Configuración de Variables de Entorno en Vercel

Este documento explica cómo configurar las variables de entorno para el proyecto CatstralAI en Vercel.

## Variables de Entorno Requeridas

### 1. API Key de Google Gemini (REQUERIDA)

La variable más importante es la API key de Google Gemini:

```bash
GEMINI_API_KEY=tu_gemini_api_key_aqui
# O alternativamente:
GOOGLE_GENERATIVE_AI_API_KEY=tu_gemini_api_key_aqui
```

### 2. Variables Opcionales de Configuración

```bash
# Configuración de modelos
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_FALLBACK_MODEL=gemini-1.5-flash

# Configuración de la API
GEMINI_API_TEMPERATURE=0.3
GEMINI_API_TOP_P=0.8
GEMINI_API_TOP_K=40
GEMINI_MAX_OUTPUT_TOKENS=8192

# Configuración de la aplicación
MAX_FILES=10
MAX_TOTAL_SIZE_MB=50
MAX_SINGLE_FILE_MB=20
DEFAULT_PROCESSING_MODE=sequential

# Configuración de UI
DEFAULT_THEME=light
ENABLE_DARK_MODE=true

# Configuración de seguridad
ENABLE_API_KEY_MASKING=true
LOG_LEVEL=info
```

## Configuración en Vercel Dashboard

### Opción 1: A través del Dashboard Web

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto "GoogleGemini.Agent.CatstralAI"
3. Ve a **Settings** > **Environment Variables**
4. Agrega las siguientes variables:

| Nombre | Valor | Entornos |
|--------|-------|----------|
| `GEMINI_API_KEY` | Tu Google Gemini API Key | Production, Preview, Development |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Tu Google Gemini API Key | Production, Preview, Development |

### Opción 2: A través de Vercel CLI

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Autenticarse
vercel login

# Configurar variables de entorno
vercel env add GEMINI_API_KEY
vercel env add GOOGLE_GENERATIVE_AI_API_KEY

# Para configurar variables opcionales
vercel env add GEMINI_MODEL
vercel env add DEFAULT_PROCESSING_MODE
```

### Opción 3: Archivo .env para desarrollo local

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar con tus valores reales
GEMINI_API_KEY=tu_gemini_api_key_real_aqui
GOOGLE_GENERATIVE_AI_API_KEY=tu_gemini_api_key_real_aqui
```

## Obtener Google Gemini API Key

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la API key generada
5. Úsala como valor para `GEMINI_API_KEY`

## Verificación de Configuración

### Para la aplicación Next.js (v0-registro-de-la-propiedad)

Las variables de entorno se cargan automáticamente en el servidor. Puedes verificar en los logs de Vercel.

### Para la aplicación HTML (el cerebro de gemini)

La aplicación ahora detecta automáticamente si hay variables de entorno disponibles:

1. **Cuando hay variables de entorno**: El campo API Key se muestra como `••••••••••••••••` y está deshabilitado
2. **Cuando NO hay variables de entorno**: El usuario debe ingresar manualmente la API Key

## Estructura del Proyecto en Vercel

```
GoogleGemini.Agent.CatstralAI/
├── vercel.json                 # Configuración principal (apunta a HTML)
├── .env.example               # Template de variables de entorno
├── el cerebro de gemini/      # Aplicación HTML principal
│   ├── index.html
│   ├── app.js                # Detecta variables de entorno automáticamente
│   └── .env.example
└── v0-registro-de-la-propiedad/  # Aplicación Next.js
    ├── vercel.json           # Configuración específica de Next.js
    ├── .env.local            # Variables de entorno locales
    └── .env.example          # Template
```

## Solución de Problemas

### Error: "API key no configurada"

1. Verifica que `GEMINI_API_KEY` esté configurada en Vercel
2. Redeploy la aplicación después de agregar variables
3. Revisa los logs de deployment en Vercel

### Error: "No se recibió respuesta válida del modelo"

1. Verifica que tu API key sea válida
2. Verifica que tengas créditos disponibles en Google AI Studio
3. Comprueba que no haya restricciones de región

### La aplicación no detecta las variables de entorno

Para aplicaciones estáticas (HTML), las variables de entorno deben ser expuestas en tiempo de build. Considera:

1. Usar la aplicación Next.js para mejor soporte de variables de entorno
2. Configurar las variables como `NEXT_PUBLIC_` si necesitas acceso desde el cliente

## Mejores Prácticas de Seguridad

1. **Nunca commits API keys** en el código fuente
2. **Usa diferentes API keys** para desarrollo y producción
3. **Configura restricciones de dominio** en Google AI Studio
4. **Rotación regular** de API keys
5. **Monitorea el uso** de la API para detectar uso no autorizado

## Comandos Útiles

```bash
# Ver variables configuradas
vercel env ls

# Eliminar una variable
vercel env rm VARIABLE_NAME

# Descargar variables para desarrollo local
vercel env pull .env.local

# Redeploy después de cambios en variables
vercel --prod
```

## Soporte

Si tienes problemas con la configuración:

1. Revisa los logs de Vercel
2. Verifica que las variables estén configuradas correctamente
3. Asegúrate de que tu API key de Google Gemini sea válida
4. Consulta la [documentación de Vercel](https://vercel.com/docs/concepts/projects/environment-variables)