import * as vscode from 'vscode';
import { Card } from './card';
import { CardDB } from './card_db';

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

export function getUsdPrice(card: Card, foil: boolean=false): string | null {
    if (card.prices?.usdFoil && (foil || (card.prices?.usd == null)))
        return card.prices?.usdFoil;
    else if (card.prices?.usd)
        return card.prices?.usd;
    return null
}

export function getEurPrice(card: Card, foil: boolean=false): string | null {
    if (card.prices?.eurFoil && (foil || (card.prices?.eur == null)))
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
    return async (searchStr: string) => {
        await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: 'Searching for Cards',
        }, async (progress) => {
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

            const column = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;
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