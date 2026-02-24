import { SourceFile, Node, SyntaxKind } from 'ts-morph';
import { DiffHunk } from './HunkParser';
import { AstContextProvider } from './AstContextProvider';
import * as fs from 'fs';
import * as path from 'path';

export type Severity = 'info' | 'warn' | 'error';

export interface ReviewIssue {
    severity: Severity;
    title: string;
    explanation: string;
    suggestion: string;
    file: string;
    lineStart: number;
    lineEnd: number;
    confidence: number;
    autoFix?: {
        replacementText: string;
        range: { startLine: number; startChar: number; endLine: number; endChar: number };
    };
}

export interface RuleContext {
    hunk: DiffHunk;
    sourceFile?: SourceFile;
    astProvider: AstContextProvider;
    config?: any;
}

export interface Rule {
    name: string;
    evaluate(context: RuleContext): ReviewIssue[];
}

// --- Rules ---

export class NoConsoleLogRule implements Rule {
    name = 'no-console-log';
    evaluate(context: RuleContext): ReviewIssue[] {
        const issues: ReviewIssue[] = [];
        context.hunk.lines.forEach(line => {
            if (line.type === 'added' && line.content.includes('console.log')) {
                issues.push({
                    severity: 'warn',
                    title: 'Console Log Detected',
                    explanation: 'Debug logs should not be committed to production.',
                    suggestion: 'Remove the console.log statement.',
                    file: context.hunk.file,
                    lineStart: line.newLineNumber!,
                    lineEnd: line.newLineNumber!,
                    confidence: 100,
                    autoFix: {
                        replacementText: '',
                        range: {
                            startLine: line.newLineNumber!,
                            startChar: 0,
                            endLine: line.newLineNumber! + 1,
                            endChar: 0
                        }
                    }
                });
            }
        });
        return issues;
    }
}

export class NoAnyRule implements Rule {
    name = 'no-any-type';
    evaluate(context: RuleContext): ReviewIssue[] {
        const issues: ReviewIssue[] = [];
        if (!context.sourceFile) return issues;

        context.hunk.lines.forEach(line => {
            if (line.type === 'added' && line.content.includes(': any')) {
                const node = context.astProvider.getNodeAtLine(context.sourceFile!, line.newLineNumber!);
                if (node && node.getKind() === SyntaxKind.AnyKeyword) {
                    issues.push({
                        severity: 'error',
                        title: 'Unsafe "any" Type',
                        explanation: 'Using "any" circumvents TypeScript\'s type safety.',
                        suggestion: 'Use a more specific type.',
                        file: context.hunk.file,
                        lineStart: line.newLineNumber!,
                        lineEnd: line.newLineNumber!,
                        confidence: 90
                    });
                }
            }
        });
        return issues;
    }
}

export class NoRemovedAwaitRule implements Rule {
    name = 'no-removed-await';
    evaluate(context: RuleContext): ReviewIssue[] {
        const issues: ReviewIssue[] = [];
        const removedLines = context.hunk.lines.filter(l => l.type === 'removed');
        const addedLines = context.hunk.lines.filter(l => l.type === 'added');

        removedLines.forEach(rl => {
            if (rl.content.includes('await ')) {
                // Check if the same logic exists in added lines without await
                const baseContent = rl.content.replace('await ', '').trim();
                const matchedAdded = addedLines.find(al => al.content.trim() === baseContent);

                if (matchedAdded) {
                    issues.push({
                        severity: 'error',
                        title: 'Potential Race Condition',
                        explanation: 'Removing "await" from an asynchronous call can lead to race conditions or unexpected behavior if the result is needed.',
                        suggestion: 'Ensure the call does not need to be awaited or restore the "await".',
                        file: context.hunk.file,
                        lineStart: matchedAdded.newLineNumber!,
                        lineEnd: matchedAdded.newLineNumber!,
                        confidence: 85,
                        autoFix: {
                            replacementText: matchedAdded.content.replace(baseContent, 'await ' + baseContent),
                            range: { startLine: matchedAdded.newLineNumber!, startChar: 0, endLine: matchedAdded.newLineNumber!, endChar: matchedAdded.content.length }
                        }
                    });
                }
            }
        });
        return issues;
    }
}

export class PayloadGuardRule implements Rule {
    name = 'payload-guard';
    evaluate(context: RuleContext): ReviewIssue[] {
        const issues: ReviewIssue[] = [];
        if (!context.sourceFile) return issues;

        // Check if the modified file contains interface or type changes related to "Response", "Payload", or "Dto"
        context.hunk.lines.forEach(line => {
            if (line.type === 'added' || line.type === 'removed') {
                const targetLine = line.newLineNumber ?? rlLineToNew(line, context.hunk) ?? 0;
                const node = context.astProvider.getNodeAtLine(context.sourceFile!, targetLine);
                // Simple heuristic: check if line is inside an interface with naming conventions
                const container = node?.getFirstAncestor(a =>
                    Node.isInterfaceDeclaration(a) ||
                    Node.isTypeAliasDeclaration(a)
                );

                if (container) {
                    const name = (container as any).getName?.() || '';
                    if (/Response|Payload|Dto|Interface/i.test(name)) {
                        issues.push({
                            severity: 'warn',
                            title: 'Shared Payload Changed',
                            explanation: `Modification to ${name} might break downstream consumers or mobile clients.`,
                            suggestion: 'Verify that this change is backward compatible.',
                            file: context.hunk.file,
                            lineStart: targetLine,
                            lineEnd: targetLine,
                            confidence: 70
                        });
                    }
                }
            }
        });
        return issues;
    }
}

function rlLineToNew(rl: any, hunk: any) {
    return hunk.lines.find((l: any) => l.type === 'context' && l.oldLineNumber === rl.oldLineNumber)?.newLineNumber;
}

export class ReviewEngine {
    private rules: Rule[] = [];
    private astProvider: AstContextProvider;
    private config: any = {};

    constructor(astProvider: AstContextProvider, workspaceRoot?: string) {
        this.astProvider = astProvider;
        this.loadConfig(workspaceRoot);

        this.rules = [
            new NoConsoleLogRule(),
            new NoAnyRule(),
            new NoRemovedAwaitRule(),
            new PayloadGuardRule()
        ];
    }

    private loadConfig(workspaceRoot?: string) {
        if (!workspaceRoot) return;
        const configPath = path.join(workspaceRoot, 'impactguard.config.json');
        if (fs.existsSync(configPath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } catch (e) {
                console.error('Failed to load impactguard.config.json', e);
            }
        }
    }

    evaluateHunks(hunks: DiffHunk[]): ReviewIssue[] {
        const allIssues: ReviewIssue[] = [];

        for (const hunk of hunks) {
            const sourceFile = this.astProvider.getSourceFile(hunk.file);
            const context: RuleContext = {
                hunk,
                sourceFile,
                astProvider: this.astProvider,
                config: this.config
            };

            for (const rule of this.rules) {
                // Check if rule is disabled in config
                if (this.config.rules && this.config.rules[rule.name] === false) continue;

                const issues = rule.evaluate(context);
                allIssues.push(...issues);
            }
        }

        return allIssues;
    }
}
