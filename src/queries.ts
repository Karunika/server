import { KeyOfGetDeck, KeyOfGetFlashcard, KeyOfGetUser, type DeckEditable, type FlashcardEditable, type GetDeck, type GetFlashcard, type GetUser, type UserEditable } from './types/models'
import { type DeckCompoundKey, type FlashcardCompoundKey, type FlashcardFields } from './types/params'
import * as TE from 'fp-ts/TaskEither';
import * as F from 'fp-ts/function'
// import * as S from 'fp-ts/string'
import * as A from 'fp-ts/Array'

interface QueryServiceDependencies {
    // TODO: types
    pgClient: any
}

const QueryService = ({ pgClient }: QueryServiceDependencies) => {

    const _queryTryCatch = (query: string) => <T>(...values: (string | number)[]): TE.TaskEither<string, T[]> => TE.tryCatch(
        () => pgClient.query(query, values).then((res: any) => res.rows as T[]),
        (err) => String(err)
    )

    const _TEgetSetStringContext = <T extends object>(entity: T, initialCounter = 1) => {
        return F.pipe(
            TE.Do,
            TE.let('keys', () =>
                Object.keys(entity) as (keyof T & string)[]
            ),
            TE.let('values', ({ keys }) =>
                A.map((key) => entity[key as (keyof T & string)])(keys) as string[]
            ),
            TE.let('setString', ({ keys }) =>
                keys.map((key, i) => `${key} = $${i + initialCounter}`).join(', ')
            )
        )
    }

    const _prefixWith = (pref: string) => (keys: string[]) => {
        return keys.map((key) => `${pref}.${key}`)
    }

    const _join = (keys: string[]) => {
        return keys.join(', ')
    }

    const _prefixAndJoin = (pref: string) => F.flow(_prefixWith(pref), _join)

    const insertUser: (username: string, hash: string) => TE.TaskEither<string, GetUser[]>
        = _queryTryCatch(`
            INSERT INTO users (username, pwdHash)
            VALUES($1, $2)
            RETURNING ${_join(KeyOfGetUser)}
        `)

    const getUser: (username: string) => TE.TaskEither<string, GetUser[]>
        = _queryTryCatch(`
            SELECT ${KeyOfGetUser.join(', ')}
            FROM users u
            WHERE u.username = $1
        `)

    const updateUser = <T extends Partial<UserEditable>>(user: T) => (username: string): TE.TaskEither<string, GetUser[]> => {
        return F.pipe(
            _TEgetSetStringContext<T>(user),
            TE.flatMap(({ keys, values, setString }) =>
                _queryTryCatch(`
                    UPDATE users
                    SET ${setString}
                    WHERE users.username = $${keys.length + 1}
                    RETURNING ${_join(KeyOfGetUser)}`
                )(...values, username)
            )
        )
    }


    const deleteUser: (username: string) => TE.TaskEither<string, GetUser[]>
        = _queryTryCatch(`
            DELETE FROM users
            WHERE users.username = $1
        `)


    const getAllUserDecks: (username: string) => TE.TaskEither<string, GetDeck[]>
        = _queryTryCatch(`
            SELECT ${_prefixAndJoin('d')(KeyOfGetDeck)}
            FROM users u
                JOIN decks d ON u.id = d.userId
            WHERE u.username = $1
        `)

    const getDeck = ({ username, deckTitle }: DeckCompoundKey): TE.TaskEither<string, GetDeck[]> => {
        return _queryTryCatch(`
            SELECT ${_prefixAndJoin('d')(KeyOfGetDeck)}
            FROM users u
                JOIN decks d ON u.id = d.userId
            WHERE u.username = $1 AND d.title = $2
        `)(username, deckTitle)
    }

    const insertDeck = ({ username, deckTitle }: DeckCompoundKey): TE.TaskEither<string, GetDeck[]> => {
        return _queryTryCatch(`
            INSERT INTO decks (title, userId) 
            SELECT $1, u.id
            FROM users u
            WHERE u.username = $2
            RETURNING ${_join(KeyOfGetDeck)}
        `)(deckTitle, username)
    }

    const updateDeck = (deck: Partial<DeckEditable>) => ({ username, deckTitle }: DeckCompoundKey): TE.TaskEither<string, GetDeck[]> => {
        return F.pipe(
            _TEgetSetStringContext(deck, 3),
            TE.flatMap(({ setString, values }) =>
                _queryTryCatch(`
                    UPDATE decks d
                    SET ${setString}
                    FROM users u
                    WHERE u.id = d.userId
                        AND u.username = $1
                        AND d.title = $2
                    RETURNING ${_prefixAndJoin('d')(KeyOfGetDeck)}
                `)(username, deckTitle, ...values)
            )
        )
    }

    const deleteDeck = ({ username, deckTitle }: DeckCompoundKey): TE.TaskEither<string, GetDeck[]> => {
        return _queryTryCatch(`
            WITH userIdFromUsername  AS (
                SELECT userId
                FROM user u
                WHERE u.username = $1
            )
            DELETE FROM decks d
            WHERE d.userId = userIdFromUsername AND d.title = $2
            RETURNING ${KeyOfGetDeck.join(', ')}
        `)(username, deckTitle)
    }

    const getAllFlashcards = ({ username, deckTitle }: DeckCompoundKey): TE.TaskEither<string, GetFlashcard[]> => {
        return _queryTryCatch(`
            SELECT ${_prefixAndJoin('f')(KeyOfGetFlashcard)}
            FROM flashcards f
                JOIN decks d ON d.id = f.deckId
                JOIN users u ON u.id = d.userId
            WHERE u.username = $1 AND d.title = $2
        `)(username, deckTitle)
    }

    const getFlashcard = ({ username, deckTitle, front }: FlashcardCompoundKey): TE.TaskEither<string, GetFlashcard[]> => {
        return _queryTryCatch(`
            SELECT ${KeyOfGetFlashcard.join(', ')}
            FROM flashcards f
                JOIN decks d ON d.deckId = f.deckId
                JOIN users u ON u.userId = d.userId
            WHERE u.username = $1 AND d.title = $2 AND f.front = $3
        `)(username, deckTitle, front)
    }

    const insertFlashcard = ({ username, deckTitle, front, back }: FlashcardFields): TE.TaskEither<string, GetFlashcard[]> => {
        return _queryTryCatch(`
            INSERT INTO flashcards (front, deckId, back) 
            SELECT $1, d.id, $2
            FROM users u
                JOIN decks d ON d.userId = u.id
            WHERE u.username = $3 AND d.title = $4
            RETURNING ${_prefixAndJoin('flashcards')(KeyOfGetFlashcard)}
        `)(front, back, username, deckTitle)

    }

    const updateFlashcard = (flashcard: Partial<FlashcardEditable>) => ({ username, deckTitle, front }: FlashcardCompoundKey): TE.TaskEither<string, GetFlashcard[]> => {
        return F.pipe(
            _TEgetSetStringContext(flashcard, 4),
            TE.flatMap(({ setString, values }) =>
                _queryTryCatch(`
                    UPDATE flashcards f
                    SET ${setString}
                    FROM users u
                        JOIN decks d ON d.userId = u.id
                    WHERE u.username = $1 AND d.title = $2 AND f.front = $3
                    RETURNING ${_prefixAndJoin('f')(KeyOfGetFlashcard)}
                `)(username, deckTitle, front, ...values)
            )
        )
    }

    const deleteFlashcard = ({ username, deckTitle, front }: FlashcardCompoundKey): TE.TaskEither<string, GetFlashcard[]> => {
        return _queryTryCatch(`
            WITH flashcardIdFromCompoundKey AS (
                SELECT userId, deckId
                FROM flashcards f
                    JOIN decks d ON d.deckId = f.deckId
                    JOIN users u ON u.usersId = d.deckId
                WHERE u.username = $1 AND d.title = $2 AND f.front = $3
            )
            DELETE FROM flashcards f
            WHERE f.flashcardId = flashcardIdFromCompoundKey
            RETURNING ${KeyOfGetFlashcard.join(', ')}
        `)(username, deckTitle, front)

    }

    return {
        insertUser,
        getUser,
        updateUser,
        deleteUser,
        getAllUserDecks,
        getDeck,
        updateDeck,
        insertDeck,
        deleteDeck,
        getAllFlashcards,
        getFlashcard,
        insertFlashcard,
        updateFlashcard,
        deleteFlashcard
    }
}

export default QueryService
