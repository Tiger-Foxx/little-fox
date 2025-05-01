import * as vscode from 'vscode';
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIProvider, CompletionOptions, ProviderStatus } from './apiManager';
import { Configuration } from '../utils/configuration';
import { ErrorHandler } from '../utils/errorHandler';

export class GeminiApi implements AIProvider {
    private configuration: Configuration;
    private cachedStatus: ProviderStatus = ProviderStatus.READY;
    private lastStatusCheck: number = 0;
    private statusCheckInterval: number = 60000; // Check status every minute
    private requestRetries: number = 2;
    private modelName: string = 'gemini-2.0-flash';
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    
    // API key par défaut - dans une vraie application, la stocker de manière sécurisée
    private DEFAULT_API_KEY = 'AIzaSyDZH3jlitdjcJZA07SF4IMQv0D75ZnmqK0';
    
    constructor(configuration: Configuration) {
        this.configuration = configuration;
        
        // Initialiser le client Google GenAI
        this.initializeClient();
        
        // Vérifier le statut initial
        this.checkProviderStatus();
    }
    
    private async initializeClient(): Promise<void> {
        try {
            const apiKey = await this.getApiKey();
            
            if (apiKey) {
                this.genAI = new GoogleGenerativeAI(apiKey);
                this.model = this.genAI.getGenerativeModel({ model: this.modelName });
                console.log('Client Google GenAI initialisé avec succès');
            } else {
                console.error('Impossible d\'initialiser le client Google GenAI : clé API manquante');
                this.cachedStatus = ProviderStatus.UNAUTHORIZED;
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du client Google GenAI:', error);
            this.cachedStatus = ProviderStatus.ERROR;
        }
    }
    
    getProviderName(): string {
        return 'Gemini AI';
    }
    
    async getProviderStatus(): Promise<ProviderStatus> {
        const now = Date.now();
        
        // Limiter la fréquence des vérifications de statut
        if (now - this.lastStatusCheck > this.statusCheckInterval) {
            await this.checkProviderStatus();
            this.lastStatusCheck = now;
        }
        
        return this.cachedStatus;
    }
    
    private async checkProviderStatus(): Promise<void> {
        try {
            const apiKey = await this.getApiKey();
            
            if (!apiKey) {
                this.cachedStatus = ProviderStatus.UNAUTHORIZED;
                return;
            }
            
            // Réinitialiser le client si nécessaire
            if (!this.genAI || !this.model) {
                await this.initializeClient();
            }
            
            // Faire une petite requête pour vérifier que l'API fonctionne
            if (this.model) {
                const result = await this.model.generateContent("Réponds juste par 'OK' s'il te plaît.");
                const response = await result.response;
                const text = response.text();
                
                if (text && text.trim().length > 0) {
                    this.cachedStatus = ProviderStatus.READY;
                } else {
                    this.cachedStatus = ProviderStatus.ERROR;
                }
            } else {
                this.cachedStatus = ProviderStatus.UNAVAILABLE;
            }
        } catch (error: any) {
            // Gérer les erreurs spécifiques
            if (error.message?.includes('API key')) {
                this.cachedStatus = ProviderStatus.UNAUTHORIZED;
            } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
                this.cachedStatus = ProviderStatus.RATE_LIMITED;
            } else if (error.message?.includes('timeout') || error.message?.includes('connection')) {
                this.cachedStatus = ProviderStatus.UNAVAILABLE;
            } else {
                this.cachedStatus = ProviderStatus.ERROR;
            }
            
            console.error('Erreur lors de la vérification du statut de Gemini API:', error);
        }
    }
    
    async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string | undefined> {
        if (!this.model) {
            await this.initializeClient();
            if (!this.model) {
                vscode.window.showErrorMessage('Impossible d\'initialiser le client Gemini. Veuillez vérifier votre clé API.');
                return undefined;
            }
        }
        
        // Configurer la génération selon les options
        const generationConfig: GenerationConfig = {
            maxOutputTokens: options?.maxTokens || 500,
            temperature: options?.temperature || 0.7,
            topP: 0.95,
            topK: 40,
        };
        
        // Configurer les paramètres de sécurité
        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            }
        ];
        
        // Stratégie de retry avec exponential backoff
        for (let attempt = 0; attempt <= this.requestRetries; attempt++) {
            try {
                // Créer un timeout
                const timeout = options?.timeoutMs || 30000;
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error("Délai d'attente dépassé")), timeout)
                );
                
                // Effectuer la requête avec la gestion du timeout
                const generateRequest = this.model.generateContent(prompt);
            const result = await Promise.race([
                generateRequest,
                timeoutPromise
            ]);
                
                if (result instanceof Error) {
                    throw result; // Propager l'erreur de timeout
                }
                
                // Traiter la réponse
                const response = await result.response;
                const text = response.text().trim();
                
                this.cachedStatus = ProviderStatus.READY;
                
                if (text) {
                    return text;
                } else {
                    console.warn('Réponse Gemini valide mais sans contenu texte:', response);
                    return undefined;
                }
            } catch (error: any) {
                // Gérer les différents types d'erreur
                if (error.message?.includes('API key')) {
                    this.cachedStatus = ProviderStatus.UNAUTHORIZED;
                    vscode.window.showErrorMessage('Clé API Gemini invalide ou expirée.');
                    return undefined;
                } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
                    this.cachedStatus = ProviderStatus.RATE_LIMITED;
                    
                    // Si ce n'est pas la dernière tentative, attendre et réessayer
                    if (attempt < this.requestRetries) {
                        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                        console.log(`Rate limited. Attente de ${waitTime}ms avant de réessayer...`);
                        await this.sleep(waitTime);
                        continue;
                    }
                    
                    vscode.window.showWarningMessage('Limite de requêtes Gemini atteinte. Réessayez plus tard ou changez de fournisseur d\'API.');
                    return undefined;
                } else if (error.message?.includes('timeout')) {
                    this.cachedStatus = ProviderStatus.UNAVAILABLE;
                    
                    if (attempt < this.requestRetries) {
                        const waitTime = Math.pow(2, attempt) * 1000;
                        console.log(`Timeout. Attente de ${waitTime}ms avant de réessayer...`);
                        await this.sleep(waitTime);
                        continue;
                    }
                } else {
                    this.cachedStatus = error.message?.includes('connect') 
                        ? ProviderStatus.UNAVAILABLE 
                        : ProviderStatus.ERROR;
                }
                
                // Si c'est la dernière tentative, journaliser et renvoyer undefined
                if (attempt === this.requestRetries) {
                    console.error('Erreur appelant Gemini API après plusieurs tentatives:', error);
                    ErrorHandler.handleError(error, 'Gemini API');
                    return undefined;
                }
                
                // Sinon, attendre et réessayer
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                await this.sleep(waitTime);
            }
        }
        
        return undefined;
    }
    
    private async getApiKey(): Promise<string | undefined> {
        // Essayer d'abord de récupérer la clé configurée par l'utilisateur
        let apiKey = this.configuration.getGeminiApiKey();
        
        // Si aucune clé n'est configurée, utiliser la clé par défaut
        if (!apiKey || apiKey.trim() === '') {
            // Dans une vraie application, vous pourriez vouloir récupérer cette clé
            // depuis un service sécurisé ou un stockage sécurisé
            apiKey = this.DEFAULT_API_KEY;
        }
        
        return apiKey;
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}