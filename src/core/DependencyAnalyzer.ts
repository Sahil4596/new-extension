import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

export class DependencyAnalyzer {
    private project: Project;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        const tsConfigPath = path.join(workspaceRoot, 'tsconfig.json');

        if (fs.existsSync(tsConfigPath)) {
            this.project = new Project({
                tsConfigFilePath: tsConfigPath,
                skipAddingFilesFromTsConfig: false,
            });
        } else {
            this.project = new Project();
        }

        // If no tsconfig, fallback to adding all files manually
        if (this.project.getSourceFiles().length === 0) {
            this.project.addSourceFilesAtPaths([
                path.join(workspaceRoot, 'src/**/*.{ts,tsx,js,jsx}'),
                path.join(workspaceRoot, 'lib/**/*.{ts,tsx,js,jsx}'),
            ]);
        }
    }

    /**
     * Refreshes the project files from disk.
     */
    async refresh() {
        // Technically ts-morph doesn't have a simple "refresh all", 
        // but we can tell it to synchronize with the file system if needed.
        // For now, we'll just reload the source files that might have changed.
    }

    /**
     * Finds all modules that directly or indirectly depend on the given file.
     */
    getAffectedFiles(changedFilePath: string): string[] {
        const sourceFile = this.project.getSourceFile(changedFilePath);
        if (!sourceFile) {
            return [];
        }

        const affected = new Set<string>();
        this.findDependentsRecursive(sourceFile, affected);

        // Remove the original file from the list
        affected.delete(changedFilePath);

        return Array.from(affected);
    }

    private findDependentsRecursive(sourceFile: SourceFile, affected: Set<string>) {
        const filePath = sourceFile.getFilePath();

        // Find all files that import this file
        const referencingFiles = sourceFile.getReferencingSourceFiles();

        for (const refFile of referencingFiles) {
            const refPath = refFile.getFilePath();
            if (!affected.has(refPath)) {
                affected.add(refPath);
                this.findDependentsRecursive(refFile, affected);
            }
        }
    }

    /**
     * Gets all source files in the project.
     */
    getAllFiles(): string[] {
        return this.project.getSourceFiles().map(sf => sf.getFilePath());
    }
}
