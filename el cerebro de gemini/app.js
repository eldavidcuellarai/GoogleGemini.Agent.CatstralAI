class CatastralAnalyzer {
    constructor() {
        this.apiKey = '';
        this.systemPrompt = '';
        this.conversationHistory = [];
        this.uploadedFiles = [];
        this.selectedFiles = [];
        this.processingMode = 'sequential';
        this.maxFiles = 10;
        this.maxTotalSize = 50 * 1024 * 1024; // 50MB
        this.maxSingleFile = 20 * 1024 * 1024; // 20MB
        this.currentDocumentType = 'propiedad'; // Track current document type
        this.extractedData = null; // Store extracted data
        
        // Predefined prompts for catastral analysis
        this.analysisPrompts = {
            compare: "Analiza y compara estas cartas catastrales, identifica similitudes y diferencias entre las propiedades",
            extract: "Extrae datos de todas las propiedades y crea una tabla comparativa con superficie, ubicación y características",
            surface: "Identifica la propiedad con mayor superficie de estos documentos y proporciona detalles",
            summary: "Resume las características comunes de todas estas propiedades catastrales",
            inconsistencies: "Detecta inconsistencias o anomalías entre los documentos catastrales proporcionados",
            ranking: "Proporciona un ranking de propiedades por valor catastral o superficie"
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadConfiguration();
        this.setupPDFJS();
        this.initializeTabs();
        this.initializeFileUpload();
        this.initializeDocumentTypeSlider();
    }
    
    initializeElements() {
        // Configuration elements
        this.apiKeyInput = document.getElementById('apiKey');
        this.systemPromptInput = document.getElementById('systemPrompt');
        this.saveConfigBtn = document.getElementById('saveConfig');
        this.configStatus = document.getElementById('configStatus');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
        this.themeToggle = document.getElementById('themeToggle');
        
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileGallery = document.getElementById('fileGallery');
        this.fileList = document.getElementById('fileList');
        this.fileCount = document.getElementById('fileCount');
        this.selectAllBtn = document.getElementById('selectAllFiles');
        this.clearAllBtn = document.getElementById('clearAllFiles');
        this.sortFiles = document.getElementById('sortFiles');
        
        // Processing mode elements
        this.processingModeInputs = document.querySelectorAll('input[name="processingMode"]');
        
        // Quick analysis elements
        this.quickAnalysis = document.getElementById('quickAnalysis');
        this.analysisButtons = document.querySelectorAll('.analysis-btn');
        
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendMessage');
        this.processBtn = document.getElementById('processFiles');
        this.clearChatBtn = document.getElementById('clearChat');
        this.exportBtn = document.getElementById('exportResults');
        
        // New chat elements
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatMessage');
        
        // Selected files elements
        this.selectedFilesDiv = document.getElementById('selectedFiles');
        this.selectedFilesList = document.getElementById('selectedFilesList');
        this.clearSelectionBtn = document.getElementById('clearSelection');
        
        // Modal elements
        this.loadingModal = document.getElementById('loadingModal');
        this.loadingText = document.getElementById('loadingText');
        this.progressFill = document.querySelector('.progress-fill');
        this.exportModal = document.getElementById('exportModal');
        this.closeExportModalBtn = document.getElementById('closeExportModal');
    }
    
    bindEvents() {
        // Configuration events
        this.saveConfigBtn.addEventListener('click', () => this.saveConfiguration());
        this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // File management events
        this.selectAllBtn.addEventListener('click', () => this.selectAllFiles());
        this.clearAllBtn.addEventListener('click', () => this.clearAllFiles());
        this.sortFiles.addEventListener('change', () => this.sortFileList());
        
        // Processing mode events
        this.processingModeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.processingMode = e.target.value;
                this.updateSelectedFiles();
            });
        });
        
        // Quick analysis events
        this.analysisButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const promptType = e.currentTarget.getAttribute('data-prompt');
                this.runQuickAnalysis(promptType);
            });
        });
        
        // Chat events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.processBtn.addEventListener('click', () => this.processSelectedFiles());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.exportBtn.addEventListener('click', () => this.showExportModal());
        this.clearSelectionBtn.addEventListener('click', () => this.clearFileSelection());
        
        // New chat events
        this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        
        // Modal events
        this.closeExportModalBtn.addEventListener('click', () => this.hideExportModal());
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-format');
                this.exportResults(format);
            });
        });
        
        // Keyboard events
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.systemPromptInput.addEventListener('input', () => this.autoResizeTextarea(this.systemPromptInput));
        this.chatInput.addEventListener('input', () => this.autoResizeChatInput());
    }
    
    setupPDFJS() {
        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('catastral-analyzer-config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.apiKeyInput.value = config.apiKey || '';
                this.systemPromptInput.value = config.systemPrompt || this.systemPromptInput.value;
                
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
        const apiKey = this.apiKeyInput.value.trim();
        const systemPrompt = this.systemPromptInput.value.trim();
        
        if (!apiKey) {
            this.showError('Por favor ingresa tu API Key de Gemini');
            this.apiKeyInput.focus();
            return;
        }
        
        if (!systemPrompt) {
            this.showError('Por favor define un System Prompt');
            this.systemPromptInput.focus();
            return;
        }
        
        this.apiKey = apiKey;
        this.systemPrompt = systemPrompt;
        
        // Save to localStorage
        try {
            const currentTheme = document.documentElement.getAttribute('data-color-scheme');
            localStorage.setItem('catastral-analyzer-config', JSON.stringify({
                apiKey: apiKey,
                systemPrompt: systemPrompt,
                theme: currentTheme
            }));
        } catch (error) {
            console.warn('Error saving configuration:', error);
        }
        
        this.enableInterface();
        this.showConfigStatus(true);
        this.clearWelcomeMessage();
    }
    
    enableInterface() {
        this.messageInput.disabled = false;
        this.sendBtn.disabled = false;
        this.processBtn.disabled = this.selectedFiles.length === 0;
        this.clearChatBtn.disabled = false;
        this.messageInput.placeholder = "Pregunta sobre tus documentos catastrales...";
        
        // Enable new chat input
        this.chatInput.disabled = false;
        this.sendChatBtn.disabled = false;
        this.chatInput.placeholder = "Pregunta sobre los datos extraídos...";
        
        // Enable analysis buttons if files are uploaded
        if (this.uploadedFiles.length > 0) {
            this.analysisButtons.forEach(btn => btn.disabled = false);
        }
    }
    
    toggleApiKeyVisibility() {
        const input = this.apiKeyInput;
        const showText = this.toggleApiKeyBtn.querySelector('.show-text');
        const hideText = this.toggleApiKeyBtn.querySelector('.hide-text');
        
        if (input.type === 'password') {
            input.type = 'text';
            showText.classList.add('hidden');
            hideText.classList.remove('hidden');
        } else {
            input.type = 'password';
            showText.classList.remove('hidden');
            hideText.classList.add('hidden');
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        this.updateThemeButton(newTheme);
        
        // Save theme preference
        try {
            const savedConfig = JSON.parse(localStorage.getItem('catastral-analyzer-config') || '{}');
            savedConfig.theme = newTheme;
            localStorage.setItem('catastral-analyzer-config', JSON.stringify(savedConfig));
        } catch (error) {
            console.warn('Error saving theme preference:', error);
        }
    }
    
    updateThemeButton(theme) {
        this.themeToggle.textContent = theme === 'dark' ? '☀️ Tema' : '🌙 Tema';
    }
    
    showConfigStatus(success) {
        this.configStatus.classList.remove('hidden');
        const statusDiv = this.configStatus.querySelector('.status');
        
        if (success) {
            statusDiv.className = 'status status--success';
            statusDiv.textContent = '✓ Configuración guardada correctamente';
        } else {
            statusDiv.className = 'status status--error';
            statusDiv.textContent = '✗ Error en la configuración';
        }
        
        setTimeout(() => {
            this.configStatus.classList.add('hidden');
        }, 3000);
    }
    
    clearWelcomeMessage() {
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }
    
    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = ''; // Reset input
    }
    
    async processFiles(files) {
        // Validate file count
        if (this.uploadedFiles.length + files.length > this.maxFiles) {
            this.showError(`Máximo ${this.maxFiles} archivos permitidos. Actualmente tienes ${this.uploadedFiles.length} archivos.`);
            return;
        }
        
        // Validate total size
        const currentSize = this.uploadedFiles.reduce((total, file) => total + file.size, 0);
        const newFilesSize = files.reduce((total, file) => total + file.size, 0);
        
        if (currentSize + newFilesSize > this.maxTotalSize) {
            this.showError('El tamaño total de archivos excede el límite de 50MB.');
            return;
        }
        
        // Process each file
        for (const file of files) {
            await this.addFile(file);
        }
        
        this.updateFileGallery();
        this.showQuickAnalysis();
    }
    
    async addFile(file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            this.showError(`Formato no soportado: ${file.name}. Usa PNG, JPEG, WebP o PDF.`);
            return;
        }
        
        // Validate file size
        if (file.size > this.maxSingleFile) {
            this.showError(`Archivo demasiado grande: ${file.name}. Máximo 20MB por archivo.`);
            return;
        }
        
        const fileData = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            type: file.type,
            size: file.size,
            preview: null,
            data: null,
            processed: false,
            selected: false
        };
        
        // Generate preview
        if (file.type.startsWith('image/')) {
            fileData.preview = await this.generateImagePreview(file);
            fileData.data = await this.fileToBase64(file);
        } else if (file.type === 'application/pdf') {
            const { preview, images } = await this.processPDF(file);
            fileData.preview = preview;
            fileData.data = images; // Array of base64 images
        }
        
        this.uploadedFiles.push(fileData);
    }
    
    async generateImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
    
    async fileToBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
    }
    
    async processPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const images = [];
            const numPages = Math.min(pdf.numPages, 5); // Limit to first 5 pages
            
            // Process first page for preview
            const page = await pdf.getPage(1);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const preview = canvas.toDataURL();
            
            // Process all pages for analysis
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                const imageData = canvas.toDataURL().split(',')[1];
                images.push(imageData);
            }
            
            return { preview, images };
        } catch (error) {
            console.error('Error processing PDF:', error);
            this.showError(`Error procesando PDF: ${file.name}`);
            return { preview: null, images: [] };
        }
    }
    
    updateFileGallery() {
        if (this.uploadedFiles.length === 0) {
            this.fileGallery.classList.add('hidden');
            this.quickAnalysis.classList.add('hidden');
            return;
        }
        
        this.fileGallery.classList.remove('hidden');
        this.fileCount.textContent = this.uploadedFiles.length;
        
        this.fileList.innerHTML = '';
        const sortedFiles = this.getSortedFiles();
        
        sortedFiles.forEach(fileData => {
            const fileElement = this.createFileElement(fileData);
            this.fileList.appendChild(fileElement);
        });
        
        this.updateProcessButton();
    }
    
    getSortedFiles() {
        const sortBy = this.sortFiles.value;
        return [...this.uploadedFiles].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size;
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });
    }
    
    createFileElement(fileData) {
        const div = document.createElement('div');
        div.className = `file-item ${fileData.selected ? 'selected' : ''}`;
        div.setAttribute('data-file-id', fileData.id);
        
        const previewIcon = fileData.type === 'application/pdf' ? '📄' : '🖼️';
        const sizeText = this.formatFileSize(fileData.size);
        
        div.innerHTML = `
            <input type="checkbox" class="file-checkbox" ${fileData.selected ? 'checked' : ''}>
            <div class="file-preview">
                ${fileData.preview 
                    ? `<img src="${fileData.preview}" alt="Preview">`
                    : `<div class="file-preview-icon">${previewIcon}</div>`
                }
            </div>
            <div class="file-info">
                <div class="file-name" title="${fileData.name}">${fileData.name}</div>
                <div class="file-meta">
                    <span>${fileData.type.split('/')[1].toUpperCase()}</span>
                    <span>${sizeText}</span>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn preview" title="Vista previa">👁️</button>
                    <button class="file-action-btn delete" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
        
        // Bind events
        const checkbox = div.querySelector('.file-checkbox');
        const previewBtn = div.querySelector('.preview');
        const deleteBtn = div.querySelector('.delete');
        
        checkbox.addEventListener('change', () => this.toggleFileSelection(fileData.id));
        div.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== previewBtn && e.target !== deleteBtn) {
                checkbox.checked = !checkbox.checked;
                this.toggleFileSelection(fileData.id);
            }
        });
        
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showFilePreview(fileData);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFile(fileData.id);
        });
        
        return div;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    toggleFileSelection(fileId) {
        const fileData = this.uploadedFiles.find(f => f.id === fileId);
        if (!fileData) return;
        
        fileData.selected = !fileData.selected;
        
        // Update selected files list
        if (fileData.selected) {
            if (!this.selectedFiles.find(f => f.id === fileId)) {
                this.selectedFiles.push(fileData);
            }
        } else {
            this.selectedFiles = this.selectedFiles.filter(f => f.id !== fileId);
        }
        
        this.updateFileGallery();
        this.updateSelectedFiles();
        this.updateProcessButton();
    }
    
    selectAllFiles() {
        this.uploadedFiles.forEach(fileData => {
            fileData.selected = true;
        });
        this.selectedFiles = [...this.uploadedFiles];
        this.updateFileGallery();
        this.updateSelectedFiles();
        this.updateProcessButton();
    }
    
    clearAllFiles() {
        if (confirm('¿Estás seguro de que quieres eliminar todos los archivos?')) {
            this.uploadedFiles = [];
            this.selectedFiles = [];
            this.updateFileGallery();
            this.updateSelectedFiles();
            this.updateProcessButton();
        }
    }
    
    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.selectedFiles = this.selectedFiles.filter(f => f.id !== fileId);
        this.updateFileGallery();
        this.updateSelectedFiles();
        this.updateProcessButton();
    }
    
    sortFileList() {
        this.updateFileGallery();
    }
    
    showFilePreview(fileData) {
        // Simple preview - in a real app, you might want a proper modal
        if (fileData.preview) {
            window.open(fileData.preview, '_blank');
        }
    }
    
    updateSelectedFiles() {
        if (this.selectedFiles.length === 0) {
            this.selectedFilesDiv.style.display = 'none';
            return;
        }
        
        this.selectedFilesDiv.style.display = 'block';
        this.selectedFilesList.innerHTML = '';
        
        this.selectedFiles.forEach(fileData => {
            const badge = document.createElement('div');
            badge.className = 'selected-file-badge';
            badge.innerHTML = `
                ${fileData.name}
                <span onclick="window.analyzer.deselectFile('${fileData.id}')" style="cursor: pointer; margin-left: 4px;">×</span>
            `;
            this.selectedFilesList.appendChild(badge);
        });
    }
    
    deselectFile(fileId) {
        const fileData = this.uploadedFiles.find(f => f.id == fileId);
        if (fileData) {
            fileData.selected = false;
            this.selectedFiles = this.selectedFiles.filter(f => f.id != fileId);
            this.updateFileGallery();
            this.updateSelectedFiles();
            this.updateProcessButton();
        }
    }
    
    clearFileSelection() {
        this.uploadedFiles.forEach(fileData => {
            fileData.selected = false;
        });
        this.selectedFiles = [];
        this.updateFileGallery();
        this.updateSelectedFiles();
        this.updateProcessButton();
    }
    
    updateProcessButton() {
        this.processBtn.disabled = this.selectedFiles.length === 0 || !this.apiKey;
    }
    
    showQuickAnalysis() {
        if (this.uploadedFiles.length > 0) {
            this.quickAnalysis.classList.remove('hidden');
        }
    }
    
    // Analysis methods
    async runQuickAnalysis(promptType) {
        if (!this.apiKey || this.uploadedFiles.length === 0) {
            this.showError('Configura tu API key y carga archivos primero.');
            return;
        }
        
        // Select all files for quick analysis
        this.selectAllFiles();
        
        const prompt = this.analysisPrompts[promptType];
        if (prompt) {
            this.messageInput.value = prompt;
            await this.processSelectedFiles();
        }
    }
    
    async processSelectedFiles() {
        if (this.selectedFiles.length === 0) {
            this.showError('Selecciona archivos para procesar.');
            return;
        }
        
        const message = this.messageInput.value.trim() || 'Analiza estos documentos catastrales.';
        
        // Add user message with file info
        this.addMessageToChat('user', message, this.selectedFiles);
        
        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Show loading
        this.showLoading(true);
        this.updateLoadingProgress(0);
        this.loadingText.textContent = 'Procesando documentos...';
        
        try {
            let response;
            
            if (this.processingMode === 'sequential') {
                response = await this.processSequential(message);
            } else if (this.processingMode === 'batch') {
                response = await this.processBatch(message);
            } else {
                response = await this.processSelective(message);
            }
            
            this.addMessageToChat('bot', response);
            this.exportBtn.disabled = false;
        } catch (error) {
            console.error('Error processing files:', error);
            this.addMessageToChat('bot', `Error: ${error.message}`);
        }
        
        this.showLoading(false);
        this.clearFileSelection();
    }
    
    async processSequential(message) {
        let combinedResponse = '';
        const totalFiles = this.selectedFiles.length;
        
        for (let i = 0; i < totalFiles; i++) {
            const fileData = this.selectedFiles[i];
            this.updateLoadingProgress((i / totalFiles) * 100);
            this.loadingText.textContent = `Procesando ${fileData.name}...`;
            
            const fileMessage = `Documento ${i + 1}/${totalFiles}: ${fileData.name}\n\n${message}`;
            const response = await this.callGeminiAPI(fileMessage, fileData);
            
            combinedResponse += `\n\n--- Análisis de ${fileData.name} ---\n${response}`;
        }
        
        return `Análisis secuencial completado:${combinedResponse}`;
    }
    
    async processBatch(message) {
        this.loadingText.textContent = 'Procesando todos los archivos simultáneamente...';
        this.updateLoadingProgress(50);
        
        const batchMessage = `Analiza comparativamente estos ${this.selectedFiles.length} documentos catastrales:\n\n${message}`;
        return await this.callGeminiAPI(batchMessage, this.selectedFiles);
    }
    
    async processSelective(message) {
        // Similar to batch but with specific selection logic
        return await this.processBatch(message);
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        if (!this.apiKey) {
            this.showError('Configura tu API key primero.');
            return;
        }
        
        // Add user message
        this.addMessageToChat('user', message);
        
        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Show loading
        this.showLoading(true);
        
        try {
            const response = await this.callGeminiAPI(message);
            this.addMessageToChat('bot', response);
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('bot', `Error: ${error.message}`);
        }
        
        this.showLoading(false);
    }
    
    async sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        if (!this.apiKey) {
            this.showError('Configura tu API key primero.');
            return;
        }
        
        // Add user message to chat
        this.addChatMessage('user', message);
        
        // Clear input
        this.chatInput.value = '';
        this.autoResizeChatInput();
        
        // Show loading
        this.showChatLoading(true);
        
        try {
            const response = await this.callChatWithGemini(message);
            this.addChatMessage('bot', response);
        } catch (error) {
            console.error('Error sending chat message:', error);
            this.addChatMessage('bot', `Error: ${error.message}`);
        }
        
        this.showChatLoading(false);
    }
    
    async callChatWithGemini(message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;
        
        // Prepare conversation context with extracted data
        let contextPrompt = `Eres un asistente experto en análisis de documentos notariales mexicanos especializado en documentos de propiedad y gravamen.
Tu trabajo es ayudar al usuario a entender y analizar los datos extraídos de documentos.

Responde de manera clara, profesional y útil. Si el usuario pregunta sobre campos específicos, explica su significado legal y relevancia.
Mantén un tono amigable pero profesional. Responde en español.

IMPORTANTE: No respondas con JSON, responde con texto natural conversacional.`;

        // Add context from extracted data if available
        if (this.extractedData && Object.keys(this.extractedData).length > 0) {
            contextPrompt += `\n\nDATOS EXTRAÍDOS DEL DOCUMENTO ACTUAL:\n${JSON.stringify(this.extractedData, null, 2)}`;
            contextPrompt += `\n\nEl usuario puede preguntarte sobre cualquier aspecto de estos datos extraídos.`;
        } else {
            contextPrompt += `\n\nActualmente no hay datos extraídos disponibles. El usuario puede estar preguntando sobre el proceso de extracción o documentos en general.`;
        }
        
        const contents = [];
        
        // Add system context
        contents.push({
            role: 'user',
            parts: [{ text: contextPrompt }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Entendido. Actuaré como un experto analista de documentos notariales según las instrucciones proporcionadas. Estoy listo para ayudarte con preguntas sobre los datos extraídos.' }]
        });
        
        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });
        
        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.7, // More creative for conversation
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1000
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No se recibió respuesta válida del modelo');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    async callGeminiAPI(message, files = null) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;
        
        // Prepare conversation history
        const contents = [];
        
        // Add system prompt as first message
        contents.push({
            role: 'user',
            parts: [{ text: this.systemPrompt }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Entendido. Actuaré como un experto analista de documentos catastrales según las instrucciones proporcionadas.' }]
        });
        
        // Add conversation history
        this.conversationHistory.forEach(entry => {
            contents.push({
                role: entry.role === 'user' ? 'user' : 'model',
                parts: entry.parts
            });
        });
        
        // Prepare current message parts
        const currentParts = [];
        if (message) {
            currentParts.push({ text: message });
        }
        
        // Add files to current message
        if (files) {
            const fileArray = Array.isArray(files) ? files : [files];
            
            fileArray.forEach(fileData => {
                if (fileData.type.startsWith('image/')) {
                    currentParts.push({
                        inlineData: {
                            mimeType: fileData.type,
                            data: fileData.data
                        }
                    });
                } else if (fileData.type === 'application/pdf' && fileData.data) {
                    // Add all PDF pages as images
                    fileData.data.forEach((imageData, index) => {
                        currentParts.push({
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageData
                            }
                        });
                    });
                }
            });
        }
        
        // Add current message
        contents.push({
            role: 'user',
            parts: currentParts
        });
        
        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Respuesta inválida de la API de Gemini');
        }
        
        const botResponse = data.candidates[0].content.parts[0].text;
        
        // Update conversation history
        this.conversationHistory.push({
            role: 'user',
            parts: currentParts
        });
        
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: botResponse }]
        });
        
        return botResponse;
    }
    
    addMessageToChat(sender, message, files = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = `message-bubble message-bubble--${sender}`;
        
        // Add file badges for user messages
        if (files && sender === 'user') {
            const fileArray = Array.isArray(files) ? files : [files];
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            
            fileArray.forEach(fileData => {
                const badge = document.createElement('div');
                badge.className = 'message-file-badge';
                badge.textContent = fileData.name;
                filesDiv.appendChild(badge);
            });
            
            bubble.appendChild(filesDiv);
        }
        
        if (message) {
            const textDiv = document.createElement('div');
            textDiv.textContent = message;
            bubble.appendChild(textDiv);
        }
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        bubble.appendChild(timestamp);
        
        messageDiv.appendChild(bubble);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    clearChat() {
        if (confirm('¿Estás seguro de que quieres limpiar todo el chat?')) {
            this.chatMessages.innerHTML = '';
            this.conversationHistory = [];
            this.exportBtn.disabled = true;
        }
    }
    
    // Loading and progress methods
    showLoading(show) {
        if (show) {
            this.loadingModal.classList.remove('hidden');
        } else {
            this.loadingModal.classList.add('hidden');
            this.updateLoadingProgress(0);
        }
    }
    
    updateLoadingProgress(percentage) {
        this.progressFill.style.width = `${percentage}%`;
    }
    
    // Export methods
    showExportModal() {
        this.exportModal.classList.remove('hidden');
    }
    
    hideExportModal() {
        this.exportModal.classList.add('hidden');
    }
    
    exportResults(format) {
        const messages = Array.from(this.chatMessages.querySelectorAll('.message--bot'));
        let content = '';
        
        messages.forEach(message => {
            const text = message.querySelector('.message-bubble').textContent;
            content += text + '\n\n';
        });
        
        if (!content.trim()) {
            this.showError('No hay resultados para exportar.');
            return;
        }
        
        let filename = '';
        let mimeType = '';
        
        switch (format) {
            case 'json':
                const jsonData = {
                    timestamp: new Date().toISOString(),
                    analysis: content,
                    files: this.uploadedFiles.map(f => ({
                        name: f.name,
                        type: f.type,
                        size: f.size
                    }))
                };
                content = JSON.stringify(jsonData, null, 2);
                filename = 'analisis_catastral.json';
                mimeType = 'application/json';
                break;
            case 'csv':
                // Simple CSV export - in a real app, you'd parse structured data
                content = 'Timestamp,Analysis\n' + `"${new Date().toISOString()}","${content.replace(/"/g, '""')}"`;
                filename = 'analisis_catastral.csv';
                mimeType = 'text/csv';
                break;
            case 'summary':
                filename = 'resumen_catastral.txt';
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
    }
    
    // Utility methods
    showError(message) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Add to config section
        this.configStatus.parentNode.insertBefore(errorDiv, this.configStatus.nextSibling);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    autoResizeTextarea(textarea = null) {
        const element = textarea || this.messageInput;
        element.style.height = 'auto';
        element.style.height = Math.min(element.scrollHeight, 150) + 'px';
    }
    
    // Chat-specific helper functions
    autoResizeChatInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }
    
    showChatLoading(show) {
        if (show) {
            const loadingMsg = this.createChatMessage('bot', '');
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-loading';
            loadingDiv.innerHTML = `
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            loadingMsg.appendChild(loadingDiv);
            this.chatMessages.appendChild(loadingMsg);
            this.scrollChatToBottom();
        } else {
            const loadingMsg = this.chatMessages.querySelector('.chat-loading');
            if (loadingMsg) {
                loadingMsg.parentElement.remove();
            }
        }
    }
    
    addChatMessage(sender, message) {
        // Clear welcome message if it exists
        this.clearWelcomeMessage();
        
        const messageDiv = this.createChatMessage(sender, message);
        this.chatMessages.appendChild(messageDiv);
        this.scrollChatToBottom();
    }
    
    createChatMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message--${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = `message-bubble message-bubble--${sender}`;
        
        if (message) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.innerHTML = this.formatMessageText(message);
            bubble.appendChild(textDiv);
        }
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        bubble.appendChild(timestamp);
        
        messageDiv.appendChild(bubble);
        return messageDiv;
    }
    
    formatMessageText(text) {
        // Convert line breaks to HTML
        return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    
    scrollChatToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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
            this.handleFiles(e.target.files);
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
            this.handleFiles(e.dataTransfer.files);
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
        const panelHeader = document.querySelector('.panel-right .panel-header h3');
        
        if (type === 'propiedad') {
            uploadSectionTitle.textContent = 'Documentos de Propiedad';
            uploadTitle.textContent = 'Carga de Documentos de Propiedad';
            uploadedFilesTitle.textContent = 'Archivos Subidos (Propiedad)';
            panelHeader.textContent = 'Datos Extraídos (Propiedad)';
        } else {
            uploadSectionTitle.textContent = 'Documentos de Gravamen';
            uploadTitle.textContent = 'Carga de Documentos de Gravamen';
            uploadedFilesTitle.textContent = 'Archivos Subidos (Gravamen)';
            panelHeader.textContent = 'Datos Extraídos (Gravamen)';
        }
        
        // Show/hide relevant cards based on document type
        this.updateVisibleCards();
        
        // Clear current data and files for the new type
        this.clearExtractedData();
        this.clearUploadedFiles();
        
        console.log(`🔄 Cambiado a tipo de documento: ${type}`);
    }
    
    // Handle file upload
    async handleFiles(files) {
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
                } else {
                    fileItem.setStatus('error', 'Error en procesamiento');
                }
            } catch (error) {
                console.error('Error procesando archivo:', error);
                fileItem.setStatus('error', error.message || 'Error desconocido');
            }
        }
    }
    
    // Validate file
    validateFile(file) {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        
        if (!allowedTypes.includes(file.type)) {
            this.showError(`Tipo de archivo no soportado: ${file.name}`);
            return false;
        }
        
        if (file.size > this.maxSingleFile) {
            this.showError(`Archivo demasiado grande: ${file.name}`);
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
                <span class="status-text">Cargando...</span>
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
                progress.className = 'progress-bar-full';
            } else if (status === 'error') {
                progress.style.width = '0%';
                progress.style.backgroundColor = '#dc2626';
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
    
    // Parse extraction response
    parseExtractionResponse(response) {
        try {
            // Clean response and parse JSON
            let cleanResponse = response.trim();
            
            // Remove any markdown formatting
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            
            const parsedData = JSON.parse(cleanResponse);
            
            return {
                datos_extraidos: parsedData,
                timestamp: new Date().toISOString(),
                document_type: this.currentDocumentType,
                campos_extraidos: this.calculateExtractedFields(parsedData),
                confianza_global: 85 // Placeholder
            };
        } catch (error) {
            console.error('Error parsing response:', error);
            throw new Error('Error parsing extraction response');
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
        // Add gravamen card if it doesn't exist
        let card = document.getElementById('gravamenCard');
        if (!card) {
            card = this.createGravamenCard();
            document.getElementById('extractedDataContainer').appendChild(card);
        }
        
        const content = card.querySelector('.card-content');
        if (content) {
            content.innerHTML = this.createDataRows(data);
            card.style.display = 'block';
        }
    }
    
    // Create gravamen card
    createGravamenCard() {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.id = 'gravamenCard';
        card.style.display = 'none';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">🏦</div>
                <h4>Información del Gravamen</h4>
            </div>
            <div class="card-content">
                <!-- Dynamic content will be added here -->
            </div>
        `;
        
        return card;
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
        const labels = {
            'expediente_catastral': 'Expediente Catastral',
            'lote': 'Lote',
            'manzana': 'Manzana',
            'superficie': 'Superficie',
            'colonia': 'Colonia',
            'municipio': 'Municipio',
            'codigo_postal': 'Código Postal',
            'tipo_predio': 'Tipo Predio',
            'ubicacion': 'Ubicación',
            'norte': 'Norte',
            'sur': 'Sur',
            'este': 'Este',
            'oeste': 'Oeste',
            'vendedor_nombre': 'Vendedor',
            'vendedor_curp': 'CURP Vendedor',
            'vendedor_rfc': 'RFC Vendedor',
            'comprador_nombre': 'Comprador',
            'comprador_curp': 'CURP Comprador',
            'comprador_rfc': 'RFC Comprador',
            'regimen_matrimonial': 'Régimen Matrimonial',
            'tipo_acto': 'Tipo Acto',
            'numero_escritura': 'Número Escritura',
            'fecha_escritura': 'Fecha Escritura',
            'notario_nombre': 'Notario',
            'notario_numero': 'Número Notario',
            'valor_operacion': 'Valor Operación',
            'moneda': 'Moneda',
            'volumen': 'Volumen',
            'libro': 'Libro',
            'seccion': 'Sección',
            'inscripcion': 'Inscripción',
            'folio_real': 'Folio Real',
            'fecha_registro': 'Fecha Registro',
            'inscripcion_anterior': 'Inscripción Anterior',
            'volumen_anterior': 'Volumen Anterior',
            'fecha_anterior': 'Fecha Anterior',
            'tipo_gravamen': 'Tipo Gravamen',
            'acreedor': 'Acreedor',
            'deudor': 'Deudor',
            'monto_gravamen': 'Monto Gravamen',
            'plazo': 'Plazo',
            'garantia': 'Garantía'
        };
        
        return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Update visible cards based on document type
    updateVisibleCards() {
        const propiedadOnlyCards = ['medidasColindanciasCard', 'titularesCard', 'antecedentesCard'];
        const gravamenOnlyCards = ['gravamenCard'];
        
        if (this.currentDocumentType === 'propiedad') {
            propiedadOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card && card.style.display !== 'none') {
                    card.style.display = 'block';
                }
            });
            gravamenOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card) card.style.display = 'none';
            });
        } else {
            propiedadOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card) card.style.display = 'none';
            });
            gravamenOnlyCards.forEach(cardId => {
                const card = document.getElementById(cardId);
                if (card) card.style.display = 'block';
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
        this.uploadedFiles = [];
    }
    
    // Utility functions
    getFileIcon(type) {
        if (type === 'application/pdf') return '📄';
        if (type.startsWith('image/')) return '🖼️';
        return '📎';
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
        // You can implement a toast notification here
        alert(message); // Simple implementation for now
    }
    
    // Tab functionality for analysis section
    initializeTabs() {
        console.log('🔄 Inicializando funcionalidad de tabs...');
        
        // Main navigation tabs
        const navTabs = document.querySelectorAll('.nav-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        console.log(`📊 Encontrados ${navTabs.length} nav tabs y ${tabPanels.length} tab panels`);
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                console.log(`🔄 Cambiando a tab: ${targetTab}`);
                
                // Remove active class from all tabs and panels
                navTabs.forEach(t => t.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = document.getElementById(targetTab + 'Tab');
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    console.log(`✅ Tab activado: ${targetTab}`);
                } else {
                    console.error(`❌ No se encontró panel: ${targetTab}Tab`);
                }
            });
        });
        
        // Panel tabs (Tables/Chat)
        const panelTabs = document.querySelectorAll('.panel-tab');
        const dataPanels = document.querySelectorAll('.data-panel');
        
        console.log(`📊 Encontrados ${panelTabs.length} panel tabs y ${dataPanels.length} data panels`);
        
        panelTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.getAttribute('data-panel');
                console.log(`🔄 Cambiando a panel: ${targetPanel}`);
                
                // Remove active class from all panel tabs and panels
                panelTabs.forEach(t => t.classList.remove('active'));
                dataPanels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetDataPanel = document.getElementById(targetPanel + 'Panel');
                if (targetDataPanel) {
                    targetDataPanel.classList.add('active');
                    console.log(`✅ Panel activado: ${targetPanel}`);
                } else {
                    console.error(`❌ No se encontró data panel: ${targetPanel}Panel`);
                }
            });
        });
        
        console.log('✅ Tabs inicializados correctamente');
    }
}

// Initialize the analyzer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analyzer = new CatastralAnalyzer();
    console.log('✅ Analizador Catastral inicializado correctamente');
});