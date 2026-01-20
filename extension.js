"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const fast_xml_parser_1 = require("fast-xml-parser");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    console.log('MTA SA Nitro Extension is now active!');
    // Register the completion provider for Lua files
    const provider = vscode.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems(document, position) {
            return getExportCompletions(document, position);
        }
    }, ':' // Trigger the provider when the user types ':'
    );
    context.subscriptions.push(provider);
}
async function getExportCompletions(document, position) {
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    // 2. Regex to match "exports.resourceName:" or "exports['resourceName']:"
    // This regex captures the resource name in group 1 or group 2
    const regex = /exports\.(\w+):$|exports\['(.*?)'\]:$/;
    const match = linePrefix.match(regex);
    if (!match) {
        return [];
    }
    // Extract the resource name (e.g., "admin" from exports.admin:)
    const resourceName = match[1] || match[2];
    if (!resourceName) {
        return [];
    }
    // 3. Find the meta.xml for this resource in the workspace
    // We look for any folder matching the resource name that contains a meta.xml
    const metaFiles = await vscode.workspace.findFiles(`**/${resourceName}/meta.xml`, '**/node_modules/**', 1);
    if (metaFiles.length === 0) {
        return [];
    }
    const metaUri = metaFiles[0];
    try {
        // 4. Read and Parse meta.xml
        const fileData = await vscode.workspace.fs.readFile(metaUri);
        const xmlContent = Buffer.from(fileData).toString('utf8');
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ""
        });
        const result = parser.parse(xmlContent);
        // 5. Extract exports
        const completionItems = [];
        const root = result.meta;
        if (root && root.export) {
            // Handle cases where there is only one export (object) vs multiple (array)
            const exports = Array.isArray(root.export) ? root.export : [root.export];
            exports.forEach((exp, index) => {
                if (exp.function) {
                    const functionName = exp.function;
                    const type = exp.type || 'shared';
                    // Use 'Method' or 'Function' for the icon (Purple box)
                    const item = new vscode.CompletionItem(functionName, vscode.CompletionItemKind.Method);
                    // --- THE FIX ---
                    // 1. "!" sorts higher than numbers and letters. This forces it to the very top.
                    item.sortText = `!${functionName}`;
                    // 2. Preselect the first item so the user doesn't accidentally hit enter on an "abc" item
                    if (index === 0) {
                        item.preselect = true;
                    }
                    // 3. Detail helps distinguish it visually
                    item.detail = `Exported Function (${type})`;
                    item.documentation = new vscode.MarkdownString(`\`${resourceName}:${functionName}\``);
                    // 4. Insert text with parentheses
                    item.insertText = new vscode.SnippetString(`${functionName}($0)`);
                    completionItems.push(item);
                }
            });
        }
        // Return a CompletionList to give us more control if needed later
        return new vscode.CompletionList(completionItems, false);
    }
    catch (error) {
        console.error(`Error parsing meta.xml for ${resourceName}:`, error);
        return [];
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map