import * as vscode from 'vscode';
import { ReviewIssue } from './ReviewEngine';

export class FixManager {
    /**
     * Applies an auto-fix for a given issue.
     */
    async applyFix(issue: ReviewIssue): Promise<boolean> {
        if (!issue.autoFix) return false;

        const { replacementText, range } = issue.autoFix;
        const uri = vscode.Uri.file(issue.file);

        const edit = new vscode.WorkspaceEdit();
        const vsRange = new vscode.Range(
            range.startLine, range.startChar,
            range.endLine, range.endChar
        );

        edit.replace(uri, vsRange, replacementText);

        try {
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                const doc = await vscode.workspace.openTextDocument(uri);
                await doc.save(); // Save to trigger re-analysis and update disk
                vscode.window.showInformationMessage(`Applied fix for: ${issue.title}`);
            } else {
                console.warn('applyEdit returned false');
            }
            return success;
        } catch (error) {
            console.error('Failed to apply fix:', error);
            vscode.window.showErrorMessage(`Failed to apply fix: ${error}`);
            return false;
        }
    }

    /**
     * Previews a fix by opening the file and selecting the range.
     */
    async previewFix(issue: ReviewIssue) {
        if (!issue.autoFix) return;

        const uri = vscode.Uri.file(issue.file);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);

        const { range } = issue.autoFix;
        const vsRange = new vscode.Range(
            range.startLine, range.startChar,
            range.endLine, range.endChar
        );

        editor.revealRange(vsRange, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(vsRange.start, vsRange.end);
    }
}
