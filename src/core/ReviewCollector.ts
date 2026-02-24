import { GitManager } from '../services/GitManager';
import { HunkParser, DiffHunk } from './HunkParser';

export interface ChangedFile {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    hunks: DiffHunk[];
}

export class ReviewCollector {
    private gitManager: GitManager;

    constructor(workspaceRoot: string) {
        this.gitManager = new GitManager(workspaceRoot);
    }

    /**
     * Collects all changes in the workspace and parses them into structured hunks.
     */
    async collectChanges(): Promise<ChangedFile[]> {
        const changedFilesPaths = await this.gitManager.getChangedFiles();
        const changedFiles: ChangedFile[] = [];

        for (const filePath of changedFilesPaths) {
            const rawDiff = await this.gitManager.getDiff(filePath);
            const hunks = HunkParser.parse(rawDiff);

            // For simplicity, we assume 'modified' if hunks exist, 
            // but in a more robust version we'd check git status more carefully.
            changedFiles.push({
                path: filePath,
                status: 'modified',
                hunks: hunks.filter(h => h.file.includes(filePath.split('/').pop() || ''))
            });
        }

        return changedFiles;
    }
}
