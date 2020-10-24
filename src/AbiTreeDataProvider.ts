import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { STATE } from './state';
import { readABI } from './eth';


export class AbiTreeDataProvider implements vscode.TreeDataProvider<Abi> {
  constructor(private workspaceRoot: string | undefined) {}

  getTreeItem(element: Abi): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Abi): Promise<Abi[]> {
    if (!STATE.currentContract) {
      return [];
    }
    
    const leaves = [];
    
    // Root tree element
    if (!element) {
      // Read the ABI and filter functions
      const abi = await readABI(path.join(this.workspaceRoot || ".", 'build/contracts', STATE.currentContract));
      for (const entry of abi) {
        if (entry.type === "function") {
          const coll = (entry.inputs && entry.inputs.length)
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None;
          leaves.push(new Abi(entry.name, entry, "abiFunction", coll));
        }
      }
    } else if (element.abi.type === "function") {
      // Given the parent, get the function params
      for (const input of element.abi.inputs) {
        leaves.push(new Abi(input.name, input, "abiInput", vscode.TreeItemCollapsibleState.None));
      }
    }

    return leaves;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Abi | undefined> = new vscode.EventEmitter<Abi | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Abi | undefined> = this._onDidChangeTreeData.event;

  refresh(item?: Abi): void {
    this._onDidChangeTreeData.fire(item);
  }
}

export class Abi extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly abi: any,
    contextValue: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    this.description = abi.type;
  }

  value: any;

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'Abi.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'Abi.svg')
  };
}