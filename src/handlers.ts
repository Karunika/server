import type { NextFunction, Request, Response } from 'express';
import QueryService from './queries';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task'
import * as F from 'fp-ts/function'
import { isUsername, type UserEditable, type UserSchema } from './types/models';
import type ConfigService from './config';
import { isCredentials, isDeckCompoundKey, isFlashcardCompoundKey, isFlashcardFields } from './types/params';

interface HandlersDependencies {
    QueryLiveService: ReturnType<typeof QueryService>
    ConfigService: typeof ConfigService
    // TODO: types
    jwtService: any
    bcryptService: any
}

const handlers = ({ QueryLiveService, ConfigService, jwtService, bcryptService }: HandlersDependencies) => {

    const _hashPassword: (plainPassword: string) => TE.TaskEither<string, string>
        = (plainPassword) => TE.tryCatch(
            () => bcryptService.hash(plainPassword, 10),
            () => 'password hashing failed from plain password failed'
        )

    const _comparePassword: (plainPwd: string, dbHash: string) => TE.TaskEither<string, boolean>
        = (plainPwd, dbHash) => TE.tryCatch(
            () => bcryptService.compare(plainPwd, dbHash),
            () => 'credential do not match'
        )

    const _generateAccessToken: (username: string) => string
        = (username: string) => jwtService.sign({ username }, ConfigService.getAccessToken(), { expiresIn: '24h' })

    const _httpResponse = (data: unknown) => {
        return {
            data
        }
    }

    const _httpErrorResponse = (error: string | Error) => {
        return {
            error: error.toString()
        }
    }

    const _TEconcatNonNullableObjects = <A extends {}>(a: A) => <B extends {}>(b: B) => {
        return F.pipe(
            TE.Do,
            TE.apSW('a', TE.fromNullable(() => 'invalid')(a)),
            TE.apSW('b', TE.fromNullable(() => 'invalid')(b)),
            TE.let('concat', ({ a, b }) => ({ ...a, ...b })),
            TE.map((res) => res.concat)
        )
    }


    const _TEJsonResponse = (res: Response) =>
        F.flow(
            TE.matchW(
                _httpErrorResponse,
                _httpResponse
            ),
            T.tapIO((val) => () => res.json(val))
        )

    const Register = async (req: Request, res: Response) => {
        await F.pipe(
            req.body,
            TE.fromPredicate(isCredentials, () => 'invalid credentials provided'),
            TE.flatMap(({ username, password }) =>
                TE.map((pwdHash: string) => ({ username, pwdHash }))(_hashPassword(password))
            ),
            TE.flatMap(({ username, pwdHash }) => QueryLiveService.insertUser(username, pwdHash)),
            TE.filterOrElse((users) => users.length === 1, () => 'unexpected error: more than one user with the same credentials'),
            TE.map((users) => users[0].username),
            // TODO: incorporate error handling here in generating accessToken
            TE.map((username) => _generateAccessToken(username)),
            _TEJsonResponse(res)
        )()
    }

    const LogIn = async (req: Request, res: Response) => {
        await F.pipe(
            req.body,
            TE.fromPredicate(isCredentials, () => 'invalid credentials provided'),
            TE.flatMap(({ username, password }) =>
                F.pipe(
                    username,
                    QueryLiveService.getUser,
                    TE.filterOrElse((users) => users.length === 1, () => 'no user found with the given username'),
                    TE.map((users) => users[0] as UserSchema),
                    TE.flatMap((user) =>
                        F.pipe(
                            _comparePassword(password, user.pwdhash),
                            TE.flatMap((isMatched) => isMatched ? TE.right(username) : TE.left('password doesn\'t match'))
                        )
                    ),
                )
            ),
            TE.map((username) => _generateAccessToken(username)),
            _TEJsonResponse(res)
        )()
    }

    const GetUser = async (req: Request, res: Response) => {

        await F.pipe(
            TE.Do,
            TE.apSW('user',
                F.pipe(
                    req.params?.username,
                    TE.fromNullable('param \'username\' not provided'),
                    TE.flatMap(QueryLiveService.getUser),
                    TE.filterOrElse((users) => users.length === 1, () => 'no user found with the given username'),
                    TE.map((users) => users[0])
                )
            ),
            TE.bindW('deck',
                ({ user: { username } }) => F.pipe(
                    username,
                    QueryLiveService.getAllUserDecks
                )
            ),
            _TEJsonResponse(res)
        )()

    }

    const PutUser = async (req: Request, res: Response) => {
        await F.pipe(
            req.params?.username,
            TE.fromPredicate(isUsername, () => 'invalid username provided'),
            TE.flatMap(
                F.pipe(
                    req.body,
                    (b) => b as UserEditable,
                    QueryLiveService.updateUser
                )
            ),
            TE.filterOrElse((users) => users.length === 1, () => 'no user found with the given username'),
            _TEJsonResponse(res)
        )()

    }

    const DeleteUser = async (req: Request, res: Response) => {
        await F.pipe(
            req.params?.username,
            TE.fromPredicate(isUsername, () => 'invalid username provided'),
            TE.flatMap(QueryLiveService.deleteUser),
            _TEJsonResponse(res)
        )()
    }

    const GetDeck = async (req: Request, res: Response) => {
        await F.pipe(
            TE.Do,
            TE.apSW('deck',
                F.pipe(
                    req.params,
                    TE.fromPredicate(isDeckCompoundKey, () => 'params missing'),
                    TE.flatMap(QueryLiveService.getDeck),
                    TE.filterOrElse((decks) => decks.length === 1, () => 'no decks with given title'),
                    TE.map((decks) => decks[0])
                )
            ),
            TE.bindW('flashcards',
                ({ deck }) => F.pipe(
                    req.params,
                    TE.fromPredicate(isDeckCompoundKey, () => 'params missing'),
                    TE.flatMap(QueryLiveService.getAllFlashcards)
                )
            ),
            _TEJsonResponse(res)
        )()

    }

    // TODO: check this
    const PostDeck = async (req: Request, res: Response) => {
        await F.pipe(
            _TEconcatNonNullableObjects(req.body)(req.params),
            TE.fromPredicate(isDeckCompoundKey, () => 'invalid request body'),
            TE.flatMap(QueryLiveService.insertDeck),
            _TEJsonResponse(res)
        )()
    }

    const PutDeck = async (req: Request, res: Response) => {
        await F.pipe(
            req.params,
            TE.fromPredicate(isDeckCompoundKey, () => 'invalid params provided'),
            TE.flatMap(
                F.pipe(
                    // TODO: request body type checking
                    req.body,
                    QueryLiveService.updateDeck
                )
            ),
            _TEJsonResponse(res)
        )()
    }

    const DeleteDeck = async (req: Request, res: Response) => {
        await F.pipe(
            req.params,
            TE.fromPredicate(isDeckCompoundKey, () => 'invalid params provided'),
            TE.flatMap(QueryLiveService.deleteDeck),
            _TEJsonResponse(res)
        )()
    }

    const GetFlashcard = (req: Request, res: Response) => {

    }

    const PostFlashcard = async (req: Request, res: Response) => {
        await F.pipe(
            _TEconcatNonNullableObjects(req.body)(req.params),
            TE.fromPredicate(isFlashcardFields, () => 'request body invalid'),
            TE.flatMap(QueryLiveService.insertFlashcard),
            _TEJsonResponse(res)
        )()
    }

    const PutFlashcard = async (req: Request, res: Response) => {
        await F.pipe(
            req.params,
            TE.fromPredicate(isFlashcardCompoundKey, () => 'invalid params provided'),
            TE.flatMap(
                F.pipe(
                    // TODO: request body type checking
                    req.body,
                    QueryLiveService.updateFlashcard
                )
            ),
            _TEJsonResponse(res)
        )()
    }

    const DeleteFlashcard = async (req: Request, res: Response) => {
        await F.pipe(
            req.params,
            TE.fromPredicate(isFlashcardCompoundKey, () => 'invalid params provided'),
            TE.flatMap(QueryLiveService.deleteFlashcard),
            _TEJsonResponse(res)
        )()
    }

    return {
        Register,
        LogIn,
        GetUser,
        PutUser,
        DeleteUser,
        GetDeck,
        PostDeck,
        PutDeck,
        DeleteDeck,
        GetFlashcard,
        PostFlashcard,
        PutFlashcard,
        DeleteFlashcard
    }
}

export default handlers
