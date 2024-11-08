// TODO: better type safety
// const UserObjectTemplate = {
//     id: '',
//     email: '',
//     username: '',
//     pwdhash: '',
//     createdat: 1
// }

// export type User = typeof UserObjectTemplate
type Brand<K, T> = K & { __brand: T }

export type Username = Brand<string, 'Username'>
export type Title = Brand<string, 'Title'>

export const isUsername = (username: string): username is Username => {
    return /^[a-zA-Z0-9\s]{3,32}$/g.test(username)
}

export const isTitle = (title: string): title is Username => {
    return /^[a-zA-Z0-9\s]{3,32}$/g.test(title)
}

export interface UserSchema {
    id: string
    username: Username
    pwdhash: string
    createdat: number
}

export interface DeckSchema {
    id: string
    title: Title
    createdat: number
    public: boolean
    userid: string
}

export interface FlashcardSchema {
    id: string
    front: string
    back: string
    createdat: number
    deckid: string
}

export type DBManagedFields = 'id' | 'createdat'

export type UserEditable = Omit<UserSchema, DBManagedFields | 'pwdhash'>
export type DeckEditable = Omit<DeckSchema, DBManagedFields | 'userid'>
export type FlashcardEditable = Omit<FlashcardSchema, DBManagedFields | 'deckid'>

export const isDeckEditable = (d: DeckEditable): d is DeckEditable => {
    return typeof d === 'object' && (
        d.title && isTitle(d.title)
        || d.public && typeof d.public === 'boolean'
    )
}

export type GetUser = Omit<UserSchema, 'pwdhash' | 'id'>
export type GetDeck = Omit<DeckSchema, 'id' | 'userid'>
export type GetFlashcard = Omit<FlashcardSchema, 'id' | 'deckid'>

export const KeyOfGetUser: (keyof GetUser)[] = ['username', 'createdat']
export const KeyOfGetDeck: (keyof GetDeck)[] = ['title', 'public', 'createdat']
export const KeyOfGetFlashcard: (keyof GetFlashcard)[] = ['front', 'back', 'createdat']
