import axios, {AxiosInstance} from "axios";
import PersistenceService from "@/services/PersistenceService";

const URL = process.env.VUE_APP_BACKEND_HOST + ":" + process.env.VUE_APP_BACKEND_PORT + "/api"

const http: AxiosInstance = axios.create({
    baseURL: URL,
    timeout: 5000,
    headers: {
        "Content-type": "application/json",
    },
});

export interface MessageEntry {
    sentences: Array<string>,
    html: string
}

export interface MessageResponse {
    save: boolean
    responses: Array<MessageEntry>
}

export interface HistoryResponse {
    history: [MessageResponse]
}

/* eslint-disable */
class DataService {

    _formatErrorResponse(status: number) {
        let s = ''
        if (status) {
            s = `[${status.toString()}]: `
        }
        return {
            'save': false,
            'responses': [
                {
                    'sentences': [
                        s + 'I lost contact to the mothership.'
                        , 'Seems like you are stuck with yourself for now...'
                        , 'Stay tuned and stay curious :).'
                    ],
                    'html': ''
                } as MessageEntry
            ]
        } as MessageResponse
    }

    sendMessage(txt: string, ctx: string[]): Promise<MessageResponse> {
        return http.post("/message", {
            'ctx': ctx || [],
            'message': txt,
            'stage': PersistenceService.getCurrentStage(),
        }).then((r) => {
            if (r.status == 200) {
                let stage = r.data.stage
                let save = r.data.save || true
                if (stage && stage != '') {
                    PersistenceService.saveStage(stage)
                }
                let entries = [] as Array<MessageEntry>
                for (const entry of r.data.responses) {
                    entries.push({
                        'sentences': entry.sentences || [],
                        'html': entry.html || ''
                    } as MessageEntry)
                }
                // 'html':
                return {
                    'save': save,
                    'responses': entries

                } as MessageResponse
            } else {
                return this._formatErrorResponse(r.status)
            }
        }, (error) => this._formatErrorResponse(error.status))
            .catch(e => {
                    console.log(e)
                    return this._formatErrorResponse(0)
                }
            )
    }

    getHistory(): Promise<MessageResponse> {
        return http.get("/history/" + PersistenceService.getCurrentStage())
            .then(r => {
                if (r.status == 200) {
                    let entries = [] as Array<MessageEntry>
                    let save = r.data.save || true
                    for (const entry of r.data.responses) {
                        entries.push({
                            'sentences': entry.sentences || [],
                            'html': entry.html || ''
                        } as MessageEntry)
                    }
                    // 'html':
                    return {
                        'save': save,
                        'responses': entries

                    } as MessageResponse
                } else {
                    return this._formatErrorResponse(r.status)
                }
            }, (error) => this._formatErrorResponse(error.status))
            .catch(e => {
                    console.log(e)
                    return this._formatErrorResponse(0)
                }
            )
    }
}

export default new DataService()
