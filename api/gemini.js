export default async function handler(req, res) {
    // Solo permitir POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Configurar headers para CORS y contenido
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verificar que la API key esté configurada
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_actual_api_key_here') {
        const errorMessage = !apiKey 
            ? 'API key not configured on server. The GEMINI_API_KEY environment variable is missing.'
            : 'Invalid API Key. The GEMINI_API_KEY is set to a placeholder value.';
        
        console.error(`Error: ${errorMessage}`);
        return res.status(500).json({ 
            error: 'Server Configuration Error',
            details: errorMessage
        });
    }

    try {
        const { text, model = 'gemini-2.5-pro', systemPrompt, fileData, fileType, mimeType } = req.body;

        // Manejo de archivos usando Google File API
        let fileUri = null;
        if (fileData && fileType && mimeType) {
            console.log(`📁 Subiendo archivo a Google File API: ${fileType}, ${mimeType}`);
            try {
                fileUri = await uploadFileToGoogle(fileData, mimeType, apiKey);
                console.log(`✅ Archivo subido exitosamente: ${fileUri}`);
            } catch (uploadError) {
                console.error('❌ Error subiendo archivo:', uploadError);
                // Fallback al método tradicional si falla la subida
                console.log('🔄 Usando método tradicional como fallback');
            }
        }

        if (!text && !fileUri) {
            return res.status(400).json({ error: 'Text or file data is required' });
        }

        // Log del tamaño si hay texto
        if (text) {
            const textSize = new TextEncoder().encode(text).length;
            console.log(`📊 Tamaño del texto: ${textSize} bytes (${text.length} caracteres)`);
        }

        // Preparar el contenido para Gemini
        const contents = [
            {
                parts: [
                    {
                        text: systemPrompt || 'Eres un experto analista de documentos catastrales especializado en el análisis técnico y legal de propiedades.'
                    }
                ]
            }
        ];

        // Agregar contenido de archivo o texto
        if (fileUri) {
            contents.push({
                parts: [
                    {
                        fileData: {
                            mimeType: mimeType,
                            fileUri: fileUri
                        }
                    },
                    {
                        text: text || 'Analiza este documento catastral y extrae toda la información relevante.'
                    }
                ]
            });
        } else if (text) {
            contents.push({
                parts: [
                    {
                        text: text
                    }
                ]
            });
        }

        // Configuración de generación
        const generationConfig = {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        };

        // Configuraciones de seguridad
        const safetySettings = [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ];

        // Llamada a la API de Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig,
                safetySettings
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', errorData);
            
            // Si el modelo principal falla, intentar con el modelo de respaldo
            if (model === 'gemini-2.5-pro') {
                console.log('Intentando con modelo de respaldo gemini-2.5-flash');
                
                const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents,
                        generationConfig,
                        safetySettings
                    })
                });

                if (!fallbackResponse.ok) {
                    throw new Error(`Gemini API error: ${response.status}`);
                }

                const fallbackData = await fallbackResponse.json();
                return res.status(200).json(fallbackData);
            }
            
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Verificar si hay contenido en la respuesta
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: 'No content generated' });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error in Gemini API handler:', error);
        return res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message 
        });
    }
}

// Función para subir archivos a Google File API (compatible con Cloud Run)
async function uploadFileToGoogle(fileData, mimeType, apiKey) {
    try {
        console.log(`📤 Subiendo archivo a Google File API, tipo: ${mimeType}`);
        
        // Usar la implementación resumable que es más confiable en Cloud Run
        const fileBytes = Buffer.from(fileData, 'base64');
        
        // Paso 1: Iniciar sesión de upload resumable
        const startResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': fileBytes.length.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file: { mimeType: mimeType }
            })
        });
        
        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error('❌ Error iniciando upload:', errorText);
            throw new Error(`Failed to start upload: ${startResponse.status} - ${errorText}`);
        }
        
        const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            throw new Error('No upload URL received from start request');
        }
        
        console.log('📤 URL de upload obtenida, subiendo archivo...');
        
        // Paso 2: Subir el archivo usando la URL obtenida
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': fileBytes.length.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            body: fileBytes
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ Error subiendo archivo:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        console.log('✅ Archivo subido exitosamente:', uploadResult.file?.name);
        
        if (!uploadResult.file || !uploadResult.file.uri) {
            throw new Error('No file URI returned from upload');
        }
        
        const fileUri = uploadResult.file.uri;
        
        // Esperar a que el archivo esté procesado
        console.log('⏳ Esperando procesamiento del archivo...');
        await waitForFileProcessing(fileUri, apiKey);
        
        return fileUri;
        
    } catch (error) {
        console.error('❌ Error en uploadFileToGoogle:', error);
        throw error;
    }
}

// Función para esperar a que el archivo sea procesado (optimizada para Cloud Run)
async function waitForFileProcessing(fileUri, apiKey, maxAttempts = 15) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🔍 Verificando estado del archivo, intento ${attempt}/${maxAttempts}`);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`⚠️ Error obteniendo estado: ${response.status}`);
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                throw new Error(`Failed to get file status: ${response.status}`);
            }
            
            const fileStatus = await response.json();
            console.log(`📊 Estado del archivo: ${fileStatus.state}`);
            
            if (fileStatus.state === 'ACTIVE') {
                console.log('✅ Archivo procesado y listo para uso');
                return;
            } else if (fileStatus.state === 'FAILED') {
                throw new Error('File processing failed');
            } else if (fileStatus.state === 'PROCESSING') {
                console.log('⏳ Archivo en procesamiento...');
            }
            
            // Esperar antes del siguiente intento (escalado)
            const waitTime = Math.min(1000 * attempt, 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
        } catch (error) {
            console.warn(`⚠️ Error verificando estado del archivo en intento ${attempt}:`, error.message);
            if (attempt === maxAttempts) {
                console.error('❌ Tiempo de espera agotado para procesamiento del archivo');
                throw new Error(`File processing timeout after ${maxAttempts} attempts: ${error.message}`);
            }
            
            // Backoff exponencial en caso de error
            const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
    }
    
    throw new Error('File processing timeout');
}

