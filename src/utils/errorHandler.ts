import * as vscode from 'vscode';
import { Configuration } from './configuration';

export enum ErrorType {
    NETWORK,
    AUTHENTICATION,
    RATE_LIMIT,
    TIMEOUT,
    API_ERROR,
    UNEXPECTED
}

export interface ErrorDetails {
    type: ErrorType;
    message: string;
    original?: any;
    timestamp: number;
}

export class ErrorHandler {
    private static errors: ErrorDetails[] = [];
    private static maxErrorsToStore = 50;
    private static configuration?: Configuration;
    
    static setConfiguration(configuration: Configuration): void {
        ErrorHandler.configuration = configuration;
    }
    
    static handleError(error: any, featureName: string): void {
        console.error(`Erreur dans ${featureName}:`, error);
        
        let errorType = ErrorType.UNEXPECTED;
        let errorMessage = "Une erreur inattendue s'est produite";
        
        if (error.response) {
            // L'API a retourné une erreur
            if (error.response.status === 401 || error.response.status === 403) {
                errorType = ErrorType.AUTHENTICATION;
                errorMessage = "Authentification échouée. Veuillez vérifier votre clé API.";
            } else if (error.response.status === 429) {
                errorType = ErrorType.RATE_LIMIT;
                errorMessage = "Limite de taux dépassée. Veuillez réessayer plus tard.";
            } else {
                errorType = ErrorType.API_ERROR;
                errorMessage = `Erreur API: ${error.response.status} - ${error.response.statusText || 'Erreur inconnue'}`;
            }
        } else if (error.request) {
            // Aucune réponse reçue
            if (error.code === 'ECONNABORTED') {
                errorType = ErrorType.TIMEOUT;
                errorMessage = "Délai d'attente dépassé pour la requête. Le serveur est peut-être surchargé.";
            } else {
                errorType = ErrorType.NETWORK;
                errorMessage = "Aucune réponse reçue de l'API. Vérifiez votre connexion Internet.";
            }
        } else {
            // Autre erreur
            errorMessage = error.message || "Erreur inconnue";
        }
        
        // Enregistrer l'erreur
        this.logError({
            type: errorType,
            message: errorMessage,
            original: error,
            timestamp: Date.now()
        });
        
        // Obtenir le message localisé si la configuration est disponible
        if (this.configuration) {
            let localizedMessage;
            
            switch (errorType) {
                case ErrorType.AUTHENTICATION:
                    localizedMessage = "🦊 " + this.getRandomizedErrorMessage('auth');
                    break;
                case ErrorType.RATE_LIMIT:
                    localizedMessage = "🦊 " + this.getRandomizedErrorMessage('rate');
                    break;
                case ErrorType.NETWORK:
                case ErrorType.TIMEOUT:
                    localizedMessage = "🦊 " + this.getRandomizedErrorMessage('network');
                    break;
                default:
                    localizedMessage = "🦊 " + this.getRandomizedErrorMessage('general');
            }
            
            vscode.window.showErrorMessage(`${featureName}: ${localizedMessage}`);
        } else {
            // Fallback si la configuration n'est pas disponible
            vscode.window.showErrorMessage(`${featureName}: ${errorMessage}`);
        }
    }
    
    private static logError(error: ErrorDetails): void {
        // Ajouter l'erreur à la liste et maintenir une taille maximale
        this.errors.unshift(error);
        
        if (this.errors.length > this.maxErrorsToStore) {
            this.errors = this.errors.slice(0, this.maxErrorsToStore);
        }
        
        // Journaliser l'erreur de manière plus détaillée pour aider au débogage
        console.error(`[${new Date(error.timestamp).toISOString()}] ${ErrorType[error.type]}: ${error.message}`, error.original);
    }
    
    static getRecentErrors(count: number = 10): ErrorDetails[] {
        return this.errors.slice(0, count);
    }
    
    static isAPIKeyMissing(apiKey?: string): boolean {
        return !apiKey || apiKey.trim() === '';
    }
    
    private static getRandomizedErrorMessage(category: 'auth' | 'rate' | 'network' | 'general'): string {
        // Messages amusants et français pour chaque catégorie d'erreur
        const messages = {
            auth: [
                "Mon flair de renard me dit que ta clé API n'est pas valide. Vérifie-la, s'il te plaît!",
                "J'ai essayé de m'authentifier mais j'ai été chassé comme un renard dans un poulailler. Vérifie ta clé API!",
                "Oups! Mon accès a été refusé plus vite qu'un renard surpris par un chasseur. Ta clé API a-t-elle expiré?"
            ],
            rate: [
                "Trop de requêtes! Je suis essoufflé comme un renard qui a couru après trop de lapins!",
                "L'API me dit de ralentir, comme ma maman renarde quand je courais trop vite étant petit.",
                "Même un renard a besoin de repos. L'API nous demande de faire une petite sieste avant de continuer."
            ],
            network: [
                "Je n'arrive pas à me connecter au serveur. Mon réseau est aussi instable qu'un renard sur une branche fine!",
                "Connexion perdue! C'est comme si quelqu'un avait coupé ma connexion Internet pendant que je chassais des bugs.",
                "Le serveur ne répond pas. Peut-être qu'il hiberne comme moi en hiver?"
            ],
            general: [
                "Quelque chose s'est mal passé et je ne sais pas quoi. C'est comme chercher une souris invisible dans l'herbe!",
                "Erreur inattendue! J'ai été surpris comme un renard devant les phares d'une voiture.",
                "Un problème est survenu. Mon instinct de renard me dit qu'il faut réessayer plus tard."
            ]
        };
        
        const categoryMessages = messages[category];
        return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
    }
}