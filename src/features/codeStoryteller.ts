import * as vscode from 'vscode';
import { ApiManager } from '../api/apiManager';
import { Configuration } from '../utils/configuration';

/**
 * Initialise la fonctionnalité Code Storyteller
 * @param context Le contexte de l'extension
 * @param apiManager Le gestionnaire d'API
 * @param configuration La configuration de l'extension
 * @param actionHistory L'historique des actions
 */
export function initializeCodeStoryteller(
    context: vscode.ExtensionContext, 
    apiManager: ApiManager,
    configuration: Configuration,
    actionHistory: any // Typé comme 'any' pour éviter les dépendances circulaires
) {
    // Ajouter un fournisseur de code lens pour suggérer des narrations pour les fonctions et les classes
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        { scheme: 'file' },
        {
            provideCodeLenses(document, token) {
                const codeLenses = [];
                
                // Dans une extension réelle, vous devriez analyser le document en fonction du langage
                const text = document.getText();
                
                // Expression régulière pour trouver les déclarations de fonctions ou de classes
                // Note: Ce n'est pas une solution robuste et devrait être adaptée à chaque langage
                const functionRegex = /\b(function|class|def|fun|func|fn|method)\s+(\w+)/g;
                let match;
                
                while ((match = functionRegex.exec(text))) {
                    const position = document.positionAt(match.index);
                    const range = new vscode.Range(
                        position,
                        new vscode.Position(position.line, position.character + match[0].length)
                    );
                    
                    const functionName = match[2];
                    const codeLens = new vscode.CodeLens(range, {
                        title: `📖 ${configuration.getString('story_title')}`,
                        command: "little-fox.codeStoryteller",
                        arguments: [{
                            document,
                            range,
                            functionName
                        }]
                    });
                    
                    codeLenses.push(codeLens);
                }
                
                return codeLenses;
            }
        }
    );
    
    context.subscriptions.push(codeLensProvider);
    
    // Ajouter une commande contextuelle dans le menu de l'éditeur
    const disposableContextCmd = vscode.commands.registerCommand('little-fox.contextStory', (uri: vscode.Uri) => {
        // Cette commande est déclenchée depuis le menu contextuel du fichier
        if (uri && uri.scheme === 'file') {
            vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc).then(() => {
                    vscode.commands.executeCommand('little-fox.codeStoryteller');
                    // Enregistrer l'action
                    actionHistory.addAction('contextStory', uri.fsPath);
                });
            });
        } else {
            vscode.window.showErrorMessage(configuration.getString('story_error'));
        }
    });
    
    context.subscriptions.push(disposableContextCmd);
}