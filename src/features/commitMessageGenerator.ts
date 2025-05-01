import * as vscode from 'vscode';
import { ApiManager } from '../api/apiManager';
import { Configuration } from '../utils/configuration';

/**
 * Initialise la fonctionnalité Commit Message Generator
 * @param context Le contexte de l'extension
 * @param apiManager Le gestionnaire d'API
 * @param configuration La configuration de l'extension
 * @param actionHistory L'historique des actions
 */
export function initializeCommitMessageGenerator(
    context: vscode.ExtensionContext, 
    apiManager: ApiManager,
    configuration: Configuration,
    actionHistory: any // Typé comme 'any' pour éviter les dépendances circulaires
) {
    // Créer un élément de barre d'état pour un accès rapide à la génération de messages de commit
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = `$(git-commit) ${configuration.getString('commit_title')}`;
    statusBarItem.tooltip = configuration.getString('commit_loading');
    statusBarItem.command = "little-fox.generateCommitMessage";
    
    // Afficher l'élément de barre d'état uniquement dans un dépôt git
    function updateStatusBarVisibility(): void {
        // Vérifier si la barre d'état doit être affichée selon la configuration
        const config = vscode.workspace.getConfiguration('littleFox');
        const showStatusBar = config.get<boolean>('showStatusBarItem', true);
        
        if (!showStatusBar) {
            statusBarItem.hide();
            return;
        }
        
        // Vérifier si on est dans un dépôt Git
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            statusBarItem.hide();
            return;
        }
        
        const api = gitExtension.getAPI(1);
        if (!api.repositories || api.repositories.length === 0) {
            statusBarItem.hide();
        } else {
            statusBarItem.show();
        }
    }
    
    // Vérification initiale de la visibilité
    updateStatusBarVisibility();
    
    // Mettre à jour la visibilité lorsque les dépôts changent
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (gitExtension) {
        const api = gitExtension.getAPI(1);
        api.onDidOpenRepository(() => updateStatusBarVisibility());
        api.onDidCloseRepository(() => updateStatusBarVisibility());
    }
    
    // Mettre à jour la visibilité lorsque la configuration change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('littleFox.showStatusBarItem')) {
                updateStatusBarVisibility();
            }
        })
    );
    
    // Configurer le hook pre-commit si enabled
    const disposablePreCommit = vscode.commands.registerCommand('little-fox.setupPreCommitHook', async () => {
        try {
            // Dans une version réelle, on installerait un hook Git pre-commit
            // Pour cet exemple, on simule juste la configuration
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Configuration du hook pre-commit...",
                cancellable: false
            }, async () => {
                // Simuler une opération asynchrone
                await new Promise(r => setTimeout(r, 1500));
                
                // Enregistrer l'action
                actionHistory.addAction('hookConfigured');
                
                vscode.window.showInformationMessage(configuration.getString('success'));
            });
        } catch (error) {
            console.error('Erreur lors de la configuration du hook pre-commit:', error);
            vscode.window.showErrorMessage(configuration.getString('error_general'));
        }
    });
    
    context.subscriptions.push(disposablePreCommit, statusBarItem);
}