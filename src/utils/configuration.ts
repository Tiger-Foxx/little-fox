import * as vscode from 'vscode';
// Note: fs and path are not used in this version as language files are hardcoded
// import * as fs from 'fs';
// import * as path from 'path';

// Interface defining the structure for language settings
export interface LanguageSettings {
    code: string; // Language code (e.g., 'fr', 'en')
    name: string; // Language name (e.g., 'Français', 'English')
    localizedStrings: Record<string, string>; // Dictionary of localized strings
}

// Class to manage extension configuration, including language settings and API keys
export class Configuration {
    private context: vscode.ExtensionContext;
    private languages: Map<string, LanguageSettings> = new Map();
    private currentLanguage: string = 'fr'; // Default language: French

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeLanguages(); // Load language data
        this.loadUserLanguagePreference(); // Set language based on user settings
    }

    // Initializes the supported languages by loading their settings
    private initializeLanguages(): void {
        try {
            // In a real scenario, you might load these from JSON files
            // For now, we load hardcoded language settings

            // Load French
            this.languages.set('fr', this.loadLanguageSettings('fr'));

            // Load English
            this.languages.set('en', this.loadLanguageSettings('en'));

            // Load Spanish
            this.languages.set('es', this.loadLanguageSettings('es'));

            // Load German
            this.languages.set('de', this.loadLanguageSettings('de'));

            console.log('Languages loaded successfully.');

        } catch (error) {
            console.error('Error loading languages:', error);

            // Fallback to hardcoded French if loading fails
            this.languages.set('fr', {
                code: 'fr',
                name: 'Français (Fallback)',
                localizedStrings: {
                    'welcome': 'Bienvenue dans Little Fox! 🦊 (Mode Fallback)',
                    'error_api': 'Erreur API. Le renard est probablement en train de faire une sieste.',
                    'error_general': 'Oups, quelque chose a mal tourné. Même le renard ne sait pas quoi.',
                    'success': 'Opération réussie ! Le renard approuve... pour l\'instant.',
                    'roast_fallback_1': 'Ce code a l\'air d\'avoir été écrit pendant une pause café... très courte.',
                    'story_fallback_1': 'Il était une fois un code... et personne ne sait comment il fonctionne.',
                    'commit_fallback_1': 'fix: Correction de bug (j\'espère)',
                }
            });
            this.currentLanguage = 'fr'; // Ensure fallback language is set
        }
    }

    // Loads (simulated) language settings for a given language code
    // In a real app, this would read from a JSON file (e.g., resources/languages/fr.json)
    private loadLanguageSettings(langCode: string): LanguageSettings {
        switch (langCode) {
            case 'fr':
                return {
                    code: 'fr',
                    name: 'Français',
                    localizedStrings: {
                        // --- General ---
                        'welcome': 'Bienvenue dans Little Fox! Votre assistant sarcastique personnel. 🦊',
                        'loading': 'Analyse en cours... J\'essaie de comprendre ce que vous avez fait.',
                        'error_general': 'Erreur générale. Franchement, je ne suis même pas surpris.',
                        'error_api': 'L\'API fait la tête. Peut-être qu\'elle n\'aime pas votre code non plus ?',
                        'success': 'Incroyable ! Ça a marché ! Vous êtes sûr que c\'est vous qui avez codé ça ?',

                        // --- Code Roast ---
                        'roast_title': 'Analyse (Sans Pitié) de Votre Oeuvre',
                        'roast_loading': 'Affûtage de mes griffes verbales pour critiquer votre code...',
                        'roast_error': 'Impossible de critiquer ce code. Soit il est parfait (improbable), soit il est illisible.',
                        'roast_fallback_1': 'Des boucles imbriquées ? Votre CPU vient de demander sa retraite anticipée.',
                        'roast_fallback_2': 'Ce code est plus complexe que mes plans pour dominer le monde (des poulaillers).',
                        'roast_fallback_3': 'Variables non utilisées... C\'est du gaspillage de mémoire. Vous chauffez la planète là.',
                        'roast_fallback_4': 'Ah, le copier-coller de Stack Overflow ! On reconnaît la patte... ou plutôt l\'absence de patte.',
                        'roast_fallback_5': 'Tant d\'indentation que votre code ressemble à un escalier vers nulle part.',
                        'roast_fallback_6': 'Je suis sûr que ce code marchait parfaitement... dans vos rêves les plus fous.',
                        'roast_fallback_7': 'Si je montre ça à mes congénères, ils vont croire que les humains codent avec leurs pieds.',
                        'roast_fallback_8': 'Commentaires : // TODO: Comprendre ce que fait ce code. Au moins, vous êtes honnête.',
                        'roast_fallback_9': 'Les noms de variables : `a`, `b`, `temp`... Vous êtes payé à la lettre ou quoi ?',
                        'roast_fallback_10': 'Ce bloc `if/else` est plus long que l\'hiver nucléaire. Pensez aux fonctions !',
                        'roast_fallback_11': 'Utiliser `var` en 2025 ? Vous êtes un rebelle ou juste nostalgique de l\'âge de pierre du JS ?',
                        'roast_fallback_12': 'Cette fonction fait 300 lignes. Elle a sa propre table des matières ?',
                        'roast_fallback_13': 'Gestion d\'erreurs ? C\'est pour les faibles, apparemment.',
                        'roast_fallback_14': 'J\'ai vu des spaghettis mieux organisés que ce code.',
                        'roast_fallback_15': 'Vous appelez ça une "optimisation" ? Mon grand-père court plus vite.',
                        'roast_fallback_16': 'C\'est pas du code, c\'est une scène de crime informatique.',
                        'roast_fallback_17': 'Tellement de `any` en TypeScript... Pourquoi utiliser TypeScript alors ? Pour la déco ?',
                        'roast_fallback_18': 'Ce code viole tellement de principes SOLID qu\'il est pratiquement liquide.',
                        'roast_fallback_19': 'La complexité cyclomatique de cette fonction vient de faire exploser mon analyseur.',
                        'roast_fallback_20': 'Vous avez testé ce code ? Ou vous préférez vivre dangereusement ?',
                        'roast_fallback_21': 'Ce code est tellement DRY qu\'il craque sous les doigts. Ah non, attendez... c\'est l\'inverse.',
                        'roast_fallback_22': 'Les commentaires expliquent *ce que* fait le code. On se demande *pourquoi* il le fait comme ça.',
                        'roast_fallback_23': 'J\'ai l\'impression que ce code a été généré par un chat qui marche sur un clavier.',
                        'roast_fallback_24': 'Vous devriez versionner ce code sous "expérience scientifique ratée".',
                        'roast_fallback_25': 'Ce n\'est pas un bug, c\'est une "fonctionnalité non documentée et très surprenante".',

                        // --- Storyteller ---
                        'story_title': 'comprendre l\'histoire de ce bloc',
                        'story_loading': 'Consultation des anciennes chroniques pour raconter l\'histoire de ce... truc.',
                        'story_error': 'L\'histoire de ce code est trop sombre pour être racontée. Ou juste trop ennuyeuse.',
                        'story_fallback_1': 'Il était une fois, un développeur plein d\'espoir, qui écrivit ce code. La suite est moins joyeuse.',
                        'story_fallback_2': 'Ce code ressemble à un héros de tragédie grecque : il essaie de bien faire, mais tout est contre lui.',
                        'story_fallback_3': 'On raconte que ce code fut écrit lors d\'une nuit sans lune, alimenté par du café froid et du désespoir.',
                        'story_fallback_4': 'Telle une relique oubliée, ce code porte les cicatrices de nombreuses batailles (contre le linter, probablement).',
                        'story_fallback_5': 'Ce code est l\'équivalent numérique du monstre de Frankenstein : assemblé à partir de morceaux divers, avec des résultats... mitigés.',
                        'story_fallback_6': 'L\'auteur de ce code avait clairement une vision. Dommage qu\'elle soit si floue.',
                        'story_fallback_7': 'Ce code murmure des secrets anciens... principalement sur les mauvaises habitudes de programmation.',
                        'story_fallback_8': 'Il navigue dans la logique comme un navire sans gouvernail dans une tempête de complexité.',
                        'story_fallback_9': 'Chaque ligne de ce code est un pas de plus dans un labyrinthe dont personne ne connaît la sortie.',
                        'story_fallback_10': 'C\'est l\'histoire d\'une fonction qui voulait juste faire une chose simple, mais qui s\'est perdue en chemin.',
                        'story_fallback_11': 'Ce code est comme un vieux château : impressionnant de loin, mais plein de courants d\'air et de fantômes (de bugs).',
                        'story_fallback_12': 'La documentation de ce code est une légende urbaine : tout le monde en parle, personne ne l\'a vue.',
                        'story_fallback_13': 'Il a bravé les `merge conflicts`, survécu aux `refactorings` hasardeux... un vrai survivant.',
                        'story_fallback_14': 'Ce code est un témoignage de la persévérance humaine face à une complexité auto-infligée.',
                        'story_fallback_15': 'On dit que toucher à ce code réveille d\'anciens démons (bugs critiques en production).',

                        // --- Commit ---
                        'commit_title': 'Message de Commit (Brutalement) Honnête',
                        'commit_loading': 'Analyse de vos changements... Préparez-vous.',
                        'commit_error': 'Impossible de générer un message. Vos changements défient toute logique.',
                        'commit_fallback_1': 'fix: Correction de bug (probablement introduit par moi hier soir).',
                        'commit_fallback_2': 'feat: Ajout d\'une fonctionnalité. Que la chance soit avec nous.',
                        'commit_fallback_3': 'refactor: J\'ai tout réécrit. C\'était ça ou la défenestration.',
                        'commit_fallback_4': 'style: Alignement des commentaires. Oui, j\'avais du temps à perdre.',
                        'commit_fallback_5': 'docs: Ajout de documentation que personne ne lira.',
                        'commit_fallback_6': 'test: Ajout de tests. Ils passent. C\'est déjà ça.',
                        'commit_fallback_7': 'chore: Mise à jour des dépendances. Croisons les doigts.',
                        'commit_fallback_8': 'fix: Correction urgente avant la démo. Ne respirez plus.',
                        'commit_fallback_9': 'perf: Optimisation. Ou peut-être pas. Difficile à dire.',
                        'commit_fallback_10': 'merge: Fusion de branche. J\'ai besoin de vacances.',
                        'commit_fallback_11': 'fix: Encore un bug. Ma vie est un éternel débogage.',
                        'commit_fallback_12': 'refactor: Simplification (enfin, j\'espère).',
                        'commit_fallback_13': 'feat: Nouvelle fonctionnalité (probablement buggée).',
                        'commit_fallback_14': 'style: Formatage automatique. La machine a gagné.',
                        'commit_fallback_15': 'revert: Annulation du commit précédent. Oubliez tout.',
                        'commit_fallback_16': 'fix: Correction du bug introduit par la correction précédente.',
                        'commit_fallback_17': 'chore: Nettoyage de code. J\'ai fait semblant d\'être productif.',
                        'commit_fallback_18': 'test: Ajout d\'un test qui échoue. C\'est un début.',
                        'commit_fallback_19': 'docs: Mise à jour de la doc (avec des mensonges).',
                        'commit_fallback_20': 'feat: Ajout expérimental. Ne pas utiliser en production (sauf si vous êtes courageux).',

                        // --- Settings ---
                        'settings_title': 'Paramètres de Little Fox (si vous osez)',
                        'settings_language': 'Langue (pour que je me moque de vous différemment)',
                        'settings_api_provider': 'Fournisseur d\'API (celui qui va juger votre code)',
                        'settings_api_key': 'Clé API (ne la montrez à personne, surtout pas à moi)',
                        'settings_save': 'Sauvegarder (si vous êtes sûr)',
                        'settings_reset': 'Réinitialiser (pour tout casser ?)',
                        'settings_saved': 'Paramètres sauvegardés. J\'espère que vous savez ce que vous faites.'
                    }
                };
            case 'en':
                return {
                    code: 'en',
                    name: 'English',
                    localizedStrings: {
                        // --- General ---
                        'welcome': 'Welcome to Little Fox! Your personal sarcastic assistant. 🦊',
                        'loading': 'Analyzing... Trying to figure out what you\'ve done.',
                        'error_general': 'General error. Frankly, I\'m not even surprised.',
                        'error_api': 'The API is sulking. Maybe it doesn\'t like your code either?',
                        'success': 'Incredible! It worked! Are you sure you wrote this?',

                        // --- Code Roast ---
                        'roast_title': 'Merciless Analysis of Your Masterpiece',
                        'roast_loading': 'Sharpening my verbal claws to critique your code...',
                        'roast_error': 'Cannot critique this code. Either it\'s perfect (unlikely) or unreadable.',
                        'roast_fallback_1': 'Nested loops? Your CPU just applied for early retirement.',
                        'roast_fallback_2': 'This code is more complex than my plans for world (henhouse) domination.',
                        'roast_fallback_3': 'Unused variables... That\'s memory waste. You\'re heating the planet.',
                        'roast_fallback_4': 'Ah, the classic Stack Overflow copy-paste! I recognize the handiwork... or lack thereof.',
                        'roast_fallback_5': 'So much indentation, your code looks like stairs to nowhere.',
                        'roast_fallback_6': 'I\'m sure this code worked perfectly... in your wildest dreams.',
                        'roast_fallback_7': 'If I show this to my peers, they\'ll think humans code with their feet.',
                        'roast_fallback_8': 'Comments: // TODO: Understand what this code does. At least you\'re honest.',
                        'roast_fallback_9': 'Variable names: `a`, `b`, `temp`... Are you paid by the letter?',
                        'roast_fallback_10': 'This `if/else` block is longer than a nuclear winter. Ever heard of functions?',
                        'roast_fallback_11': 'Using `var` in 2025? Are you a rebel or just nostalgic for the JS stone age?',
                        'roast_fallback_12': 'This function is 300 lines long. Does it have its own table of contents?',
                        'roast_fallback_13': 'Error handling? That\'s for the weak, apparently.',
                        'roast_fallback_14': 'I\'ve seen better organized spaghetti than this code.',
                        'roast_fallback_15': 'You call this an "optimization"? My grandpa runs faster.',
                        'roast_fallback_16': 'This isn\'t code, it\'s a digital crime scene.',
                        'roast_fallback_17': 'So many `any` types in TypeScript... Why use TypeScript then? For decoration?',
                        'roast_fallback_18': 'This code violates so many SOLID principles, it\'s practically liquid.',
                        'roast_fallback_19': 'The cyclomatic complexity of this function just blew up my analyzer.',
                        'roast_fallback_20': 'Did you test this code? Or do you prefer to live dangerously?',
                        'roast_fallback_21': 'This code is so DRY it crumbles. Oh wait... it\'s the opposite.',
                        'roast_fallback_22': 'The comments explain *what* the code does. One wonders *why* it does it like that.',
                        'roast_fallback_23': 'Looks like this code was generated by a cat walking on a keyboard.',
                        'roast_fallback_24': 'You should version this code under "failed science experiment".',
                        'roast_fallback_25': 'It\'s not a bug, it\'s an "undocumented and very surprising feature".',

                        // --- Storyteller ---
                        'story_title': 'The Legend (or Tragedy) of Your Code',
                        'story_loading': 'Consulting ancient chronicles to tell the tale of this... thing.',
                        'story_error': 'The story of this code is too dark to be told. Or just too boring.',
                        'story_fallback_1': 'Once upon a time, a hopeful developer wrote this code. The rest is less cheerful.',
                        'story_fallback_2': 'This code resembles a Greek tragedy hero: it tries to do good, but everything is against it.',
                        'story_fallback_3': 'Legend has it this code was written on a moonless night, fueled by cold coffee and despair.',
                        'story_fallback_4': 'Like a forgotten relic, this code bears the scars of many battles (against the linter, probably).',
                        'story_fallback_5': 'This code is the digital equivalent of Frankenstein\'s monster: assembled from various parts, with... mixed results.',
                        'story_fallback_6': 'The author of this code clearly had a vision. Too bad it\'s so blurry.',
                        'story_fallback_7': 'This code whispers ancient secrets... mainly about bad programming habits.',
                        'story_fallback_8': 'It navigates logic like a rudderless ship in a storm of complexity.',
                        'story_fallback_9': 'Each line of this code is another step into a labyrinth no one knows the exit to.',
                        'story_fallback_10': 'This is the story of a function that just wanted to do one simple thing but got lost along the way.',
                        'story_fallback_11': 'This code is like an old castle: impressive from afar, but full of drafts and ghosts (of bugs).',
                        'story_fallback_12': 'The documentation for this code is an urban legend: everyone talks about it, nobody has seen it.',
                        'story_fallback_13': 'It braved `merge conflicts`, survived hazardous `refactorings`... a true survivor.',
                        'story_fallback_14': 'This code is a testament to human perseverance in the face of self-inflicted complexity.',
                        'story_fallback_15': 'They say touching this code awakens ancient demons (critical production bugs).',

                        // --- Commit ---
                        'commit_title': '(Brutally) Honest Commit Message',
                        'commit_loading': 'Analyzing your changes... Brace yourself.',
                        'commit_error': 'Cannot generate message. Your changes defy all logic.',
                        'commit_fallback_1': 'fix: Bug fix (probably introduced by me last night).',
                        'commit_fallback_2': 'feat: Added a feature. May the odds be ever in our favor.',
                        'commit_fallback_3': 'refactor: Rewrote everything. It was either this or throwing the computer out the window.',
                        'commit_fallback_4': 'style: Aligned comments. Yes, I had time to waste.',
                        'commit_fallback_5': 'docs: Added documentation that nobody will read.',
                        'commit_fallback_6': 'test: Added tests. They pass. That\'s something.',
                        'commit_fallback_7': 'chore: Updated dependencies. Fingers crossed.',
                        'commit_fallback_8': 'fix: Hotfix before the demo. Stop breathing.',
                        'commit_fallback_9': 'perf: Optimization. Or maybe not. Hard to tell.',
                        'commit_fallback_10': 'merge: Branch merged. I need a vacation.',
                        'commit_fallback_11': 'fix: Another bug. My life is eternal debugging.',
                        'commit_fallback_12': 'refactor: Simplification (I hope).',
                        'commit_fallback_13': 'feat: New feature (probably buggy).',
                        'commit_fallback_14': 'style: Auto-formatting. The machine won.',
                        'commit_fallback_15': 'revert: Reverted previous commit. Forget everything.',
                        'commit_fallback_16': 'fix: Fixed the bug introduced by the previous fix.',
                        'commit_fallback_17': 'chore: Code cleanup. Pretended to be productive.',
                        'commit_fallback_18': 'test: Added a failing test. It\'s a start.',
                        'commit_fallback_19': 'docs: Updated docs (with lies).',
                        'commit_fallback_20': 'feat: Experimental addition. Do not use in production (unless you\'re brave).',

                        // --- Settings ---
                        'settings_title': 'Little Fox Settings (If You Dare)',
                        'settings_language': 'Language (so I can mock you differently)',
                        'settings_api_provider': 'API Provider (the one that will judge your code)',
                        'settings_api_key': 'API Key (don\'t show it to anyone, especially me)',
                        'settings_save': 'Save (if you\'re sure)',
                        'settings_reset': 'Reset (to break everything?)',
                        'settings_saved': 'Settings saved. I hope you know what you\'re doing.'
                    }
                };
            case 'es':
                return {
                    code: 'es',
                    name: 'Español',
                    localizedStrings: {
                        // --- General ---
                        'welcome': '¡Bienvenido a Little Fox! Tu asistente sarcástico personal. 🦊',
                        'loading': 'Analizando... Intentando comprender qué has hecho.',
                        'error_general': 'Error general. Francamente, ni siquiera me sorprende.',
                        'error_api': 'La API está de morros. ¿Quizás tampoco le gusta tu código?',
                        'success': '¡Increíble! ¡Funcionó! ¿Seguro que lo has programado tú?',

                        // --- Code Roast ---
                        'roast_title': 'Análisis (Sin Piedad) de Tu Obra Maestra',
                        'roast_loading': 'Afilando mis garras verbales para criticar tu código...',
                        'roast_error': 'Imposible criticar este código. O es perfecto (improbable) o es ilegible.',
                        'roast_fallback_1': '¿Bucles anidados? Tu CPU acaba de pedir la jubilación anticipada.',
                        'roast_fallback_2': 'Este código es más complejo que mis planes para dominar el mundo (de los gallineros).',
                        'roast_fallback_3': 'Variables sin usar... Es un desperdicio de memoria. Estás calentando el planeta.',
                        'roast_fallback_4': '¡Ah, el clásico copiar y pegar de Stack Overflow! Se reconoce la mano... o la falta de ella.',
                        'roast_fallback_5': 'Tanta indentación que tu código parece una escalera a ninguna parte.',
                        'roast_fallback_6': 'Estoy seguro de que este código funcionaba perfectamente... en tus sueños más locos.',
                        'roast_fallback_7': 'Si le enseño esto a mis congéneres, pensarán que los humanos programan con los pies.',
                        'roast_fallback_8': 'Comentarios: // TODO: Entender qué hace este código. Al menos eres honesto.',
                        'roast_fallback_9': 'Nombres de variables: `a`, `b`, `temp`... ¿Te pagan por letra o qué?',
                        'roast_fallback_10': 'Este bloque `if/else` es más largo que el invierno nuclear. ¡Piensa en funciones!',
                        'roast_fallback_11': '¿Usando `var` en 2025? ¿Eres un rebelde o solo un nostálgico de la edad de piedra de JS?',
                        'roast_fallback_12': 'Esta función tiene 300 líneas. ¿Tiene su propio índice?',
                        'roast_fallback_13': '¿Manejo de errores? Eso es para los débiles, aparentemente.',
                        'roast_fallback_14': 'He visto espaguetis mejor organizados que este código.',
                        'roast_fallback_15': '¿Llamas a esto "optimización"? Mi abuelo corre más rápido.',
                        'roast_fallback_16': 'Esto no es código, es la escena de un crimen informático.',
                        'roast_fallback_17': 'Tantos `any` en TypeScript... ¿Para qué usar TypeScript entonces? ¿De adorno?',
                        'roast_fallback_18': 'Este código viola tantos principios SOLID que es prácticamente líquido.',
                        'roast_fallback_19': 'La complejidad ciclomática de esta función acaba de hacer explotar mi analizador.',
                        'roast_fallback_20': '¿Has probado este código? ¿O prefieres vivir peligrosamente?',
                        'roast_fallback_21': 'Este código es tan DRY que se deshace. Ah no, espera... es lo contrario.',
                        'roast_fallback_22': 'Los comentarios explican *qué* hace el código. Uno se pregunta *por qué* lo hace así.',
                        'roast_fallback_23': 'Parece que este código fue generado por un gato caminando sobre un teclado.',
                        'roast_fallback_24': 'Deberías versionar este código como "experimento científico fallido".',
                        'roast_fallback_25': 'No es un bug, es una "funcionalidad no documentada y muy sorprendente".',

                        // --- Storyteller ---
                        'story_title': 'La Leyenda (o Tragedia) de Tu Código',
                        'story_loading': 'Consultando antiguas crónicas para contar la historia de esta... cosa.',
                        'story_error': 'La historia de este código es demasiado oscura para ser contada. O simplemente demasiado aburrida.',
                        'story_fallback_1': 'Érase una vez, un desarrollador lleno de esperanza, que escribió este código. El resto no es tan alegre.',
                        'story_fallback_2': 'Este código se parece a un héroe de tragedia griega: intenta hacer el bien, pero todo está en su contra.',
                        'story_fallback_3': 'Cuenta la leyenda que este código fue escrito en una noche sin luna, alimentado por café frío y desesperación.',
                        'story_fallback_4': 'Como una reliquia olvidada, este código lleva las cicatrices de muchas batallas (contra el linter, probablemente).',
                        'story_fallback_5': 'Este código es el equivalente digital del monstruo de Frankenstein: ensamblado a partir de diversas partes, con resultados... mixtos.',
                        'story_fallback_6': 'El autor de este código claramente tenía una visión. Lástima que sea tan borrosa.',
                        'story_fallback_7': 'Este código susurra secretos antiguos... principalmente sobre malos hábitos de programación.',
                        'story_fallback_8': 'Navega por la lógica como un barco sin timón en una tormenta de complejidad.',
                        'story_fallback_9': 'Cada línea de este código es otro paso en un laberinto del que nadie conoce la salida.',
                        'story_fallback_10': 'Esta es la historia de una función que solo quería hacer una cosa simple, pero se perdió por el camino.',
                        'story_fallback_11': 'Este código es como un castillo antiguo: impresionante desde lejos, pero lleno de corrientes de aire y fantasmas (de bugs).',
                        'story_fallback_12': 'La documentación de este código es una leyenda urbana: todo el mundo habla de ella, nadie la ha visto.',
                        'story_fallback_13': 'Ha desafiado los `merge conflicts`, sobrevivido a `refactorings` peligrosos... un verdadero superviviente.',
                        'story_fallback_14': 'Este código es un testimonio de la perseverancia humana frente a una complejidad autoinfligida.',
                        'story_fallback_15': 'Dicen que tocar este código despierta demonios antiguos (bugs críticos en producción).',

                        // --- Commit ---
                        'commit_title': 'Mensaje de Commit (Brutalmente) Honesto',
                        'commit_loading': 'Analizando tus cambios... Prepárate.',
                        'commit_error': 'Imposible generar mensaje. Tus cambios desafían toda lógica.',
                        'commit_fallback_1': 'fix: Corrección de bug (probablemente introducido por mí anoche).',
                        'commit_fallback_2': 'feat: Añadida una funcionalidad. Que la suerte nos acompañe.',
                        'commit_fallback_3': 'refactor: Lo he reescrito todo. Era esto o la defenestración.',
                        'commit_fallback_4': 'style: Alineación de comentarios. Sí, tenía tiempo que perder.',
                        'commit_fallback_5': 'docs: Añadida documentación que nadie leerá.',
                        'commit_fallback_6': 'test: Añadidas pruebas. Pasan. Algo es algo.',
                        'commit_fallback_7': 'chore: Actualizadas las dependencias. Crucemos los dedos.',
                        'commit_fallback_8': 'fix: Corrección urgente antes de la demo. No respiren.',
                        'commit_fallback_9': 'perf: Optimización. O tal vez no. Difícil de decir.',
                        'commit_fallback_10': 'merge: Fusión de rama. Necesito vacaciones.',
                        'commit_fallback_11': 'fix: Otro bug. Mi vida es un eterno debug.',
                        'commit_fallback_12': 'refactor: Simplificación (eso espero).',
                        'commit_fallback_13': 'feat: Nueva funcionalidad (probablemente con bugs).',
                        'commit_fallback_14': 'style: Formateo automático. La máquina ha ganado.',
                        'commit_fallback_15': 'revert: Revertido el commit anterior. Olviden todo.',
                        'commit_fallback_16': 'fix: Corregido el bug introducido por la corrección anterior.',
                        'commit_fallback_17': 'chore: Limpieza de código. He fingido ser productivo.',
                        'commit_fallback_18': 'test: Añadida una prueba que falla. Es un comienzo.',
                        'commit_fallback_19': 'docs: Actualizada la documentación (con mentiras).',
                        'commit_fallback_20': 'feat: Añadido experimental. No usar en producción (a menos que seas valiente).',

                        // --- Settings ---
                        'settings_title': 'Configuración de Little Fox (Si te atreves)',
                        'settings_language': 'Idioma (para que pueda burlarme de ti de forma diferente)',
                        'settings_api_provider': 'Proveedor de API (el que juzgará tu código)',
                        'settings_api_key': 'Clave API (no se la enseñes a nadie, especialmente a mí)',
                        'settings_save': 'Guardar (si estás seguro)',
                        'settings_reset': 'Restablecer (¿para romperlo todo?)',
                        'settings_saved': 'Configuración guardada. Espero que sepas lo que haces.'
                    }
                };
            case 'de':
                return {
                    code: 'de',
                    name: 'Deutsch',
                    localizedStrings: {
                        // --- General ---
                        'welcome': 'Willkommen bei Little Fox! Ihr persönlicher sarkastischer Assistent. 🦊',
                        'loading': 'Analysiere... Versuche herauszufinden, was Sie getan haben.',
                        'error_general': 'Allgemeiner Fehler. Ehrlich gesagt, bin ich nicht einmal überrascht.',
                        'error_api': 'Die API schmollt. Vielleicht mag sie Ihren Code auch nicht?',
                        'success': 'Unglaublich! Es hat funktioniert! Sind Sie sicher, dass Sie das geschrieben haben?',

                        // --- Code Roast ---
                        'roast_title': 'Gnadenlose Analyse Ihres Meisterwerks',
                        'roast_loading': 'Schärfe meine verbalen Krallen, um Ihren Code zu kritisieren...',
                        'roast_error': 'Kann diesen Code nicht kritisieren. Entweder ist er perfekt (unwahrscheinlich) oder unlesbar.',
                        'roast_fallback_1': 'Verschachtelte Schleifen? Ihre CPU hat gerade den Vorruhestand beantragt.',
                        'roast_fallback_2': 'Dieser Code ist komplexer als meine Pläne zur Weltherrschaft (über Hühnerställe).',
                        'roast_fallback_3': 'Unbenutzte Variablen... Das ist Speicherverschwendung. Sie heizen den Planeten auf.',
                        'roast_fallback_4': 'Ah, das klassische Stack Overflow Copy-Paste! Ich erkenne die Handschrift... oder deren Fehlen.',
                        'roast_fallback_5': 'So viel Einrückung, Ihr Code sieht aus wie eine Treppe ins Nirgendwo.',
                        'roast_fallback_6': 'Ich bin sicher, dieser Code funktionierte perfekt... in Ihren kühnsten Träumen.',
                        'roast_fallback_7': 'Wenn ich das meinen Artgenossen zeige, denken sie, Menschen programmieren mit den Füßen.',
                        'roast_fallback_8': 'Kommentare: // TODO: Verstehen, was dieser Code tut. Wenigstens sind Sie ehrlich.',
                        'roast_fallback_9': 'Variablennamen: `a`, `b`, `temp`... Werden Sie pro Buchstabe bezahlt?',
                        'roast_fallback_10': 'Dieser `if/else`-Block ist länger als ein nuklearer Winter. Schon mal was von Funktionen gehört?',
                        'roast_fallback_11': '`var` im Jahr 2025 verwenden? Sind Sie ein Rebell oder nur nostalgisch für die JS-Steinzeit?',
                        'roast_fallback_12': 'Diese Funktion ist 300 Zeilen lang. Hat sie ein eigenes Inhaltsverzeichnis?',
                        'roast_fallback_13': 'Fehlerbehandlung? Das ist anscheinend etwas für Schwächlinge.',
                        'roast_fallback_14': 'Ich habe schon besser organisierte Spaghetti gesehen als diesen Code.',
                        'roast_fallback_15': 'Nennen Sie das eine "Optimierung"? Mein Opa rennt schneller.',
                        'roast_fallback_16': 'Das ist kein Code, das ist ein digitaler Tatort.',
                        'roast_fallback_17': 'So viele `any`-Typen in TypeScript... Warum dann TypeScript verwenden? Zur Dekoration?',
                        'roast_fallback_18': 'Dieser Code verletzt so viele SOLID-Prinzipien, er ist praktisch flüssig.',
                        'roast_fallback_19': 'Die zyklomatische Komplexität dieser Funktion hat gerade meinen Analysator gesprengt.',
                        'roast_fallback_20': 'Haben Sie diesen Code getestet? Oder leben Sie lieber gefährlich?',
                        'roast_fallback_21': 'Dieser Code ist so DRY, dass er zerbröselt. Oh warte... es ist das Gegenteil.',
                        'roast_fallback_22': 'Die Kommentare erklären, *was* der Code tut. Man fragt sich, *warum* er es so tut.',
                        'roast_fallback_23': 'Sieht aus, als wäre dieser Code von einer Katze generiert worden, die über eine Tastatur läuft.',
                        'roast_fallback_24': 'Sie sollten diesen Code unter "fehlgeschlagenes wissenschaftliches Experiment" versionieren.',
                        'roast_fallback_25': 'Es ist kein Bug, es ist ein "undokumentiertes und sehr überraschendes Feature".',

                        // --- Storyteller ---
                        'story_title': 'Die Legende (oder Tragödie) Ihres Codes',
                        'story_loading': 'Konsultiere alte Chroniken, um die Geschichte dieses... Dings zu erzählen.',
                        'story_error': 'Die Geschichte dieses Codes ist zu düster, um erzählt zu werden. Oder einfach zu langweilig.',
                        'story_fallback_1': 'Es war einmal ein hoffnungsvoller Entwickler, der diesen Code schrieb. Der Rest ist weniger fröhlich.',
                        'story_fallback_2': 'Dieser Code ähnelt einem Helden der griechischen Tragödie: Er versucht Gutes zu tun, aber alles ist gegen ihn.',
                        'story_fallback_3': 'Die Legende besagt, dieser Code wurde in einer mondlosen Nacht geschrieben, angetrieben von kaltem Kaffee und Verzweiflung.',
                        'story_fallback_4': 'Wie ein vergessenes Relikt trägt dieser Code die Narben vieler Schlachten (wahrscheinlich gegen den Linter).',
                        'story_fallback_5': 'Dieser Code ist das digitale Äquivalent von Frankensteins Monster: aus verschiedenen Teilen zusammengesetzt, mit... gemischten Ergebnissen.',
                        'story_fallback_6': 'Der Autor dieses Codes hatte eindeutig eine Vision. Schade, dass sie so verschwommen ist.',
                        'story_fallback_7': 'Dieser Code flüstert alte Geheimnisse... hauptsächlich über schlechte Programmiergewohnheiten.',
                        'story_fallback_8': 'Er navigiert durch die Logik wie ein steuerloses Schiff in einem Sturm der Komplexität.',
                        'story_fallback_9': 'Jede Zeile dieses Codes ist ein weiterer Schritt in ein Labyrinth, dessen Ausgang niemand kennt.',
                        'story_fallback_10': 'Dies ist die Geschichte einer Funktion, die nur eine einfache Sache tun wollte, sich aber auf dem Weg verirrte.',
                        'story_fallback_11': 'Dieser Code ist wie ein altes Schloss: beeindruckend aus der Ferne, aber voller Zugluft und Geister (von Bugs).',
                        'story_fallback_12': 'Die Dokumentation für diesen Code ist eine urbane Legende: Jeder spricht darüber, niemand hat sie gesehen.',
                        'story_fallback_13': 'Er hat `merge conflicts` getrotzt, gefährliche `refactorings` überlebt... ein wahrer Überlebender.',
                        'story_fallback_14': 'Dieser Code ist ein Beweis für menschliche Beharrlichkeit angesichts selbstverschuldeter Komplexität.',
                        'story_fallback_15': 'Man sagt, das Berühren dieses Codes weckt alte Dämonen (kritische Produktionsfehler).',

                        // --- Commit ---
                        'commit_title': '(Brutal) Ehrliche Commit-Nachricht',
                        'commit_loading': 'Analysiere Ihre Änderungen... Machen Sie sich bereit.',
                        'commit_error': 'Nachricht kann nicht generiert werden. Ihre Änderungen widersprechen jeder Logik.',
                        'commit_fallback_1': 'fix: Bugfix (wahrscheinlich gestern Abend von mir eingeführt).',
                        'commit_fallback_2': 'feat: Feature hinzugefügt. Möge das Glück mit uns sein.',
                        'commit_fallback_3': 'refactor: Alles neu geschrieben. Es war entweder das oder den Computer aus dem Fenster werfen.',
                        'commit_fallback_4': 'style: Kommentare ausgerichtet. Ja, ich hatte Zeit zu verschwenden.',
                        'commit_fallback_5': 'docs: Dokumentation hinzugefügt, die niemand lesen wird.',
                        'commit_fallback_6': 'test: Tests hinzugefügt. Sie laufen durch. Das ist schon mal was.',
                        'commit_fallback_7': 'chore: Abhängigkeiten aktualisiert. Daumen drücken.',
                        'commit_fallback_8': 'fix: Hotfix vor der Demo. Hören Sie auf zu atmen.',
                        'commit_fallback_9': 'perf: Optimierung. Oder vielleicht auch nicht. Schwer zu sagen.',
                        'commit_fallback_10': 'merge: Branch gemerged. Ich brauche Urlaub.',
                        'commit_fallback_11': 'fix: Noch ein Bug. Mein Leben ist ewiges Debugging.',
                        'commit_fallback_12': 'refactor: Vereinfachung (hoffe ich).',
                        'commit_fallback_13': 'feat: Neues Feature (wahrscheinlich fehlerhaft).',
                        'commit_fallback_14': 'style: Automatische Formatierung. Die Maschine hat gewonnen.',
                        'commit_fallback_15': 'revert: Vorherigen Commit rückgängig gemacht. Vergessen Sie alles.',
                        'commit_fallback_16': 'fix: Den durch den vorherigen Fix eingeführten Bug behoben.',
                        'commit_fallback_17': 'chore: Code aufgeräumt. Habe so getan, als wäre ich produktiv.',
                        'commit_fallback_18': 'test: Einen fehlschlagenden Test hinzugefügt. Es ist ein Anfang.',
                        'commit_fallback_19': 'docs: Doku aktualisiert (mit Lügen).',
                        'commit_fallback_20': 'feat: Experimentelle Ergänzung. Nicht in Produktion verwenden (außer Sie sind mutig).',

                        // --- Settings ---
                        'settings_title': 'Little Fox Einstellungen (Wenn Sie sich trauen)',
                        'settings_language': 'Sprache (damit ich Sie anders verspotten kann)',
                        'settings_api_provider': 'API-Anbieter (derjenige, der Ihren Code beurteilen wird)',
                        'settings_api_key': 'API-Schlüssel (zeigen Sie ihn niemandem, besonders mir nicht)',
                        'settings_save': 'Speichern (wenn Sie sicher sind)',
                        'settings_reset': 'Zurücksetzen (um alles kaputt zu machen?)',
                        'settings_saved': 'Einstellungen gespeichert. Ich hoffe, Sie wissen, was Sie tun.'
                    }
                };
            default:
                // Fallback to English if language code is unknown
                console.warn(`Unsupported language code: ${langCode}. Falling back to English.`);
                return this.loadLanguageSettings('en');
        }
    }

    // Loads the user's preferred language from VS Code settings
    private loadUserLanguagePreference(): void {
        try {
            const config = vscode.workspace.getConfiguration('littleFox');
            // Get language setting, default to 'fr' if not set
            const userLang = config.get<string>('language', this.currentLanguage);

            // Check if the configured language is available in our map
            if (this.languages.has(userLang)) {
                this.currentLanguage = userLang;
                console.log(`User language set to: ${userLang}`);
            } else {
                console.warn(`Configured language '${userLang}' not available. Using default: ${this.currentLanguage}`);
                // Keep the default language if the user's preference isn't supported
            }
        } catch (error) {
            console.error("Error loading user language preference:", error);
            // Keep the default language in case of error
        }
    }

    // Gets a localized string for the given key in the current language
    public getString(key: string): string {
        const langSettings = this.languages.get(this.currentLanguage);

        // Fallback if current language settings are somehow missing
        if (!langSettings) {
            console.error(`Language settings for '${this.currentLanguage}' not found.`);
            const fallbackLang = this.languages.get('en') || this.languages.get('fr'); // Try English or French
            return fallbackLang?.localizedStrings[key] || `[${key}]`; // Return key if not found even in fallback
        }

        const value = langSettings.localizedStrings[key];

        // Return the key itself in brackets if the specific string is not found
        if (value === undefined) {
            console.warn(`Localization key '${key}' not found for language '${this.currentLanguage}'.`);
            return `[${key}]`;
        }

        return value;
    }

    // Gets a random fallback message for a specific category (roast, story, commit)
    public getRandomFallbackMessage(category: 'roast' | 'story' | 'commit'): string {
        const prefix = `${category}_fallback_`;
        // Get settings for the current language, or default to French if something went wrong
        const langSettings = this.languages.get(this.currentLanguage) || this.languages.get('fr')!;

        if (!langSettings) {
            // This should theoretically not happen due to initialization fallback, but safety first
            return "Fallback message system failed. Even the fallbacks need a fallback.";
        }

        // Find all keys starting with the category prefix (e.g., 'roast_fallback_')
        const fallbackKeys = Object.keys(langSettings.localizedStrings)
            .filter(key => key.startsWith(prefix));

        // If no fallback keys are found for this category (shouldn't happen with the added messages)
        if (fallbackKeys.length === 0) {
            console.warn(`No fallback messages found for category '${category}' in language '${this.currentLanguage}'.`);
            return this.getString('error_general'); // Return a generic error message
        }

        // Select a random key from the filtered list
        const randomIndex = Math.floor(Math.random() * fallbackKeys.length);
        const randomKey = fallbackKeys[randomIndex];

        // Return the corresponding localized string
        return langSettings.localizedStrings[randomKey];
    }

    // Returns a list of available languages
    public getAvailableLanguages(): { code: string, name: string }[] {
        const result: { code: string, name: string }[] = [];
        this.languages.forEach(lang => {
            result.push({
                code: lang.code,
                name: lang.name
            });
        });
        // Sort alphabetically by language name for display
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Gets the code of the currently active language
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    // Sets the current language and saves the preference
    public setLanguage(langCode: string): boolean {
        if (this.languages.has(langCode)) {
            this.currentLanguage = langCode;

            // Persist the preference in VS Code settings
            try {
                const config = vscode.workspace.getConfiguration('littleFox');
                // Update the 'language' setting globally
                config.update('language', langCode, vscode.ConfigurationTarget.Global);
                console.log(`Language preference updated to: ${langCode}`);
                return true;
            } catch (error) {
                console.error(`Failed to save language preference '${langCode}':`, error);
                // Language changed in memory, but saving failed
                return false; // Indicate that saving failed
            }
        }
        // Language code not supported
        console.warn(`Attempted to set unsupported language: ${langCode}`);
        return false;
    }

    // --- API Configuration Methods ---

    // Gets the configured API provider (e.g., 'gemini', 'groq')
    getApiProvider(): string {
        // Default to 'gemini' if not set
        return vscode.workspace.getConfiguration('littleFox').get('apiProvider', 'gemini');
    }

    // Gets the Gemini API key from configuration (should ideally use secrets)
    getGeminiApiKey(): string | undefined {
        // Consider using context.secrets for better security in a real extension
        return vscode.workspace.getConfiguration('littleFox').get('geminiApiKey');
    }

    // Gets the Groq API key from configuration (should ideally use secrets)
    getGroqApiKey(): string | undefined {
        // Consider using context.secrets for better security in a real extension
        return vscode.workspace.getConfiguration('littleFox').get('groqApiKey');
    }

    // --- Secure Storage Methods (using VS Code SecretStorage) ---

    /**
     * Stores a sensitive value securely.
     * @param key The key under which to store the secret.
     * @param value The secret value to store.
     */
    async storeSecretValue(key: string, value: string): Promise<void> {
        try {
            await this.context.secrets.store(key, value);
            console.log(`Secret stored successfully for key: ${key}`);
        } catch (error) {
            console.error(`Error storing secret for key '${key}':`, error);
            vscode.window.showErrorMessage(`Failed to store secret for ${key}. See console for details.`);
        }
    }

    /**
     * Retrieves a securely stored value.
     * @param key The key of the secret to retrieve.
     * @returns The secret value, or undefined if not found or an error occurs.
     */
    async getSecretValue(key: string): Promise<string | undefined> {
        try {
            const secret = await this.context.secrets.get(key);
            if (secret) {
                console.log(`Secret retrieved successfully for key: ${key}`);
            } else {
                console.log(`No secret found for key: ${key}`);
            }
            return secret;
        } catch (error) {
            console.error(`Error retrieving secret for key '${key}':`, error);
            vscode.window.showErrorMessage(`Failed to retrieve secret for ${key}. See console for details.`);
            return undefined;
        }
    }

     /**
     * Deletes a securely stored value.
     * @param key The key of the secret to delete.
     */
    async deleteSecretValue(key: string): Promise<void> {
        try {
            await this.context.secrets.delete(key);
            console.log(`Secret deleted successfully for key: ${key}`);
        } catch (error) {
            console.error(`Error deleting secret for key '${key}':`, error);
            vscode.window.showErrorMessage(`Failed to delete secret for ${key}. See console for details.`);
        }
    }
}
