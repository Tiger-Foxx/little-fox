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
    // --- NOUVEAU : Ajout du CodeLens Provider pour le Roast ---
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        { scheme: 'file' }, // S'applique à tous les fichiers de l'éditeur
        {
            provideCodeLenses(document, token) {
                const codeLenses: vscode.CodeLens[] = []; // Explicitement type CodeLens[]
                const text = document.getText();

                // Regex étendue pour trouver fonctions, classes, boucles et conditions.
                // Groupe 1&2: Déclarations (function/class + nom)
                // Groupe 3: Structures de contrôle (if, for, while, etc.)
                // NOTE : Approximation multi-langages. Peut avoir des faux positifs/négatifs.
                const blockRegex = /\b(function|class|def|fun|func|fn|method)\s+(\w+)|\b(if|elif|else\s+if|else|for|while|switch|do)\b/g;
                let match;

                while ((match = blockRegex.exec(text)) && !token.isCancellationRequested) {
                    const matchIndex = match.index;
                    const matchText = match[0]; // Texte complet du match (ex: "function myFunc", "if")

                    const position = document.positionAt(matchIndex);
                    // Range couvrant le mot-clé ou la déclaration trouvée
                    const range = new vscode.Range(
                        position,
                        new vscode.Position(position.line, position.character + matchText.length)
                    );

                    // Déterminer le type de bloc et le nom (si applicable)
                    const functionName = match[2]; // Nom (si groupe 1/2) ou undefined (si groupe 3)
                    let blockType = 'unknown';
                    if (match[1]) { // Déclaration (function, class...)
                        blockType = match[1];
                    } else if (match[3]) { // Contrôle (if, for...)
                         // Gérer "else if" spécifiquement
                        blockType = match[3].startsWith('else') && match[3].includes('if') ? 'else if' : match[3];
                    }

                    // Création du CodeLens
                    const codeLens = new vscode.CodeLens(range, {
                        // Utilise la config pour le titre, avec un fallback et emoji
                        title: `🔥 ${configuration.getString('roast_title') || 'Roast this code'}`,
                        command: "little-fox.codeRoast", // La commande à exécuter
                        arguments: [{ // Arguments pour la commande (potentiellement utilisables plus tard)
                            documentUri: document.uri, // Passer l'URI est souvent plus fiable
                            range: { // Sérialiser le range car l'objet VS Code n'est pas toujours transmis tel quel
                                start: { line: range.start.line, character: range.start.character },
                                end: { line: range.end.line, character: range.end.character }
                            },
                            blockType: blockType,
                            blockName: functionName || null
                            // NOTE: Le handler de la commande 'little-fox.codeRoast'
                            // n'utilise peut-être pas encore ces arguments.
                        }]
                    });

                    codeLenses.push(codeLens);
                }

                return codeLenses;
            }
        }
    );
    // Enregistrer le nouveau CodeLensProvider
    context.subscriptions.push(codeLensProvider);
    // --- FIN NOUVEAU ---


    // --- CODE EXISTANT (INCHANGÉ) ---

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
                    // Utilisation de l'emoji feu et fallback pour titre/loading
                    return new vscode.Hover(`🔥 **${configuration.getString('roast_title') || 'Code Roast'}**: ${roastMessage}\n\n_${configuration.getString('roast_loading') || 'Thinking...'} _`);
                }

                return null;
            }
        }
    );
    // Enregistrer le HoverProvider existant
    context.subscriptions.push(hoverProvider);

    // Enregistrer les événements pour la fonctionnalité auto-roast si configurée
    const disposableDidSave = vscode.workspace.onDidSaveTextDocument((document) => {
        const config = vscode.workspace.getConfiguration('littleFox');
        const autoRoastOnSave = config.get<boolean>('autoRoastOnSave', false);

        if (autoRoastOnSave) {
            // Traiter uniquement les fichiers de code courants
            const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php'];

            if (supportedLanguages.includes(document.languageId)) {
                // Exécute la commande globale, sans utiliser les arguments du CodeLens ici
                vscode.commands.executeCommand('little-fox.codeRoast');
                // Enregistrer l'événement dans l'historique des actions
                actionHistory.addAction('autoRoast', document.fileName);
            }
        }
    });
    // Enregistrer le listener de sauvegarde existant
    context.subscriptions.push(disposableDidSave);
}