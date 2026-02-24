import { GitManager } from './services/GitManager';
import { DependencyAnalyzer } from './core/DependencyAnalyzer';
import { RiskScorer } from './core/RiskScorer';
import * as path from 'path';

async function runDemo() {
    const testRepoRoot = path.join(process.cwd(), 'test-repo');
    console.log(`--- Starting Verification in ${testRepoRoot} ---`);

    const gitManager = new GitManager(testRepoRoot);
    const dependencyAnalyzer = new DependencyAnalyzer(testRepoRoot);
    const riskScorer = new RiskScorer(['auth', 'payment']);

    console.log('\n1. Detecting Changed Files...');
    const changedFiles = await gitManager.getChangedFiles();
    console.log('Changed Files:', changedFiles.map(f => path.relative(testRepoRoot, f)));

    console.log('\n2. Analyzing Dependencies...');
    const affectedFilesSet = new Set<string>();
    for (const file of changedFiles) {
        const affected = dependencyAnalyzer.getAffectedFiles(file);
        affected.forEach(f => affectedFilesSet.add(f));
    }
    const affectedFiles = Array.from(affectedFilesSet);
    console.log('Affected Modules:', affectedFiles.map(f => path.relative(testRepoRoot, f)));

    console.log('\n3. Calculating Risk Score...');
    const analysis = riskScorer.analyze(changedFiles, affectedFiles, new Map());

    console.log('\n--- IMPACT REPORT ---');
    console.log(`RISK LEVEL: ${analysis.level}`);
    console.log(`SCORE: ${analysis.score}`);
    console.log('RISK DETAILS:');
    analysis.risks.forEach(risk => {
        console.log(`\n - [Priority: ${risk.priority}] ${risk.reason}`);
        console.log(`   Suggestion: ${risk.suggestion}`);
    });
}

runDemo().catch(console.error);
