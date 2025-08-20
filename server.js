const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para parsear JSON con límite de tamaño aumentado
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the 'el cerebro de gemini' directory
app.use(express.static(path.join(__dirname, 'el cerebro de gemini')));

// Serve additional static files from root if needed
app.use('/static', express.static(path.join(__dirname, 'public')));

// API endpoint para Gemini
app.post('/api/gemini', async (req, res) => {
    // Configurar headers para CORS y contenido
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Verificar que la API key esté configurada
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { text, model = 'gemini-2.5-pro', systemPrompt, image } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Log del tamaño sin límites
        const textSize = new TextEncoder().encode(text).length;
        console.log(`📊 Tamaño del texto: ${textSize} bytes (${text.length} caracteres)`);
        
        // Usar texto completo sin límites - el chunking se maneja en el frontend
        const processedText = text;

        // Preparar el contenido para Gemini
        let contents;
        
        if (image) {
            // For vision requests with images
            contents = [
                {
                    parts: [
                        {
                            text: systemPrompt || 'Eres un experto en OCR y análisis de documentos catastrales. Extrae toda la información visible de la imagen de manera precisa y estructurada.'
                        }
                    ]
                },
                {
                    parts: [
                        {
                            text: processedText
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: image
                            }
                        }
                    ]
                }
            ];
        } else {
            // For text-only requests
            contents = [
                {
                    parts: [
                        {
                            text: systemPrompt || 'Eres un experto analista de documentos catastrales especializado en el análisis técnico y legal de propiedades.'
                        }
                    ]
                },
                {
                    parts: [
                        {
                            text: processedText
                        }
                    ]
                }
            ];
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
});

// Handle OPTIONS for CORS preflight
app.options('/api/gemini', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'el cerebro de gemini', 'index.html'));
});

// Handle all other routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'el cerebro de gemini', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Abre http://localhost:${PORT} para ver la aplicación`);
  console.log(`📂 Sirviendo archivos desde: ${path.join(__dirname, 'el cerebro de gemini')}`);
});
