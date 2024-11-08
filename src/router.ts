import express from 'express'
import HandlersService from './handlers'

interface RouterDependencies {
    HandlersLiveService: ReturnType<typeof HandlersService>
}

export default ({ HandlersLiveService }: RouterDependencies) => {

    const router = express.Router()

    router.post('/auth/register', HandlersLiveService.Register)
    router.post('/auth/login', HandlersLiveService.LogIn)

    router.get('/:username', HandlersLiveService.GetUser)
    router.put('/:username', HandlersLiveService.PutUser)
    router.delete('/:username', HandlersLiveService.DeleteUser)

    router.post('/:username', HandlersLiveService.PostDeck)

    router.get('/:username/:deckTitle', HandlersLiveService.GetDeck)
    router.put('/:username/:deckTitle', HandlersLiveService.PutDeck)
    router.delete('/:username/:deckTitle', HandlersLiveService.DeleteDeck)

    router.post('/:username/:deckTitle', HandlersLiveService.PostFlashcard)

    router.get('/:username/:deckTitle/:front', HandlersLiveService.GetFlashcard)
    router.put('/:username/:deckTitle/:front', HandlersLiveService.PutFlashcard)
    router.delete('/:username/:deckTitle/:front', HandlersLiveService.DeleteFlashcard)

    return router

}


