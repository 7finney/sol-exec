import { STATE } from "../state";
import * as vscode from "vscode";
import * as fs from "fs";
import { Contract as ContractTreeItem } from "./ContractTreeDataProvider";
import { ContractFactory } from "ethers";
import { read } from "../PendingTransactionTreeView/functions";

const ethcodeExtension: any = vscode.extensions.getExtension("7finney.ethcode");
const api: any = ethcodeExtension.exports;

async function search(filePath: string, searchString: string, startLine: number = 0) {
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();
    const start = text.indexOf(searchString, document.offsetAt(new vscode.Position(startLine, 0)));
    const startPosition = document.positionAt(start);
    return startPosition;
}


const updateContractAddress = async (
    contractName: string | undefined,
    abiTreeView: any,
    constructorTreeView: any,
    pendingTransactionTreeView: any
) => {
    if (contractName === undefined) {
        return;
    }
    const address = await api.contract.getContractAddress(contractName);
    STATE.contractAddress = address;
    abiTreeView.description = `${contractName} @ ${address}`;
    constructorTreeView.description = `${contractName} @ ${address}`;
    pendingTransactionTreeView.description = `${contractName} @ ${address}`;

};

const useContract = async (
    node: ContractTreeItem,
    abiTreeDataProvider: any,
    abiTreeView: any,
    pendingTransactionDataProvider: any,
    pendingTransactionTreeView: any,
    constructorTreeDataProvider: any,
    constructorTreeView: any
) => {
    await api.contract.selectContract(node.label);
    updateContractAddress(node.label, abiTreeView, constructorTreeView, pendingTransactionTreeView);
    STATE.currentContract = node.label;
    abiTreeDataProvider.refresh();
    abiTreeView.message = undefined;
    constructorTreeDataProvider.refresh();
    // check if constructor tree view has childern if not then show message
    const len = await api.contract.getConstructorInput(STATE.currentContract);
    if (len.length === 0) {
        constructorTreeView.message = "No constructor input";
    } else {
        constructorTreeView.message = undefined;
    }
    pendingTransactionDataProvider.refresh();
    pendingTransactionTreeView.message = undefined;
    STATE.flag = true;
    await read();
};

const refreshContract = async (node: ContractTreeItem, contractTreeDataProvider: any): Promise<vscode.TreeView<ContractTreeItem>> => {
    return vscode.window.createTreeView("sol-exec.contracts", { treeDataProvider: contractTreeDataProvider, });
};

const deployContract = async (channel: any) => {
    const networkConfig = await api.provider.network.get();
    const wallet = await api.wallet.get(STATE.currentAccount);
    const compiledOutput = await vscode.workspace.findFiles(`**/${STATE.currentContract}.json`, '', 1);
    const abi = JSON.parse(fs.readFileSync(compiledOutput[0].fsPath, "utf8")).abi;
    const bytecode = JSON.parse(fs.readFileSync(compiledOutput[0].fsPath, "utf8")).bytecode;
    const factory = new ContractFactory(abi, bytecode, wallet);
    let contract;
    const param = [];
    let constructor;
    try {
        constructor = await api.contract.getConstructorInput(STATE.currentContract);
        for (const ele of constructor) {
            param.push(ele.value);
        }
        channel.appendLine(`Deploy ${STATE.currentContract} contract >`);
        switch (parseInt(networkConfig.chainID)) {
            case 137: {
                channel.appendLine(`Calculating gas prices for Matic deployment...`);
                const { maxFeePerGas, maxPriorityFeePerGas } = await api.provider.network.getGasPrices();
                channel.appendLine(`Gas Price: ${maxFeePerGas.toString()} Gwei`);
                channel.appendLine(`Priority Fee: ${maxPriorityFeePerGas.toString()} Gwei`);
                contract = await factory.deploy(...param, { maxFeePerGas, maxPriorityFeePerGas });
                break;
            }
            case 59140: {
                channel.appendLine(`Calculating gas prices for Linea deployment...`);
                const { maxFeePerGas, maxPriorityFeePerGas } = await api.provider.network.getGasPrices();
                channel.appendLine(`Gas Price: ${maxFeePerGas.toString()} Gwei`);
                channel.appendLine(`Priority Fee: ${maxPriorityFeePerGas.toString()} Gwei`);
                contract = await factory.deploy(...param, { maxFeePerGas, maxPriorityFeePerGas });
                break;
            }
            case 80002: {
                channel.appendLine(`Calculating gas prices for Amoy deployment...`);
                const { maxFeePerGas, maxPriorityFeePerGas } = await api.provider.network.getGasPrices();
                channel.appendLine(`Gas Price: ${maxFeePerGas.toString()} Gwei`);
                channel.appendLine(`Priority Fee: ${maxPriorityFeePerGas.toString()} Gwei`);
                contract = await factory.deploy(...param, { maxFeePerGas, maxPriorityFeePerGas });
                break;
            }
            default: {
                channel.appendLine(`Using default gas prices`);
                contract = await factory.deploy(...param);
                break;
            }
        }
        channel.appendLine(`Transaction Hash: ${contract.deployTransaction.hash}`);
        channel.appendLine(`${networkConfig.blockScanner}/tx/${contract.deployTransaction.hash} `);
        channel.appendLine(`Waiting for transaction to be mined...`);
        await contract.deployTransaction.wait();
        return contract.address;
    } catch (error: any) {
        console.error(error);
        channel.appendLine(`Error: Deploying ${STATE.currentContract} contract > ${error.message}`);
        return "";
    }
};

const editContractAddress = async (input : any) => {
    let filePath = "";
    const path = await vscode.workspace.findFiles(`**/${STATE.currentContract}_deployed_address.json`);
    filePath = path[0].fsPath;

    const document = await vscode.workspace.openTextDocument(filePath);
    const line = await search(filePath, `"address": "`, 0);

    const cursorPosition = new vscode.Position(line.line, line.character+12);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
    editor.revealRange(new vscode.Range(cursorPosition, cursorPosition));
};

export {
    useContract,
    refreshContract,
    deployContract,
    updateContractAddress,
    editContractAddress
};