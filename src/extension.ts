import * as vscode from 'vscode';
import { XMLParser } from 'fast-xml-parser';
import * as path from 'path';

// --- CACHE ---
// Stores parsed completion items to make typing fast
const exportCache = new Map<string, vscode.CompletionItem[]>();

export function activate(context: vscode.ExtensionContext) {
    console.log('MTA SA Nitro: Active');

    // 1. Autocomplete Provider (Triggered by ':')
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'lua',
        { provideCompletionItems: getExportCompletions },
        ':' 
    );

    // 2. Definition Provider (Triggered by F12 or Ctrl+Click)
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        'lua',
        { provideDefinition: getExportDefinition }
    );

    // 3. File Watcher (Clears cache when files change)
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    const clearCache = (uri: vscode.Uri) => {
        for (const resName of exportCache.keys()) {
            if (uri.fsPath.includes(path.sep + resName + path.sep)) {
                exportCache.delete(resName);
            }
        }
    };
    watcher.onDidChange(clearCache);
    watcher.onDidCreate(clearCache);
    watcher.onDidDelete(clearCache);

    context.subscriptions.push(completionProvider, definitionProvider, watcher);
}

// ----------------------------------------------------------------
// FEATURE 1: AUTOCOMPLETION
// ----------------------------------------------------------------
async function getExportCompletions(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    
    // Check if line ends with "exports.resName:"
    const regex = /exports\.(\w+):$|exports\['(.*?)'\]:$/;
    const match = linePrefix.match(regex);
    if (!match) return [];

    const resourceName = match[1] || match[2];
    if (!resourceName) return [];

    // Check Cache
    if (exportCache.has(resourceName)) {
        return new vscode.CompletionList(exportCache.get(resourceName)!, false);
    }

    // Parse Meta and Scripts
    const data = await getResourceData(resourceName);
    if (!data) return [];

    const completionItems: vscode.CompletionItem[] = [];

    for (const exp of data.exports) {
        if (exp.function) {
            // Find arguments for the tooltip
            const args = await findFunctionArgsInScripts(data.rootPath, data.scripts, exp.function);
            
            const item = new vscode.CompletionItem(exp.function, vscode.CompletionItemKind.Method);
            item.sortText = `!${exp.function}`; // Force to top
            item.detail = `${exp.function}(${args}) : ${exp.type || 'shared'}`;
            item.documentation = new vscode.MarkdownString(
                `**Exported Function**\n\n\`${resourceName}:${exp.function}(${args})\``
            );
            item.insertText = new vscode.SnippetString(`${exp.function}(${args})$0`);
            
            completionItems.push(item);
        }
    }

    exportCache.set(resourceName, completionItems);
    return new vscode.CompletionList(completionItems, false);
}

// ----------------------------------------------------------------
// FEATURE 2: GO TO DEFINITION
// ----------------------------------------------------------------
async function getExportDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition | null> {
    // We need to parse the whole line to see if the user clicked on an export
    const lineText = document.lineAt(position).text;
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;

    const clickedWord = document.getText(wordRange);

    // Regex to match "exports.resName:funcName" anywhere in the line
    // Capture groups: 1=resName, 2=funcName OR 3=resName, 4=funcName (bracket syntax)
    const regex = /exports\.(\w+):(\w+)|exports\['(.*?)'\]:(\w+)/g;
    
    let match;
    let targetResource = '';
    let targetFunction = '';

    while ((match = regex.exec(lineText)) !== null) {
        // check if our cursor is inside this match
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        
        if (position.character >= matchStart && position.character <= matchEnd) {
            // We found the export string the user clicked on
            targetResource = match[1] || match[3];
            targetFunction = match[2] || match[4];
            break;
        }
    }

    if (!targetResource || targetFunction !== clickedWord) {
        return null;
    }

    // Find the definition file and line
    const data = await getResourceData(targetResource);
    if (!data) return null;

    const location = await findFunctionLocation(data.rootPath, data.scripts, targetFunction);
    return location;
}

// ----------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------

// 1. Reads meta.xml and returns the list of scripts and exports
async function getResourceData(resourceName: string) {
    const metaFiles = await vscode.workspace.findFiles(`**/${resourceName}/meta.xml`, '**/node_modules/**', 1);
    if (metaFiles.length === 0) return null;

    const metaUri = metaFiles[0];
    const rootPath = path.dirname(metaUri.fsPath);

    try {
        const fileData = await vscode.workspace.fs.readFile(metaUri);
        const xmlContent = Buffer.from(fileData).toString('utf8');
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
        const result = parser.parse(xmlContent);
        const root = result.meta;
        if (!root) return null;

        const exports = root.export ? (Array.isArray(root.export) ? root.export : [root.export]) : [];
        const scripts = root.script ? (Array.isArray(root.script) ? root.script : [root.script]) : [];
        
        const scriptFiles = scripts
            .filter((s: any) => s.src && s.src.endsWith('.lua'))
            .map((s: any) => s.src);

        return { rootPath, scripts: scriptFiles, exports };
    } catch (e) {
        return null;
    }
}

// 2. Scans scripts to find the ARGUMENTS string (for autocomplete)
async function findFunctionArgsInScripts(root: string, scripts: string[], funcName: string): Promise<string> {
    const funcRegex = new RegExp(`function\\s+${funcName}\\s*\\(([^)]*)\\)`);
    
    for (const script of scripts) {
        try {
            const uri = vscode.Uri.file(path.join(root, script));
            const data = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(data).toString('utf8');
            const match = content.match(funcRegex);
            if (match) return match[1].replace(/\s+/g, ' ').trim();
        } catch (e) {}
    }
    return '';
}

// 3. Scans scripts to find the LOCATION (Uri + Position) (for Go to Definition)
async function findFunctionLocation(root: string, scripts: string[], funcName: string): Promise<vscode.Location | null> {
    // Regex that matches "function myFunc"
    const funcRegex = new RegExp(`function\\s+${funcName}\\s*\\(`);

    for (const script of scripts) {
        try {
            const filePath = path.join(root, script);
            const uri = vscode.Uri.file(filePath);
            const data = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(data).toString('utf8');
            
            const lines = content.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (funcRegex.test(lines[i])) {
                    // Found it! Return the location.
                    return new vscode.Location(uri, new vscode.Position(i, 0));
                }
            }
        } catch (e) {}
    }
    return null;
}

export function deactivate() {
    exportCache.clear();
}