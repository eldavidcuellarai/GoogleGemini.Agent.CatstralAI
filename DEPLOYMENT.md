# Guía de Despliegue en Vercel

## Configuración para "El Cerebro de Gemini"

### 1. Preparación

La aplicación está configurada para desplegarse en Vercel usando:
- **Frontend**: Archivos estáticos HTML/CSS/JS en `el cerebro de gemini/`
- **Backend**: Serverless function en `/api/gemini.js`
- **Configuración**: `vercel.json` optimizado

### 2. Variables de Entorno Requeridas

En el dashboard de Vercel, configura estas variables de entorno:

**Obligatorio:**
```
GEMINI_API_KEY=tu_api_key_de_gemini_aqui
```

**Opcional (ya tienen valores por defecto):**
```
GEMINI_MODEL=gemini-2.5-pro
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
```

### 3. Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la key y agrégala a las variables de entorno de Vercel

### 4. Despliegue

#### Opción A: Desde GitHub
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

#### Opción B: Desde CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno
vercel env add GEMINI_API_KEY
```

### 5. Configuración del Proyecto

El archivo `vercel.json` está configurado para:
- ✅ Servir archivos estáticos desde `el cerebro de gemini/`
- ✅ Enrutar APIs a `/api/gemini.js`
- ✅ Configurar headers de seguridad
- ✅ Habilitar CORS para la API
- ✅ Timeout de 30 segundos para la función serverless

### 6. Estructura de Archivos

```
/
├── api/
│   └── gemini.js          # Serverless function
├── el cerebro de gemini/
│   ├── index.html         # Página principal
│   ├── app.js            # Lógica modificada para usar /api/gemini
│   ├── style.css         # Estilos
│   └── ...
├── vercel.json           # Configuración de Vercel
└── .env.example          # Variables de entorno de ejemplo
```

### 7. Verificación Post-Despliegue

1. ✅ La página principal carga en `https://tu-dominio.vercel.app`
2. ✅ Los archivos se pueden subir sin errores
3. ✅ La API de Gemini responde correctamente
4. ✅ El chat funciona sin problemas
5. ✅ No hay errores en la consola del navegador

### 8. Troubleshooting

**Error: "API key not configured"**
- Verificar que `GEMINI_API_KEY` esté configurado en Vercel
- Redesplegar después de agregar la variable

**Error: "Function timeout"**
- Los documentos muy grandes pueden tardar más de 30 segundos
- Verificar el tamaño de los archivos PDF

**Error: CORS**
- Los headers CORS ya están configurados en `vercel.json`
- Verificar que la request se haga a `/api/gemini`

### 9. Dominios Personalizados

Para usar un dominio personalizado:
1. Ve a Settings > Domains en Vercel
2. Agrega tu dominio
3. Configura los DNS según las instrucciones

### 10. Monitoreo

- **Analytics**: Habilitado automáticamente en Vercel
- **Logs**: Visibles en el dashboard de Vercel
- **Performance**: Monitoreado por Vercel automáticamente