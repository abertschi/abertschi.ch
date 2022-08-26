<template>
  <div class='text-container'
       id='user-input-div'
       v-show="showInput">

    <div class='text-prefix'>$</div>

    <textarea @keydown.enter.prevent="onTextEnter"
              class='text-input'
              id='user-input-text'
              v-model="inputText"
              placeholder="and more ..."></textarea>
  </div>
  <div class='text-bottom-margin'></div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import {Vue} from "vue-class-component";
import CmdHandler from "@/services/CmdHandler";
import PersistenceService from "@/services/PersistenceService";


const ID_INTRO = 'intro'
const ID_TEXT_INPUT = 'user-input-text'
const CURSOR_HTML = '<span class="typing">|</span>'
const LINEBREAK = 'linebreak'

const WAIT_EMPTY_LINE_MS = 500
const WAIT_LINE_BREAK_MS = 100
const WAIT_END_OF_LINE_MS = 600
const WAIT_CHAR = 40


export default defineComponent({
  name: "AppIntro",
  mounted() {

    this.conversationIntro = this.clearHtmlData(ID_INTRO)
    this.typeRows(this.conversationIntro, false)

    /* Clear ctx if stage changes */
    PersistenceService.addStageChangeNotifier(() => {
      this.questionCtx = []
    })

    window.addEventListener('click', this.skipTyping);
    window.addEventListener('touchend', this.skipTyping);
    window.addEventListener("keypress", this.skipTyping);
    this.doTyping()
  },

  data() {
    return {
      inputText: '' as string,
      showInput: false,
      stop: false,
      initialDialog: true,
      questionCtx: [] as Array<string>,
      isTyping: false,
      typingBuffer: [] as Array<string>,
      typingBufferIndex: 0,
      typeEmptyRow: false,
      typeLineBreak: false,
      conversation: PersistenceService.getConversation() as Array<string>,
      conversationIntro: [] as Array<string>,
    }
  },
  methods: {
    _scrollToBottomOfPage() {
      window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
    },
    _addConversation(entry: string) {
      this.conversation.push(entry)
      PersistenceService.saveConversation(this.conversation)
    },
    _escapeHTML(unsafeText) {
      let div = document.createElement('div');
      div.innerText = unsafeText;
      return div.innerHTML;
    },
    onTextEnter() {
      PersistenceService.markLastUsage()
      let escaped = this._escapeHTML(this.inputText)
      this.questionCtx.push(escaped)
      let msg = `<i style="opacity: 0.4; font-size: 13px;">${escaped}</i>`
      this._addConversation(msg)
      this._createAndInsertLi(ID_INTRO, msg)

      let that = this
      CmdHandler.handle(this.inputText, this.$root as Vue, this.questionCtx).then(r => {
        setTimeout(() => {
          for (const entry of r.responses) {
            if (entry.html != null && entry.html != '') {
              that.typeRows([entry.html], r.save)
            }
            that.typeRows(entry.sentences, r.save)
          }
        }, 500)
      })
      this.inputText = ''
    },
    resetState() {
      PersistenceService.resetState()
      this.clearConversation()
      this.questionCtx = []
    },
    clearConversation() {
      this.conversation = []
      this.questionCtx = []
      PersistenceService.saveConversation(this.conversation)
      this.clearHtmlData(ID_INTRO, true)
      this.stop = true;
      this.typingBuffer = [...this.conversationIntro];
      this.typingBufferIndex = this.conversationIntro.length
      this.isTyping = false

      for (let i = 0; i < this.typingBuffer.length; i++) {
        this._createAndInsertLi(ID_INTRO, this.typingBuffer[i])
      }

      this.showInput = true
      this.initialDialog = false
      this.stop = false
    },
    clearHtmlData(container: string,
                  clear: boolean = true): Array<string> {
      let intro = document.getElementById(container);
      if (!intro) {
        throw Error("id not found: " + container)
      }
      let rx = intro!.children
      let rows: string[] = []
      for (let i = 0; i < rx.length; i++) {
        rows.push(rx[i]!.innerHTML)
      }
      if (clear) {
        document.getElementById(container)!.innerHTML = ''
      }
      return rows
    },
    _createAndInsertLi(containerId: string, data: string = '') {
      let intro = document.getElementById(containerId)
      if (intro == null) {
        throw Error("id not found: " + containerId)
      }
      let li = document.createElement('li')
      li.className = 'command'
      li.appendChild(document.createTextNode(''))
      li.innerHTML = data
      intro.appendChild(li)
      return li
    },
    skipTyping(e: Event) {
      if (!this.initialDialog) {
        return
      }
      e.stopPropagation();
      this.clearHtmlData(ID_INTRO, true)
      this.stop = true;
      this.typingBufferIndex = this.typingBuffer.length
      this.showInput = false
      this.isTyping = false

      for (let i = 0; i < this.typingBuffer.length; i++) {
        this._createAndInsertLi(ID_INTRO, this.typingBuffer[i])
      }

      this.showInput = true
      let that = this
      this._onTypingFinished()
      setTimeout(() => {
        that.stop = false
      }, 1000)
    },
    _removeTypingAnimation(containerId: string) {
      let id = document.getElementById(containerId)
      if (id == null) {
        throw Error("id not found: " + containerId)
      }
      let rx = id!.children
      for (let i = 0; i < rx.length; i++) {
        if (rx[i].innerHTML == null) continue
        if (rx[i].innerHTML.indexOf('<span class="typing">|</span>') > -1) {
          rx[i].innerHTML = rx[i].innerHTML.replace('<span class="typing">|</span>', '');
        }
      }
    },
    _onTypingFinished() {
      let init = this.initialDialog
      if (this.initialDialog) {
        let last = PersistenceService.getLastUsage();
        if (last != null) {
          let msg = CmdHandler.greetBack(last)
          for (const m of msg) {
            this._createAndInsertLi(ID_INTRO, m)
          }
        }
        for (let i = 0; i < this.conversation.length; i++) {
          this._createAndInsertLi(ID_INTRO, this.conversation[i])
        }
      } else {
        this._scrollToBottomOfPage()
      }
      this.initialDialog = false
      let that = this
      setTimeout(() => {
        this.isTyping = false
        if (!init) {
          that._focusInput()
        }
        that.doTyping()
      }, 500)
    },
    doTyping() {
      if (this.isTyping) {
        return
      }

      if (this.typingBuffer.length <= this.typingBufferIndex) {
        return
      }
      this.isTyping = true
      this.showInput = false
      this._removeTypingAnimation(ID_INTRO)

      let i = this.typingBufferIndex
      let that = this

      function type() {
        if (that.stop) {
          return
        }
        if (++i < that.typingBuffer.length) {
          that._typeSingleRow(that.typingBuffer[i], type)
        } else {
          that._removeTypingAnimation(ID_INTRO)
          that.showInput = true
          that.typingBufferIndex = i
          that.isTyping = false
          that._onTypingFinished()
        }
      }

      this._typeSingleRow(this.typingBuffer[i], type)
    },
    _focusInput() {
      document.getElementById(ID_TEXT_INPUT)!.focus()
    },
    typeRows(rows: Array<string>, save: boolean = true) {
      rows.forEach(r => this.typingBuffer.push(r))
      if (save) {
        rows.forEach(r => this._addConversation(r))
      }
      this.doTyping()
    },
    _typeSingleRow(row: string, onDone: () => void) {
      if (this.stop) return

      this.typeEmptyRow = false
      this.typeLineBreak = false
      let li = this._createAndInsertLi(ID_INTRO)
      let cursor = 0

      let typeCharInterval = setInterval(() => {
        if (this.stop) {
          clearInterval(typeCharInterval)
          return
        }
        // empty lines
        if (row.indexOf('<br') == cursor) {
          this.typeEmptyRow = true;
        }
        // any html
        if (row[cursor] == "<") {
          let startPos = cursor;
          for (; row[cursor] != ">"; cursor++) {
            if (row.substr(startPos, cursor).indexOf(LINEBREAK) > -1) {
              this.typeLineBreak = true;
            }
          }
        }

        li.innerHTML = row.substr(0, cursor) + CURSOR_HTML;
        cursor++;

        // end of line
        if (row.length < cursor) {
          clearInterval(typeCharInterval)
          let that = this
          setTimeout(function () {
            if (that.stop) {
              return
            }
            that._removeTypingAnimation(ID_INTRO)

            onDone()
          }, this.stop ? 0 : this.typeEmptyRow
              ? WAIT_EMPTY_LINE_MS : this.typeLineBreak
                  ? WAIT_LINE_BREAK_MS : WAIT_END_OF_LINE_MS)
        }

      }, this.stop ? 0 : WAIT_CHAR); /* typeChar */
    }
  },
});

</script>

<style>
.intro {
  font-family: 'Ubuntu Mono', serif;
  font-size: 16px;
  line-height: 1.2;
}

.cmd-intro {
  padding-top: 30px;
}

.typing {
  position: relative;
  display: inline-block;
  width: 8px;
  /* background: #BE0000;
     color: #BE0000; */

  background: #000000;
  color: #000000;

  -webkit-animation: blink 1.5s linear infinite;
  -moz-animation: blink 1.5s linear infinite;
  -ms-animation: blink 1.5s linear infinite;
  -o-animation: blink 1.5s linear infinite;
  animation: blink 1.5s linear infinite;
}

ul {
  list-style: none;
  list-style-type: none;
  margin: 0;
  padding: 0;
}

@-webkit-keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@-moz-keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@-ms-keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@-o-keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}


.text-container {
  background-color: transparent;
  outline: none;
  border: none;
  text-align: left;
  overflow: hidden;
  margin-top: 15px;
}

.text-prefix {
  float: left;
}

.text-input {
  opacity: 0.5;
  min-height: 100px;
  height: auto;
  background-color: transparent;
  outline: none;
  border: none;
  margin-left: 10px;
  font-family: 'Ubuntu Mono';

  width: 90%;

}

@media ( min-width: 900px ) {
  /** laptop **/
  .text-bottom-margin {
    margin-bottom: 100px
  }
}


</style>