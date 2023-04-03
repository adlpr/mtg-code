import { execPath } from 'process';
import * as vscode from 'vscode';
import { Card } from './card';
import { CardDB } from './card_db';
import { parseCardLine } from './card_statistics';
import { cardLineRegExp, lineSplitterRegExp, cardNameReplaceExp, cardCollNoReplaceExp } from './regular_expressions';
import { Ruling } from './card_rulings';

function getHTMLImagesLine(card: Card): string | undefined {
    let oracleText = card.oracleText ?
        card.oracleText?.replace(/\"/g, "'") :
        card.cardFaces ?
            card.cardFaces.map(cardFace => cardFace.oracleText ? cardFace.oracleText.replace(/\"/g, "'") : '').join('\n//\n')
            : 'no oracle text';

    return card.imageUris ?
        `<img src="${card.imageUris?.small}" alt="image of ${card.name}" title="${oracleText}"/>` :
        card.cardFaces?.map(cardFace => `<img src="${cardFace.imageUris?.small}" alt="image of ${cardFace.name}" title="${cardFace.oracleText?.replace(/\"/g, "'")}"/>`).join('');
}

export function getUsdPrice(card: Card, foil: boolean=false, etched: boolean=false): string | null {
    if (card.prices?.usdEtched && (etched || ((card.prices?.usd == null) && (card.prices?.usdFoil == null))))
        return card.prices?.usdEtched;
    else if (card.prices?.usdFoil && (foil || (card.prices?.usd == null)))
        return card.prices?.usdFoil;
    else if (card.prices?.usd)
        return card.prices?.usd;
    return null
}

export function getEurPrice(card: Card, foil: boolean=false, etched: boolean=false): string | null {
    if (card.prices?.eurEtched && (etched || ((card.prices?.eur == null) && (card.prices?.eurFoil == null))))
        return card.prices?.eurEtched;
    else if (card.prices?.eurFoil && (foil || (card.prices?.eur == null)))
        return card.prices?.eurFoil;
    else if (card.prices?.eur)
        return card.prices?.eur;
    return null
}

export function getPrices(card: Card, foil: boolean=false): string {
    if (card.prices) {
        const usdPrice = getUsdPrice(card, foil);
        const eurPrice = getEurPrice(card, foil);

        var priceLine = "";
        if (usdPrice) {
            priceLine += `$${usdPrice}`;
            if (eurPrice)
                priceLine += " / ";
        }
        if (eurPrice)
            priceLine += `${eurPrice}€`;

        return priceLine ? priceLine : "n/a";
    }
    return "n/a";
}

export function searchCards(cardDB: CardDB) {
    return async (searchStr: string | undefined) => {
        await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: 'Searching for Cards',
        }, async (progress) => {
            if (searchStr === undefined) {
                searchStr = await vscode.window.showInputBox({
                    placeHolder: 'Enter your search query...',
                });
            }

            if (searchStr === undefined) {
                return;
            }

            let cards: Card[];
            try {
                let cardNames = await cardDB.searchCardsAdvanced(searchStr);
                cards = await Promise.all(cardNames.map(cardName => cardDB.getCard(cardName)));
            } catch (e) {
                vscode.window.showErrorMessage(`search failed: ${e}`);
                return;
            }

            let searchDocumentContent = `<h1>Search: ${searchStr}</h1>${cards.map((card) => {
                let imagesLine = getHTMLImagesLine(card);
                let priceLine = `<p><b>Price:</b> ${getPrices(card)}</p>`
                return `<h2 style="padding-top: 12px;">${card.name}</h2>${imagesLine}${priceLine}`;
            }).join('')}`;

            const panel = vscode.window.createWebviewPanel(
                'Search Result',
                `Search: ${searchStr}`,
                vscode.ViewColumn.Two,
                {
                    enableScripts: false,
                    enableCommandUris: false,
                    enableFindWidget: false,
                },
            );

            panel.webview.html = searchDocumentContent;
        });
    };
}

export function fixCardNames(cardDB: CardDB) {
    return async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            throw Error(`Could not get text editor`);

        const document = editor.document;
        const lines: string[] = document.getText().split(lineSplitterRegExp);
        var numReplaced: number = 0;
        for (const [lineNum, line] of lines.entries()) {
            try {
                var cardLine = await parseCardLine(line, cardDB);
            } catch (e) {
                continue;
            }

            // fix name
            if (cardLine.name != cardLine.card.name) {
                const lineRange = document.lineAt(lineNum).range;

                const lineStr = document.lineAt(lineNum).text;
                const newLineStr = lineStr.replace(cardNameReplaceExp, `$1${cardLine.card.name}$2`)

                await editor.edit(edit => edit.replace(lineRange, newLineStr));
                numReplaced++;
                console.log(`replaced name @ line ${lineNum}: ${cardLine.name} -> ${cardLine.card.name}`);
            }

            // fix collector number
            if (cardLine.collectorNumber != cardLine.card.collectorNumber) {
                const lineRange = document.lineAt(lineNum).range;

                const lineStr = document.lineAt(lineNum).text;
                const newLineStr = lineStr.replace(cardCollNoReplaceExp, `$1 ${cardLine.card.collectorNumber}$2`);

                console.log(cardCollNoReplaceExp.exec(lineStr));
                console.log(lineStr);
                console.log(newLineStr);

                await editor.edit(edit => edit.replace(lineRange, newLineStr));
                numReplaced++;
                console.log(`replaced cn @ line ${lineNum}: ${cardLine.collectorNumber} -> ${cardLine.card.collectorNumber}`);
            }

        }
        console.log(`total elements replaced: ${numReplaced}`);
    };
}

export function showCardRulings(cardDB: CardDB) {
    return async (cardName: string | undefined) => {
        await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: 'Loading Card Rulings',
        }, async (progress) => {
            if (cardName === undefined) {
                const line = vscode.window.activeTextEditor?.document.lineAt(vscode.window.activeTextEditor.selection.active.line).text;
                if (line === undefined) {
                    return;
                }

                let search = cardLineRegExp.exec(line);

                if (!search || search.length < 3) {
                    return new vscode.Hover('');
                }

                cardName = search[2].trim();
            }

            let rulings: Ruling[];
            let card: Card;
            try {
                card = await cardDB.getCard(cardName);
                rulings = await cardDB.getCardRulings(card);
            } catch (e) {
                vscode.window.showErrorMessage(`failed to get card: ${e}`);
                return;
            }


            const rulingsStr = rulings.map((ruling) => {
                return `<h2>${ruling.publishedAt?.toLocaleDateString()}</h2><p>${ruling.comment}</p>`;
            }).join('');

            const content = `<div style="padding-bottom: 20px;">
            <h1>Rulings for '${card.name}'</h1>
            ${rulingsStr}
            </div>`;

            const panel = vscode.window.createWebviewPanel(
                'Card Rulings',
                `Rulings for '${cardName}'`,
                vscode.ViewColumn.Two,
                {
                    enableScripts: false,
                    enableCommandUris: false,
                    enableFindWidget: false,
                },
            );

            panel.webview.html = content;
        });
    };
}