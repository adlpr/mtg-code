import { CommentThreadCollapsibleState, TextEditorRevealType } from "vscode";
import { Card } from "./card";
import { CardDB } from "./card_db";
import { cardLineRegExp } from "./regular_expressions";

export class CardLine {
    constructor(quantity: number,
                card: Card,
                name: string,
                set: string,
                collectorNumber: string,
                miscInfo: string,
                lineStr: string) {
        this.quantity = quantity;
        this.card = card;
        this.name = name;
        this.set = set;
        this.collectorNumber = collectorNumber;
        this.miscInfo = miscInfo;
        this.lineStr = lineStr;
    }

    quantity: number;
    card: Card;
    name: string;
    set: string;
    collectorNumber: string;
    miscInfo: string;
    lineStr: string;
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
    const miscInfo = search[6];
    try {
        card = await cardDB.getCard(name.trim(), set, collectorNumber, lang);
    }
    catch (e) {
        throw Error(`failed to get card information: ${e}`);
    }

    let quantity: number;
    try {
        quantity = parseInt(search[1]);
    }
    catch (e) {
        throw Error(`invalid card quantity '${search[1]}'`);
    }

    return new CardLine(quantity, card, name, set, collectorNumber, miscInfo, search[0]);
}

export function getNumberOfCards(cardLines: CardLine[]): number {
    if (cardLines.length === 0) {
        return 0;
    }

    const numCards = cardLines
        .map((cardLine) => { return cardLine.quantity; })
        .reduce((sum, quantity) => { return sum + quantity; });
    return numCards;
}