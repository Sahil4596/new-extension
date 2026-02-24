import * as vscode from 'vscode';
import { ReviewIssue } from './ReviewEngine';

export class DiagnosticsManager {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('change-impact-review');
    }

    /**
     * Updates the diagnostics in the editor based on the provided issues.
     */
    updateDiagnostics(issues: ReviewIssue[]) {
        this.diagnosticCollection.clear();

        const issuesByFile = new Map<string, ReviewIssue[]>();
        for (const issue of issues) {
            const fileIssues = issuesByFile.get(issue.file) || [];
            fileIssues.push(issue);
            issuesByFile.set(issue.file, fileIssues);
        }

        for (const [file, fileIssues] of issuesByFile.entries()) {
            const diagnostics: vscode.Diagnostic[] = fileIssues.map(issue => {
                const range = new vscode.Range(
                    issue.lineStart, 0,
                    issue.lineEnd, 100 // End column can be approximated
                );

                const diagnostic = new vscode.Diagnostic(
                    range,
                    `${issue.title}: ${issue.explanation}`,
                    this.mapSeverity(issue.severity)
                );

                diagnostic.source = 'Impact Guard';
                diagnostic.code = issue.title;

                return diagnostic;
            });

            this.diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
        }
    }

    private mapSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error': return vscode.DiagnosticSeverity.Error;
            case 'warn': return vscode.DiagnosticSeverity.Warning;
            case 'info': return vscode.DiagnosticSeverity.Information;
            default: return vscode.DiagnosticSeverity.Information;
        }
    }

    dispose() {
        this.diagnosticCollection.dispose();
    }
}
