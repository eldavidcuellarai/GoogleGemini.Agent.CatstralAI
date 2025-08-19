# GoogleGemini.Agent.CatstralAI

Un agente inteligente basado en Google Gemini AI para el procesamiento y análisis de datos catastrales.

## 🚀 Características

- Procesamiento inteligente de documentos PDF catastrales
- Interfaz web moderna construida con Next.js
- Extracción automática de datos relevantes
- Visualización y edición de datos procesados
- Sistema de carga y gestión de archivos
- Interfaz de usuario responsiva y accesible

## 💻 Tecnologías

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **IA**: Google Gemini AI
- **Procesamiento de PDFs**: Biblioteca PDF integrada
- **Componentes UI**: Sistema de diseño personalizado

## 🛠️ Estructura del Proyecto

```
v0-registro-de-la-propiedad/   # Aplicación principal
├── app/                       # Lógica principal de Next.js
│   ├── actions/              # Acciones del servidor
│   └── api/                  # Endpoints de la API
├── components/               # Componentes reutilizables
├── lib/                     # Utilidades y configuración
└── public/                  # Archivos estáticos
```

## 🏁 Comenzando

1. Clona el repositorio
```bash
git clone https://github.com/eldavidcuellarai/GoogleGemini.Agent.CatstralAI.git
```

2. Instala las dependencias
```bash
cd v0-registro-de-la-propiedad
npm install
```

3. Inicia el servidor de desarrollo
```bash
npm run dev
```

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