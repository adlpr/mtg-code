// TODO: Allow parenthesis, negation (-) and OR in search lines. (Syntax and HoverProvider)

'use strict';
import * as fs from 'fs';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CardDB } from './card_db';
import { CardLine, getNumberOfCards, parseCardLine, getManaCostDistribution, renderManaCostDistributionToString, computeMeanManaCost, getTotalPrice } from './card_statistics';
import { CardSearchLensProvider } from './code_lens_providers';
import { fixCardNames, searchCards, showCardRulings } from './commands';
import { CardCompletionItemProvider, SearchCompletionItemProvider } from './completion_providers';
import { setCardDecorations } from './decorators';
import { CardHoverProvider } from './hover_providers';
import { FixCardNameCodeActionProvider, refreshCardDiagnostics } from './diagnostics';
import { CommentLineFoldingRangeProvider } from './folding_range_providers';

const languageID: string = 'mtg';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// change cwd for wsl compatibility
	var last_cwd = process.cwd();
	if (last_cwd.startsWith('/mnt/c/'))
		process.chdir('/tmp');
	console.log(`loading card db from cwd: ${process.cwd()}`);
	if (!fs.existsSync('./card_db'))
		fs.mkdirSync('./card_db');
	// wsl: change back
	if (last_cwd.startsWith('/mnt/c/'))
		process.chdir(last_cwd);
	var cardDB: CardDB = new CardDB('./card_db');
	await cardDB.isReady;
	console.log(`card db is ready`);

	context.subscriptions.push(vscode.commands.registerCommand('mtg-code.search-cards', searchCards(cardDB)));
	context.subscriptions.push(vscode.commands.registerCommand('mtg-code.fix-card-names', fixCardNames(cardDB)));
	context.subscriptions.push(vscode.commands.registerCommand('mtg-code.show-card-rulings', showCardRulings(cardDB)));

	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '\":/<>=".split("");

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(languageID, new CardCompletionItemProvider(cardDB), ...alphabet));
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			languageID,
			new SearchCompletionItemProvider(
				['c', 'color', 'id', 'identity', 'commander', 't', 'type', 'o', 'oracle', 'm', 'mana', 'mv', 'manavalue', 'cmc', 'is', 'devotion', 'produces', 'pow', 'power', 'tou', 'toughness', 'pt', 'powtou', 'loyalty', 'loy', 'r', 'rarity', 'new', 'in', 's', 'set', 'e', 'edition', 'cn', 'number', 'b', 'block', 'st', 'cube', 'f', 'format', 'banned', 'restricted', 'usd', 'eur', 'tix', 'cheapest', 'a', 'artist', 'artists', 'ft', 'flavor', 'wm', 'watermark', 'has', 'illustrations', 'border', 'frame', 'game', 'year', 'art', 'atag', 'arttag', 'function', 'otag', 'oracletag', 'not', 'prints', 'paperprints', 'papersets', 'sets', 'lang', 'language', 'order', 'direction'],
				new Map([
					['type', cardDB.getAllTypes()],
					['color', cardDB.getAllColorCombinations()],
					['identity', cardDB.getAllColorCombinations()],
					['commander', cardDB.getAllColorCombinations()],
					['power', cardDB.getAllPowers()],
					['toughness', cardDB.getAllToughnesses()],
					['loyalty', cardDB.getAllLoyalties()],
					['rarity', cardDB.getAllRarities()],
					['set', cardDB.getAllSetNames()],
					['cube', cardDB.getAllCubes()],
					['format', cardDB.getAllFormats()],
					['artist', cardDB.getAllArtists()],
					['watermark', cardDB.getAllWatermarks()],
					['border', cardDB.getAllBorders()],
					['frame', cardDB.getAlllFrames()],
					['game', cardDB.getAllGames()],
					['order', ['name', 'set', 'released', 'rarity', 'color', 'usd', 'tix', 'eur', 'cmc', 'power', 'toughness', 'edhrec', 'artist']],
					['direction', ['asc', 'dsc']]
				])
			),
			...alphabet
		)
	);

	context.subscriptions.push(vscode.languages.registerHoverProvider(languageID, new CardHoverProvider(cardDB)));

	context.subscriptions.push(vscode.languages.registerCodeLensProvider(languageID, new CardSearchLensProvider()));

	const cardDiagnostics = vscode.languages.createDiagnosticCollection("cards");
	context.subscriptions.push(cardDiagnostics);

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (e) => {
		if (e.document.languageId !== languageID) {
			return;
		}

		const editors = vscode.window.visibleTextEditors.filter((editor) => editor.document === e.document);
		for (const editor of editors) {
			await setCardDecorations(editor, cardDB);
			await refreshCardDiagnostics(editor.document, cardDiagnostics, cardDB);
		}
	}));

	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(async (e) => {
		let cardLines: CardLine[] = [];
		for (const selection of e.selections) {
			for (let l = selection.start.line; l <= selection.end.line; l++) {
				const lineStr = e.textEditor.document.lineAt(l).text;
				// ignore comments even where parsable as card lines
				if (lineStr.startsWith('//'))
					continue;
				try {
					var cardLine = await parseCardLine(lineStr, cardDB);
					cardLines.push(cardLine);
				}
				catch (e) {
					continue;
				}
			}
		}

		if (cardLines.length < 2) {
			statusBarItem.hide();
			return;
		}

		const numCardsInSelection = getNumberOfCards(cardLines);

		if (numCardsInSelection === 0) {
			statusBarItem.hide();
			return;
		}


		let statusText = `${numCardsInSelection} cards`;

		const manaCostDistribution = getManaCostDistribution(cardLines);
		if (manaCostDistribution.length !== 0)
			statusText += `; avg. cmc=${computeMeanManaCost(manaCostDistribution).toFixed(1)}`;

		const totalCost = getTotalPrice(cardLines);
		if (totalCost > 0)
			statusText += `; total price=$${totalCost.toFixed(2)}`;

		statusBarItem.text = statusText;
		statusBarItem.show();
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => {
		if (!e) {
			return;
		}

		setCardDecorations(e, cardDB);
		refreshCardDiagnostics(e.document, cardDiagnostics, cardDB);
	}));

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(document => cardDiagnostics.delete(document.uri))
	);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(languageID, new FixCardNameCodeActionProvider(cardDB), {
			providedCodeActionKinds: FixCardNameCodeActionProvider.providedCodeActionKinds
		})
	);

	context.subscriptions.push(
		vscode.languages.registerFoldingRangeProvider(languageID, new CommentLineFoldingRangeProvider())
	);

	const editors = vscode.window.visibleTextEditors.filter((editor) => editor.document.languageId === languageID);
	for (const editor of editors) {
		await setCardDecorations(editor, cardDB);
		await refreshCardDiagnostics(editor.document, cardDiagnostics, cardDB);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}