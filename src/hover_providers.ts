import * as vscode from 'vscode';
import { CardDB } from './card_db';
import { Card } from './card';

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

function getPriceLine(card: Card): string | undefined {
    let usdPrice = `${card.prices?.usd ? card.prices?.usd : card.prices?.usdFoil ? card.prices?.usdFoil : ' - '}`;
    let eurPrice = `${card.prices?.eur ? card.prices?.eur : card.prices?.eurFoil ? card.prices?.eurFoil : ' - '}`;
    return `**Price:** $${usdPrice}$ / ${eurPrice}€`;
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
        let regexp: RegExp = /^(?:\w+: )?(\d+)\s+([^\[]+)(?:\s+\[([^\]\s]+)(?:\s+([^\]\s]+)(?:\s+([^\]\s]+).*)?)?\])?$/;
        let search = regexp.exec(document.lineAt(position.line).text);

        if (!search || search.length < 6) {
            return new vscode.Hover('');
        }

        const cardName = search[2].trim();
        const cardLang = search[5];
        try {
            let card = await this.cardDB.getCard(cardName, search[3], search[4], cardLang);
            let imagesLine = getMarkdownImagesLine(card);
            let priceLine = getPriceLine(card);
            return new vscode.Hover(new vscode.MarkdownString(`${imagesLine}\n\n${priceLine}`));
        }
        catch (e) {
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
                let priceLine = getPriceLine(card);
                return `### ${card.name}\n\n${imagesLine}\n\n${priceLine}`;
            });
            return new vscode.Hover(new vscode.MarkdownString(cardLines.join('\n\n')));
        }
        catch (e) {
            return new vscode.Hover(new vscode.MarkdownString(`searching cards failed: ${e}`));
        }
    }
}