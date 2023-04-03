# mtg-code

This is an extension for building Magic the Gathering decks in VSCode.

## Features

* Autocompletion while typing card names. Also adds basic information about each card in your decklist.
* Displays a card preview and price information when hovering a card.
* Search for cards using scryfall's [advanced query api](https://scryfall.com/docs/syntax).
* Provides syntax highlighting for search queries and autocompletion for query terms and for some query parameter values.
* Easily count your cards by selecting lines.

![mtg-code features](static/mtg-code-basic-features.gif?raw=true "mtg-code features")

## Known Issues

## Release Notes

### 1.2.0

* Merge upstream ([PixR2/1.1.0](https://github.com/PixR2/mtg-code/blob/master/CHANGELOG.md#110---2023-03-04)):
	* Added
		* Show average converted mana cost of cards in selection in the status bar.
		* Folding ranges for all blocks starting with a comment line (comment or search line).
		* Command to show a card's rulings.
		* Syntax highlighting support for 'or' and parenthesis.
	* Fixed
		* Syntax highlighting for quoted fields.
		* Prevent the extension from breaking in case new fields are added to scryfall's API.

### 1.1.2

* API updates: PreDH and Oathbreaker legalities
* Add language configuration file

### 1.1.1

* Fix compatibility with Attractions, content warning cards, and collector numbers with a star
* WSL environment compatibility

### 1.1.0

* Handling for set code, collector number, language, and foil
* Command to fix card names based on set info
* Hover image links to card page on Scryfall
* Lines can be prefixed ("SB:" etc.)

### 1.0.0

Initial release of the mtg-code extension. Includes:
* Syntax Highlighting
* Autocompletion for card names.
* Card preview on hover.
* Card search as CodeLens with syntax highlighting and autocompletion.
* Card counting when selecting card lines.