import { CommentThreadCollapsibleState, TextEditorRevealType } from "vscode";
import { Card } from "./card";
import { CardDB } from "./card_db";
import { cardLineRegExp } from "./regular_expressions";

export class CardLine {
    constructor(card: Card, search: RegExpExecArray) {
        this.card = card;
        this.search = search;
        this.lineStr = search[0];
        try {
            this.quantity = parseInt(search[1]);
        } catch (e) {
            throw Error(`invalid card quantity '${search[1]}'`);
        }
        this.name = search[2];
        this.set = search[3];
        this.collectorNumber = search[4];
        this.lang = search[5];
        this.miscInfo = search[6];
    }

    card: Card;
    search: RegExpExecArray;
    lineStr: string;
    quantity: number;
    name: string;
    set: string;
    collectorNumber: string;
    lang: string;
    miscInfo: string;
}

export async function parseCardLine(lineStr: string, cardDB: CardDB): Promise<CardLine> {
    // $1: count; $2: name; $3: set;
    // $4: collno; $5: lang; $6: foil and misc info
    const search = cardLineRegExp.exec(lineStr);
    if (!search || search.length !== 7) {
        throw Error(`'${lineStr}' is not a card line`);
    }

    let card: Card;
    const name = search[2];
    const set = search[3];
    const collectorNumber = search[4];
    const lang = search[5];
    try {
        card = await cardDB.getCard(name.trim(), set, collectorNumber, lang);
    } catch (e) {
        throw Error(`failed to get card information: ${e}`);
    }

    return new CardLine(card, search);
}

export function getNumberOfCards(cardLines: CardLine[]): number {
    if (cardLines.length === 0)
        return 0;

    const numCards = cardLines
        .map((cardLine) => { return cardLine.quantity; })
        .reduce((sum, quantity) => { return sum + quantity; });
    return numCards;
}