import * as path from 'path';

export enum RiskLevel {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High'
}

export interface RiskItem {
    priority: number;
    reason: string;
    suggestion: string;
    file?: string;
    line?: number;
    canFix?: boolean;
    fixCommand?: string;
}

export interface RiskAnalysis {
    score: number;
    level: RiskLevel;
    risks: RiskItem[];
}

export class RiskScorer {
    private criticalPaths: string[];

    constructor(criticalPaths: string[]) {
        this.criticalPaths = criticalPaths;
    }

    private featureMap: Record<string, string> = {
        'auth': 'Authentication Logic',
        'api': 'API Configuration',
        'db': 'Database Schema',
        'ui': 'User Interface',
        'core': 'Core Domain Logic',
        'services': 'Backend Services',
        'utils': 'Utility Functions'
    };

    analyze(changedFiles: string[], affectedFiles: string[], diffMap: Map<string, string>): RiskAnalysis {
        const riskItems: RiskItem[] = [];
        let score = 0;

        // 1. Feature-Aware Critical Changes (Severity: Critical)
        const criticalChanges = changedFiles.filter(file =>
            this.criticalPaths.some(cp => file.includes(path.sep + cp + path.sep))
        );

        if (criticalChanges.length > 0) {
            score += criticalChanges.length * 20;
            const features = new Set(criticalChanges.map(f => this.getFeatureName(f)));
            features.forEach(feature => {
                riskItems.push({
                    priority: 100,
                    reason: `🔥 **${feature} modified**\n→ Source of truth for critical system stability.`,
                    suggestion: `Request a secondary review from @${feature.toLowerCase().replace(' ', '-')}-owners.`
                });
            });
        }

        // 2. Missing Tests (Severity: High)
        const logicFiles = changedFiles.filter(f => !this.isTestFile(f) && !this.isConfigFile(f));
        const testFiles = changedFiles.filter(f => this.isTestFile(f));
        if (logicFiles.length > 0 && testFiles.length === 0) {
            score += 40;
            riskItems.push({
                priority: 80,
                reason: '🧪 **Tests not updated**\n→ High risk of regression. Modified logic lacks automated safety nets.',
                suggestion: 'Add unit or integration tests for the modified logic.'
            });
        }

        // 3. Blast Radius (Severity: High)
        if (changedFiles.length > 5) {
            score += 30;
            riskItems.push({
                priority: 70,
                reason: `📦 **Large blast radius (${changedFiles.length} files)**\n→ High risk of unexpected side effects across unrelated modules.`,
                suggestion: 'Consider breaking this change down into smaller, atomic PRs.'
            });
        }

        // 4. Dependency Impact (Severity: Medium/High)
        if (affectedFiles.length > 10) {
            score += 35;
            riskItems.push({
                priority: 60,
                reason: `🛰️ **High dependency impact (${affectedFiles.length} modules)**\n→ Broad ripple effect across the codebase.`,
                suggestion: 'Perform a full regression test suite on affected modules.'
            });
        }

        // 6. Actionable Diff Checks (Severity: Variable)
        for (const [file, diff] of diffMap.entries()) {
            const relPath = path.relative(path.sep, file); // Simple relative path for display

            // Console log check
            if (diff.includes('+') && diff.includes('console.log')) {
                const lines = diff.split('\n');
                lines.forEach((line, index) => {
                    if (line.startsWith('+') && line.includes('console.log')) {
                        riskItems.push({
                            priority: 40,
                            reason: `🚩 **Debug log found** in ${path.basename(file)}\n→ Leftover console.log can clutter production logs.`,
                            suggestion: 'Remove the console.log before committing.',
                            file: file,
                            line: index, // This is a rough estimate from diff
                            canFix: true,
                            fixCommand: 'remove-console'
                        });
                    }
                });
            }

            // Simple Hardcoded Secret Check
            const secretRegex = /(password|secret|apikey|token)\s*[:=]\s*['"].+['"]/i;
            if (diff.includes('+') && secretRegex.test(diff)) {
                riskItems.push({
                    priority: 95,
                    reason: `🔐 **Potential secret leaked** in ${path.basename(file)}\n→ Security risk: Hardcoded credentials detected.`,
                    suggestion: 'Move the secret to an environment variable (.env) or secret manager.',
                    file: file,
                    canFix: false // Too risky to auto-fix, manual intervention required
                });
            }
        }

        // Sort by priority and take top 10 now that we have more granular findings
        const topRisks = riskItems
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 10);

        return {
            score,
            level: this.getRiskLevel(score),
            risks: topRisks
        };
    }

    private getFeatureName(filePath: string): string {
        const parts = filePath.split(path.sep);
        for (const part of parts) {
            if (this.featureMap[part]) {
                return this.featureMap[part];
            }
        }
        return 'Critical Path';
    }

    /**
     * Returns a neutral analysis for when no files are changed.
     */
    emptyAnalysis(): RiskAnalysis {
        return {
            score: 0,
            level: RiskLevel.Low,
            risks: [{
                priority: 0,
                reason: 'No changes detected. Ready to analyze.',
                suggestion: 'Modify some files to see the impact.'
            }]
        };
    }

    private isTestFile(filePath: string): boolean {
        const basename = path.basename(filePath).toLowerCase();
        return basename.includes('.test.') || basename.includes('.spec.') || filePath.includes('__tests__');
    }

    private isConfigFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        return ['.json', '.env', '.yaml', '.yml', '.config.'].some(s => basename.includes(s)) ||
            ['dockerfile', 'makefile'].includes(basename);
    }

    private getRiskLevel(score: number): RiskLevel {
        if (score >= 70) return RiskLevel.High;
        if (score >= 30) return RiskLevel.Medium;
        return RiskLevel.Low;
    }
}
