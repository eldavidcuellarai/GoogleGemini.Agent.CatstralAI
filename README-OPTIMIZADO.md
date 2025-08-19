# GoogleGemini.Agent.CatstralAI - Optimizado

Un agente inteligente basado en Google Gemini AI para el procesamiento y análisis de datos catastrales.

## 🚀 Características Optimizadas

- **Procesamiento inteligente de documentos PDF catastrales** con OCR avanzado
- **Interfaz web moderna** con análisis en tiempo real
- **Extracción automática de datos** específicos de documentos mexicanos
- **Slider dinámico** para cambiar entre Documentos de Propiedad y Gravamen
- **Sistema de carga dual** con drag & drop funcional
- **Visualización estructurada** con todas las secciones de datos
- **Interfaz responsiva** con tabs organizados por categorías
- **Análisis comparativo** de múltiples documentos catastrales

## 💻 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **IA**: Google Gemini AI con prompts optimizados
- **Procesamiento de PDFs**: PDF.js integrado
- **Deployment**: Vercel con Node.js Express
- **UI/UX**: Diseño moderno con sistema de tabs y paneles duales

## 🗂️ Secciones de Datos Extraídos

### Documentos de Propiedad
- **🏠 Información del Predio**: Expediente catastral, lote, manzana, superficie, ubicación
- **📐 Medidas y Colindancias**: Norte, sur, este, oeste con descripciones detalladas  
- **👥 Titulares**: Vendedor/comprador con CURP, RFC, régimen matrimonial
- **⚖️ Acto Jurídico**: Tipo acto, escritura, notario, fecha, valor
- **📜 Datos Registrales**: Volumen, libro, sección, folio, fechas
- **📚 Antecedentes**: Inscripciones anteriores y propietarios
- **🎯 Calidad de Extracción**: Métricas de confianza y completitud

### Documentos de Gravamen  
- **🏠 Información del Predio**: Datos básicos del inmueble
- **⚖️ Acto Jurídico**: Detalles del acto constitutivo del gravamen
- **📜 Datos Registrales**: Referencias registrales del gravamen
- **🏦 Información del Gravamen**: Acreedor, deudor, monto, plazo, garantías

## 🛠️ Estructura del Proyecto

```
📁 GoogleGemini.Agent.CatstralAI/
├── 🎯 el cerebro de gemini/    # ← Aplicación principal optimizada
│   ├── index.html              # ← Interfaz con tabs duales y slider
│   ├── app.js                  # ← JavaScript con funcionalidad completa
│   └── style.css               # ← Estilos optimizados y responsivos
├── 📁 v0-registro-de-la-propiedad/  # ← Referencia Next.js original
├── server.js                   # ← Servidor Express para desarrollo/producción
├── package.json               # ← Dependencias y scripts
├── vercel.json               # ← Configuración de Vercel
└── README.md                 # ← Documentación completa
```

## 🏁 Comenzando

### Desarrollo Local

1. **Clona el repositorio**
```bash
git clone https://github.com/eldavidcuellarai/GoogleGemini.Agent.CatstralAI.git
cd GoogleGemini.Agent.CatstralAI
```

2. **Ejecuta el servidor**
```bash
npm install
npm start
# Visita http://localhost:8080
```

### Despliegue en Vercel

```bash
npm i -g vercel
vercel --prod
```

## 🔧 Uso de la Aplicación

### 1. Configuración
- Obtén API Key de Google AI Studio
- Ingresa la clave en la sección de configuración

### 2. Carga de Documentos
- **Usa el slider** para seleccionar tipo: Propiedad/Gravamen
- **Arrastra archivos** o usa el botón de selección
- **Formatos**: PDF, PNG, JPG, WebP (máx. 30MB)

### 3. Análisis Automático
- Los archivos se procesan automáticamente
- Los datos aparecen en el panel derecho
- Navegación por tabs: Tablas/Chat

## ✅ Mejoras Implementadas

### 🎛️ UI/UX Optimizada:
- ✅ Slider funcional Propiedad/Gravamen
- ✅ Sistema de carga dual operativo
- ✅ Visualización dinámica de datos
- ✅ Estados de carga y error
- ✅ Diseño responsivo mejorado

### 🧠 Funcionalidad Avanzada:
- ✅ Extracción de datos completa
- ✅ Prompts optimizados para documentos mexicanos
- ✅ Manejo inteligente de variaciones de texto
- ✅ Procesamiento asíncrono de archivos
- ✅ Validación robusta de archivos

### 📊 Secciones de Datos:
- ✅ Información del Predio completa
- ✅ Medidas y Colindancias detalladas
- ✅ Titulares con CURP/RFC
- ✅ Acto Jurídico completo
- ✅ Datos Registrales
- ✅ Antecedentes (solo Propiedad)
- ✅ Información de Gravamen (solo Gravamen)
- ✅ Calidad de Extracción

### 🔧 Aspectos Técnicos:
- ✅ Drag & drop funcional
- ✅ Validación de archivos
- ✅ Procesamiento con PDF.js
- ✅ Llamadas a API Gemini
- ✅ Parsing inteligente de respuestas JSON
- ✅ Manejo de errores robusto

## 🚀 Listo para Producción

La aplicación está completamente funcional y lista para:
- ✅ Despliegue en Vercel
- ✅ Procesamiento real de documentos
- ✅ Uso por usuarios finales
- ✅ Análisis de documentos catastrales mexicanos

---

**¡La aplicación está optimizada y completamente operativa!** 🎉
