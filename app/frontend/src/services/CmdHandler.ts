// eslint-disable-next-line no-unused-vars
import DataService, {MessageResponse} from "@/services/DataService";
import {Vue} from "vue-class-component";

interface CmdHandler {
    canHandle(msg: string, vue: Vue): boolean

    handle(msg: string, vue: Vue): Promise<CmdHandlerMessageResponse>
}

export interface CmdHandlerMessageEntry {
    sentences: Array<string>,
    html: string
}

export interface CmdHandlerMessageResponse {
    responses: Array<CmdHandlerMessageEntry>,
    save: boolean
}

const QUESTION_CTX_SLICE_SIZE = -10

// eslint-disable-next-line no-unused-vars
class CmdManager {
    private handlers: Array<CmdHandler>;

    constructor() {
        this.handlers = [
            this.help(),
            this.clear(),
            this.reset(),
            this.history()
        ] as Array<CmdHandler>
    }

    greetBack(date: Date): Array<string> {
        return ['Seems like our paths have already crossed in the past...',
            'Last used on ' + date.toDateString() + '.', '<br/>']
    }

    _createSimpleResponse(save: boolean, html: string, msgs: Array<string>) {
        return {
            'save': save,
            'responses': [{
                'html': html,
                'sentences': msgs
            } as CmdHandlerMessageEntry]
        } as CmdHandlerMessageResponse
    }

    help(): CmdHandler {
        const that = this
        return new class implements CmdHandler {
            canHandle(msg: string, vue: Vue): boolean {
                return msg.trim().toLocaleLowerCase().indexOf('help') > -1
            }

            // eslint-disable-next-line no-unused-vars
            async handle(msg: string, vue: Vue): Promise<CmdHandlerMessageResponse> {
                return that._createSimpleResponse(false, '', ['Some things you may want to do...:',
                    'help......: this',
                    'clear.....: clear the screen',
                    'reset.....: reset conversation state',
                    'history...: see what you accomplished'])
            }
        }
    }

    reset(): CmdHandler {
        const that = this
        return new class implements CmdHandler {
            canHandle(msg: string, vue: Vue): boolean {
                return msg.trim().toLocaleLowerCase() === 'reset'
            }

            async handle(msg: string, vue: Vue): Promise<CmdHandlerMessageResponse> {
                // @ts-ignore
                vue.$refs!.appConversation!.resetState()
                return that._createSimpleResponse(false, '',
                    ['It\'s time to reset, rethink and reposition.', 'Let the work begin.'])
            }
        }
    }

    clear(): CmdHandler {
        const that = this
        return new class implements CmdHandler {
            canHandle(msg: string, vue: Vue): boolean {
                return msg.trim().toLocaleLowerCase() === 'clear'
            }

            async handle(msg: string, vue: Vue): Promise<CmdHandlerMessageResponse> {
                // @ts-ignore
                vue.$refs!.appConversation!.clearConversation()
                return that._createSimpleResponse(false, '',
                    ['Every moment is a fresh beginning. -- T.S. ELIOT'])
            }
        }
    }

    history(): CmdHandler {
        const that = this
        return new class implements CmdHandler {
            canHandle(msg: string, vue: Vue): boolean {
                return msg.trim().toLocaleLowerCase() === 'history'
            }

            async handle(msg: string, vue: Vue): Promise<CmdHandlerMessageResponse> {
                // @ts-ignore
                return that._createSimpleResponse(false, '',
                    ['It does not do to dwell on dreams and forget to live. -- Albus Dumbledore', '',
                        'Here is what I remember about your history on this site...'])
            }
        }
    }

// eslint-disable-next-line no-unused-vars
    async handle(msg: string, vue: Vue, ctx: Array<string> = []):
        Promise<CmdHandlerMessageResponse> {
        for (const h of this.handlers) {
            if (h.canHandle(msg, vue)) {
                return h.handle(msg, vue)
            }
        }
        /*
         * I am afraid, nothing to find here... :)
         */
        // @ts-ignore
        return DataService.sendMessage(msg, ctx.slice(QUESTION_CTX_SLICE_SIZE)).then(m => {
            return {
                'save': m.save || false,
                'responses': m.responses || []
            } as CmdHandlerMessageResponse
        })
    }
}

export default new CmdManager()