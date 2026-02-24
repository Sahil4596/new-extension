# Change Impact Guard

**Change Impact Guard** is a VS Code extension that analyzes your code changes and warns you about potential risks before you commit or push. It helps developers understand the ripple effects of their changes and suggests best practices like adding tests or regression testing affected modules.

## Features

- **Git Integration**: Automatically detects modified and staged files.
- **Dependency Analysis**: Builds a dependency graph for JavaScript/TypeScript projects to identify affected downstream modules.
- **Risk Scoring**: Evaluates changes based on:
  - Critical folder modifications (e.g., `auth`, `payment`).
  - Large volume of file changes.
  - Missing tests for logic changes.
  - Configuration or environment file modifications.
- **Impact Report Sidebar**: Real-time feedback on risk level, affected modules, and improvement suggestions.

## Installation & Testing

### 1. Test in Any Project (Development Mode)
This is the fastest way to test the extension on different repositories without a permanent install.
1. Open this source code folder in VS Code.
2. **Start Debugging**:
   - **Option A**: Press `Fn + F5` (on Mac).
   - **Option B**: Go to the **Run** menu > **Start Debugging**.
   - **Option C**: Click the **Run and Debug** icon in the Activity Bar (Play button) and click the green **"Run Extension"** button.
   - **Option D**: Press `Cmd + Shift + P` and type "Debug: Start Debugging".
3. In the new `[Extension Development Host]` window, open **any other project** (Git-based JS/TS).
4. The extension will run automatically on that repository.

### 2. Local Deployment (Permanent Install)
To use the extension daily in your main VS Code instance:
1. Install the packaging tool: `npm install -g @vscode/vsce`
2. Package the extension: `vsce package`
3. In VS Code, go to the **Extensions** view (`Cmd+Shift+X`).
4. Click `...` > **Install from VSIX...** and select the generated `.vsix` file.

## Configuration

You can define "Critical Paths" in your VS Code settings. Changes in these folders will contribute to a higher risk score.

```json
"changeImpactGuard.criticalPaths": [
    "auth",
    "payment",
    "checkout",
    "db"
]
```

## Architecture

- **GitManager**: Uses `simple-git` to track staged and modified files.
- **DependencyAnalyzer**: Uses `ts-morph` for static analysis of imports.
- **RiskScorer**: A configurable scoring engine that translates code metrics into human-readable risk levels.
- **Webview UI**: A responsive sidebar provider that communicates with the core engine.

## License

MIT
