import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import { AIProvider, CompletionOptions, ProviderStatus } from './apiManager';
import { Configuration } from '../utils/configuration';
import { ErrorHandler } from '../utils/errorHandler';

interface GroqMessage {
    role: string;
    content: string;
}

interface GroqRequestBody {
    model: string;
    messages: GroqMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
}

interface GroqResponseChoice {
    index: number;
    message: {
        role: string;
        content: string;
    };
    finish_reason: string;
}

interface GroqResponse {
    id: string;
    choices: GroqResponseChoice[];
    created: number;
    model: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class GroqApi implements AIProvider {
    private configuration: Configuration;
    private readonly apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    private defaultModel = 'llama3-8b-8192'; // Modèle par défaut
    private cachedStatus: ProviderStatus = ProviderStatus.READY;
    private lastStatusCheck: number = 0;
    private statusCheckInterval: number = 60000; // Vérifier le statut toutes les minutes
    private requestTimeoutMs: number = 30000; // 30 secondes de timeout
    private requestRetries: number = 2;
    
    // Clé API par défaut - dans une vraie application, stocker de manière sécurisée
    private DEFAULT_API_KEY = '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';
    
    constructor(configuration: Configuration) {
        this.configuration = configuration;
        
        // Vérifier le statut initial
        this.checkProviderStatus();
    }
    
    getProviderName(): string {
        return 'Groq AI';
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
                    model: this.defaultModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu es un assistant utile.'
                        },
                        {
                            role: 'user',
                            content: "Réponds juste par 'OK' s'il te plaît."
                        }
                    ],
                    max_tokens: 10
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
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
            
            console.error('Erreur lors de la vérification du statut de Groq API:', error);
        }
    }
    
    async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string | undefined> {
        const apiKey = await this.getApiKey();
        
        if (!apiKey) {
            vscode.window.showErrorMessage('Clé API Groq non configurée. Veuillez la configurer dans les paramètres de Little Fox.');
            return undefined;
        }
        
        // Vérifier si le prompt contient des instructions de système séparées
        // (Format hypothétique: ###SYSTEM### instructions système ###USER### prompt utilisateur)
        let systemMessage = 'Tu es un renard astucieux et créatif qui aide les programmeurs. Réponds en français.';
        let userMessage = prompt;
        
        const systemDelimiter = '###SYSTEM###';
        const userDelimiter = '###USER###';
        
        if (prompt.includes(systemDelimiter) && prompt.includes(userDelimiter)) {
            const systemStart = prompt.indexOf(systemDelimiter) + systemDelimiter.length;
            const userStart = prompt.indexOf(userDelimiter);
            
            if (systemStart < userStart) {
                systemMessage = prompt.substring(systemStart, userStart).trim();
                userMessage = prompt.substring(userStart + userDelimiter.length).trim();
            }
        }
        
        const requestBody: GroqRequestBody = {
            model: this.defaultModel,
            messages: [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: options?.maxTokens || 500,
            temperature: options?.temperature || 0.7,
            top_p: 0.95,
        };
        
        // Stratégie de retry avec exponential backoff
        for (let attempt = 0; attempt <= this.requestRetries; attempt++) {
            try {
                const response = await axios.post<GroqResponse>(
                    this.apiEndpoint,
                    requestBody,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: options?.timeoutMs || this.requestTimeoutMs
                    }
                );
                
                this.cachedStatus = ProviderStatus.READY;
                
                // Traiter la réponse selon la structure de l'API OpenAI (utilisée par Groq)
                if (this.isValidGroqResponse(response.data)) {
                    return this.extractTextFromGroqResponse(response.data);
                } else {
                    console.warn('Réponse Groq valide mais sans contenu texte:', response.data);
                    return undefined;
                }
            } catch (error) {
                const axiosError = error as AxiosError;
                
                // Mettre à jour le statut du provider selon l'erreur
                if (axiosError.response) {
                    if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                        this.cachedStatus = ProviderStatus.UNAUTHORIZED;
                        vscode.window.showErrorMessage('Clé API Groq invalide ou expirée.');
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
                        
                        vscode.window.showWarningMessage('Limite de requêtes Groq atteinte. Réessayez plus tard ou changez de fournisseur d\'API.');
                        return undefined;
                    } else {
                        this.cachedStatus = ProviderStatus.ERROR;
                    }
                } else {
                    this.cachedStatus = ProviderStatus.UNAVAILABLE;
                }
                
                // Si c'est la dernière tentative, journaliser et renvoyer undefined
                if (attempt === this.requestRetries) {
                    console.error('Erreur appelant Groq API après plusieurs tentatives:', error);
                    ErrorHandler.handleError(error, 'Groq API');
                    return undefined;
                }
                
                // Sinon, attendre et réessayer
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                await this.sleep(waitTime);
            }
        }
        
        return undefined;
    }
    
    private isValidGroqResponse(response: GroqResponse): boolean {
        return !!(
            response &&
            response.choices &&
            response.choices.length > 0 &&
            response.choices[0].message &&
            response.choices[0].message.content
        );
    }
    
    private extractTextFromGroqResponse(response: GroqResponse): string | undefined {
        if (!this.isValidGroqResponse(response)) {
            return undefined;
        }
        
        return response.choices[0].message.content.trim();
    }
    
    private async getApiKey(): Promise<string | undefined> {
        // Essayer d'abord de récupérer la clé configurée par l'utilisateur
        let apiKey = this.configuration.getGroqApiKey();
        
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