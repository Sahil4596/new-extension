import * as vscode from 'vscode';
import { RiskAnalysis, RiskLevel } from '../core/RiskScorer';

export class ImpactReportViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'changeImpactReport';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'analyze':
                    vscode.commands.executeCommand('change-impact-guard.analyzeImpact');
                    break;
                case 'applyFix':
                    vscode.commands.executeCommand('change-impact-guard.fixRisk', data.risk);
                    break;
                case 'previewFix':
                    vscode.commands.executeCommand('change-impact-guard.previewFix', data.risk);
                    break;
            }
        });
    }

    public updateReport(analysis: RiskAnalysis, changedFiles: string[], affectedFiles: string[]) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                analysis,
                changedFiles: changedFiles.map(f => vscode.workspace.asRelativePath(f)),
                affectedFiles: affectedFiles.map(f => vscode.workspace.asRelativePath(f))
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Impact Report</title>
                <style>
                    :root {
                        --padding: 12px;
                        --card-bg: var(--vscode-sideBar-background);
                        --border-radius: 6px;
                    }
                    body { 
                        font-family: var(--vscode-font-family); 
                        color: var(--vscode-foreground); 
                        padding: var(--padding);
                        margin: 0;
                        background: var(--vscode-editor-background);
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin: 10px 0 16px 0;
                    }
                    .risk-badge { 
                        padding: 4px 10px; 
                        border-radius: 20px; 
                        font-weight: 600; 
                        font-size: 0.85em;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .risk-low { border: 1px solid #28a745; color: #28a745; background: rgba(40, 167, 69, 0.1); }
                    .risk-medium { border: 1px solid #ffbc00; color: #ffbc00; background: rgba(255, 188, 0, 0.1); }
                    .risk-high { border: 1px solid #dc3545; color: #dc3545; background: rgba(220, 53, 69, 0.1); }
                    
                    .card {
                        background: var(--card-bg);
                        border-radius: var(--border-radius);
                        padding: 12px;
                        margin-bottom: 12px;
                        border: 1px solid var(--vscode-panel-border);
                        animation: fadeIn 0.4s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .section-title { 
                        font-size: 0.75em; 
                        font-weight: bold;
                        color: var(--vscode-descriptionForeground);
                        text-transform: uppercase;
                        margin-bottom: 10px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    ul { list-style: none; padding: 0; margin: 0; }
                    li { 
                        margin-bottom: 8px; 
                        font-size: 0.9em; 
                        line-height: 1.4;
                        padding-left: 4px;
                        border-left: 2px solid transparent;
                        transition: all 0.2s;
                    }
                    li:hover {
                        border-left-color: var(--vscode-focusBorder);
                        padding-left: 8px;
                    }
                    .description {
                        font-size: 0.85em;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 2px;
                        white-space: pre-wrap;
                    }
                    .blast-radius {
                        display: flex;
                        gap: 12px;
                        margin-top: 8px;
                    }
                    .stat {
                        flex: 1;
                        text-align: center;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 4px;
                    }
                    .stat-value { font-size: 1.2em; font-weight: bold; }
                    .stat-label { font-size: 0.7em; opacity: 0.7; }

                    button { 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground); 
                        border: none; 
                        padding: 8px 16px; 
                        cursor: pointer; 
                        width: 100%; 
                        border-radius: 4px;
                        font-weight: 500;
                        transition: background 0.2s;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    
                    button.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        margin-top: 8px;
                        font-size: 0.85em;
                        padding: 6px 12px;
                    }
                    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

                    .fix-btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        margin-top: 8px;
                        background: rgba(30, 215, 96, 0.15);
                        color: #1ed760;
                        border: 1px solid #1ed760;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 0.8em;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .fix-btn:hover {
                        background: #1ed760;
                        color: #000;
                    }

                    .empty { color: var(--vscode-descriptionForeground); font-style: italic; font-size: 0.9em; padding: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div id="content">
                    <div class="empty">
                        <p>No analysis run yet.</p>
                        <p style="font-size: 0.8em">Modify files to see real-time impact.</p>
                    </div>
                </div>
                <div style="padding: 0 var(--padding)">
                    <button onclick="analyze()">Analyze Staged Changes</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let currentAnalysis = null;

                    function analyze() {
                        vscode.postMessage({ type: 'analyze' });
                    }

                    function applyFix(index) {
                        if (currentAnalysis && currentAnalysis.risks[index]) {
                            vscode.postMessage({ 
                                type: 'applyFix', 
                                risk: currentAnalysis.risks[index] 
                            });
                        }
                    }

                    function previewFix(index) {
                        if (currentAnalysis && currentAnalysis.risks[index]) {
                            vscode.postMessage({ 
                                type: 'previewFix', 
                                risk: currentAnalysis.risks[index] 
                            });
                        }
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'update') {
                            const { analysis, changedFiles, affectedFiles } = message;
                            currentAnalysis = analysis;
                            const container = document.getElementById('content');
                            
                            container.innerHTML = \`
                                <div class="header">
                                    <h3 style="margin:0; font-size: 1.1em">Review Insights</h3>
                                    <div class="risk-badge risk-\${analysis.level.toLowerCase()}">\${analysis.level} Risk</div>
                                </div>
                                
                                <div class="card">
                                    <div class="section-title">🚀 Blast Radius</div>
                                    <div class="blast-radius">
                                        <div class="stat">
                                            <div class="stat-value">\${changedFiles.length}</div>
                                            <div class="stat-label">Files</div>
                                        </div>
                                        <div class="stat">
                                            <div class="stat-value">\${affectedFiles.length}</div>
                                            <div class="stat-label">Affected</div>
                                        </div>
                                        <div class="stat">
                                            <div class="stat-value">\${analysis.score}</div>
                                            <div class="stat-label">Score</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card">
                                    <div class="section-title">🔍 Detailed Findings</div>
                                    <ul>\${analysis.risks.map((risk, index) => {
                                        const [title, ...desc] = (risk.reason || '').split('\\n');
                                        const isSecondary = risk.priority < 70;
                                        return \`<li style="\${isSecondary ? 'opacity: 0.8; font-size: 0.85em' : ''}">
                                            <div style="display:flex; justify-content:space-between; align-items: flex-start">
                                                <span>\${title}</span>
                                                \${isSecondary ? '<span style="font-size: 0.8em; opacity: 0.6">Notice</span>' : ''}
                                            </div>
                                            <div class="description">\${desc.join('\\n').replace('→ ', '')}</div>
                                            \${risk.file ? \`<div style="font-size: 0.8em; opacity: 0.6; margin-top:4px">📍 \${risk.file.split('/').pop()}:L\${risk.line + 1}</div>\` : ''}
                                            <div style="margin-top: 6px; font-style: italic; font-size: 0.9em; color: var(--vscode-textLink-foreground)">
                                                💡 \${risk.suggestion}
                                            </div>
                                            \${risk.canFix ? \`
                                                <div style="display:flex; gap: 8px; margin-top: 8px">
                                                    <button class="fix-btn" style="flex:1" onclick="applyFix(\${index})">
                                                        ✨ Apply Fix
                                                    </button>
                                                    <button class="fix-btn" style="flex:1; background: rgba(255,255,255,0.05); color: var(--vscode-foreground); border-color: var(--vscode-panel-border)" onclick="previewFix(\${index})">
                                                        👁️ Preview
                                                    </button>
                                                </div>
                                            \` : ''}
                                        </li>\`;
                                    }).join('') || '<li class="empty">No critical risks detected</li>'}</ul>
                                </div>
                            \`;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

