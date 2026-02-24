import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    public static init() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('Change Impact Guard');
        }
    }

    public static info(message: string) {
        this.log('INFO', message);
    }

    public static warn(message: string) {
        this.log('WARN', message);
    }

    public static error(message: string, error?: any) {
        this.log('ERROR', `${message} ${error ? JSON.stringify(error) : ''}`);
        if (error instanceof Error) {
            console.error(error);
        }
    }

    private static log(level: string, message: string) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level}] ${message}`;
        this.outputChannel.appendLine(logLine);
    }

    public static show() {
        this.outputChannel.show();
    }
}
