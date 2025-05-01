import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { initializeCodeRoast } from './features/codeRoast';
import { initializeCodeStoryteller } from './features/codeStoryteller';
import { initializeCommitMessageGenerator } from './features/commitMessageGenerator';
import { ApiManager } from './api/apiManager';
import { Configuration } from './utils/configuration';
import { ErrorHandler } from './utils/errorHandler';

// Classe pour gérer l'historique des actions
class ActionHistory {
    private static readonly MAX_HISTORY_SIZE = 100;
    private history: { action: string, timestamp: number, details?: string }[] = [];
    
    addAction(action: string, details?: string): void {
        this.history.unshift({
            action,
            timestamp: Date.now(),
            details
        });
        
        // Limiter la taille de l'historique
        if (this.history.length > ActionHistory.MAX_HISTORY_SIZE) {
            this.history = this.history.slice(0, ActionHistory.MAX_HISTORY_SIZE);
        }
    }
    
    getHistory(): { action: string, timestamp: number, details?: string }[] {
        return [...this.history];
    }
    
    clearHistory(): void {
        this.history = [];
    }
}

// Classe pour le tableau de bord principal
class Dashboard {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private configuration: Configuration;
    private apiManager: ApiManager;
    private actionHistory: ActionHistory;

    constructor(context: vscode.ExtensionContext, configuration: Configuration, apiManager: ApiManager, actionHistory: ActionHistory) {
        this.context = context;
        this.configuration = configuration;
        this.apiManager = apiManager;
        this.actionHistory = actionHistory;
    }

    public show(): void {
        if (this.panel) {
            // Si le panel existe déjà, le mettre au premier plan
            this.panel.reveal();
        } else {
            // Sinon, créer un nouveau panel
            this.panel = vscode.window.createWebviewPanel(
                'littleFoxDashboard',
                'Little Fox Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
                    ]
                }
            );

            // Gérer la fermeture du panel
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            }, null, this.context.subscriptions);

            // Gérer les messages du webview
            this.panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:theTigerFox.little-fox');
                        break;
                    case 'changeLanguage': {
                            const languageOptions = this.configuration.getAvailableLanguages();
                            const selectedLanguage = await vscode.window.showQuickPick(
                                languageOptions.map(lang => ({ label: lang.name, value: lang.code })),
                                { placeHolder: 'Choisissez une langue' }
                            );
                            
                            if (selectedLanguage) {
                                this.configuration.setLanguage(selectedLanguage.value);
                                this.updateWebviewContent();
                                this.actionHistory.addAction('languageChanged', selectedLanguage.label);
                            }
                        break; }
                    case 'testApi':
                        this.testApiConnection(message.provider);
                        break;
                    case 'clearHistory':
                        this.actionHistory.clearHistory();
                        this.updateWebviewContent();
                        break;
                }
            }, undefined, this.context.subscriptions);

            // Initialiser le contenu du webview
            this.updateWebviewContent();
        }
    }

    private async testApiConnection(provider: string): Promise<void> {
        try {
            this.panel?.webview.postMessage({ command: 'apiTestStarted', provider });
            
            // Simuler un test d'API
            const isSuccessful = await this.apiManager.testConnection(provider);
            
            setTimeout(() => {
                if (isSuccessful) {
                    this.panel?.webview.postMessage({ 
                        command: 'apiTestCompleted', 
                        provider,
                        success: true,
                        message: `Connexion à ${provider} réussie! 🦊` 
                    });
                    this.actionHistory.addAction('apiTested', `Connexion à ${provider} réussie`);
                } else {
                    this.panel?.webview.postMessage({ 
                        command: 'apiTestCompleted', 
                        provider, 
                        success: false,
                        message: `Échec de la connexion à ${provider}. Vérifiez votre clé API.` 
                    });
                    this.actionHistory.addAction('apiTested', `Échec de la connexion à ${provider}`);
                }
                
                this.updateWebviewContent();
            }, 1500);
        } catch (error) {
            this.panel?.webview.postMessage({ 
                command: 'apiTestCompleted', 
                provider, 
                success: false,
                message: `Erreur lors du test: ${error}` 
            });
        }
    }

    private updateWebviewContent(): void {
        if (!this.panel) {
            return;
        }

        // Obtenir les ressources nécessaires
        const foxIconPath = vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'images', 'fox-icon.png'));
        const foxIconUri = this.panel.webview.asWebviewUri(foxIconPath);
        
        const currentLanguage = this.configuration.getCurrentLanguage();
        const apiProvider = this.configuration.getApiProvider();
        const history = this.actionHistory.getHistory();
        
        // Formater l'historique pour l'affichage
        const historyHtml = history.length > 0 
            ? history.map(item => {
                const date = new Date(item.timestamp).toLocaleString('fr-FR');
                return `<div class="history-item">
                    <span class="history-time">${date}</span>
                    <span class="history-action">${item.action}</span>
                    ${item.details ? `<span class="history-details">${item.details}</span>` : ''}
                </div>`;
            }).join('')
            : '<div class="no-history">Aucune action récente</div>';

        // Générer le HTML pour la page
        this.panel.webview.html = `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Little Fox Dashboard</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 30px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 15px;
                }
                
                .logo {
                    width: 64px;
                    height: 64px;
                    margin-right: 15px;
                }
                
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0;
                }
                
                .subtitle {
                    font-size: 14px;
                    opacity: 0.8;
                    margin: 5px 0 0;
                }
                
                .section {
                    margin-bottom: 30px;
                    padding: 15px;
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 5px;
                }
                
                .section-title {
                    font-size: 18px;
                    margin-top: 0;
                    margin-bottom: 15px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }
                
                .feature-card {
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                    border: 1px solid var(--vscode-panel-border);
                }
                
                .feature-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-top: 0;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                }
                
                .feature-icon {
                    margin-right: 8px;
                    font-size: 18px;
                }
                
                .feature-desc {
                    font-size: 14px;
                    margin-bottom: 15px;
                }
                
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 15px;
                }
                
                .setting-item {
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                    border: 1px solid var(--vscode-panel-border);
                }
                
                .setting-label {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .setting-value {
                    font-family: var(--vscode-editor-font-family);
                    padding: 5px;
                    background-color: var(--vscode-input-background);
                    border-radius: 3px;
                }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-top: 8px;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .history-container {
                    max-height: 200px;
                    overflow-y: auto;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                }
                
                .history-item {
                    padding: 5px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: grid;
                    grid-template-columns: 140px 1fr 2fr;
                    gap: 10px;
                    font-size: 12px;
                }
                
                .history-time {
                    color: var(--vscode-descriptionForeground);
                }
                
                .no-history {
                    font-style: italic;
                    color: var(--vscode-descriptionForeground);
                    text-align: center;
                    padding: 10px;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid var(--vscode-panel-border);
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .clear-history {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 10px;
                }
                
                .api-test-status {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    margin-left: 8px;
                }
                
                .status-unknown {
                    background-color: var(--vscode-editorWarning-foreground);
                }
                
                .status-success {
                    background-color: var(--vscode-debugIcon-startForeground);
                }
                
                .status-error {
                    background-color: var(--vscode-errorForeground);
                }
                
                .status-loading {
                    animation: pulse 1.5s infinite;
                    background-color: var(--vscode-progressBar-background);
                }
                
                @keyframes pulse {
                    0% {
                        opacity: 0.5;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0.5;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${foxIconUri}" alt="Little Fox Logo" class="logo">
                <div>
                    <h1 class="title">Little Fox</h1>
                    <p class="subtitle">Votre assistant renard malicieux pour VS Code</p>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Fonctionnalités</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <h3 class="feature-title">
                            <span class="feature-icon">🔥</span>
                            Critique de Code
                        </h3>
                        <p class="feature-desc">Recevez des commentaires sarcastiques mais utiles sur votre code. Le renard n'a pas la langue dans sa poche!</p>
                        <button id="btn-code-roast">Critiquer la sélection</button>
                    </div>
                    
                    <div class="feature-card">
                        <h3 class="feature-title">
                            <span class="feature-icon">📖</span>
                            Storyteller
                        </h3>
                        <p class="feature-desc">Découvrez l'histoire que raconte votre code, narrée par un renard créatif qui comprend le développement.</p>
                        <button id="btn-code-story">Raconter l'histoire</button>
                    </div>
                    
                    <div class="feature-card">
                        <h3 class="feature-title">
                            <span class="feature-icon">📝</span>
                            Messages de Commit
                        </h3>
                        <p class="feature-desc">Générez des messages de commit brutalement honnêtes. Votre historique Git n'aura jamais été aussi divertissant!</p>
                        <button id="btn-commit-msg">Créer un message</button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Paramètres</h2>
                <div class="settings-grid">
                    <div class="setting-item">
                        <div class="setting-label">Langue actuelle</div>
                        <div class="setting-value">${currentLanguage === 'fr' ? 'Français' : currentLanguage === 'en' ? 'Anglais' : currentLanguage === 'es' ? 'Espagnol' : 'Allemand'}</div>
                        <button id="btn-change-language">Changer</button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Fournisseur d'API</div>
                        <div class="setting-value">
                            ${apiProvider === 'gemini' ? 'Gemini AI' : 'Groq AI'}
                            <span id="api-status-${apiProvider}" class="api-test-status status-unknown"></span>
                        </div>
                        <button id="btn-test-api">Tester la connexion</button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Configuration</div>
                        <div class="setting-value">Paramètres de l'extension</div>
                        <button id="btn-open-settings">Ouvrir</button>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">Historique des Actions</h2>
                <div class="history-container">
                    ${historyHtml}
                </div>
                <div class="clear-history">
                    <button id="btn-clear-history">Effacer l'historique</button>
                </div>
            </div>
            
            <div class="footer">
                Little Fox v0.1.0 | Créé par theTigerFox | ${new Date().getFullYear()}
            </div>
            
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // Boutons des fonctionnalités
                    document.getElementById('btn-code-roast').addEventListener('click', () => {
                        vscode.postMessage({ command: 'executeCommand', value: 'little-fox.codeRoast' });
                    });
                    
                    document.getElementById('btn-code-story').addEventListener('click', () => {
                        vscode.postMessage({ command: 'executeCommand', value: 'little-fox.codeStoryteller' });
                    });
                    
                    document.getElementById('btn-commit-msg').addEventListener('click', () => {
                        vscode.postMessage({ command: 'executeCommand', value: 'little-fox.generateCommitMessage' });
                    });
                    
                    // Boutons de paramètres
                    document.getElementById('btn-change-language').addEventListener('click', () => {
                        vscode.postMessage({ command: 'changeLanguage' });
                    });
                    
                    document.getElementById('btn-test-api').addEventListener('click', () => {
                        const provider = '${apiProvider}';
                        const statusEl = document.getElementById('api-status-' + provider);
                        statusEl.className = 'api-test-status status-loading';
                        vscode.postMessage({ command: 'testApi', provider });
                    });
                    
                    document.getElementById('btn-open-settings').addEventListener('click', () => {
                        vscode.postMessage({ command: 'openSettings' });
                    });
                    
                    // Bouton d'historique
                    document.getElementById('btn-clear-history').addEventListener('click', () => {
                        vscode.postMessage({ command: 'clearHistory' });
                    });
                    
                    // Écouteur de messages du côté extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'apiTestStarted':
                                const statusElStart = document.getElementById('api-status-' + message.provider);
                                if (statusElStart) {
                                    statusElStart.className = 'api-test-status status-loading';
                                }
                                break;
                                
                            case 'apiTestCompleted':
                                const statusEl = document.getElementById('api-status-' + message.provider);
                                if (statusEl) {
                                    statusEl.className = 'api-test-status ' + (message.success ? 'status-success' : 'status-error');
                                    statusEl.title = message.message;
                                }
                                break;
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
    }
}

// Fonction principale d'activation de l'extension
export function activate(context: vscode.ExtensionContext) {
    console.log('Little Fox est maintenant actif! 🦊');
    
    // Initialiser la configuration
    const configuration = new Configuration(context);
    
    // Initialiser le gestionnaire d'erreurs avec la configuration
    ErrorHandler.setConfiguration(configuration);
    
    // Initialiser le gestionnaire d'API
    const apiManager = new ApiManager(configuration);
    
    // Initialiser l'historique des actions
    const actionHistory = new ActionHistory();
    
    // Initialiser le tableau de bord
    const dashboard = new Dashboard(context, configuration, apiManager, actionHistory);
    
    // Initialiser les fonctionnalités
    initializeCodeRoast(context, apiManager, configuration, actionHistory);
    initializeCodeStoryteller(context, apiManager, configuration, actionHistory);
    initializeCommitMessageGenerator(context, apiManager, configuration, actionHistory);
    
    // Enregistrer les commandes
    context.subscriptions.push(
        vscode.commands.registerCommand('little-fox.codeRoast', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                try {
                    const selection = editor.selection;
                    const text = editor.document.getText(selection.isEmpty ? undefined : selection);
                    
                    // Afficher une progression pendant la génération de la critique
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: configuration.getString('roast_loading'),
                        cancellable: true
                    }, async (progress) => {
                        const response = await apiManager.generateCodeRoast(text);
                        
                        // Afficher la critique dans l'éditeur sous forme de commentaire au-dessus du code sélectionné
                        if (response) {
                            const position = new vscode.Position(selection.start.line, 0);
                            
                            // Déterminer le préfixe de commentaire selon le langage
                            let commentPrefix = '// ';
                            let commentSuffix = '';
                            
                            switch (editor.document.languageId) {
                                case 'python':
                                    commentPrefix = '# ';
                                    break;
                                case 'html':
                                case 'xml':
                                case 'svg':
                                    commentPrefix = '<!-- ';
                                    commentSuffix = ' -->';
                                    break;
                                case 'css':
                                case 'scss':
                                case 'less':
                                    commentPrefix = '/* ';
                                    commentSuffix = ' */';
                                    break;
                                case 'markdown':
                                    commentPrefix = '<!-- LITTLE FOX: ';
                                    commentSuffix = ' -->';
                                    break;
                            }
                            
                            await editor.edit(editBuilder => {
                                editBuilder.insert(position, `${commentPrefix}🦊 CRITIQUE: ${response}${commentSuffix}\n`);
                            });
                            
                            vscode.window.showInformationMessage('Code critiqué avec succès! 🔥');
                            actionHistory.addAction('codeRoasted', `${text.substring(0, 30)}...`);
                        }
                    });
                } catch (error) {
                    ErrorHandler.handleError(error, 'Code Roast');
                }
            } else {
                vscode.window.showWarningMessage('Veuillez ouvrir un fichier pour critiquer du code!');
            }
        }),
        
        vscode.commands.registerCommand('little-fox.codeStoryteller', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                try {
                    const selection = editor.selection;
                    const text = editor.document.getText(selection.isEmpty ? undefined : selection);
                    
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: configuration.getString('story_loading'),
                        cancellable: true
                    }, async (progress) => {
                        const story = await apiManager.generateCodeStory(text);
                        
                        if (story) {
                            // Créer un nouveau panel webview pour afficher l'histoire
                            const panel = vscode.window.createWebviewPanel(
                                'codeStory',
                                configuration.getString('story_title'),
                                vscode.ViewColumn.Beside,
                                {
                                    enableScripts: true
                                }
                            );
                            
                            // Récupérer l'URI de l'icône du renard
                            const foxIconPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'images', 'fox-icon.png'));
                            const foxIconUri = panel.webview.asWebviewUri(foxIconPath);
                            
                            panel.webview.html = `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>${configuration.getString('story_title')}</title>
                                    <style>
                                        body {
                                            font-family: var(--vscode-editor-font-family);
                                            padding: 20px;
                                            line-height: 1.6;
                                            color: var(--vscode-foreground);
                                            background-color: var(--vscode-editor-background);
                                        }
                                        .header {
                                            display: flex;
                                            align-items: center;
                                            margin-bottom: 20px;
                                            padding-bottom: 10px;
                                            border-bottom: 1px solid var(--vscode-panel-border);
                                        }
                                        .logo {
                                            width: 48px;
                                            height: 48px;
                                            margin-right: 15px;
                                        }
                                        h1 {
                                            margin: 0;
                                            color: var(--vscode-editor-foreground);
                                        }
                                        .story-content {
                                            white-space: pre-wrap;
                                            background-color: var(--vscode-input-background);
                                            padding: 15px;
                                            border-radius: 5px;
                                            font-size: 14px;
                                            margin-bottom: 20px;
                                        }
                                        .code-preview {
                                            white-space: pre-wrap;
                                            font-family: var(--vscode-editor-font-family);
                                            background-color: var(--vscode-editor-inactiveSelectionBackground);
                                            padding: 10px;
                                            border-radius: 5px;
                                            font-size: 12px;
                                            margin-bottom: 20px;
                                            max-height: 200px;
                                            overflow-y: auto;
                                            border: 1px solid var(--vscode-panel-border);
                                        }
                                        .code-title {
                                            font-size: 14px;
                                            margin-bottom: 5px;
                                            color: var(--vscode-descriptionForeground);
                                        }
                                        .footer {
                                            font-size: 12px;
                                            color: var(--vscode-descriptionForeground);
                                            margin-top: 30px;
                                            text-align: center;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        <img src="${foxIconUri}" alt="Little Fox Logo" class="logo">
                                        <h1>${configuration.getString('story_title')}</h1>
                                    </div>
                                    
                                    <div class="code-title">Code analysé:</div>
                                    <div class="code-preview">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                                    
                                    <div class="story-content">${story.replace(/\n/g, '<br>')}</div>
                                    
                                    <div class="footer">
                                        Généré par Little Fox - Votre assistant renard 🦊
                                    </div>
                                </body>
                                </html>
                            `;
                            
                            vscode.window.showInformationMessage('Histoire du code générée! 📖');
                            actionHistory.addAction('codeStoryGenerated', `${text.substring(0, 30)}...`);
                        }
                    });
                } catch (error) {
                    ErrorHandler.handleError(error, 'Code Storyteller');
                }
            } else {
                vscode.window.showWarningMessage('Veuillez ouvrir un fichier pour raconter son histoire!');
            }
        }),
        
        vscode.commands.registerCommand('little-fox.generateCommitMessage', async () => {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: configuration.getString('commit_loading'),
                    cancellable: true
                }, async (progress) => {
                    // Récupérer les changements Git
                    const gitChanges = await getGitChanges();
                    
                    if (gitChanges) {
                        const commitMessage = await apiManager.generateCommitMessage(gitChanges);
                        
                        if (commitMessage) {
                            // Afficher le message de commit dans une boîte de dialogue pour faciliter la copie ou l'édition
                            const result = await vscode.window.showInputBox({
                                prompt: 'Voici votre message de commit. Modifiez-le si nécessaire:',
                                value: commitMessage
                            });
                            
                            if (result) {
                                // Exécuter la commande git commit avec le message fourni
                                const terminal = vscode.window.createTerminal('Git Commit');
                                terminal.sendText(`git commit -m "${result.replace(/"/g, '\\"')}"`);
                                terminal.show();
                                vscode.window.showInformationMessage('Message de commit appliqué! 🚀');
                                actionHistory.addAction('commitMessageGenerated', result);
                            }
                        }
                    } else {
                        vscode.window.showWarningMessage('Aucun changement détecté à commiter.');
                    }
                });
            } catch (error) {
                ErrorHandler.handleError(error, 'Commit Message Generator');
            }
        }),
        
        vscode.commands.registerCommand('little-fox.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:theTigerFox.little-fox');
        }),
        
        vscode.commands.registerCommand('little-fox.setLanguage', async () => {
            const languages = configuration.getAvailableLanguages();
            const selectedLanguage = await vscode.window.showQuickPick(
                languages.map(lang => ({ label: lang.name, value: lang.code })),
                { placeHolder: 'Choisissez une langue' }
            );
            
            if (selectedLanguage) {
                configuration.setLanguage(selectedLanguage.value);
                vscode.window.showInformationMessage(`Langue changée en ${selectedLanguage.label}`);
                actionHistory.addAction('languageChanged', selectedLanguage.label);
            }
        }),
        
        vscode.commands.registerCommand('little-fox.showAbout', () => {
            dashboard.show();
        })
    );
    
    // Ajouter une icône dans la barre d'état pour ouvrir le tableau de bord
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = "$(fox) Little Fox";
    statusBarItem.tooltip = "Ouvrir le tableau de bord Little Fox";
    statusBarItem.command = 'little-fox.showAbout';
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);
    
    // Créer un TreeDataProvider pour la vue historique dans la barre latérale
    class HistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
        private _onDidChangeTreeData = new vscode.EventEmitter<HistoryItem | undefined>();
        readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
        
        constructor(private actionHistory: ActionHistory) {}
        
        refresh(): void {
            this._onDidChangeTreeData.fire(undefined);
        }
        
        getTreeItem(element: HistoryItem): vscode.TreeItem {
            return element;
        }
        
        getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
            if (element) {
                return Promise.resolve([]);
            } else {
                const history = this.actionHistory.getHistory();
                return Promise.resolve(
                    history.map(item => {
                        const treeItem = new HistoryItem(
                            item.action,
                            item.details || '',
                            item.timestamp,
                            vscode.TreeItemCollapsibleState.None
                        );
                        
                        switch (item.action) {
                            case 'codeRoasted':
                                treeItem.iconPath = new vscode.ThemeIcon('flame');
                                break;
                            case 'codeStoryGenerated':
                                treeItem.iconPath = new vscode.ThemeIcon('book');
                                break;
                            case 'commitMessageGenerated':
                                treeItem.iconPath = new vscode.ThemeIcon('git-commit');
                                break;
                            case 'languageChanged':
                                treeItem.iconPath = new vscode.ThemeIcon('globe');
                                break;
                            case 'apiTested':
                                treeItem.iconPath = new vscode.ThemeIcon('server');
                                break;
                            default:
                                treeItem.iconPath = new vscode.ThemeIcon('history');
                        }
                        
                        return treeItem;
                    })
                );
            }
        }
    }
    
    class HistoryItem extends vscode.TreeItem {
        constructor(
            public readonly label: string,
            public readonly details: string,
            public readonly timestamp: number,
            public readonly collapsibleState: vscode.TreeItemCollapsibleState
        ) {
            super(label, collapsibleState);
            
            const date = new Date(timestamp).toLocaleString('fr-FR');
            this.tooltip = `${date} - ${details}`;
            this.description = date;
        }
    }
    
    // Créer un TreeDataProvider pour le dashboard dans la barre latérale
    class DashboardProvider implements vscode.TreeDataProvider<DashboardItem> {
        private _onDidChangeTreeData = new vscode.EventEmitter<DashboardItem | undefined>();
        readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
        
        constructor(private configuration: Configuration, private apiManager: ApiManager) {}
        
        refresh(): void {
            this._onDidChangeTreeData.fire(undefined);
        }
        
        getTreeItem(element: DashboardItem): vscode.TreeItem {
            return element;
        }
        
        getChildren(element?: DashboardItem): Thenable<DashboardItem[]> {
            if (element) {
                return Promise.resolve([]);
            } else {
                const items: DashboardItem[] = [];
                
                // Élément pour le tableau de bord
                items.push(new DashboardItem(
                    'Tableau de bord',
                    'Ouvrir le tableau de bord Little Fox',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'little-fox.showAbout',
                        title: 'Ouvrir',
                        arguments: []
                    },
                    new vscode.ThemeIcon('dashboard')
                ));
                
                // Éléments pour chaque fonctionnalité
                items.push(new DashboardItem(
                    'Critique de code',
                    'Critiquer le code sélectionné',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'little-fox.codeRoast',
                        title: 'Critiquer',
                        arguments: []
                    },
                    new vscode.ThemeIcon('flame')
                ));
                
                items.push(new DashboardItem(
                    'Narration de code',
                    'Raconter l\'histoire du code sélectionné',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'little-fox.codeStoryteller',
                        title: 'Raconter',
                        arguments: []
                    },
                    new vscode.ThemeIcon('book')
                ));
                
                items.push(new DashboardItem(
                    'Message de commit',
                    'Générer un message de commit honnête',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'little-fox.generateCommitMessage',
                        title: 'Générer',
                        arguments: []
                    },
                    new vscode.ThemeIcon('git-commit')
                ));
                
                // Élément pour les paramètres
                items.push(new DashboardItem(
                    'Paramètres',
                    'Configurer Little Fox',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'little-fox.openSettings',
                        title: 'Ouvrir',
                        arguments: []
                    },
                    new vscode.ThemeIcon('gear')
                ));
                
                return Promise.resolve(items);
            }
        }
    }
    
    class DashboardItem extends vscode.TreeItem {
        constructor(
            public readonly label: string,
            public readonly tooltip: string,
            public readonly collapsibleState: vscode.TreeItemCollapsibleState,
            public readonly command?: vscode.Command,
            public readonly iconPath?: vscode.ThemeIcon
        ) {
            super(label, collapsibleState);
        }
    }
    
    // Enregistrer les TreeDataProviders pour les vues
    const historyProvider = new HistoryProvider(actionHistory);
    const dashboardProvider = new DashboardProvider(configuration, apiManager);
    
    vscode.window.registerTreeDataProvider('little-fox-history', historyProvider);
    vscode.window.registerTreeDataProvider('little-fox-dashboard', dashboardProvider);
    
    // S'abonner aux changements d'historique pour mettre à jour la vue
    context.subscriptions.push(vscode.commands.registerCommand('little-fox.refreshHistory', () => {
        historyProvider.refresh();
    }));
    
    // S'abonner aux changements de configuration pour mettre à jour le tableau de bord
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('littleFox')) {
            dashboardProvider.refresh();
        }
    }));
    
    // Afficher un message de bienvenue
    vscode.window.showInformationMessage(
        `${configuration.getString('welcome')} Utilisez les commandes du menu ou la barre latérale pour interagir avec moi!`,
        'Voir le tableau de bord'
    ).then(selection => {
        if (selection === 'Voir le tableau de bord') {
            vscode.commands.executeCommand('little-fox.showAbout');
        }
    });
    
    // Ajouter une action d'activation à l'historique
    actionHistory.addAction('extensionActivated');
}

async function getGitChanges(): Promise<string | undefined> {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            vscode.window.showWarningMessage('L\'extension Git n\'est pas disponible');
            return undefined;
        }
        
        const api = gitExtension.getAPI(1);
        const repo = api.repositories[0];
        
        if (!repo) {
            vscode.window.showWarningMessage('Aucun dépôt trouvé');
            return undefined;
        }
        
        // Récupérer tous les fichiers modifiés
        const changes = repo.state.workingTreeChanges;
        if (changes.length === 0) {
            return "Aucun changement détecté";
        }
        
        // Construire un résumé des changements
        let changesSummary = `Fichiers modifiés: ${changes.length}\n\n`;
        
        for (const change of changes) {
            changesSummary += `${change.uri.fsPath.split('/').pop()} (${change.status})\n`;
            
            // Récupérer le diff pour ce fichier
            try {
                const diff = await repo.diffWith(change.uri);
                if (diff) {
                    // Ajouter un résumé du diff (limité pour ne pas dépasser la limite de tokens)
                    const diffLines = diff.split('\n').slice(0, 20);
                    changesSummary += diffLines.join('\n') + '\n';
                    
                    if (diff.split('\n').length > 20) {
                        changesSummary += '... (diff tronqué)\n';
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du diff:', error);
            }
            
            changesSummary += '\n';
        }
        
        return changesSummary;
    } catch (error) {
        console.error('Erreur lors de la récupération des changements Git:', error);
        return undefined;
    }
}

export function deactivate() {
    console.log('Little Fox s\'en va chasser! Au revoir! 🦊');
}