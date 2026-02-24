import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

export class AstContextProvider {
    private project: Project;

    constructor(workspaceRoot: string) {
        const tsConfigPath = path.join(workspaceRoot, 'tsconfig.json');

        if (fs.existsSync(tsConfigPath)) {
            this.project = new Project({
                tsConfigFilePath: tsConfigPath,
                skipAddingFilesFromTsConfig: false,
            });
        } else {
            this.project = new Project();
        }
    }

    /**
     * Gets the source file for a given path, adding it to the project if necessary.
     */
    getSourceFile(filePath: string): SourceFile | undefined {
        let sf = this.project.getSourceFile(filePath);
        if (!sf && fs.existsSync(filePath)) {
            sf = this.project.addSourceFileAtPath(filePath);
        }
        return sf;
    }

    /**
     * Finds the most specific AST node at a given line number.
     */
    getNodeAtLine(sourceFile: SourceFile, lineNumber: number): Node | undefined {
        const lines = sourceFile.getFullText().split('\n');
        let pos = 0;
        // Since lineNumber is 0-indexed, we skip (lineNumber) lines to get to the start of that line
        for (let i = 0; i < lineNumber; i++) {
            if (i < lines.length) {
                pos += lines[i].length + 1; // +1 for newline
            }
        }
        return sourceFile.getDescendantAtPos(pos);
    }

    /**
     * Gets the surrounding context for a line, such as the containing function or class.
     */
    getContextAtLine(sourceFile: SourceFile, lineNumber: number) {
        const node = this.getNodeAtLine(sourceFile, lineNumber);
        if (!node) return undefined;

        const container = node.getFirstAncestor(a =>
            Node.isFunctionDeclaration(a) ||
            Node.isMethodDeclaration(a) ||
            Node.isArrowFunction(a) ||
            Node.isClassDeclaration(a)
        );

        return {
            node,
            container,
            containerName: container && (Node.isFunctionDeclaration(container) || Node.isMethodDeclaration(container) || Node.isClassDeclaration(container))
                ? container.getName()
                : 'anonymous'
        };
    }

    /**
     * Checks if a node is part of an async flow.
     */
    isAsyncContext(node: Node): boolean {
        const container = node.getFirstAncestor(a =>
            Node.isFunctionDeclaration(a) ||
            Node.isMethodDeclaration(a) ||
            Node.isArrowFunction(a)
        );

        if (!container) return false;

        if (Node.isFunctionDeclaration(container) || Node.isMethodDeclaration(container)) {
            return container.isAsync();
        }

        if (Node.isArrowFunction(container)) {
            return container.isAsync();
        }

        return false;
    }
}
