import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';
import * as vscode from 'vscode';
import * as path from 'path';

export class GitManager {
    private git: SimpleGit;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        const options: Partial<SimpleGitOptions> = {
            baseDir: workspaceRoot,
            binary: 'git',
            maxConcurrentProcesses: 6,
        };
        this.git = simpleGit(options);
    }

    /**
     * Gets a list of files that have been modified or are staged for commit using git diff.
     * This ensures we focus only on active changes in the repo.
     */
    async getChangedFiles(): Promise<string[]> {
        try {
            // Get both staged and unstaged changes using name-only
            const results = await Promise.all([
                this.git.diff(['--name-only']),         // Unstaged
                this.git.diff(['--cached', '--name-only']) // Staged
            ]);

            const changedFiles = new Set<string>();
            results.forEach(output => {
                output.split('\n')
                    .map(f => f.trim())
                    .filter(f => f.length > 0)
                    .forEach(f => changedFiles.add(f));
            });

            // Map to absolute paths
            return Array.from(changedFiles).map(f => path.join(this.workspaceRoot, f));
        } catch (error) {
            console.error('Error getting changed files via git diff:', error);
            return [];
        }
    }

    /**
     * Gets the diff content for a specific file.
     */
    async getDiff(filePath: string): Promise<string> {
        try {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            // Diff against HEAD for both staged and unstaged changes
            return await this.git.diff(['HEAD', '--', relativePath]);
        } catch (error) {
            console.error(`Error getting diff for ${filePath}:`, error);
            return '';
        }
    }

    /**
     * Checks if a file is staged.
     */
    async isStaged(filePath: string): Promise<boolean> {
        try {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const status = await this.git.status();
            return status.staged.includes(relativePath);
        } catch (error) {
            return false;
        }
    }
}
