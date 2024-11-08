import * as S from 'fp-ts/string'
import { isTitle, isUsername, type Title, type Username } from './models'

export interface Credentials {
    username: Username
    password: string
}

export const isCredentials = (cred: any): cred is Credentials => {
    return cred && isUsername(cred.username) && S.isString(cred.password)
}


export interface DeckCompoundKey {
    username: Username
    deckTitle: Title
}

export const isDeckCompoundKey = (ck: any): ck is DeckCompoundKey => {
    return ck && isUsername(ck.username) && isTitle(ck.deckTitle)
}

export interface FlashcardCompoundKey extends DeckCompoundKey {
    front: string
}

export const isFlashcardCompoundKey = (ck: any): ck is FlashcardCompoundKey => {
    return ck && isUsername(ck.username) && isTitle(ck.deckTitle) && S.isString(ck.front)
}

export interface FlashcardFields extends FlashcardCompoundKey {
    back: string
}

export const isFlashcardFields = (ck: any): ck is FlashcardFields => {
    return ck && isUsername(ck.username) && isTitle(ck.deckTitle) && S.isString(ck.front) && S.isString(ck.back)
}