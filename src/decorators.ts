import { info } from 'console';
import * as vscode from 'vscode';
import { Card } from './card';
import { CardDB } from './card_db';
import { getUsdPrice } from './commands';
import { lineSplitterRegExp, cardLineRegExp } from './regular_expressions';

const cardDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({});

export async function setCardDecorations(editor: vscode.TextEditor, cardDB: CardDB) {
    await vscode.window.withProgress({
        cancellable: false,
        location: vscode.ProgressLocation.Window,
        title: 'Adding Card Decorations'
    }, async (progress) => {
        let decorations: vscode.DecorationOptions[] = [];

        const lines: string[] = editor.document.getText().split(lineSplitterRegExp);
        for (const [lineNum, line] of lines.entries()) {
            progress.report({
                increment: (lineNum / lines.length) * 100.0
            });

            const search = cardLineRegExp.exec(line);
            // $1: count; $2: name; $3: set;
            // $4: collno; $5: lang; $6: foil and misc info
            if (!search || search.length !== 6)
                continue;

            let card: Card;
            const cardName = search[2].trim();
            const cardLang = search[5];
            try {
                card = await cardDB.getCard(cardName, search[3], search[4], cardLang);
            }
            catch (e) {
                continue;
            }

            const infos: string[] = [];
            // if match yielded from set/collno but name doesn't match, add to decoration
            if (cardName != card.name) {
                infos.push(`${card.name}`);
            }
            // if no [set collno] specified, add to decoration
            if (!search[4]) {
                if (!search[3])
                    infos.push(`[${card.set} ${card.collectorNumber}]`);
                else
                    infos.push(`[${card.collectorNumber}]`);
            }
            if (card.manaCost) {
                infos.push(card.manaCost);
            } else if (card.cardFaces) {
                infos.push(
                    card.cardFaces.map(
                        cardFace => cardFace.manaCost
                    ).filter(
                        manaCost => manaCost !== undefined && manaCost.length > 0
                    ).join(' // '));
            }
            if (card.typeLine) {
                infos.push(card.typeLine);
            }
            if (card.power || card.toughness) {
                infos.push(`${card.power}/${card.toughness}`);
            }
            if (card.prices) {
                const usdPrice = getUsdPrice(card, !!/\bfoil\b/.exec(search[6]));
                infos.push(usdPrice ? `$${usdPrice}` : "$na");
            }
            const infoStr = infos.join(' · ');

            decorations.push(
                {
                    range: new vscode.Range(
                        new vscode.Position(lineNum, search[0].length),
                        new vscode.Position(lineNum, search[0].length)
                    ),
                    renderOptions: {
                        after: {
                            contentText: infoStr,
                            margin: '10px',
                            color: new vscode.ThemeColor('badge.background')
                        }
                    }
                }
            );
        }

        editor.setDecorations(cardDecorationType, decorations);
    });
}