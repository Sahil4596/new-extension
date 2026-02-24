export interface DiffHunk {
    file: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: {
        type: 'added' | 'removed' | 'context';
        content: string;
        newLineNumber?: number;
        oldLineNumber?: number;
    }[];
}

export class HunkParser {
    /**
     * Parses a raw git diff string into structured hunks.
     */
    static parse(rawDiff: string): DiffHunk[] {
        const hunks: DiffHunk[] = [];
        const lines = rawDiff.split('\n');

        let currentFile = '';
        let currentHunk: DiffHunk | null = null;
        let oldLinePtr = 0;
        let newLinePtr = 0;

        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                // Parse file name from diff --git a/path/to/file b/path/to/file
                const match = line.match(/b\/(.+)$/);
                if (match) currentFile = match[1];
                continue;
            }

            if (line.startsWith('@@')) {
                // Parse hunk header @@ -oldStart,oldLines +newStart,newLines @@
                const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
                if (match) {
                    const oldStart = parseInt(match[1]);
                    const oldLines = match[2] ? parseInt(match[2]) : 1;
                    const newStart = parseInt(match[3]);
                    const newLines = match[4] ? parseInt(match[4]) : 1;

                    currentHunk = {
                        file: currentFile,
                        oldStart,
                        oldLines,
                        newStart,
                        newLines,
                        lines: []
                    };
                    hunks.push(currentHunk);
                    oldLinePtr = oldStart - 1;
                    newLinePtr = newStart - 1;
                }
                continue;
            }

            if (currentHunk) {
                if (line.startsWith('+')) {
                    currentHunk.lines.push({
                        type: 'added',
                        content: line.substring(1),
                        newLineNumber: newLinePtr++
                    });
                } else if (line.startsWith('-')) {
                    currentHunk.lines.push({
                        type: 'removed',
                        content: line.substring(1),
                        oldLineNumber: oldLinePtr++
                    });
                } else if (line.startsWith(' ')) {
                    currentHunk.lines.push({
                        type: 'context',
                        content: line.substring(1),
                        oldLineNumber: oldLinePtr++,
                        newLineNumber: newLinePtr++
                    });
                }
            }
        }

        return hunks;
    }
}
