# GoogleGemini.Agent.CatstralAI

Un agente inteligente basado en Google Gemini AI para el procesamiento y análisis de datos catastrales.

## 🚀 Características

- Procesamiento inteligente de documentos PDF catastrales
- Interfaz web moderna con análisis en tiempo real
- Extracción automática de datos relevantes con OCR + IA
- Visualización y gestión de datos de propiedades
- Sistema de carga y gestión de archivos drag & drop
- Interfaz responsiva con tabs organizados por categorías
- Análisis comparativo de múltiples documentos catastrales

## 💻 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **IA**: Google Gemini AI
- **Procesamiento de PDFs**: PDF.js
- **Deployment**: Vercel con Node.js Express
- **UI/UX**: Diseño moderno con sistema de tabs y paneles

## 🛠️ Estructura del Proyecto

```
el cerebro de gemini/          # Aplicación principal (HTML)
├── index.html                 # Interfaz principal
├── app.js                     # Lógica de la aplicación
├── style.css                  # Estilos CSS
└── README.md                  # Documentación

server.js                      # Servidor Express para producción
package.json                   # Dependencias y scripts
vercel.json                    # Configuración de Vercel
```

## 🏁 Comenzando

### Desarrollo Local

1. Clona el repositorio
```bash
git clone https://github.com/eldavidcuellarai/GoogleGemini.Agent.CatstralAI.git
```

2. Abre el archivo HTML directamente
```bash
# Opción 1: Abrir directamente en el navegador
open "el cerebro de gemini/index.html"

# Opción 2: Usar servidor local
cd GoogleGemini.Agent.CatstralAI
npm install
npm run dev
```

### Despliegue en Vercel

La aplicación está configurada para desplegarse fácilmente en Vercel:

1. **Método 1: Despliegue directo (recomendado)**
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Desplegar
vercel --prod
```

2. **Método 2: Conectar con GitHub**
- Conecta tu repositorio de GitHub con Vercel
- Vercel detectará automáticamente la configuración
- Cada push a main se desplegará automáticamente

3. **Configuración de entorno**
- No requiere variables de entorno del servidor
- Los usuarios ingresan su API key directamente en la interfaz
- La aplicación funciona completamente del lado del cliente

### URLs de Prueba

- **Desarrollo**: http://localhost:8080
- **Producción**: Tu URL de Vercel después del despliegue

## 🔧 Configuración

La aplicación incluye:

- **OCR + IA Tab**: Procesamiento principal de documentos catastrales
  - Carga de documentos de propiedad
  - Extracción automática de datos
  - Visualización en tablas organizadas
- **Validación Tab**: Análisis de documentos de gravamen
- **Sistema de tabs dual**: Navegación principal y paneles internos (Tablas/Chat)
- **Datos estructurados**: Información del predio, medidas y colindancias

## 🔧 Configuración

1. Obtén una API Key de Google AI Studio: https://makersuite.google.com/app/apikey
2. Ingresa tu API Key en la sección de configuración
3. Personaliza las instrucciones del sistema (opcional)
4. ¡Comienza a cargar y analizar documentos catastrales!

## 🚀 Despliegue en Vercel

Para desplegar en Vercel:

1. **Root Directory**: Configura como `v0-registro-de-la-propiedad`
2. **Framework**: Next.js (auto-detectado)
3. **Build Command**: `npm run build`
4. **Install Command**: `npm install`
5. **Variables de Entorno**: Agrega `GEMINI_API_KEY` con tu API key de Google AI Studio

### Configuración de Variables de Entorno

- `GEMINI_API_KEY` - Tu API key de Google AI Studio

## 📄 Licencia

Este proyecto está bajo la Licencia incluida en el archivo [LICENSE](LICENSE).