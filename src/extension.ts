import * as vscode from 'vscode';
import { GitManager } from './services/GitManager';
import { DependencyAnalyzer } from './core/DependencyAnalyzer';
import { RiskScorer, RiskLevel } from './core/RiskScorer';
import { ImpactReportViewProvider } from './ui/ImpactReportView';
import { Logger } from './services/Logger';
import { TelemetryService } from './services/TelemetryService';
import { ReviewCollector } from './core/ReviewCollector';
import { AstContextProvider } from './core/AstContextProvider';
import { ReviewEngine, ReviewIssue } from './core/ReviewEngine';
import { DiagnosticsManager } from './core/DiagnosticsManager';
import { FixManager } from './core/FixManager';

export function activate(context: vscode.ExtensionContext) {
    Logger.init();
    Logger.info('Change Impact Guard activating...');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        Logger.warn('No workspace folder found. Activation aborted.');
        return;
    }

    try {
        // Initialize Core Services
        Logger.info(`Initializing Advanced Review Engine for: ${workspaceRoot}`);

        const reviewCollector = new ReviewCollector(workspaceRoot);
        const astProvider = new AstContextProvider(workspaceRoot);
        const reviewEngine = new ReviewEngine(astProvider, workspaceRoot);
        const diagnosticsManager = new DiagnosticsManager();
        const fixManager = new FixManager();
        const dependencyAnalyzer = new DependencyAnalyzer(workspaceRoot);

        // UI Provider
        const provider = new ImpactReportViewProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ImpactReportViewProvider.viewType, provider),
            diagnosticsManager
        );

        let analysisTimer: NodeJS.Timeout | undefined;

        const runAnalysis = async (isAuto = false) => {
            const startTime = Date.now();
            Logger.info(`Starting Advanced Review (auto: ${isAuto})...`);

            try {
                // 1. Collect structured changes (hunks)
                const changedFiles = await reviewCollector.collectChanges();
                if (changedFiles.length === 0) {
                    Logger.info('No changes detected.');
                    provider.updateReport({ score: 0, level: RiskLevel.Low, risks: [] }, [], []);
                    diagnosticsManager.updateDiagnostics([]);
                    return;
                }

                // 2. Perform deep semantic review
                const allHunks = changedFiles.flatMap(f => f.hunks);
                const issues = reviewEngine.evaluateHunks(allHunks);

                // 3. Perform legacy dependency analysis (for blast radius)
                const changedPaths = changedFiles.map(f => f.path);
                const affectedFilesSet = new Set<string>();
                for (const path of changedPaths) {
                    const affected = dependencyAnalyzer.getAffectedFiles(path);
                    affected.forEach(f => affectedFilesSet.add(f));
                }
                const affectedFiles = Array.from(affectedFilesSet);

                // 4. Update UI and Diagnostics
                // Map ReviewIssues to the UI format (backwards compatible for now)
                const uiRisks = issues.map(issue => ({
                    priority: issue.severity === 'error' ? 90 : (issue.severity === 'warn' ? 70 : 40),
                    reason: `${issue.title}\n${issue.explanation}`,
                    suggestion: issue.suggestion,
                    file: issue.file,
                    line: issue.lineStart,
                    canFix: !!issue.autoFix,
                    autoFix: issue.autoFix, // Preserve autoFix data for the UI
                    title: issue.title,
                    explanation: issue.explanation,
                    fixCommand: 'fix'
                }));

                // Dummy for status, actual risk scoring is now based on issues
                const analysis = {
                    score: issues.length * 10,
                    level: issues.some(i => i.severity === 'error') ? RiskLevel.High : (issues.length > 0 ? RiskLevel.Medium : RiskLevel.Low),
                    risks: uiRisks
                };

                provider.updateReport(analysis, changedPaths, affectedFiles);
                diagnosticsManager.updateDiagnostics(issues);

                const duration = Date.now() - startTime;
                Logger.info(`Review completed in ${duration}ms. Found ${issues.length} issues.`);
            } catch (error) {
                Logger.error('Review failed', error);
            }
        };

        const debouncedAnalysis = () => {
            if (analysisTimer) {
                clearTimeout(analysisTimer);
            }
            analysisTimer = setTimeout(() => runAnalysis(true), 1000);
        };

        // Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('change-impact-guard.analyzeImpact', async () => {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Performing Smart Review...",
                    cancellable: false
                }, () => runAnalysis());
            }),

            vscode.commands.registerCommand('change-impact-guard.fixRisk', async (issue: any) => {
                Logger.info(`Applying fix for ${issue.title} in ${issue.file}`);
                await fixManager.applyFix(issue);
                // runAnalysis will be triggered by the file save in FixManager
            }),

            vscode.commands.registerCommand('change-impact-guard.previewFix', async (issue: ReviewIssue) => {
                await fixManager.previewFix(issue);
            }),

            vscode.commands.registerCommand('change-impact-guard.configureCriticalPaths', () => {
                vscode.commands.executeCommand('workbench.action.openSettings', 'changeImpactGuard.criticalPaths');
            })
        );

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');
        watcher.onDidChange(() => debouncedAnalysis());
        watcher.onDidCreate(() => debouncedAnalysis());
        watcher.onDidDelete(() => debouncedAnalysis());
        context.subscriptions.push(watcher);

        // Initial analysis
        runAnalysis(true);
        Logger.info('Advanced Review Engine active.');

    } catch (error) {
        Logger.error('Failed to activate extension', error);
    }
}

export function deactivate() {
    Logger.info('Change Impact Guard deactivating...');
}
