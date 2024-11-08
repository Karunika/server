# Trashcards Server


## API Endpoints

/api


| endpoints | methods | params | description |
|-----|-----|----|-----|
| /auth/register | POST | | register a new user, returns an access token |
| /auth/login | POST | | verify credentials, returns an access token |
| /:username | GET | | returns user details and all decks |
| | PUT | | updates user details |
| | DELETE | | deletes user and all their decks |
| | POST | | create a new deck |
|/:username/:deck| GET | | returns the deck of the user and all the flashcards in it |
| | PUT | | update deck details |
| | DELETE | | deletes the deck and all the flashcards in it |
| | POST | | create a new flashcard |
|/:username/:deck/:flashcard | GET | | returns the flashcard |
| | PUT | | updates flashcard details |
| | DELETE | | deletes the flashcard |
