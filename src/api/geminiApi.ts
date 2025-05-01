import axios, { AxiosError, AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { AIProvider, CompletionOptions, ProviderStatus } from './apiManager';
import { Configuration } from '../utils/configuration';
import { ErrorHandler } from '../utils/errorHandler';

interface GeminiRequestContent {
    parts: {
        text: string;
    }[];
}

interface GeminiRequestBody {
    contents: GeminiRequestContent[];
    generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
        topP?: number;
        topK?: number;
    };
}

interface GeminiResponseContentPart {
    text: string;
}

interface GeminiResponseContent {
    parts: GeminiResponseContentPart[];
}

interface GeminiCandidate {
    content: GeminiResponseContent;
    finishReason: string;
    index: number;
}

interface GeminiResponse {
    candidates: GeminiCandidate[];
    promptFeedback?: {
        blockReason?: string;
    };
}

export class GeminiApi implements AIProvider {
    private configuration: Configuration;
    private readonly apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
    private cachedStatus: ProviderStatus = ProviderStatus.READY;
    private lastStatusCheck: number = 0;
    private statusCheckInterval: number = 60000; // Check status every minute
    private requestTimeoutMs: number = 30000; // 30 seconds timeout
    private requestRetries: number = 2;
    
    // API key par défaut - dans une vraie application, la stocker de manière sécurisée
    private DEFAULT_API_KEY = 'AIzaSyDZH3jlitdjcJZA07SF4IMQv0D75ZnmqK0';
    
    constructor(configuration: Configuration) {
        this.configuration = configuration;
        
        // Vérifier le statut initial
        this.checkProviderStatus();
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
            
            // Faire une petite requête pour vérifier que l'API fonctionne
            const response = await axios.post(
                this.apiEndpoint,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Réponds juste par 'OK' s'il te plaît."
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 10
                    }
                },
                {
                    params: {
                        key: apiKey
                    },
                    timeout: 10000 // Court timeout pour la vérification
                }
            );
            
            if (response.status === 200) {
                this.cachedStatus = ProviderStatus.READY;
            } else {
                this.cachedStatus = ProviderStatus.ERROR;
            }
        } catch (error) {
            const axiosError = error as AxiosError;
            
            if (axiosError.response) {
                if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                    this.cachedStatus = ProviderStatus.UNAUTHORIZED;
                } else if (axiosError.response.status === 429) {
                    this.cachedStatus = ProviderStatus.RATE_LIMITED;
                } else {
                    this.cachedStatus = ProviderStatus.ERROR;
                }
            } else if (axiosError.code === 'ECONNABORTED') {
                this.cachedStatus = ProviderStatus.UNAVAILABLE;
            } else {
                this.cachedStatus = ProviderStatus.UNAVAILABLE;
            }
            
            console.error('Erreur lors de la vérification du statut de Gemini API:', error);
        }
    }
    
    async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string | undefined> {
        const apiKey = await this.getApiKey();
        
        if (!apiKey) {
            vscode.window.showErrorMessage('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres de Little Fox.');
            return undefined;
        }
        
        const requestBody: GeminiRequestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: options?.maxTokens || 500,
                temperature: options?.temperature || 0.7,
                topP: 0.95,
                topK: 40
            }
        };
        
        // Stratégie de retry avec exponential backoff
        for (let attempt = 0; attempt <= this.requestRetries; attempt++) {
            try {
                const response = await axios.post<GeminiResponse>(
                    this.apiEndpoint,
                    requestBody,
                    {
                        params: {
                            key: apiKey
                        },
                        timeout: options?.timeoutMs || this.requestTimeoutMs
                    }
                );
                
                this.cachedStatus = ProviderStatus.READY;
                
                // Traiter la réponse en fonction de la structure de Gemini API
                if (this.isValidGeminiResponse(response.data)) {
                    return this.extractTextFromGeminiResponse(response.data);
                } else {
                    console.warn('Réponse Gemini valide mais sans contenu texte:', response.data);
                    return undefined;
                }
            } catch (error) {
                const axiosError = error as AxiosError;
                
                // Mettre à jour le statut du provider en fonction de l'erreur
                if (axiosError.response) {
                    if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                        this.cachedStatus = ProviderStatus.UNAUTHORIZED;
                        vscode.window.showErrorMessage('Clé API Gemini invalide ou expirée.');
                        return undefined;
                    } else if (axiosError.response.status === 429) {
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
                    } else {
                        this.cachedStatus = ProviderStatus.ERROR;
                    }
                } else {
                    this.cachedStatus = ProviderStatus.UNAVAILABLE;
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
    
    private isValidGeminiResponse(response: GeminiResponse): boolean {
        return !!(
            response &&
            response.candidates &&
            response.candidates.length > 0 &&
            response.candidates[0].content &&
            response.candidates[0].content.parts &&
            response.candidates[0].content.parts.length > 0 &&
            response.candidates[0].content.parts[0].text
        );
    }
    
    private extractTextFromGeminiResponse(response: GeminiResponse): string | undefined {
        if (!this.isValidGeminiResponse(response)) {
            return undefined;
        }
        
        return response.candidates[0].content.parts[0].text.trim();
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