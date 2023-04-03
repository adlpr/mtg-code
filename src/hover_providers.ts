import * as vscode from 'vscode';
import { Card } from './card';
import { CardDB } from './card_db';
import { parseCardLine } from './card_statistics';
import { getPrices } from './commands';

function getMarkdownImagesLine(card: Card): string | undefined {
    let oracleText = card.oracleText ?
        card.oracleText?.replace(/\"/g, "'") :
        card.cardFaces ?
            card.cardFaces.map(cardFace => cardFace.oracleText ? cardFace.oracleText.replace(/\"/g, "'") : '').join('\n//\n')
            : 'no oracle text';
    var markdownImagesLine = card.imageUris ?
        `![image of ${card.name}](${card.imageUris?.small} "${oracleText}")` :
        card.cardFaces?.map(cardFace => `![image of ${cardFace.name}](${cardFace.imageUris?.small} "${cardFace.oracleText?.replace(/\"/g, "'")}")`).join('');

    return `[${markdownImagesLine}](${card.scryfallURI})`
}

function getRulingsLine(card: Card): string | undefined {
    if (card.name === undefined) {
        return undefined;
    }

    if (card.rulingsURI === undefined) {
        return undefined;
    }

    const args = [card.name];
    const showRulingsCommandUri = vscode.Uri.parse(
        `command:mtg-code.show-card-rulings?${encodeURIComponent(JSON.stringify(args))}`
    );

    const rulingsLine = `[Show Rulings](${showRulingsCommandUri})`;
    return rulingsLine;
}

export class CardHoverProvider implements vscode.HoverProvider {
    cardDB: CardDB;

    constructor(cardDB: CardDB) {
        this.cardDB = cardDB;
    }

    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken):
        Promise<vscode.Hover> {

        try {
            var cardLine = await parseCardLine(document.lineAt(position.line).text, this.cardDB);
        } catch (e) {
            return new vscode.Hover(new vscode.MarkdownString(''));
        }

        const card = cardLine.card;
        try {
            let imagesLine = getMarkdownImagesLine(card);
            let priceLine = `**Price:** ${getPrices(card)}`;
            return new vscode.Hover(new vscode.MarkdownString(`${imagesLine}\n\n${priceLine}`));
        } catch (e) {
            return new vscode.Hover(new vscode.MarkdownString(`failed to get card from card database: ${e}`));
        }
    }
}

export class CardSearchHoverProvider implements vscode.HoverProvider {
    cardDB: CardDB;
    regexp: RegExp = /^\/\/ *Search: *([^;]*?) *$/i;
    constructor(cardDB: CardDB) {
        this.cardDB = cardDB;
    }

    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken):
        Promise<vscode.Hover> {

        let search = this.regexp.exec(document.lineAt(position.line).text);
        if (!search || search.length !== 2) {
            return new vscode.Hover('');
        }

        let searchStr: string = search[1].trim();

        try {
            let cardNames = await this.cardDB.searchCardsAdvanced(searchStr);
            let cards = await Promise.all(cardNames.map(cardName => this.cardDB.getCard(cardName)));
            let cardLines = cards.map((card) => {
                let imagesLine = getMarkdownImagesLine(card);
                let priceLine = getPrices(card);
                return `### ${card.name}\n\n${imagesLine}\n\n${priceLine}`;
            });
            return new vscode.Hover(new vscode.MarkdownString(cardLines.join('\n\n')));
        } catch (e) {
            return new vscode.Hover(new vscode.MarkdownString(`searching cards failed: ${e}`));
        }
    }
}