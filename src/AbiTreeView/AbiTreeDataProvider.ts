import { Command, extensions, TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter, Event, ThemeIcon } from 'vscode';
import { myEmitter } from '../PendingTransactionTreeView/NodeDependenciesProvider';
import { STATE } from '../state';


export class Abi extends TreeItem {
  public value: any;
  constructor(
    public readonly label: string,
    public readonly abi: any,
    contextValue: string,
    public parent: Abi | null,
    public children: Abi[],
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if(abi.type === "function") {
      this.iconPath = new ThemeIcon("symbol-method");
    } else {
      this.description = abi.type + " : " + abi.value;
      this.iconPath = new ThemeIcon("symbol-parameter");
    }
  }
}

let ethcodeExtension: any = extensions.getExtension('7finney.ethcode');
const api: any = ethcodeExtension.exports;


export class AbiTreeDataProvider implements TreeDataProvider<Abi> {
  constructor(private workspaceRoot: string | undefined) {}

  getTreeItem(element: Abi): TreeItem {
    return element;
  }

  async getChildren(element?: Abi): Promise<Abi[]> {
    const leaves = [];
    let inputsEthcode: any = await api.contract.getFunctionInput(STATE.currentContract);
    if (!element) {
      const abi = await api.contract.abi(STATE.currentContract);
      
      for (const entry of abi) {
        console.log('============== entry types ==============');
        console.log(entry.type);
        if (entry.type === "function" ) {
          const coll = (entry.inputs && entry.inputs.length)
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.None;
          leaves.push(
            new Abi(
              entry.name,
              entry,
              entry.stateMutability === "view" ? "abiReadFunction" : "abiFunction",
              null,
              [],
              coll
            )
          );
        }
      }
    } else if (element.abi.type === "function") {
      const value = inputsEthcode.find((i: any) => i.name === element.abi.name);
      console.log(value);
      for (const input of value.inputs) {
        leaves.push(
          new Abi(
            input.name,
            input,
            "abiInput",
            element,
            [],
            TreeItemCollapsibleState.None
          )
        );
      }
      element.children = leaves;
    }
    return leaves;
  }

  private _onDidChangeTreeData: EventEmitter<Abi | undefined> = new EventEmitter<Abi | undefined>();
  readonly onDidChangeTreeData: Event<Abi | undefined> = this._onDidChangeTreeData.event;

  refresh(item?: Abi): void {
    this._onDidChangeTreeData.fire(item);
  }
}