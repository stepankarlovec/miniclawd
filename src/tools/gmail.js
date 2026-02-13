import { Tool } from './base.js';
import { z } from 'zod';
import { google } from 'googleapis';
import chalk from 'chalk';

export class GmailManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.oAuth2Client = null;
        this.gmail = null;
    }

    async init() {
        try {
            const config = this.configManager.get();
            if (config.gmail_client_id && config.gmail_client_secret) {
                this.oAuth2Client = new google.auth.OAuth2(
                    config.gmail_client_id,
                    config.gmail_client_secret,
                    'urn:ietf:wg:oauth:2.0:oob' // For headless/CLI
                );

                if (config.gmail_token) {
                    this.oAuth2Client.setCredentials(config.gmail_token);
                    this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
                }
            }
        } catch (error) {
            console.error(chalk.red("Gmail Init Error:", error.message));
        }
    }

    getAuthUrl() {
        if (!this.oAuth2Client) throw new Error("Gmail Client ID/Secret not configured.");
        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.modify'],
        });
    }

    async authenticate(code) {
        if (!this.oAuth2Client) throw new Error("Gmail Client ID/Secret not configured.");
        try {
            const { tokens } = await this.oAuth2Client.getToken(code);
            this.oAuth2Client.setCredentials(tokens);

            // Save tokens
            await this.configManager.update({ gmail_token: tokens });
            this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
            return "Authentication successful!";
        } catch (error) {
            throw new Error(`Failed to exchange code for token: ${error.message}`);
        }
    }

    isConfigured() {
        return !!this.oAuth2Client;
    }

    isAuthenticated() {
        return !!this.gmail;
    }
}

export class GmailAuthTool extends Tool {
    constructor(gmailManager) {
        super(
            'gmail_authenticate',
            'Exchange an authorization code for a token. Use this when the user provides an auth code.',
            z.object({
                code: z.string().describe('The authorization code provided by the user'),
            })
        );
        this.gmailManager = gmailManager;
    }

    async execute({ code }) {
        try {
            return await this.gmailManager.authenticate(code);
        } catch (error) {
            return `Authentication failed: ${error.message}`;
        }
    }
}

export class GmailSendTool extends Tool {
    constructor(gmailManager) {
        super(
            'gmail_send_email',
            'Send an email.',
            z.object({
                to: z.string().describe('Recipient email address'),
                subject: z.string().describe('Email subject'),
                body: z.string().describe('Email body content'),
            })
        );
        this.gmailManager = gmailManager;
    }

    async execute({ to, subject, body }) {
        if (!this.gmailManager.isConfigured()) return "Error: Gmail Client ID/Secret not missing in config.";
        if (!this.gmailManager.isAuthenticated()) {
            return `Error: Not authenticated. Please authorize here: ${this.gmailManager.getAuthUrl()} and then use the 'gmail_authenticate' tool with the code.`;
        }

        try {
            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `To: ${to}`,
                'Content-Type: text/plain; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                body,
            ];
            const message = messageParts.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await this.gmailManager.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });
            return `Email sent! ID: ${res.data.id}`;
        } catch (error) {
            return `Error sending email: ${error.message}`;
        }
    }
}

export class GmailReadTool extends Tool {
    constructor(gmailManager) {
        super(
            'gmail_read_recent',
            'Read recent emails.',
            z.object({
                count: z.number().optional().default(5).describe('Number of emails to read (max 10)'),
            })
        );
        this.gmailManager = gmailManager;
    }

    async execute({ count = 5 }) {
        if (!this.gmailManager.isConfigured()) return "Error: Gmail Client ID/Secret not missing in config.";
        if (!this.gmailManager.isAuthenticated()) {
            return `Error: Not authenticated. Please authorize here: ${this.gmailManager.getAuthUrl()} and then use the 'gmail_authenticate' tool with the code.`;
        }

        try {
            const res = await this.gmailManager.gmail.users.messages.list({
                userId: 'me',
                maxResults: Math.min(count, 10),
            });

            if (!res.data.messages || res.data.messages.length === 0) {
                return "No new messages found.";
            }

            const emails = [];
            for (const message of res.data.messages) {
                const msg = await this.gmailManager.gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                });

                const headers = msg.data.payload.headers;
                const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
                const from = headers.find((h) => h.name === 'From')?.value || '(Unknown)';
                const snippet = msg.data.snippet;

                emails.push(`- From: ${from}\n  Subject: ${subject}\n  Snippet: ${snippet}`);
            }

            return emails.join('\n\n');
        } catch (error) {
            return `Error reading emails: ${error.message}`;
        }
    }
}
