export default async function handler(req, res) {
    // Solo permitir POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verificar que la API key esté configurada
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { text, model = 'gemini-2.5-pro', systemPrompt } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Preparar el contenido para Gemini
        const contents = [
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
                        text: text
                    }
                ]
            }
        ];

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