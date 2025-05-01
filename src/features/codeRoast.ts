import * as vscode from 'vscode';
import { ApiManager } from '../api/apiManager';
import { Configuration } from '../utils/configuration';

/**
 * Initialise la fonctionnalité Code Roast
 * @param context Le contexte de l'extension
 * @param apiManager Le gestionnaire d'API
 * @param configuration La configuration de l'extension
 * @param actionHistory L'historique des actions
 */
export function initializeCodeRoast(
    context: vscode.ExtensionContext, 
    apiManager: ApiManager,
    configuration: Configuration,
    actionHistory: any // Typé comme 'any' pour éviter les dépendances circulaires
) {
    // Enregistrer le fournisseur de survol pour afficher les suggestions de critique
    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: 'file' },
        {
            provideHover(document, position, token) {
                const range = document.getWordRangeAtPosition(position);
                if (!range) {
                    return;
                }
                
                const line = document.lineAt(position.line);
                
                // Fournir des survols uniquement pour les lignes avec certains modèles
                if (line.text.includes('if') && line.text.includes('else') ||
                    (line.text.match(/for\s*\(/g) && line.text.includes('{')) ||
                    line.text.length > 100) {
                    
                    const lineContent = line.text.trim();
                    
                    // Retourner une critique rapide basée sur le contenu de la ligne
                    let roastMessage = '';
                    
                    if (line.text.length > 100) {
                        roastMessage = configuration.getString('roast_fallback_5');
                    } else if (line.text.includes('if') && line.text.includes('else')) {
                        roastMessage = configuration.getString('roast_fallback_10');
                    } else if (line.text.match(/for\s*\(/g)) {
                        roastMessage = configuration.getString('roast_fallback_1');
                    } else {
                        // Obtenir un message aléatoire
                        roastMessage = configuration.getRandomFallbackMessage('roast');
                    }
                    
                    return new vscode.Hover(`🦊 **${configuration.getString('roast_title')}**: ${roastMessage}\n\n_${configuration.getString('roast_loading')}_`);
                }
                
                return null;
            }
        }
    );
    
    context.subscriptions.push(hoverProvider);
    
    // Enregistrer les événements pour la fonctionnalité auto-roast si configurée
    const disposableDidSave = vscode.workspace.onDidSaveTextDocument((document) => {
        const config = vscode.workspace.getConfiguration('littleFox');
        const autoRoastOnSave = config.get<boolean>('autoRoastOnSave', false);
        
        if (autoRoastOnSave) {
            // Traiter uniquement les fichiers de code courants
            const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php'];
            
            if (supportedLanguages.includes(document.languageId)) {
                vscode.commands.executeCommand('little-fox.codeRoast');
                // Enregistrer l'événement dans l'historique des actions
                actionHistory.addAction('autoRoast', document.fileName);
            }
        }
    });
    
    context.subscriptions.push(disposableDidSave);
}