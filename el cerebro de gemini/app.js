class CatastralAnalyzer {
    constructor() {
        this.apiKey = '';
        this.systemPrompt = '';
        this.conversationHistory = [];
    this.maxSingleFile = Infinity; // Sin límite de tamaño por archivo
        this.currentDocumentType = 'propiedad';
        this.extractedData = null;
        this.processingFiles = new Map(); // Track processing files
        this.geminiModel = 'gemini-2.5-pro';
        this.geminiFallbackModel = 'gemini-1.5-flash';

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
    this.geminiModelSelect = document.getElementById('geminiModel');
    // File upload elements
    this.selectFilesBtn = document.getElementById('selectFilesBtn');
    this.fileInput = document.getElementById('fileInputCompact');
    this.uploadArea = document.getElementById('uploadAreaCompact');
        
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

        if (this.geminiModelSelect) {
            this.geminiModelSelect.addEventListener('change', (e) => {
                this.geminiModel = e.target.value;
                localStorage.setItem('catastral-analyzer-gemini-model', this.geminiModel);
            });
        }
        
        if (this.toggleApiKeyBtn) {
            this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        }
        
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Upload events - Removed handleFileSelect and handleDrop since they're handled in initializeFileUpload()
        
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

                // Load Gemini model from localStorage or default
                const savedModel = localStorage.getItem('catastral-analyzer-gemini-model');
                if (this.geminiModelSelect && savedModel) {
                    this.geminiModelSelect.value = savedModel;
                    this.geminiModel = savedModel;
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
            // Load Gemini model from localStorage or default
            const savedModel = localStorage.getItem('catastral-analyzer-gemini-model');
            if (this.geminiModelSelect && savedModel) {
                this.geminiModelSelect.value = savedModel;
                this.geminiModel = savedModel;
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
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        
        // Make upload area clickable
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });
        
        // Enhanced drag and drop handlers
        uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            // Only remove drag-over if we're leaving the upload area entirely
            if (!uploadArea.contains(e.relatedTarget)) {
                uploadArea.classList.remove('drag-over');
            }
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFiles(files);
            }
        });
        
        // Global drag and drop handlers for better UX
        let dragCounter = 0;
        const appContainer = document.querySelector('.app-container');
        
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (appContainer) {
                appContainer.classList.add('global-drag-over');
            }
        });
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0 && appContainer) {
                appContainer.classList.remove('global-drag-over');
            }
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            if (appContainer) {
                appContainer.classList.remove('global-drag-over');
            }
            
            // If dropped outside upload area, still handle the files
            if (e.target !== uploadArea && !uploadArea.contains(e.target)) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFiles(files);
                }
            }
        });
        
        console.log('✅ Funcionalidad de upload inicializada con drag & drop mejorado');
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
    
    // Handle file upload - Enhanced with better user feedback
    async handleFiles(files) {
        if (!this.apiKey) {
            this.showError('⚙️ Configuración requerida\n\nPor favor configura tu API Key de Google AI Studio primero para poder procesar documentos.\n\n🔗 Obtén tu clave en: https://makersuite.google.com/app/apikey');
            return;
        }
        
        const fileArray = Array.from(files);
        const validFiles = [];
        const invalidFiles = [];
        
        // Validate all files first
        fileArray.forEach(file => {
            if (this.validateFile(file)) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file);
            }
        });
        
        if (validFiles.length === 0) {
            this.showError('❌ No hay archivos válidos para procesar.\n\n💡 Verifica que los archivos sean PDF o imágenes y no excedan los límites de tamaño.');
            return;
        }
        
        if (invalidFiles.length > 0) {
            console.warn(`⚠️ Se omitieron ${invalidFiles.length} archivo(s) inválido(s)`);
        }
        
        console.log(`📁 Procesando ${validFiles.length} archivo(s) válido(s)...`);
        
        // Show processing feedback
        if (validFiles.length > 1) {
            this.addChatMessage('system', `📤 Subiendo ${validFiles.length} archivos... Esto puede tomar unos momentos.`);
        }
        
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            
            try {
                // Add file to UI
                const fileItem = this.createFileItem(file);
                this.addFileToList(fileItem);
                
                // Process file
                fileItem.setStatus('processing', `Procesando... (${i + 1}/${validFiles.length})`);
                
                const extractedData = await this.processFile(file);
                
                if (extractedData) {
                    fileItem.setStatus('completed', '✅ Completado');
                    this.displayExtractedData(extractedData);
                    
                    // Add success message to chat
                    this.addChatMessage('system', `✅ Documento "${file.name}" procesado correctamente.\n\n📊 Los datos extraídos están disponibles en la pestaña de Tablas.\n💬 Puedes hacer preguntas sobre el contenido en este chat.`);
                } else {
                    fileItem.setStatus('error', '❌ Sin datos extraídos');
                    this.addChatMessage('system', `⚠️ El documento "${file.name}" fue procesado pero no se pudieron extraer datos estructurados.\n\n💡 Verifica que el documento contenga texto legible y datos catastrales.`);
                }
            } catch (error) {
                console.error('Error procesando archivo:', error);
                const fileItem = document.querySelector(`[data-file-name="${file.name}"]`);
                if (fileItem && fileItem.setStatus) {
                    fileItem.setStatus('error', '❌ Error');
                }
                this.showError(`💥 Error procesando "${file.name}":\n\n${error.message || 'Error desconocido'}\n\n💡 Intenta con otro archivo o verifica que el documento sea legible.`);
            }
        }
        
        if (validFiles.length > 1) {
            this.addChatMessage('system', `🎉 ¡Procesamiento completado!\n\n📊 Se procesaron ${validFiles.length} documentos.\n💬 Ahora puedes hacer preguntas sobre los datos extraídos.`);
        }
    }

    // Limpiar datos extraídos y tarjetas antes de cargar nuevos
    clearExtractedData() {
        this.extractedData = null;
        // Ocultar y limpiar tarjetas de datos
        const cardIds = [
            'informacionPredioCard',
            'medidasColindanciasCard',
            'titularesCard',
            'actoJuridicoCard',
            'datosRegistralesCard',
            'antecedentesCard',
            'gravamenCard',
            'calidadExtraccionCard'
        ];
        cardIds.forEach(id => {
            const card = document.getElementById(id);
            if (card) {
                card.style.display = 'none';
                const content = card.querySelector('.card-content');
                if (content) content.innerHTML = '';
            }
        });
        // Mostrar mensaje de "No hay datos extraídos"
        const noDataMessage = document.getElementById('noDataMessage');
        if (noDataMessage) noDataMessage.style.display = 'block';
    }

    // Clear uploaded files list
    clearUploadedFiles() {
        const uploadedFilesList = document.getElementById('uploadedFilesList');
        if (uploadedFilesList) {
            uploadedFilesList.innerHTML = '';
        }
        console.log('🗑️ Lista de archivos cargados limpiada');
    }
    
    // Validate file - Enhanced with user-friendly messages
    validateFile(file) {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 30 * 1024 * 1024; // 30MB limit
        
        if (!allowedTypes.includes(file.type)) {
            console.warn(`❌ Tipo de archivo no soportado: ${file.name} (${file.type})`);
            return false;
        }
        
        if (file.size > maxSize) {
            console.warn(`❌ Archivo muy grande: ${file.name} (${this.formatFileSize(file.size)})`);
            return false;
        }
        
        if (file.size === 0) {
            console.warn(`❌ Archivo vacío: ${file.name}`);
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
        let model = this.geminiModel || 'gemini-2.5-pro';
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        let parts;
        if (fileType === 'application/pdf') {
            // For PDF, send as text
            parts = [
                { text: prompt },
                { text: `\n\nCONTENIDO DEL DOCUMENTO:\n${content}` }
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
            contents: [{ parts: parts }]
        };
        try {
            let response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                // Fallback to alternate model if available
                if (model !== this.geminiFallbackModel) {
                    model = this.geminiFallbackModel;
                    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                    response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                }
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                }
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
            // Remove markdown code block (```json ... ``` or ``` ... ```)
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json[\r\n]*/i, '').replace(/```\s*$/i, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```[\r\n]*/i, '').replace(/```\s*$/i, '');
            }
            // Remove any stray backticks or code block remnants
            cleanResponse = cleanResponse.replace(/^```+|```+$/g, '').trim();
            // Now try to parse
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
    
    // Initialize chat functionality - Enhanced
    initializeChat() {
        // Verify chat elements exist
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatMessage');
        this.chatMessages = document.getElementById('chatMessages');
        
        if (!this.chatInput || !this.sendChatBtn || !this.chatMessages) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }
        
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
            
            // Auto-resize textarea
            this.chatInput.addEventListener('input', () => {
                this.chatInput.style.height = 'auto';
                this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
            });
        }
        
        // Initialize panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const panelType = e.target.dataset.panel;
                this.switchPanel(panelType);
            });
        });
        
        // Add welcome message
        this.addWelcomeMessage();
        
        console.log('✅ Chat inicializado correctamente');
    }
    
    // Add welcome message to chat
    addWelcomeMessage() {
        if (!this.chatMessages) return;
        
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <div class="welcome-content">
                <div class="welcome-icon">🤖</div>
                <div class="welcome-text">
                    <h4>¡Hola! Soy tu asistente de documentos catastrales</h4>
                    <p>Puedes preguntarme sobre:</p>
                    <ul>
                        <li>📊 Datos extraídos de documentos procesados</li>
                        <li>🏠 Información sobre propiedades</li>
                        <li>⚖️ Aspectos legales y notariales</li>
                        <li>📋 Comparaciones entre documentos</li>
                    </ul>
                    <p><strong>💡 Tip:</strong> Primero sube y procesa un documento para obtener análisis específicos.</p>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(welcomeDiv);
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
    
    // Send chat message - Enhanced with better error handling
    async sendChatMessage() {
        if (!this.chatInput) {
            console.error('Chat input element not found');
            return;
        }
        
        if (!this.apiKey) {
            this.addChatMessage('system', '⚠️ API Key no configurada.\n\nPor favor configura tu API Key de Google AI Studio en la sección de Configuración antes de usar el chat.');
            return;
        }
        
        const message = this.chatInput.value.trim();
        if (!message) {
            return;
        }
        
        // Validate message length
        if (message.length > 4000) {
            this.addChatMessage('system', '❌ Mensaje muy largo.\n\nPor favor usa un mensaje más corto (máximo 4000 caracteres).');
            return;
        }
        
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
            
            let errorMessage = 'Lo siento, ocurrió un error al procesar tu mensaje.';
            
            if (error.message.includes('HTTP 400')) {
                errorMessage = '❌ Error de configuración.\n\nVerifica que tu API Key sea válida y tenga los permisos necesarios.';
            } else if (error.message.includes('HTTP 401')) {
                errorMessage = '🔑 API Key inválida.\n\nPor favor verifica que tu API Key de Google AI Studio sea correcta.';
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = '🚫 Acceso denegado.\n\nTu API Key no tiene permisos para usar este modelo de IA.';
            } else if (error.message.includes('HTTP 429')) {
                errorMessage = '⏰ Límite de uso excedido.\n\nHas alcanzado el límite de requests. Intenta de nuevo más tarde.';
            } else if (error.message.includes('quota')) {
                errorMessage = '📊 Cuota excedida.\n\nHas alcanzado tu límite de uso de la API de Google AI Studio.';
            }
            
            this.addChatMessage('assistant', errorMessage + '\n\n💡 Si el problema persiste, revisa tu configuración o intenta más tarde.');
        }
    }
    
    // Add message to chat - Enhanced with better formatting
    addChatMessage(sender, content, isTyping = false) {
        if (!this.chatMessages) {
            console.error('Chat messages container not found');
            return null;
        }
        
        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${sender === 'user' ? 'user' : 'bot'} ${isTyping ? 'typing' : ''}`;
        messageDiv.id = messageId;
        
        // Sanitize and format content
        let formattedContent = content;
        if (!isTyping && typeof content === 'string') {
            // Convert newlines to HTML breaks for better display
            formattedContent = content.replace(/\n/g, '<br>');
            
            // Escape HTML to prevent XSS but preserve our <br> tags
            formattedContent = formattedContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/&lt;br&gt;/g, '<br>');
        }
        
        const avatar = sender === 'user' ? '👤' : (sender === 'system' ? '⚙️' : '🤖');
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-bubble">
                ${isTyping ? '<div class="typing-dots"><span></span><span></span><span></span></div>' : formattedContent}
            </div>
            <div class="message-timestamp">
                ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
        `;
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage && !isTyping) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        return messageId;
    }
    
    // Remove message from chat
    removeChatMessage(messageId) {
        const message = document.getElementById(messageId);
        if (message) {
            message.remove();
        }
    }
    
    // Call chat with Gemini - Fixed version
    async callChatWithGemini(message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.apiKey}`;
        
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
            const dataString = JSON.stringify(this.extractedData, null, 2);
            contextPrompt += `\n\nDATOS EXTRAÍDOS DEL DOCUMENTO ACTUAL:\n${dataString}`;
            contextPrompt += `\n\nEl usuario puede preguntarte sobre cualquier aspecto de estos datos extraídos.`;
        } else {
            contextPrompt += `\n\nActualmente no hay datos extraídos disponibles. El usuario puede estar preguntando sobre el proceso de extracción o documentos en general.`;
        }
        
        // Build conversation history for better context
        const conversationParts = [];
        
        // Add system context
        conversationParts.push({
            parts: [{ text: contextPrompt }]
        });
        
        // Add recent conversation history (last 10 messages)
        const recentHistory = this.conversationHistory.slice(-10);
        recentHistory.forEach(entry => {
            conversationParts.push({
                parts: [{ text: `${entry.role === 'user' ? 'Usuario' : 'Asistente'}: ${entry.content}` }]
            });
        });
        
        // Add current user message
        conversationParts.push({
            parts: [{ text: `Usuario: ${message}` }]
        });
        
        const requestBody = {
            contents: conversationParts,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            },
            safetySettings: [
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
            ]
        };
        
        try {
            console.log('Sending chat request to:', url);
            console.log('Request body:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const responseText = await response.text();
            console.log('Response status:', response.status);
            console.log('Response text:', responseText);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = JSON.parse(responseText);
                    if (errorData.error && errorData.error.message) {
                        errorMessage += ` - ${errorData.error.message}`;
                    }
                } catch (e) {
                    errorMessage += ` - ${responseText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = JSON.parse(responseText);
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No se generó respuesta válida de la API');
            }
            
            const candidate = data.candidates[0];
            
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('Respuesta vacía de la API');
            }
            
            const responseContent = candidate.content.parts[0].text;
            
            // Store in conversation history
            this.conversationHistory.push({ role: 'user', content: message });
            this.conversationHistory.push({ role: 'assistant', content: responseContent });
            
            // Limit history to last 50 messages to prevent context overflow
            if (this.conversationHistory.length > 50) {
                this.conversationHistory = this.conversationHistory.slice(-50);
            }
            
            return responseContent;
            
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
