const STAGE = 'stage';
const CONVERSATION = 'conversation';
const LAST_USE = 'last_use';


class PersistenceService {
    private stageChangeNotifiers: { (): void; }[] = [];

    constructor() {
    }

    addStageChangeNotifier(callback: { (): void }) {
        this.stageChangeNotifiers.push(callback)
    }

    getCurrentStage() {
        return localStorage.getItem(STAGE) || 'init'
    }

    saveStage(stage: string) {
        const stored = localStorage.getItem(STAGE)
        if (stored != null && stored != stage) {
            this.stageChangeNotifiers.forEach(f => f())
        }
        localStorage.setItem(STAGE, stage)
    }

    saveConversation(msgs: Array<string>) {
        localStorage.setItem(CONVERSATION, JSON.stringify(msgs))
    }

    getConversation() {
        const c = localStorage.getItem(CONVERSATION)
        if (c == null) {
            return []
        }
        return JSON.parse(c)
    }

    resetState() {
        localStorage.removeItem(CONVERSATION)
        localStorage.removeItem(STAGE)
        localStorage.removeItem(LAST_USE)
    }

    markLastUsage() {
        localStorage.setItem(LAST_USE, JSON.stringify(Date.now()))
    }

    getLastUsage(): Date | null {
        const d = localStorage.getItem(LAST_USE)
        if (d == null) return null
        return new Date(JSON.parse(d))
    }

}

export default new PersistenceService();
