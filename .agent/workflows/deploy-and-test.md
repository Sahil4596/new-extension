---
description: How to package, deploy, and test the Change Impact Guard extension
---

## Option 1: Test in any project (Development Mode)
This is the fastest way to test the extension without a permanent install.

1. Open the "Change Impact Guard" source code folder in VS Code.
2. **Start Debugging**:
   - Go to the **Run** menu > **Start Debugging**.
   - **OR** Click the **Run and Debug** icon in the sidebar and press the green Play button.
   - **OR** Press `Cmd + Shift + P` and type "Debug: Start Debugging".
   - **OR** Press `Fn + F5`.
3. A new window `[Extension Development Host]` will open.
4. In this new window, go to `File > Open Folder...` and select **any other project** (e.g., a real codebase with Git).
5. The extension will run on that repo! You can see the Shield icon in the sidebar.

## Option 2: Install permanently (Local Deployment)
Use this to use the extension every day in your main VS Code instance.

1. Install the VS Code packaging tool:
   ```bash
   npm install -g @vscode/vsce
   ```
2. Build the package:
   ```bash
   vsce package
   ```
3. This creates a `.vsix` file (e.g., `change-impact-guard-0.0.1.vsix`).
4. In VS Code, go to the **Extensions** view (`Cmd+Shift+X`).
5. Click the `...` menu (top right of Extensions panel) and select **Install from VSIX...**.
6. Select the `.vsix` file you just created.

## Option 3: Publish to Marketplace
To share it with the world.

1. Create a [Publisher](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#create-a-publisher).
2. Login to vsce:
   ```bash
   vsce login <publisher-name>
   ```
3. Publish:
   ```bash
   vsce publish
   ```
