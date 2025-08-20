class CatastralAnalyzer {
    constructor() {
        this.apiKey = '';
        this.systemPrompt = '';
        this.conversationHistory = [];
        this.maxSingleFile = 20 * 1024 * 1024; // 20MB
        this.currentDocumentType = 'propiedad';
        this.extractedData = null;
        this.processingFiles = new Map(); // Track processing files
        
        // Initialize immediately
        this.initializeElements();
        this.bindEvents();
        this.loadConfiguration();
        this.setupPDFJS();
        this.initializeTabs();
        this.initializeFileUpload();
        this.initializeDocumentTypeSlider();
        this.initializeChat();
    }
    
    initializeElements() {
        // Configuration elements
        this.apiKeyInput = document.getElementById('apiKey');
        this.systemPromptInput = document.getElementById('systemPrompt');
        this.saveConfigBtn = document.getElementById('saveConfig');
        this.configStatus = document.getElementById('configStatus');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
        this.themeToggle = document.getElementById('themeToggle');
        
        // Chat elements
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatMessage');
        this.chatMessages = document.getElementById('chatMessages');
        
        // Modal elements
        this.loadingModal = document.getElementById('loadingModal');
        this.loadingText = document.getElementById('loadingText');
        this.progressFill = document.querySelector('.progress-fill');
        this.exportModal = document.getElementById('exportModal');
        this.closeExportModalBtn = document.getElementById('closeExportModal');
    }
    
    bindEvents() {
        // Configuration events
        if (this.saveConfigBtn) {
            this.saveConfigBtn.addEventListener('click', () => this.saveConfiguration());
        }
        
        if (this.toggleApiKeyBtn) {
            this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        }
        
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Upload events
        if (this.selectFilesBtn) {
            this.selectFilesBtn.addEventListener('click', () => this.fileInput.click());
        }
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (this.processFilesBtn) {
            this.processFilesBtn.addEventListener('click', () => this.processFiles());
        }
        
        if (this.clearFilesBtn) {
            this.clearFilesBtn.addEventListener('click', () => this.clearFiles());
        }
        
        // Modal events
        if (this.closeExportModalBtn) {
            this.closeExportModalBtn.addEventListener('click', () => this.hideExportModal());
        }
        
        // Export options
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportResults(format);
            });
        });
    }
    
    setupPDFJS() {
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }
    
    getEnvironmentVariable(name) {
        // In browser environment, try to access from window object or meta tags
        if (typeof window !== 'undefined') {
            // Check if environment variables are exposed via window object (Vercel, Netlify, etc.)
            if (window.process && window.process.env && window.process.env[name]) {
                return window.process.env[name];
            }
            
            // Check for meta tags with environment variables
            const metaTag = document.querySelector(`meta[name="env-${name.toLowerCase()}"]`);
            if (metaTag) {
                return metaTag.getAttribute('content');
            }
            
            // Check for global variables (some deployment platforms expose them this way)
            if (window[name]) {
                return window[name];
            }
        }
        
        return null;
    }
    
    loadConfiguration() {
        try {
            // Try to get API key from environment variable first
            const envApiKey = this.getEnvironmentVariable('GEMINI_API_KEY') || this.getEnvironmentVariable('GOOGLE_GENERATIVE_AI_API_KEY');
            
            if (envApiKey) {
                this.apiKey = envApiKey;
                if (this.apiKeyInput) {
                    this.apiKeyInput.value = '••••••••••••••••'; // Show masked value
                    this.apiKeyInput.disabled = true;
                }
                console.log('Using API key from environment variable');
                
                // Load system prompt from localStorage or use default
                const savedConfig = localStorage.getItem('catastral-analyzer-config');
                if (savedConfig) {
                    const config = JSON.parse(savedConfig);
                    if (this.systemPromptInput) {
                        this.systemPromptInput.value = config.systemPrompt || this.systemPromptInput.value;
                        this.systemPrompt = config.systemPrompt || this.systemPromptInput.value;
                    }
                }
                
                this.enableInterface();
                this.showConfigStatus(true, 'Configuración cargada desde variables de entorno');
                return;
            }
            
            // Fallback to localStorage configuration
            const savedConfig = localStorage.getItem('catastral-analyzer-config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                
                if (this.apiKeyInput) this.apiKeyInput.value = config.apiKey || '';
                if (this.systemPromptInput) this.systemPromptInput.value = config.systemPrompt || this.systemPromptInput.value;
                
                if (config.apiKey && config.systemPrompt) {
                    this.apiKey = config.apiKey;
                    this.systemPrompt = config.systemPrompt;
                    this.enableInterface();
                    this.showConfigStatus(true);
                }
                
                // Load theme preference
                if (config.theme) {
                    document.documentElement.setAttribute('data-color-scheme', config.theme);
                    this.updateThemeButton(config.theme);
                }
            }
        } catch (error) {
            console.warn('Error loading configuration:', error);
        }
    }
    
    saveConfiguration() {
        if (!this.systemPromptInput) {
            this.showError('Elementos de configuración no encontrados');
            return;
        }
        
        const systemPrompt = this.systemPromptInput.value.trim();
        
        // Check if API key is already loaded from environment
        if (this.apiKeyInput && this.apiKeyInput.disabled && this.apiKey) {
            // API key comes from environment, only save system prompt
            this.systemPrompt = systemPrompt;
            
            // Save only system prompt to localStorage
            try {
                const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
                const existingConfig = JSON.parse(localStorage.getItem('catastral-analyzer-config') || '{}');
                localStorage.setItem('catastral-analyzer-config', JSON.stringify({
                    ...existingConfig,
                    systemPrompt: systemPrompt,
                    theme: currentTheme
                }));
            } catch (error) {
                console.warn('Error saving configuration:', error);
            }
            
            this.enableInterface();
            this.showConfigStatus(true, '✓ System Prompt guardado (API Key desde variables de entorno)');
            console.log('✅ System Prompt guardado con API Key desde entorno');
            return;
        }
        
        // Manual API key configuration
        if (!this.apiKeyInput) {
            this.showError('Elementos de configuración no encontrados');
            return;
        }
        
        const apiKey = this.apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showError('Por favor ingresa tu API Key de Gemini o configúrala como variable de entorno');
            return;
        }
        
        this.apiKey = apiKey;
        this.systemPrompt = systemPrompt;
        
        // Save to localStorage
        const config = {
            apiKey: this.apiKey,
            systemPrompt: this.systemPrompt,
            theme: document.documentElement.getAttribute('data-color-scheme') || 'light'
        };
        
        localStorage.setItem('catastral-analyzer-config', JSON.stringify(config));
        
        this.enableInterface();
        this.showConfigStatus(true);
        
        console.log('✅ Configuración guardada');
    }
    
    enableInterface() {
        // Enable chat input
        if (this.chatInput) {
            this.chatInput.disabled = false;
            this.chatInput.placeholder = "Pregunta sobre los datos extraídos o sube un documento...";
        }
        
        if (this.sendChatBtn) {
            this.sendChatBtn.disabled = false;
        }
        
        // Update connection status
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            const indicator = connectionStatus.querySelector('.status-indicator');
            const statusText = connectionStatus.querySelector('.status-text');
            
            if (indicator) indicator.className = 'status-indicator online';
            if (statusText) statusText.textContent = 'Configurado';
        }
    }
    
    showConfigStatus(success, message = '') {
        if (!this.configStatus) return;
        
        this.configStatus.classList.remove('hidden');
        const statusText = this.configStatus.querySelector('.status-text');
        const statusIcon = this.configStatus.querySelector('.status-icon');
        
        if (success) {
            if (statusText) statusText.textContent = message || 'Configuración guardada correctamente';
            if (statusIcon) statusIcon.textContent = '✅';
            this.configStatus.classList.add('success');
            this.configStatus.classList.remove('error');
        } else {
            if (statusText) statusText.textContent = message || 'Error en la configuración';
            if (statusIcon) statusIcon.textContent = '❌';
            this.configStatus.classList.add('error');
            this.configStatus.classList.remove('success');
        }
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.configStatus.classList.add('hidden');
        }, 3000);
    }
    
    toggleApiKeyVisibility() {
        if (!this.apiKeyInput || !this.toggleApiKeyBtn) return;
        
        const isPassword = this.apiKeyInput.type === 'password';
        this.apiKeyInput.type = isPassword ? 'text' : 'password';
        
        const icon = this.toggleApiKeyBtn.querySelector('.show-text');
        if (icon) {
            icon.textContent = isPassword ? '🙈' : '👁️';
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        this.updateThemeButton(newTheme);
        
        // Save theme preference
        const savedConfig = localStorage.getItem('catastral-analyzer-config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            config.theme = newTheme;
            localStorage.setItem('catastral-analyzer-config', JSON.stringify(config));
        }
    }
    
    updateThemeButton(theme) {
        if (!this.themeToggle) return;
        
        const icon = this.themeToggle.querySelector('.theme-icon');
        const text = this.themeToggle.querySelector('.theme-text');
        
        if (theme === 'dark') {
            if (icon) icon.textContent = '☀️';
            if (text) text.textContent = 'Claro';
        } else {
            if (icon) icon.textContent = '🌙';
            if (text) text.textContent = 'Oscuro';
        }
    }
    
    // Initialize file upload functionality
    initializeFileUpload() {
        const uploadArea = document.getElementById('uploadAreaCompact');
        const fileInput = document.getElementById('fileInputCompact');
        const selectBtn = document.getElementById('selectFilesBtn');
        
        if (!uploadArea || !fileInput || !selectBtn) {
            console.error('❌ Elementos de upload no encontrados');
            return;
        }
        
        // Button click handler
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });
        
        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
        
        console.log('✅ Funcionalidad de upload inicializada');
    }
    
    // Initialize document type slider
    initializeDocumentTypeSlider() {
        const propiedadRadio = document.getElementById('propiedadType');
        const gravamenRadio = document.getElementById('gravamenType');
        
        if (propiedadRadio && gravamenRadio) {
            propiedadRadio.addEventListener('change', () => {
                if (propiedadRadio.checked) {
                    this.switchDocumentType('propiedad');
                }
            });
            
            gravamenRadio.addEventListener('change', () => {
                if (gravamenRadio.checked) {
                    this.switchDocumentType('gravamen');
                }
            });
        }
        
        console.log('✅ Slider de tipo de documento inicializado');
    }
    
    // Switch document type
    switchDocumentType(type) {
        this.currentDocumentType = type;
        
        // Update UI elements
        const uploadSectionTitle = document.getElementById('uploadSectionTitle');
        const uploadTitle = document.getElementById('uploadTitle');
        const uploadedFilesTitle = document.getElementById('uploadedFilesTitle');
        
        if (type === 'propiedad') {
            if (uploadSectionTitle) uploadSectionTitle.textContent = 'Documentos de Propiedad';
            if (uploadTitle) uploadTitle.textContent = 'Carga de Documentos de Propiedad';
            if (uploadedFilesTitle) uploadedFilesTitle.textContent = 'Archivos Procesados (Propiedad)';
        } else {
            if (uploadSectionTitle) uploadSectionTitle.textContent = 'Documentos de Gravamen';
            if (uploadTitle) uploadTitle.textContent = 'Carga de Documentos de Gravamen';
            if (uploadedFilesTitle) uploadedFilesTitle.textContent = 'Archivos Procesados (Gravamen)';
        }
        
        // Clear previous data and files
        this.clearExtractedData();
        this.clearUploadedFiles();
        
        console.log(`🔄 Cambiado a tipo de documento: ${type}`);
    }
    
    // Handle file upload
    async handleFiles(files) {
        if (!this.apiKey) {
            this.showError('Por favor configura tu API Key primero');
            return;
        }
        
        console.log(`📁 Procesando ${files.length} archivo(s)...`);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validate file
            if (!this.validateFile(file)) continue;
            
            // Add file to UI
            const fileItem = this.createFileItem(file);
            this.addFileToList(fileItem);
            
            // Process file
            try {
                fileItem.setStatus('processing', 'Procesando...');
                const extractedData = await this.processFile(file);
                
                if (extractedData) {
                    fileItem.setStatus('completed', 'Completado');
                    this.displayExtractedData(extractedData);
                    
                    // Add success message to chat
                    this.addChatMessage('system', `✅ Documento "${file.name}" procesado correctamente. Los datos han sido extraídos y están disponibles en la pestaña de Tablas.`);
                } else {
                    fileItem.setStatus('error', 'Error en procesamiento');
                }
            } catch (error) {
                console.error('Error procesando archivo:', error);
                fileItem.setStatus('error', error.message || 'Error desconocido');
                this.showError(`Error procesando ${file.name}: ${error.message}`);
            }
        }
    }
    
    // Validate file
    validateFile(file) {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        
        if (!allowedTypes.includes(file.type)) {
            this.showError(`Tipo de archivo no soportado: ${file.name}. Solo se permiten PDF e imágenes PNG/JPEG.`);
            return false;
        }
        
        if (file.size > this.maxSingleFile) {
            this.showError(`Archivo demasiado grande: ${file.name}. Máximo ${this.formatFileSize(this.maxSingleFile)} por archivo.`);
            return false;
        }
        
        return true;
    }
    
    // Create file item UI
    createFileItem(file) {
        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.setAttribute('data-file-id', fileId);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${this.getFileIcon(file.type)}</div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="file-status">
                <div class="status-indicator processing"></div>
                <span class="status-text">Procesando...</span>
            </div>
            <div class="file-progress">
                <div class="progress-bar-partial"></div>
            </div>
        `;
        
        // Add helper methods to file item
        fileItem.setStatus = (status, text) => {
            const indicator = fileItem.querySelector('.status-indicator');
            const statusText = fileItem.querySelector('.status-text');
            const progress = fileItem.querySelector('.progress-bar-partial');
            
            indicator.className = `status-indicator ${status}`;
            statusText.textContent = text;
            
            if (status === 'completed') {
                progress.style.width = '100%';
                progress.style.backgroundColor = '#10b981';
            } else if (status === 'error') {
                progress.style.width = '0%';
                progress.style.backgroundColor = '#dc2626';
            } else if (status === 'processing') {
                progress.style.width = '50%';
                progress.style.backgroundColor = '#3b82f6';
            }
        };
        
        return fileItem;
    }
    
    // Add file to list
    addFileToList(fileItem) {
        const uploadedFilesList = document.getElementById('uploadedFilesList');
        if (uploadedFilesList) {
            uploadedFilesList.appendChild(fileItem);
        }
    }
    
    // Process file with Gemini
    async processFile(file) {
        if (!this.apiKey) {
            throw new Error('API key no configurada');
        }
        
        try {
            let fileContent;
            
            if (file.type === 'application/pdf') {
                fileContent = await this.extractTextFromPDF(file);
            } else {
                fileContent = await this.convertImageToBase64(file);
            }
            
            // Create extraction prompt
            const extractionPrompt = this.createExtractionPrompt();
            
            // Call Gemini API
            const response = await this.callGeminiAPI(extractionPrompt, fileContent, file.type);
            
            return this.parseExtractionResponse(response);
            
        } catch (error) {
            console.error('Error en processFile:', error);
            throw error;
        }
    }
    
    // Extract text from PDF
    async extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\\n\\n';
            }
            
            return fullText;
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            throw new Error('Error al extraer texto del PDF');
        }
    }
    
    // Convert image to base64
    async convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data:image/jpeg;base64, prefix for Gemini
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // Create extraction prompt based on document type
    createExtractionPrompt() {
        const basePrompt = `Eres un experto analista de documentos notariales, registrales y catastrales mexicanos. Analiza exhaustivamente el siguiente documento buscando información específica con patrones flexibles.

ESTRATEGIA DE BÚSQUEDA:
- Busca términos similares y variaciones (ej: "expediente", "exp.", "catastral", "clave catastral")
- Identifica números que podrían ser lotes, manzanas, escrituras, folios
- Busca nombres propios en mayúsculas que podrían ser personas o lugares
- Identifica patrones de CURP (18 chars), RFC (10-13 chars), códigos postales (5 dígitos)
- Busca fechas en cualquier formato y convierte a DD/MM/AAAA
- Identifica medidas y colindancias (metros, norte, sur, este, oeste)

REGLAS DE EXTRACCIÓN:
1. Si encuentras información relacionada, extráela aunque no esté perfectamente etiquetada
2. Busca variaciones de términos (Notario/Notaria, Adquirente/Comprador, etc.)
3. Si un campo no existe después de búsqueda exhaustiva, usa: "NO_CONSTA"
4. Mantén formato original pero limpia espacios extra
5. Para fechas, acepta cualquier formato y convierte a DD/MM/AAAA
6. Para superficies, incluye la unidad si está presente (ej: "150.50 m²")
7. Sé flexible con variaciones de escritura y abreviaciones`;
        
        const extractionFields = this.currentDocumentType === 'propiedad' 
            ? this.getPropertyExtractionFields()
            : this.getGravamenExtractionFields();
        
        return `${basePrompt}

REALIZA BÚSQUEDA EXHAUSTIVA:
1. Lee TODO el documento línea por línea
2. Busca patrones incluso si no están perfectamente etiquetados
3. Identifica números que podrían corresponder a campos específicos
4. Busca nombres propios (generalmente en mayúsculas)
5. Identifica fechas en cualquier formato
6. Si encuentras información parcial, inclúyela
7. Solo usa "NO_CONSTA" si después de búsqueda exhaustiva no encuentras nada

RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON (sin texto adicional antes o después):
${extractionFields}`;
    }
    
    // Get property extraction fields
    getPropertyExtractionFields() {
        return `{
  "informacion_predio": {
    "expediente_catastral": "NO_CONSTA",
    "lote": "NO_CONSTA",
    "manzana": "NO_CONSTA",
    "superficie": "NO_CONSTA",
    "colonia": "NO_CONSTA",
    "municipio": "NO_CONSTA",
    "codigo_postal": "NO_CONSTA",
    "tipo_predio": "NO_CONSTA"
  },
  "medidas_colindancias": {
    "norte": "NO_CONSTA",
    "sur": "NO_CONSTA",
    "este": "NO_CONSTA",
    "oeste": "NO_CONSTA"
  },
  "titulares": {
    "vendedor_nombre": "NO_CONSTA",
    "vendedor_curp": "NO_CONSTA",
    "vendedor_rfc": "NO_CONSTA",
    "comprador_nombre": "NO_CONSTA",
    "comprador_curp": "NO_CONSTA",
    "comprador_rfc": "NO_CONSTA",
    "regimen_matrimonial": "NO_CONSTA"
  },
  "acto_juridico": {
    "tipo_acto": "NO_CONSTA",
    "numero_escritura": "NO_CONSTA",
    "fecha_escritura": "NO_CONSTA",
    "notario_nombre": "NO_CONSTA",
    "notario_numero": "NO_CONSTA",
    "valor_operacion": "NO_CONSTA",
    "moneda": "NO_CONSTA"
  },
  "datos_registrales": {
    "volumen": "NO_CONSTA",
    "libro": "NO_CONSTA",
    "seccion": "NO_CONSTA",
    "inscripcion": "NO_CONSTA",
    "folio_real": "NO_CONSTA",
    "fecha_registro": "NO_CONSTA"
  },
  "antecedentes": {
    "inscripcion_anterior": "NO_CONSTA",
    "volumen_anterior": "NO_CONSTA",
    "fecha_anterior": "NO_CONSTA"
  }
}`;
    }
    
    // Get gravamen extraction fields
    getGravamenExtractionFields() {
        return `{
  "informacion_predio": {
    "expediente_catastral": "NO_CONSTA",
    "superficie": "NO_CONSTA",
    "ubicacion": "NO_CONSTA",
    "tipo_predio": "NO_CONSTA"
  },
  "acto_juridico": {
    "tipo_acto": "NO_CONSTA",
    "numero_escritura": "NO_CONSTA",
    "fecha_escritura": "NO_CONSTA",
    "notario_nombre": "NO_CONSTA",
    "notario_numero": "NO_CONSTA",
    "valor_operacion": "NO_CONSTA",
    "moneda": "NO_CONSTA"
  },
  "datos_registrales": {
    "volumen": "NO_CONSTA",
    "libro": "NO_CONSTA",
    "seccion": "NO_CONSTA",
    "inscripcion": "NO_CONSTA",
    "folio_real": "NO_CONSTA",
    "fecha_registro": "NO_CONSTA"
  },
  "gravamen": {
    "tipo_gravamen": "NO_CONSTA",
    "acreedor": "NO_CONSTA",
    "deudor": "NO_CONSTA",
    "monto_gravamen": "NO_CONSTA",
    "plazo": "NO_CONSTA",
    "garantia": "NO_CONSTA"
  }
}`;
    }
    
    // Call Gemini API
    async callGeminiAPI(prompt, content, fileType) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        
        let parts;
        
        if (fileType === 'application/pdf') {
            // For PDF, send as text
            parts = [
                { text: prompt },
                { text: `\\n\\nCONTENIDO DEL DOCUMENTO:\\n${content}` }
            ];
        } else {
            // For images, send as multimodal
            parts = [
                { text: prompt },
                { 
                    inlineData: {
                        mimeType: fileType,
                        data: content
                    }
                }
            ];
        }
        
        const requestBody = {
            contents: [{
                parts: parts
            }]
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de la API de Gemini');
            }
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw new Error(`Error en API de Gemini: ${error.message}`);
        }
    }
    
    // Parse extraction response
    parseExtractionResponse(response) {
        try {
            // Clean response and parse JSON
            let cleanResponse = response.trim();
            
            // Remove any markdown formatting
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\\s*/, '').replace(/\\s*```$/, '');
            }
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```[\\s\\S]*?\\n/, '').replace(/\\s*```$/, '');
            }
            
            const parsedData = JSON.parse(cleanResponse);
            
            return {
                datos_extraidos: parsedData,
                timestamp: new Date().toISOString(),
                document_type: this.currentDocumentType,
                campos_extraidos: this.calculateExtractedFields(parsedData),
                confianza_global: 85 // Placeholder - could be calculated based on data completeness
            };
        } catch (error) {
            console.error('Error parsing response:', error, 'Raw response:', response);
            throw new Error('Error al procesar la respuesta de la IA. Verifica que el documento sea legible.');
        }
    }
    
    // Calculate extracted fields statistics
    calculateExtractedFields(data) {
        let total = 0;
        let extracted = 0;
        
        const countFields = (obj) => {
            for (let key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    countFields(obj[key]);
                } else {
                    total++;
                    if (obj[key] && obj[key] !== 'NO_CONSTA' && obj[key] !== '') {
                        extracted++;
                    }
                }
            }
        };
        
        countFields(data);
        
        return { total, extracted };
    }
    
    // Display extracted data
    displayExtractedData(extractedData) {
        this.extractedData = extractedData;
        
        // Hide no data message
        const noDataMessage = document.getElementById('noDataMessage');
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
        
        // Display data in cards
        this.displayInformacionPredio(extractedData.datos_extraidos.informacion_predio);
        
        if (this.currentDocumentType === 'propiedad') {
            this.displayMedidasColindancias(extractedData.datos_extraidos.medidas_colindancias);
            this.displayTitulares(extractedData.datos_extraidos.titulares);
            this.displayAntecedentes(extractedData.datos_extraidos.antecedentes);
        }
        
        this.displayActoJuridico(extractedData.datos_extraidos.acto_juridico);
        this.displayDatosRegistrales(extractedData.datos_extraidos.datos_registrales);
        
        if (this.currentDocumentType === 'gravamen' && extractedData.datos_extraidos.gravamen) {
            this.displayGravamen(extractedData.datos_extraidos.gravamen);
        }
        
        this.displayCalidadExtraccion(extractedData);
        this.updateVisibleCards();
        
        console.log('✅ Datos extraídos mostrados correctamente');
    }
    
    // Display functions for each section
    displayInformacionPredio(data) {
        const card = document.getElementById('informacionPredioCard');
        const content = document.getElementById('informacionPredioContent');
        
        if (!card || !content) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayMedidasColindancias(data) {
        const card = document.getElementById('medidasColindanciasCard');
        const content = document.getElementById('medidasColindanciasContent');
        
        if (!card || !content || !data) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayTitulares(data) {
        const card = document.getElementById('titularesCard');
        const content = document.getElementById('titularesContent');
        
        if (!card || !content || !data) return;
        
        let html = '';
        
        // Vendedor info
        if (data.vendedor_nombre && data.vendedor_nombre !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">Vendedor:</span>
                <span class="data-value">${data.vendedor_nombre}</span>
            </div>`;
        }
        if (data.vendedor_curp && data.vendedor_curp !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">CURP Vendedor:</span>
                <span class="data-value">${data.vendedor_curp}</span>
            </div>`;
        }
        if (data.vendedor_rfc && data.vendedor_rfc !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">RFC Vendedor:</span>
                <span class="data-value">${data.vendedor_rfc}</span>
            </div>`;
        }
        
        // Comprador info
        if (data.comprador_nombre && data.comprador_nombre !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">Comprador:</span>
                <span class="data-value">${data.comprador_nombre}</span>
            </div>`;
        }
        if (data.comprador_curp && data.comprador_curp !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">CURP Comprador:</span>
                <span class="data-value">${data.comprador_curp}</span>
            </div>`;
        }
        if (data.comprador_rfc && data.comprador_rfc !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">RFC Comprador:</span>
                <span class="data-value">${data.comprador_rfc}</span>
            </div>`;
        }
        
        // Régimen matrimonial
        if (data.regimen_matrimonial && data.regimen_matrimonial !== 'NO_CONSTA') {
            html += `<div class="data-row">
                <span class="data-label">Régimen Matrimonial:</span>
                <span class="data-value">${data.regimen_matrimonial}</span>
            </div>`;
        }
        
        content.innerHTML = html || '<p>No hay datos de titulares disponibles</p>';
        card.style.display = 'block';
    }
    
    displayActoJuridico(data) {
        const card = document.getElementById('actoJuridicoCard');
        const content = document.getElementById('actoJuridicoContent');
        
        if (!card || !content) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayDatosRegistrales(data) {
        const card = document.getElementById('datosRegistralesCard');
        const content = document.getElementById('datosRegistralesContent');
        
        if (!card || !content) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayAntecedentes(data) {
        const card = document.getElementById('antecedentesCard');
        const content = document.getElementById('antecedentesContent');
        
        if (!card || !content || !data) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayGravamen(data) {
        const card = document.getElementById('gravamenCard');
        const content = document.getElementById('gravamenContent');
        
        if (!card || !content) return;
        
        content.innerHTML = this.createDataRows(data);
        card.style.display = 'block';
    }
    
    displayCalidadExtraccion(extractedData) {
        const card = document.getElementById('calidadExtraccionCard');
        const content = document.getElementById('calidadExtraccionContent');
        
        if (!card || !content) return;
        
        const qualityData = {
            'Campos Extraídos': `${extractedData.campos_extraidos.extracted}/${extractedData.campos_extraidos.total}`,
            'Confianza Global': `${extractedData.confianza_global}%`,
            'Tipo Documento': extractedData.document_type === 'propiedad' ? 'Propiedad' : 'Gravamen',
            'Timestamp': new Date(extractedData.timestamp).toLocaleString('es-ES')
        };
        
        content.innerHTML = this.createDataRows(qualityData);
        card.style.display = 'block';
    }
    
    // Create data rows HTML
    createDataRows(data) {
        if (!data || typeof data !== 'object') return '<p>No hay datos disponibles</p>';
        
        let html = '';
        for (let [key, value] of Object.entries(data)) {
            if (value && value !== 'NO_CONSTA' && value !== '') {
                const label = this.formatLabel(key);
                html += `
                    <div class="data-row">
                        <span class="data-label">${label}:</span>
                        <span class="data-value">${Array.isArray(value) ? value.join(', ') : value}</span>
                    </div>
                `;
            }
        }
        
        return html || '<p>No hay datos disponibles</p>';
    }
    
    // Format field labels
    formatLabel(key) {
        const labelMap = {
            'expediente_catastral': 'Expediente Catastral',
            'lote': 'Lote',
            'manzana': 'Manzana',
            'superficie': 'Superficie',
            'colonia': 'Colonia',
            'municipio': 'Municipio',
            'codigo_postal': 'Código Postal',
            'tipo_predio': 'Tipo de Predio',
            'norte': 'Norte',
            'sur': 'Sur',
            'este': 'Este',
            'oeste': 'Oeste',
            'vendedor_nombre': 'Vendedor',
            'comprador_nombre': 'Comprador',
            'tipo_acto': 'Tipo de Acto',
            'numero_escritura': 'Número de Escritura',
            'fecha_escritura': 'Fecha de Escritura',
            'notario_nombre': 'Nombre del Notario',
            'notario_numero': 'Número de Notario',
            'valor_operacion': 'Valor de la Operación',
            'volumen': 'Volumen',
            'libro': 'Libro',
            'seccion': 'Sección',
            'inscripcion': 'Inscripción',
            'folio_real': 'Folio Real',
            'fecha_registro': 'Fecha de Registro'
        };
        
        return labelMap[key] || key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    }
    
    // Update visible cards based on document type
    updateVisibleCards() {
        const propiedadOnlyCards = ['medidasColindanciasCard', 'titularesCard', 'antecedentesCard'];
        const gravamenOnlyCards = ['gravamenCard'];
        
        if (this.currentDocumentType === 'propiedad') {
            gravamenOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card) card.style.display = 'none';
            });
        } else {
            propiedadOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card) card.style.display = 'none';
            });
        }
    }
    
    // Clear extracted data
    clearExtractedData() {
        this.extractedData = null;
        
        // Show no data message
        const noDataMessage = document.getElementById('noDataMessage');
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
        }
        
        // Hide all cards
        const cards = ['informacionPredioCard', 'medidasColindanciasCard', 'titularesCard', 
                      'actoJuridicoCard', 'datosRegistralesCard', 'antecedentesCard', 
                      'calidadExtraccionCard', 'gravamenCard'];
        
        cards.forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) card.style.display = 'none';
        });
    }
    
    // Clear uploaded files
    clearUploadedFiles() {
        const uploadedFilesList = document.getElementById('uploadedFilesList');
        if (uploadedFilesList) {
            uploadedFilesList.innerHTML = '';
        }
    }
    
    // Initialize chat functionality
    initializeChat() {
        if (this.sendChatBtn) {
            this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        // Initialize panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const panelType = e.target.dataset.panel;
                this.switchPanel(panelType);
            });
        });
        
        console.log('✅ Chat inicializado');
    }
    
    // Switch between panels (tables/chat)
    switchPanel(panelType) {
        // Update tab active state
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelType}"]`).classList.add('active');
        
        // Update panel visibility
        document.querySelectorAll('.data-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        if (panelType === 'tables') {
            document.getElementById('tablesPanel').classList.add('active');
        } else if (panelType === 'chat') {
            document.getElementById('chatPanel').classList.add('active');
        }
    }
    
    // Send chat message
    async sendChatMessage() {
        if (!this.chatInput || !this.apiKey) return;
        
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Clear input
        this.chatInput.value = '';
        
        // Add user message to chat
        this.addChatMessage('user', message);
        
        // Show typing indicator
        const typingId = this.addChatMessage('assistant', 'Escribiendo...', true);
        
        try {
            const response = await this.callChatWithGemini(message);
            
            // Remove typing indicator and add actual response
            this.removeChatMessage(typingId);
            this.addChatMessage('assistant', response);
            
        } catch (error) {
            console.error('Error en chat:', error);
            this.removeChatMessage(typingId);
            this.addChatMessage('assistant', 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.');
        }
    }
    
    // Add message to chat
    addChatMessage(sender, content, isTyping = false) {
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${sender === 'user' ? 'user' : 'bot'} ${isTyping ? 'typing' : ''}`;
        messageDiv.id = messageId;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${sender === 'user' ? '👤' : '🤖'}
            </div>
            <div class="message-bubble">
                ${isTyping ? '<div class="typing-dots"><span></span><span></span><span></span></div>' : content}
            </div>
            <div class="message-timestamp">
                ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
        `;
        
        if (this.chatMessages) {
            // Remove welcome message if it exists
            const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
            if (welcomeMessage && !isTyping) {
                welcomeMessage.remove();
            }
            
            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
        
        return messageId;
    }
    
    // Remove message from chat
    removeChatMessage(messageId) {
        const message = document.getElementById(messageId);
        if (message) {
            message.remove();
        }
    }
    
    // Call chat with Gemini
    async callChatWithGemini(message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        
        let contextPrompt = `Eres un experto analista de documentos catastrales y notariales mexicanos. Tu función es:

1. ANALIZAR documentos catastrales con precisión técnica
2. RESPONDER preguntas sobre datos extraídos de forma clara y detallada
3. EXPLICAR terminología legal/catastral cuando sea necesario
4. PROPORCIONAR insights y recomendaciones basadas en los datos
5. MANTENER un tono profesional pero accesible

IMPORTANTE:
- Si hay datos extraídos disponibles, úsalos como contexto principal
- Sé específico y preciso en tus respuestas
- Explica conceptos técnicos cuando sea relevante
- Si no tienes información suficiente, indica qué datos adicionales serían útiles`;
        
        // Add extracted data context if available
        if (this.extractedData) {
            contextPrompt += `\\n\\nDATOS EXTRAÍDOS DEL DOCUMENTO ACTUAL:\\n${JSON.stringify(this.extractedData, null, 2)}`;
            contextPrompt += `\\n\\nEl usuario puede preguntarte sobre cualquier aspecto de estos datos extraídos.`;
        } else {
            contextPrompt += `\\n\\nActualmente no hay datos extraídos disponibles. El usuario puede estar preguntando sobre el proceso de extracción o documentos en general.`;
        }
        
        const requestBody = {
            contents: [
                {
                    parts: [{ text: contextPrompt }]
                },
                {
                    parts: [{ text: `Usuario pregunta: ${message}` }]
                }
            ]
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de la API');
            }
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error in chat API call:', error);
            throw error;
        }
    }
    
    // Tab functionality for analysis section
    initializeTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const panels = document.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update active panel
                panels.forEach(panel => {
                    panel.classList.remove('active');
                });
                
                const targetPanel = document.getElementById(targetTab + 'Tab');
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
        
        console.log('✅ Tabs inicializados');
    }
    
    // Export results
    exportResults(format) {
        if (!this.extractedData) {
            this.showError('No hay datos extraídos para exportar.');
            return;
        }
        
        let content = '';
        let filename = '';
        let mimeType = '';
        
        switch (format) {
            case 'json':
                content = JSON.stringify(this.extractedData, null, 2);
                filename = `datos_catastrales_${new Date().getTime()}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.convertToCSV(this.extractedData);
                filename = `datos_catastrales_${new Date().getTime()}.csv`;
                mimeType = 'text/csv';
                break;
            case 'summary':
                content = this.createSummaryReport(this.extractedData);
                filename = `resumen_catastral_${new Date().getTime()}.txt`;
                mimeType = 'text/plain';
                break;
        }
        
        // Create and download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.hideExportModal();
        this.showSuccess(`Archivo ${filename} descargado correctamente.`);
    }
    
    // Convert data to CSV
    convertToCSV(data) {
        const rows = [];
        rows.push(['Campo', 'Valor', 'Sección']);
        
        const addRows = (obj, section) => {
            for (let [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    addRows(value, key);
                } else if (value && value !== 'NO_CONSTA') {
                    rows.push([this.formatLabel(key), value, section]);
                }
            }
        };
        
        addRows(data.datos_extraidos, 'root');
        
        return rows.map(row => 
            row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`)
               .join(',')
        ).join('\\n');
    }
    
    // Create summary report
    createSummaryReport(data) {
        const timestamp = new Date(data.timestamp).toLocaleString('es-ES');
        const docType = data.document_type === 'propiedad' ? 'Propiedad' : 'Gravamen';
        
        let report = `REPORTE DE ANÁLISIS CATASTRAL\\n`;
        report += `==========================================\\n\\n`;
        report += `Fecha de análisis: ${timestamp}\\n`;
        report += `Tipo de documento: ${docType}\\n`;
        report += `Campos extraídos: ${data.campos_extraidos.extracted}/${data.campos_extraidos.total}\\n`;
        report += `Confianza global: ${data.confianza_global}%\\n\\n`;
        
        const createSection = (title, sectionData) => {
            if (!sectionData) return '';
            
            let section = `${title.toUpperCase()}\\n`;
            section += '-'.repeat(title.length) + '\\n';
            
            for (let [key, value] of Object.entries(sectionData)) {
                if (value && value !== 'NO_CONSTA') {
                    section += `${this.formatLabel(key)}: ${value}\\n`;
                }
            }
            section += '\\n';
            return section;
        };
        
        const datos = data.datos_extraidos;
        
        if (datos.informacion_predio) {
            report += createSection('Información del Predio', datos.informacion_predio);
        }
        
        if (datos.medidas_colindancias) {
            report += createSection('Medidas y Colindancias', datos.medidas_colindancias);
        }
        
        if (datos.titulares) {
            report += createSection('Titulares', datos.titulares);
        }
        
        if (datos.acto_juridico) {
            report += createSection('Acto Jurídico', datos.acto_juridico);
        }
        
        if (datos.datos_registrales) {
            report += createSection('Datos Registrales', datos.datos_registrales);
        }
        
        if (datos.antecedentes) {
            report += createSection('Antecedentes', datos.antecedentes);
        }
        
        if (datos.gravamen) {
            report += createSection('Información del Gravamen', datos.gravamen);
        }
        
        return report;
    }
    
    // Show/hide export modal
    showExportModal() {
        if (this.exportModal) {
            this.exportModal.classList.remove('hidden');
        }
    }
    
    hideExportModal() {
        if (this.exportModal) {
            this.exportModal.classList.add('hidden');
        }
    }
    
    // Utility functions
    getFileIcon(type) {
        if (type === 'application/pdf') return '📄';
        if (type.startsWith('image/')) return '🖼️';
        return '📁';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showError(message) {
        console.error('❌', message);
        
        // You could add a toast notification system here
        // For now, we'll use a simple alert
        if (typeof window !== 'undefined') {
            // Create a temporary error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-toast';
            errorDiv.textContent = message;
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc2626;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 400px;
                word-wrap: break-word;
            `;
            
            document.body.appendChild(errorDiv);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    }
    
    showSuccess(message) {
        console.log('✅', message);
        
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando CloudRun AI Catastral...');
    
    // Create global instance
    window.analyzer = new CatastralAnalyzer();
    
    console.log('✅ Aplicación inicializada correctamente');
});

// Handle any uncaught errors
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada:', e.reason);
});
