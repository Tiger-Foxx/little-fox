import * as vscode from 'vscode';
import { GeminiApi } from './geminiApi'; // Assurez-vous que le chemin est correct
import { GroqApi } from './groqApi';     // Assurez-vous que le chemin est correct
import { Configuration } from '../utils/configuration'; // Assurez-vous que le chemin est correct
// Assurez-vous que le chemin est correct ou décommentez si ErrorHandler est dans un fichier séparé
// import { ErrorHandler } from '../utils/errorHandler';

// Interface décrivant un fournisseur d'IA générique
export interface AIProvider {
    /**
     * Génère une complétion de texte basée sur un prompt.
     * @param prompt Le texte d'invite pour l'IA.
     * @param options Options de complétion (maxTokens, temperature, etc.).
     * @returns Une promesse résolue avec le texte généré ou undefined en cas d'échec.
     */
    generateCompletion(prompt: string, options?: CompletionOptions): Promise<string | undefined>;

    /**
     * Retourne le nom du fournisseur d'IA (ex: "Gemini", "Groq").
     */
    getProviderName(): string;

    /**
     * Vérifie et retourne le statut actuel du fournisseur d'IA.
     */
    getProviderStatus(): Promise<ProviderStatus>;
}

// Options pour la génération de complétion
export interface CompletionOptions {
    maxTokens?: number;     // Nombre maximum de tokens à générer
    temperature?: number;   // Contrôle la créativité/aléatoire (0 = déterministe, >1 = plus créatif)
    timeoutMs?: number;     // Délai d'attente maximum pour la réponse de l'API en millisecondes
}

// Énumération des statuts possibles pour un fournisseur d'IA
export enum ProviderStatus {
    READY,          // Prêt à recevoir des requêtes
    UNAVAILABLE,    // Le service est indisponible (erreur serveur, maintenance)
    RATE_LIMITED,   // Trop de requêtes envoyées, limité temporairement
    UNAUTHORIZED,   // Clé API invalide ou manquante
    ERROR           // Erreur générique inconnue
}

// Gère la sélection et l'interaction avec les différents fournisseurs d'IA (Gemini, Groq)
export class ApiManager {
    private geminiApi: GeminiApi;
    private groqApi: GroqApi;
    private configuration: Configuration;
    private statusBarItem: vscode.StatusBarItem;
    private currentProvider: AIProvider | null = null; // Le fournisseur d'IA actuellement sélectionné

    constructor(configuration: Configuration) {
        this.configuration = configuration;

        // Initialisation des instances des fournisseurs d'IA
        this.geminiApi = new GeminiApi(configuration);
        this.groqApi = new GroqApi(configuration);

        // Création et configuration de l'élément dans la barre d'état de VS Code
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = this.configuration.getString('welcome'); // Tooltip initial
        this.statusBarItem.command = 'littleFox.showCommands'; // Optionnel: commande à exécuter au clic
        this.setCurrentProvider(); // Définit le fournisseur initial basé sur la config
        this.updateStatusBar();    // Met à jour le texte/icône de la barre d'état
        this.statusBarItem.show(); // Affiche l'élément

        // Écoute les changements dans la configuration de l'extension
        vscode.workspace.onDidChangeConfiguration(e => {
            // Si le choix du fournisseur d'API ou les clés ont changé...
            if (e.affectsConfiguration('littleFox.apiProvider') || e.affectsConfiguration('littleFox.geminiApiKey') || e.affectsConfiguration('littleFox.groqApiKey')) {
                console.log('Configuration changed, updating API provider and status bar.');
                this.setCurrentProvider(); // Met à jour le fournisseur actuel
                this.updateStatusBar();    // Met à jour l'affichage
            }
        });
    }

    /**
     * Sélectionne le fournisseur d'IA actuel en fonction de la configuration utilisateur.
     */
    private setCurrentProvider(): void {
        const providerName = this.configuration.getApiProvider(); // Récupère le nom ('gemini' ou 'groq') depuis la config
        console.log(`Setting current AI provider to: ${providerName}`);

        switch (providerName.toLowerCase()) {
            case 'gemini':
                this.currentProvider = this.geminiApi;
                break;
            case 'groq':
                this.currentProvider = this.groqApi;
                break;
            default:
                // Si la valeur configurée n'est pas reconnue, utilise Gemini par défaut
                console.warn(`Unknown API provider configured: '${providerName}'. Defaulting to Gemini.`);
                this.currentProvider = this.geminiApi;
        }
        // Met à jour la barre d'état après avoir changé de fournisseur (ou confirmé le défaut)
        this.updateStatusBar();
    }

    /**
     * Met à jour le texte, l'icône et le tooltip de la barre d'état
     * en fonction du statut du fournisseur d'IA actuel.
     */
    private async updateStatusBar(): Promise<void> {
        if (!this.currentProvider) {
            // Cas où aucun fournisseur n'est défini (ne devrait pas arriver après le constructeur)
            this.statusBarItem.text = `$(error) Little Fox: HS`;
            this.statusBarItem.tooltip = this.configuration.getString('error_general');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            return;
        }

        const providerName = this.currentProvider.getProviderName();
        let status: ProviderStatus;
        try {
             // Vérifie le statut actuel du fournisseur
            status = await this.currentProvider.getProviderStatus();
        } catch (error) {
            console.error(`Failed to get status for provider ${providerName}:`, error);
            status = ProviderStatus.ERROR; // Marque comme erreur si la vérification échoue
        }

        let icon: string;
        let text: string;
        let tooltipKey: string;
        let bgColor: vscode.ThemeColor | undefined = undefined; // Couleur de fond par défaut

        switch (status) {
            case ProviderStatus.READY:
                icon = '$(check)';
                text = `Little Fox: ${providerName} OK`;
                tooltipKey = 'welcome';
                break;
            case ProviderStatus.UNAVAILABLE:
                icon = '$(warning)';
                text = `Little Fox: ${providerName} Indispo.`;
                tooltipKey = 'error_api';
                bgColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case ProviderStatus.RATE_LIMITED:
                icon = '$(clock)';
                text = `Little Fox: ${providerName} Limité`;
                tooltipKey = 'error_api';
                bgColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case ProviderStatus.UNAUTHORIZED:
                icon = '$(key)';
                text = `Little Fox: ${providerName} Clé API?`;
                tooltipKey = 'settings_api_key'; // Clé liée à la config de la clé API
                 bgColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case ProviderStatus.ERROR:
            default:
                icon = '$(error)';
                text = `Little Fox: ${providerName} Erreur`;
                tooltipKey = 'error_general';
                bgColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }

        // Met à jour l'élément de la barre d'état
        this.statusBarItem.text = `${icon} ${text}`;
        this.statusBarItem.tooltip = `${providerName}: ${this.configuration.getString(tooltipKey)}`;
        this.statusBarItem.backgroundColor = bgColor;
    }

    /**
     * Génère une critique sarcastique et humoristique du code fourni.
     * @param code Le bloc de code à analyser.
     * @returns Une promesse résolue avec la critique générée ou un message de fallback.
     */
    async generateCodeRoast(code: string): Promise<string | undefined> {
        if (!this.currentProvider) {
            console.warn("generateCodeRoast called but no AI provider is available.");
            return this.getFallbackMessage('roast', code);
        }

        const status = await this.currentProvider.getProviderStatus();
        if (status !== ProviderStatus.READY) {
             console.warn(`generateCodeRoast called but provider ${this.currentProvider.getProviderName()} is not ready (Status: ${ProviderStatus[status]}).`);
             vscode.window.showWarningMessage(`Little Fox ne peut pas critiquer le code car ${this.currentProvider.getProviderName()} n'est pas prêt (${ProviderStatus[status]}). Vérifiez votre clé API ou réessayez plus tard.`);
             return this.getFallbackMessage('roast', code);
        }

        this.statusBarItem.text = `$(sync~spin) ${this.configuration.getString('roast_loading')}`;
        this.statusBarItem.tooltip = `Le renard prépare sa meilleure vanne sur votre code...`;

        // Prompt (inchangé par rapport à la v1, déjà orienté stand-up)
        const prompt = `
            Persona: Tu es "Foxy McSarcasm", un renard développeur senior blasé, expert en clean code mais avec un humour noir et pince-sans-rire. Tu animes un stand-up où tu te moques GENTIMENT du code des autres. Ton but n'est pas d'être méchant, mais de faire rire en pointant (parfois avec exagération) des défauts réels ou potentiels, des anti-patterns, ou juste des choix de style discutables.

            Tâche: Analyse le bloc de code suivant fourni par un développeur (probablement fatigué). Trouve UN SEUL point faible, drôle ou intéressant à commenter. Fais une remarque courte (1-2 phrases MAX), percutante et humoristique dans le style stand-up. Utilise le tutoiement. Fais comme si tu t'adressais directement au développeur dans la salle. Tu peux utiliser des analogies animales (renards, poules, etc.) ou des situations de dev courantes.

            Exemples de ton:
            - "Ah, les variables globales... C'est comme laisser la porte du poulailler ouverte et espérer que le renard ne viendra pas."
            - "Cette fonction fait 500 lignes ? Elle a son propre code postal ou bien ?"
            - "Try... catch... sans rien dans le catch ? C'est la politique de l'autruche version code, ça."
            - "Copier-coller de Stack Overflow sans comprendre ? J'appelle ça le 'syndrome du perroquet compilé'."

            Contraintes:
            - Réponse en FRANÇAIS uniquement.
            - 1 ou 2 phrases MAXIMUM.
            - Ton sarcastique, humoristique, façon stand-up, mais pointe si possible un VRAI défaut (même mineur).
            - Ne sois PAS juste méchant, le but est de faire sourire le dev.
            - Ne commence PAS par "Ah," ou "Oh," systématiquement. Varie tes intros.

            Code à analyser:
            \`\`\`
            ${code}
            \`\`\`

            Ta remarque sarcastique:`;

        try {
            const response = await this.currentProvider.generateCompletion(prompt, {
                maxTokens: 150,
                temperature: 0.85,
                timeoutMs: 15000
            });
            await this.updateStatusBar();
            return response?.trim() || this.getFallbackMessage('roast', code);

        } catch (error: any) {
            console.error('Error during Code Roast generation:', error);
            ErrorHandler.handleApiError(error, this.configuration);
            await this.updateStatusBar();
            return this.getFallbackMessage('roast', code);
        }
    }

     /**
     * Génère une histoire créative et métaphorique sur le code fourni.
     * @param code Le bloc de code à analyser.
     * @returns Une promesse résolue avec l'histoire générée ou un message de fallback.
     */
    async generateCodeStory(code: string): Promise<string | undefined> {
        if (!this.currentProvider) {
             console.warn("generateCodeStory called but no AI provider is available.");
            return this.getFallbackMessage('story', code);
        }

        const status = await this.currentProvider.getProviderStatus();
        if (status !== ProviderStatus.READY) {
             console.warn(`generateCodeStory called but provider ${this.currentProvider.getProviderName()} is not ready (Status: ${ProviderStatus[status]}).`);
             vscode.window.showWarningMessage(`Little Fox ne peut pas raconter d'histoire car ${this.currentProvider.getProviderName()} n'est pas prêt (${ProviderStatus[status]}).`);
             return this.getFallbackMessage('story', code);
        }

        this.statusBarItem.text = `$(sync~spin) ${this.configuration.getString('story_loading')}`;
        this.statusBarItem.tooltip = `Le renard cherche l'inspiration pour l'épopée de votre code...`;

        // Prompt (inchangé par rapport à la v1)
        const prompt = `
            Persona: Tu es "Maître Renard Conteur", un vieux renard sage et un peu poète, qui voit la beauté et la complexité même dans les lignes de code les plus obscures. Tu transformes le code en une petite fable ou une légende.

            Tâche: Regarde attentivement ce morceau de code. Raconte son histoire en quelques phrases (3-5 phrases environ). Imagine que ce code est une créature, un lieu ou un artefact dans une forêt enchantée. Décris sa nature, son rôle, ses défis, ses réussites. Utilise des métaphores liées à la forêt, aux animaux, aux saisons, à la ruse du renard. Le ton doit être imaginatif, légèrement philosophique, mais toujours ancré dans ce que le code *fait* réellement.

            Exemples de ton:
            - "Ce module est comme un vieux chêne au cœur de la forêt : il fournit l'ombre (les fonctions de base) dont dépendent les jeunes pousses (les autres modules)."
            - "Telle une rivière sinueuse, cette fonction navigue entre les conditions, cherchant le chemin le plus court vers l'océan du résultat attendu."
            - "Ce code gère les erreurs avec la prudence d'un renard évitant un piège, anticipant les dangers pour proteger le reste de l'application."

            Contraintes:
            - Réponse en FRANÇAIS uniquement.
            - Environ 3 à 5 phrases.
            - Ton poétique, métaphorique, basé sur la nature/les renards.
            - L'histoire doit refléter la fonction ou la structure du code fourni.
            - tu n'es pas un asistant inutile donc tu te dois d'etre bien explicatif et tres clair en fait , tu es certes un compteur mais tu sers srutout a comprendre donc ne pas pas trop dans les methaphores

            Code à transformer en histoire:
            \`\`\`
            ${code}
            \`\`\`

            L'histoire de ce code:`;

        try {
            const response = await this.currentProvider.generateCompletion(prompt, {
                maxTokens: 400,
                temperature: 0.75,
                timeoutMs: 20000
            });
            await this.updateStatusBar();
            return response?.trim() || this.getFallbackMessage('story', code);

        } catch (error: any) {
            console.error('Error during Code Story generation:', error);
            ErrorHandler.handleApiError(error, this.configuration);
            await this.updateStatusBar();
            return this.getFallbackMessage('story', code);
        }
    }

    /**
     * Génère un message de commit humoristique et honnête basé sur les changements de code.
     * @param changes Une description textuelle des changements (par exemple, sortie de `git diff`).
     * @returns Une promesse résolue avec le message de commit généré ou un message de fallback.
     */
    async generateCommitMessage(changes: string): Promise<string | undefined> {
        if (!this.currentProvider) {
             console.warn("generateCommitMessage called but no AI provider is available.");
            return this.getFallbackMessage('commit', changes);
        }

       const status = await this.currentProvider.getProviderStatus();
       if (status !== ProviderStatus.READY) {
             console.warn(`generateCommitMessage called but provider ${this.currentProvider.getProviderName()} is not ready (Status: ${ProviderStatus[status]}).`);
             vscode.window.showWarningMessage(`Little Fox ne peut pas générer de commit car ${this.currentProvider.getProviderName()} n'est pas prêt (${ProviderStatus[status]}).`);
             return this.getFallbackMessage('commit', changes);
       }

        this.statusBarItem.text = `$(sync~spin) ${this.configuration.getString('commit_loading')}`;
        this.statusBarItem.tooltip = `Le renard essaie de trouver une excuse euh... un message de commit pertinent...`;

        const maxDiffLength = 4000;
        let truncatedChanges = changes;
        if (changes.length > maxDiffLength) {
            truncatedChanges = changes.substring(0, maxDiffLength) + '\n... [Changes truncated] ...';
            console.log(`Commit changes truncated to ${maxDiffLength} characters.`);
        }

        // Prompt pour le "Commit Message Generator" - MODIFIÉ pour inclure l'aspect utile
        const prompt = `
            Persona: Tu es "Commit Fox", le renard stagiaire honnête jusqu'à l'os (et un peu maladroit). Tu dois écrire des messages de commit pour ton maître développeur. Tu ne comprends pas toujours tout, mais tu essaies d'être précis, parfois trop. Ton ton est un mélange d'auto-dépréciation, d'honnêteté brutale et d'une touche d'humour involontaire sur les galères du dev.

            Tâche: Analyse le "diff" (les changements de code) suivant. Génère UN message de commit COURT (max 70 caractères) qui respecte le format Conventional Commits (\`type: description\`). Le \`type\` doit être l'un des suivants : feat, fix, docs, style, refactor, perf, test, chore. La \`description\` doit résumer les changements de manière honnête et un peu drôle/auto-dépréciative.
            **Important**: Tout en étant drôle, essaie d'être **utile** si possible. Si tu peux facilement identifier un nom de fichier principal modifié, une fonction ajoutée/corrigée, ou l'objectif principal du changement à partir du diff, mentionne-le brièvement dans la description. Mais ne sacrifie pas la concision ou l'humour pour ça. Fais de ton mieux pour équilibrer les deux !

            Exemples de ton (potentiellement plus utiles):
            - fix: Correction du bug d'affichage dans UserProfile. Oups.
            - feat: Ajout du bouton de sauvegarde (enfin !).
            - refactor: Simplification de la fonction calculateTotal(). Croisons les doigts.
            - docs: Ajout d'une doc pour l'API /orders (que personne ne lira).
            - style: Formatage de utils.ts parce que ça piquait les yeux.
            - chore: Mise à jour de React vers v19. Prions ensemble.
            - test: Ajout de tests pour la fonction login(). C'est suspect que ça passe.

            Contraintes:
            - Réponse en FRANÇAIS uniquement.
            - Format STRICT: \`type: description\` (ex: \`fix: Tentative désespérée de corriger le bug #123 dans payment.js\`)
            - Maximum 150 caractères au total.
            - Ton honnête, auto-dépréciatif, humoristique ET utile si possible.
            - Choisis le \`type\` le plus approprié en fonction du diff.

            Changements (diff) à analyser:
            \`\`\`diff
            ${truncatedChanges}
            \`\`\`

            Ton message de commit (format 'type: description'):`;

        try {
            const response = await this.currentProvider.generateCompletion(prompt, {
                maxTokens: 60,
                temperature: 0.8,
                timeoutMs: 15000
            });
            await this.updateStatusBar();

            const commitRegex = /^(feat|fix|docs|style|refactor|perf|test|chore):\s.{5,60}$/;
            const finalResponse = response?.trim();

            if (finalResponse && commitRegex.test(finalResponse)) {
                return finalResponse;
            } else {
                 console.warn("Generated commit message did not match expected format. Using fallback.", finalResponse);
                 return this.getFallbackMessage('commit', changes); // Utilise fallback si format invalide
            }

        } catch (error: any) {
            console.error('Error during Commit Message generation:', error);
            ErrorHandler.handleApiError(error, this.configuration);
            await this.updateStatusBar();
            return this.getFallbackMessage('commit', changes);
        }
    }

    /**
     * Méthode centralisée pour obtenir un message de fallback.
     * Tente d'abord de trouver un message spécifique basé sur le contexte,
     * sinon retourne un message aléatoire de la configuration.
     * @param category La catégorie de fallback ('roast', 'story', 'commit').
     * @param context Le code ou les changements (diff).
     * @returns Une chaîne de caractères contenant le message de fallback.
     */
    private getFallbackMessage(category: 'roast' | 'story' | 'commit', context?: string): string {
        console.log(`Attempting to find specific fallback for category: ${category}`);

        // --- Logique de Fallback Spécifique (Réintroduite et Enrichie) ---
        if (context) {
            const lowerContext = context.toLowerCase();
            const contextLines = context.split('\n');
            const lineCount = contextLines.length;

            // --- Cas pour 'roast' ---
            if (category === 'roast') {
                // Basé sur les mots-clés et la structure
                if (lowerContext.includes('goto')) {
                    return "Un `goto` ? Sérieusement ? On est en quelle année, 1970 ?";
                }
                if (lowerContext.includes('var ')) {
                     return "Utiliser `var` en plein 21ème siècle ? T'es un historien du JavaScript ou quoi ?";
                }
                if (lowerContext.includes('!important')) {
                    return "Ah, le `!important` en CSS... Le cri de désespoir du développeur qui ne maîtrise plus rien.";
                }
                if (lowerContext.includes('eval(')) {
                    return "`eval()` ? T'aimes vivre dangereusement ou tu veux juste ouvrir une faille de sécurité béante ?";
                }
                if (lowerContext.includes('while(true)') || lowerContext.includes('for(;;)')) {
                    return "`while(true)` ? T'essaies de faire bouillir l'océan ou juste ton processeur ?";
                }
                if (lowerContext.includes('try') && !lowerContext.includes('catch')) {
                    return "Un `try` sans `catch` ? C'est comme sauter en parachute sans vérifier s'il y en a un.";
                }
                if (lowerContext.includes('catch (e) {}') || lowerContext.includes('catch (err) {}') || lowerContext.includes('catch(e){}')) {
                    return "Un `catch` vide ? Ignorer les erreurs, c'est la meilleure façon de se prendre un mur plus tard.";
                }
                 if (lowerContext.includes('// fixme') || lowerContext.includes('// hack')) {
                    return "Un commentaire 'FIXME' ou 'HACK' ? C'est la version code de 'Je reviendrai... peut-être'.";
                 }
                 if (lowerContext.match(/if\s*\(.*\)\s*\{\s*if\s*\(.*\)\s*\{/)) { 
                    return "Des `if` imbriqués comme des poupées russes... C'est mignon, mais ça devient vite illisible.";
                 }
                 if (lowerContext.match(/===?\s*(true|false|null|undefined)\b/)) {
                    return "Comparer explicitement à `true`, `false` ou `null` ? Le booléen se suffit à lui-même, tu sais.";
                 }
                 if (lowerContext.match(/function\s*\w*\s*\(\s*a,\s*b,\s*c,\s*d,\s*e.*\)/)) { // Fonction avec beaucoup d'arguments
                    return "Cette fonction a plus d'arguments qu'un débat politique. Pense aux objets de paramètres !";
                 }

                // Basé sur le comptage
                const todoCount = (lowerContext.match(/todo/g) || []).length;
                if (todoCount > 3) {
                    return `Plus de ${todoCount} 'TODO' ? C'est une feuille de route pour les bugs futurs ou quoi ?`;
                }
                const consoleLogCount = (lowerContext.match(/console\.log/g) || []).length;
                if (consoleLogCount > 5) {
                    return `${consoleLogCount} ` + "`console.log` ? C'est du débogage ou tu laisses juste des miettes de pain pour retrouver ton chemin ?";
                }
                const anyCount = (context.match(/\bany\b/g) || []).length; // Recherche 'any' en TypeScript
                if (anyCount > 4) {
                    return `Tellement de 'any' (${anyCount} !) que ton TypeScript ressemble à du JavaScript déguisé.`;
                }
                const magicNumberCount = (context.match(/\b(if|while|for)\s*\(.*[<=>]\s*\d+\.?\d*\s*[^;]\)/g) || []).length; // Détection simple de nombres magiques
                if (magicNumberCount > 2) {
                    return "Des nombres magiques qui sortent de nulle part ? Donne-leur des noms, bon sang !";
                }

                // Basé sur la longueur
                if (lineCount > 200) {
                     return `Ce fichier fait ${lineCount} lignes ! C'est un roman ou du code ? Pense à découper !`;
                }
                const longLineCount = contextLines.filter(line => line.length > 120).length;
                if (longLineCount > 5) {
                    return `Plus de ${longLineCount} lignes dépassent 120 caractères. Mon écran n'est pas extensible, tu sais !`;
                }

                // Ajoute ENCORE PLUS de conditions spécifiques pour 'roast' ici...
                // Exemples : détection de commentaires excessifs, noms de variables trop courts/longs,
                // complexité cyclomatique basique (beaucoup de if/else/switch), etc.
                 if ((lowerContext.match(/else if/g) || []).length > 4) {
                    return "Une chaîne de `else if` plus longue que ma queue... Un `switch` ou un objet de mapping, ça te dit quelque chose ?";
                 }
                 if (lowerContext.match(/<\s*br\s*\/?\s*>/g) && (lowerContext.match(/<\s*br\s*\/?\s*>/g) || []).length > 3) {
                    return "Abuser des `<br>` en HTML pour faire de l'espacement ? Le CSS existe, tu sais...";
                 }
                 if (lowerContext.includes('password') && !lowerContext.includes('hash') && !lowerContext.includes('encrypt')) {
                    return "Je vois le mot 'password' mais pas de 'hash' ou 'encrypt'... J'espère que c'est juste un exemple !";
                 }


            }
             // --- Cas pour 'story' ---
             else if (category === 'story') {
                 if (lowerContext.includes('async') && lowerContext.includes('await')) {
                     return "Ce code jongle avec le temps lui-même, attendant patiemment que les promesses du passé se réalisent avant de continuer son voyage...";
                 }
                 if (lowerContext.includes('class') && lowerContext.includes('extends')) {
                     return "Telle une lignée de nobles renards, cette classe hérite des ruses et des secrets de ses ancêtres pour accomplir sa destinée...";
                 }
                 if (lowerContext.includes('recursive') || context.match(/function\s+(\w+)\s*\(.*\)\s*\{.*\1\(.*\)/)) { // Détection simple de récursivité
                    return "Comme un renard qui se mord la queue, cette fonction s'appelle elle-même, plongeant dans les profondeurs de la logique...";
                 }
                 if (lowerContext.includes('eventlistener') || lowerContext.includes('addeventlistener')) {
                    return "Tel un guetteur aux aguets, ce code écoute attentivement les murmures de l'utilisateur, prêt à bondir à la moindre interaction...";
                 }
                 if (lowerContext.includes('switch') && (lowerContext.match(/case/g) || []).length > 4) {
                    return "Comme un carrefour dans la forêt, ce `switch` guide le flux du programme vers de multiples chemins possibles, selon les signes rencontrés...";
                 }
                 if (lowerContext.includes('map(') && lowerContext.includes('filter(') && lowerContext.includes('reduce(')) {
                    return "Ce code transforme les données comme un alchimiste : il filtre l'inutile, cartographie les trésors cachés et réduit le tout à sa plus pure essence.";
                 }
                 // Ajoute d'autres conditions spécifiques pour 'story' ici...
             }
            // --- Cas pour 'commit' (basé sur le diff) ---
            else if (category === 'commit') {
                // Basé sur les mots-clés du diff
                if (lowerContext.includes('delete') && (lowerContext.match(/\bdelete\b/g) || []).length > 3 && lineCount < 50) { // Beaucoup de suppressions dans un petit diff
                    return "chore: Suppression massive de code. Moins il y en a, moins ça bugue, non ?";
                }
                if (lowerContext.includes('rename') || lowerContext.includes('mv ') || lowerContext.includes('renamed:')) {
                    return "refactor: Renommage de fichiers/variables. J'espère ne rien avoir cassé...";
                }
                if (lowerContext.includes('merge branch') || lowerContext.includes('conflict')) {
                    return "merge: Fusion douloureuse terminée. J'ai besoin d'un café fort.";
                }
                if (lowerContext.includes('add') && lowerContext.includes('test')) {
                    return "test: Ajout de tests. Ils passent. C'est louche.";
                }
                if (lowerContext.includes('update') && (lowerContext.includes('package.json') || lowerContext.includes('dependencies'))) {
                    return "chore: Mise à jour des dépendances. Que les dieux du versionning soient avec nous.";
                }
                if (lowerContext.includes('fix') && lowerContext.includes('typo')) {
                    return "fix: Correction d'une faute de frappe embarrassante.";
                }
                if (lowerContext.includes('console.log') && lowerContext.startsWith('+')) { // Ajout de console.log
                    return "chore: Ajout de console.log pour déboguer (je les enlèverai plus tard, promis...)";
                }
                 if (lowerContext.includes('console.log') && lowerContext.startsWith('-')) { // Suppression de console.log
                    return "chore: Suppression des console.log oubliés. Nettoyage de printemps !";
                 }
                 if (lowerContext.includes('readme.md')) {
                    return "docs: Mise à jour du README (parce qu'il le fallait bien).";
                 }
                 if (lowerContext.includes('eslint') || lowerContext.includes('prettier') || lowerContext.includes('lint')) {
                    return "style: Correction des erreurs de linting. Sale robot.";
                 }

                // Basé sur la taille du diff
                if (lineCount > 300) {
                    return "refactor: Grosse refonte. J'ai touché à beaucoup de choses. Bonne chance pour la review.";
                }
                if (lineCount < 5 && lowerContext.includes('fix')) {
                    return "fix: Petite correction rapide. Probablement un truc idiot.";
                }

                // Ajoute d'autres conditions spécifiques pour 'commit' ici...
            }
        }


        // --- Fallback Aléatoire (si aucun cas spécifique n'a correspondu) ---
        console.log(`No specific fallback matched. Using random fallback for category: ${category}`);
        return this.configuration.getRandomFallbackMessage(category);
    }


    // Ajouter cette méthode à la classe ApiManager

/**
 * Teste la connexion avec le fournisseur d'API spécifié
 * @param providerName Le nom du fournisseur à tester ('gemini' ou 'groq')
 * @returns Promesse qui résout à true si la connexion est réussie, false sinon
 */
async testConnection(providerName: string): Promise<boolean> {
    try {
        // Selon le fournisseur demandé, utiliser l'instance appropriée
        let provider: AIProvider;
        
        if (providerName === 'gemini') {
            provider = this.geminiApi;
        } else if (providerName === 'groq') {
            provider = this.groqApi;
        } else {
            return false; // Fournisseur inconnu
        }
        
        // Mettre à jour la barre d'état
        this.statusBarItem.text = `$(sync~spin) Test de connexion à ${provider.getProviderName()}...`;
        
        // Vérifier le statut du fournisseur
        const status = await provider.getProviderStatus();
        
        // Restaurer la barre d'état
        this.updateStatusBar();
        
        // La connexion est réussie si le statut est READY
        return status === ProviderStatus.READY;
    } catch (error) {
        console.error(`Erreur lors du test de connexion à ${providerName}:`, error);
        this.updateStatusBar();
        return false;
    }
}
}

// Classe simple pour la gestion centralisée des erreurs (peut être étendue)
// Assurez-vous que cette classe est définie ici ou importée correctement
class ErrorHandler {
    static handleApiError(error: any, config: Configuration) {
        // Log l'erreur détaillée pour le débogage
        console.error("API Error:", error);

        let userMessage: string;

        // Tente de déterminer la cause de l'erreur pour un message plus utile
        // Note: Les messages d'erreur exacts peuvent varier selon l'API (Gemini, Groq)
        const errorMessage = error.message?.toLowerCase() || '';
        const errorStatus = error.status || error.code; // Certaines erreurs ont un status/code

        if (errorMessage.includes('api key not valid') || errorMessage.includes('invalid api key') || errorStatus === 401 || errorStatus === 403) {
             userMessage = config.getString('error_api') + " Cause probable : Clé API invalide ou manquante.";
             // Suggérer d'ouvrir les paramètres
             vscode.window.showErrorMessage(`Little Fox: ${userMessage}`, "Ouvrir Paramètres")
                .then(selection => {
                    if (selection === "Ouvrir Paramètres") {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'littleFox.'); // Ouvre les paramètres filtrés pour l'extension
                    }
                });
             return; // Évite d'afficher deux fois le message si on a un bouton
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota exceeded') || errorStatus === 429) {
            userMessage = config.getString('error_api') + " Vous avez atteint la limite de requêtes. Réessayez plus tard.";
        } else if (errorMessage.includes('fetch failed') || errorMessage.includes('network error') || errorMessage.includes('connection refused')) {
             userMessage = config.getString('error_api') + " Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.";
        } else if (errorStatus === 500 || errorStatus === 503) {
             userMessage = config.getString('error_api') + ` Le serveur de ${config.getApiProvider()} semble rencontrer des problèmes (${errorStatus}). Réessayez plus tard.`;
        }
         else {
             // Erreur plus générique
             userMessage = config.getString('error_general') + ` Détail: ${error.message || 'Erreur inconnue'}`;
        }

        // Affiche une notification d'erreur standard à l'utilisateur
        vscode.window.showErrorMessage(`Little Fox: ${userMessage}`);
    }
}
