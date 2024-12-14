// src/lib/llm.ts
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './types';

export class LLMService {
    private openai: OpenAI;
    private anthropic: Anthropic;
    private activeProvider: LLMProvider;

    constructor(config: { openaiKey: string; anthropicKey: string; provider: LLMProvider }) {
        this.openai = new OpenAI({ apiKey: config.openaiKey, dangerouslyAllowBrowser: true });
        this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
        this.activeProvider = config.provider;
    }

    async generateContent(prompt: string): Promise<string> {
        try {
            if (this.activeProvider === 'gpt4') {
                const response = await this.openai.chat.completions.create({
                    model: 'gpt-4o',  // Using the specific model you mentioned
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                });
                return response.choices[0].message.content || '';
            } else {
                const response = await this.anthropic.messages.create({
                    model: 'claude-3-sonnet-20241022',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                });
                return response.content[0].text;
            }
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async compressContent(content: string): Promise<string> {
        const prompt = `Compress the following content while maintaining key information and narrative flow: ${content}`;
        return this.generateContent(prompt);
    }

    async generateBridge(currentContent: string, nextOutline: string): Promise<string> {
        const prompt = `Create a smooth narrative bridge between:\n${currentContent}\n\nAnd the next section about:\n${nextOutline}`;
        return this.generateContent(prompt);
    }
}