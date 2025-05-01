# 🦊 Little Fox: Votre Compagnon de Code IA Plein d'Esprit


**Fatigué des assistants IA trop sérieux ? Little Fox est là pour injecter un peu d'humour (et d'honnêteté brutale) dans votre quotidien de développeur !**

Little Fox est une extension VS Code qui utilise la puissance de l'IA (Gemini ou Groq, au choix !) pour interagir avec votre code de manière unique :

*   **Roast de Code :** Recevez des commentaires sarcastiques et humoristiques sur vos choix de programmation douteux.
*   **Narrateur d'Histoire de Code :** Découvrez l'intention et le contexte derrière vos blocs de code, racontés comme une histoire.
*   **Générateur de Messages de Commit Honnêtes :** Finis les messages de commit ennuyeux, place à la vérité (parfois absurde) !

## ✨ Fonctionnalités Principales

### 🔥 Code Roast

*   **Quoi ?** Little Fox analyse votre code et ajoute des commentaires piquants (mais souvent pertinents) juste au-dessus des fonctions, classes, boucles ou conditions qui méritent une petite remarque.
*   **Pourquoi ?** Pour vous faire sourire, mais aussi pour attirer votre attention sur des patterns potentiellement améliorables (5 boucles imbriquées ? Vraiment ? 😉).
*   **Comment ?** Cliquez sur l'icône `🔥 Roast this code` qui apparaît au-dessus des blocs de code, ou utilisez la commande depuis la palette ou le menu contextuel. Fonctionne avec l'IA (Gemini/Groq) et des messages prédéfinis si l'IA n'est pas joignable.

### 📖 AI Code Storyteller

*   **Quoi ?** Obtenez une explication narrative et contextuelle de ce que fait un bloc de code spécifique.
*   **Pourquoi ?** Pour mieux comprendre la logique, l'intention ou l'"histoire" derrière un morceau de code complexe (ou même le vôtre, après une longue nuit !).
*   **Comment ?** Cliquez sur l'icône `📖 Tell me a story` qui apparaît au-dessus des fonctions/classes, ou utilisez la commande dédiée. Basé sur l'analyse de l'IA.

### ✍️ Générateur de Messages de Commit Honnêtes

*   **Quoi ?** Laisse Little Fox analyser vos changements Git (indexés et non-indexés) et proposer un message de commit qui reflète... eh bien, la réalité du développement. Attendez-vous à des messages comme "feat: Ajout d'une fonctionnalité (je crois ?)", "fix: Corrigé un bug que j'ai introduit hier soir", ou "refactor: J'ai touché à ça, aucune idée pourquoi ça marche encore".
*   **Pourquoi ?** Parce que parfois, l'honnêteté est la meilleure politique (et c'est plus drôle).
*   **Comment ?** Cliquez sur l'icône Little Fox 🦊 qui apparaît dans la barre de titre de la vue Source Control (Git).

### 🧠 Flexibilité de l'IA

*   Choisissez entre **Google Gemini** ou **Groq** comme moteur IA dans les paramètres.
*   Utilisez les clés API par défaut (non visibles) ou **fournissez vos propres clés API** pour une utilisation personnalisée.
*   Des **messages de secours prédéfinis** assurent que l'extension reste utile même en cas de problème réseau ou API.

## 🚀 Comment Utiliser

1.  **CodeLens :** Survolez le début d'une fonction, classe, boucle (`for`, `while`) ou condition (`if`, `else`). Des liens `🔥 Roast this code` et/ou `📖 Tell me a story` apparaîtront. Cliquez dessus !
2.  **Command Palette :** Ouvrez la palette de commandes (`Ctrl+Shift+P` ou `Cmd+Shift+P`), tapez `Little Fox` et choisissez l'action désirée (`Critique mon code`, `Raconte l'histoire`, `Génère un message de commit`, etc.).
3.  **Menu Contextuel :** Faites un clic droit dans l'éditeur de texte pour accéder aux commandes de Roast et Storyteller.
4.  **Source Control (Git) :** Ouvrez la vue Source Control (`Ctrl+Shift+G` ou `Cmd+Shift+G`). Cliquez sur la petite icône de renard 🦊 dans la barre de titre pour générer un message de commit basé sur les changements détectés.

**(Insérez ici des captures d'écran ou des GIFs animés montrant chaque fonctionnalité en action ! C'est très important pour la visibilité sur la Marketplace.)**


## ⚙️ Configuration

Vous pouvez personnaliser le comportement de Little Fox via les paramètres de VS Code (`Ctrl+,` ou `Cmd+,`, puis recherchez "Little Fox") :

*   **`littleFox.apiProvider`**: Choisissez votre fournisseur IA (`gemini` ou `groq`). Défaut: `gemini`.
*   **`littleFox.geminiApiKey`**: Votre clé API personnelle pour Gemini (facultatif).
*   **`littleFox.groqApiKey`**: Votre clé API personnelle pour Groq (facultatif).
*   **`littleFox.language`**: Langue de l'interface (certains messages internes peuvent rester en français). Options: `fr`, `en`, `es`, `de`. Défaut: `fr`.
*   **`littleFox.autoRoastOnSave`**: Activer/désactiver la critique automatique lors de la sauvegarde. Défaut: `false`.
*   **`littleFox.showStatusBarItem`**: Afficher/masquer l'icône dans la barre d'état. Défaut: `true`.
*   **`littleFox.humorLevel`**: Ajustez le niveau d'humour des réponses (de `low` à `extreme`). Défaut: `medium`.

## ⚠️ Requirements

*   Cette extension dépend de l'extension **Git intégrée** (`vscode.git`) pour la fonctionnalité "Générateur de Messages de Commit". Assurez-vous qu'elle est activée dans VS Code.

## 🐛 Limitations Connues

*   La détection des blocs de code pour le CodeLens (Roast/Storyteller) utilise des expressions régulières. Bien qu'elle couvre de nombreux cas (fonctions, classes, boucles, conditions), elle pourrait ne pas être parfaite pour toutes les syntaxes exotiques ou tous les langages.
*   Les réponses de l'IA peuvent varier en qualité et en temps de réponse en fonction de la charge du fournisseur (Gemini/Groq) et de la complexité du code analysé.

## 📈 Historique des Versions

Consultez le fichier [CHANGELOG.md](CHANGELOG.md) pour le détail des changements à chaque version. (Note : Vous devrez créer et maintenir ce fichier).



*Créé avec malice par Fox*