// Client half of dsh-client-annotation-cards-v2.
//
// Codex-style annotations, second pass:
//   * select text -> small white pill "加入对话";
//   * clicking it opens a centered popover right at the selection where the user
//     types the execution result / comment; Enter saves and closes it;
//   * a small blue badge is pinned to the annotated text; clicking the badge
//     reopens the popover for editing;
//   * the composer only grows a compact "4 条注释" chip; expanding it shows the
//     Codex-style cards (quote + comment + edit/delete);
//   * sending attaches a machine-readable block, and after the message lands the
//     raw block is replaced in the transcript by a collapsible "N 条注解" card
//     (that part is a DOM enhancement; if it cannot find the bubble it leaves
//     the readable text in place).
window.__ModuleLoader__.load({
  id: 'dsh-client-annotation-cards-v2',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const react = require('react')
    const h = react.createElement

    const MAX_SELECTION = 4000
    const SENT_START = '[[对话注解]]'
    const SENT_END = '[[/对话注解]]'

    // ------------------------------------------------------------- style ----

    const CSS = `
.dsa-bar{position:fixed;z-index:2147483000;display:none;align-items:center;padding:3px;border-radius:10px;
  background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e7e7e7);
  box-shadow:0 8px 28px rgba(0,0,0,.14),0 1px 2px rgba(0,0,0,.06);
  font:13px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--dsw-alias-label-primary,#111)}
.dsa-bar[data-open="1"]{display:flex}
.dsa-bar-btn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border:0;border-radius:7px;
  background:transparent;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary,#111);cursor:pointer;white-space:nowrap}
.dsa-bar-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#f2f2f2)}
.dsa-pop{position:fixed;z-index:2147483001;display:none;box-sizing:border-box;width:320px;padding:10px;
  border-radius:12px;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e7e7e7);
  box-shadow:0 12px 36px rgba(0,0,0,.18);font:12px/18px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  color:var(--dsw-alias-label-primary,#111)}
.dsa-pop[data-open="1"]{display:block}
.dsa-pop-preview{max-height:36px;overflow:hidden;background:var(--dsw-alias-bg-l2,#f6f6f6);border-radius:8px;
  padding:6px 8px;font:11px/16px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:var(--dsw-alias-label-secondary,#555);white-space:pre-wrap;word-break:break-word;margin-bottom:8px}
.dsa-pop-edit{box-sizing:border-box;width:100%;min-height:64px;padding:7px 9px;border-radius:8px;
  border:1px solid var(--dsw-alias-border-l2,#ddd);background:var(--dsw-alias-bg-base,#fff);color:inherit;
  font:inherit;font-size:13px;line-height:20px;resize:vertical;outline:none}
.dsa-pop-edit:focus{border-color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsa-pop-foot{display:flex;align-items:center;gap:8px;margin-top:8px}
.dsa-pop-hint{color:var(--dsw-alias-label-caption,#aaa);font-size:11px;line-height:16px}
.dsa-pop-save{margin-left:auto;height:26px;padding:0 12px;border:0;border-radius:8px;
  background:var(--dsw-alias-state-business-primary,#4d6bfe);color:#fff;font:inherit;font-size:12px;cursor:pointer}
.dsa-pop-save:hover{filter:brightness(1.05)}
.dsa-badges{position:fixed;inset:0;z-index:2147482990;pointer-events:none}
.dsa-badge{position:fixed;pointer-events:auto;display:flex;align-items:center;justify-content:center;
  width:20px;height:20px;padding:0;border:2px solid var(--dsw-alias-bg-base,#fff);border-radius:50%;
  background:var(--dsw-alias-state-business-primary,#4d6bfe);color:#fff;cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform 100ms ease}
.dsa-badge:hover{transform:scale(1.12)}
.dsa-dock{box-sizing:border-box;width:calc(100% - 24px);max-width:720px;margin:0 auto 6px;display:flex;justify-content:flex-start}
.dsa-mini{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 8px 0 5px;border-radius:8px;
  background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e7e7e7);
  box-shadow:0 2px 10px rgba(0,0,0,.07);color:var(--dsw-alias-label-secondary,#555);
  font:12px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;cursor:pointer;
  max-width:100%;white-space:nowrap}
.dsa-mini:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);color:var(--dsw-alias-label-primary,#111)}
.dsa-mini-count{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;
  padding:0 4px;border-radius:9px;background:var(--dsw-alias-state-business-primary,#4d6bfe);color:#fff;
  font-size:10px;font-weight:600;line-height:16px}
.dsa-mini-chev{color:var(--dsw-alias-label-tertiary,#999);display:inline-flex}
.dsa-panel{box-sizing:border-box;width:calc(100% - 24px);max-width:720px;margin:0 auto 6px;padding:10px 12px 8px;
  border:1px solid var(--dsw-alias-border-l1,#e7e7e7);border-radius:14px;background:var(--dsw-alias-bg-base,#fff);
  box-shadow:0 6px 24px rgba(0,0,0,.06);font:13px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  color:var(--dsw-alias-label-primary,#111)}
.dsa-panel-head{display:flex;align-items:center;gap:8px;padding:0 2px 2px}
.dsa-panel-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#666)}
.dsa-panel-spacer{flex:auto}
.dsa-icon-btn{width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;
  color:var(--dsw-alias-label-tertiary,#999);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.dsa-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#f2f2f2);color:var(--dsw-alias-label-primary,#111)}
.dsa-card{border:1px solid var(--dsw-alias-border-l1,#ececec);border-radius:10px;padding:8px 10px;margin-top:8px;
  background:var(--dsw-alias-bg-base,#fff)}
.dsa-card:first-of-type{margin-top:0}
.dsa-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.dsa-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);margin-bottom:4px}
.dsa-actions{display:flex;align-items:center;gap:2px;flex:none}
.dsa-quote{position:relative;box-sizing:border-box;background:var(--dsw-alias-bg-l2,#f6f6f6);border-radius:8px;
  padding:8px 10px;font:12px/18px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:var(--dsw-alias-label-secondary,#444);white-space:pre-wrap;word-break:break-word;overflow:hidden;max-height:52px}
.dsa-quote::after{content:"";position:absolute;left:0;right:0;bottom:0;height:14px;
  background:linear-gradient(to bottom,rgba(246,246,246,0),var(--dsw-alias-bg-l2,#f6f6f6))}
.dsa-comment-label{margin-top:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888)}
.dsa-comment{margin-top:2px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#111);
  white-space:pre-wrap;word-break:break-word}
.dsa-comment-empty{color:var(--dsw-alias-label-caption,#aaa);cursor:text}
.dsa-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;
  border-top:1px solid var(--dsw-alias-border-l1,#f0f0f0)}
.dsa-chip{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border:0;border-radius:7px;
  background:var(--dsw-alias-bg-l2,#f2f2f2);color:var(--dsw-alias-label-secondary,#555);
  font:inherit;font-size:12px;cursor:pointer}
.dsa-chip:hover{background:var(--dsw-alias-interactive-bg-hover,#e9e9e9);color:var(--dsw-alias-label-primary,#111)}
.dsa-hint{font-size:12px;color:var(--dsw-alias-label-caption,#aaa)}
.dsa-ghost{margin-left:auto;height:24px;padding:0 8px;border:0;border-radius:7px;background:transparent;
  color:var(--dsw-alias-label-tertiary,#888);font:inherit;font-size:12px;cursor:pointer}
.dsa-ghost:hover{background:var(--dsw-alias-interactive-bg-hover,#f2f2f2);color:var(--dsw-alias-label-primary,#111)}
.dsa-sent{margin:6px 0 0 auto;max-width:100%;display:flex;flex-direction:column;align-items:flex-end}
.dsa-sent-head{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 5px;border-radius:8px;
  background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e7e7e7);
  box-shadow:0 1px 6px rgba(0,0,0,.06);color:var(--dsw-alias-label-secondary,#555);
  font:12px/18px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;cursor:pointer;max-width:100%}
.dsa-sent-head:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5)}
.dsa-sent-count{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;padding:0 4px;
  border-radius:8px;background:var(--dsw-alias-state-business-primary,#4d6bfe);color:#fff;font-size:10px;font-weight:600}
.dsa-sent-list{display:none;flex-direction:column;gap:6px;margin-top:6px;width:min(360px,100%)}
.dsa-sent-list[data-open="1"]{display:flex}
.dsa-sent-card{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l1,#ececec);border-radius:10px;
  background:var(--dsw-alias-bg-base,#fff);padding:8px 10px;box-shadow:0 2px 10px rgba(0,0,0,.05);text-align:left;
  font:12px/18px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--dsw-alias-label-primary,#111)}
.dsa-sent-label{color:var(--dsw-alias-label-tertiary,#888);font-size:11px;margin-bottom:3px}
.dsa-sent-quote{background:var(--dsw-alias-bg-l2,#f6f6f6);border-radius:7px;padding:6px 8px;
  font:11px/16px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary,#444);
  white-space:pre-wrap;word-break:break-word;max-height:64px;overflow:hidden}
.dsa-sent-comment{margin-top:5px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary,#111)}
`
    const styleTagId = 'dsh-client-annotation-cards-v2/style'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + styleTagId + '"]') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-client-annotation-cards-v2'
      tag.dataset.pluginCss = styleTagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    // ------------------------------------------------------------- state ----

    const state = { sessionId: null, draft: '', phase: 'plain', inputActions: undefined }
    const stores = new Map()
    let nextAnnotationId = 1
    let nextAnchorId = 1

    function storeFor(sessionId) {
      let store = stores.get(sessionId)
      if (store === undefined) {
        store = { list: [], anchors: new Map(), listeners: new Set(), expanded: false }
        stores.set(sessionId, store)
      }
      return store
    }

    function emit(sessionId) {
      const store = storeFor(sessionId)
      for (const listener of [...store.listeners]) {
        try {
          listener()
        } catch {
          // a broken subscriber must not break annotation edits
        }
      }
    }

    function normalize(text) {
      return String(text == null ? '' : text).replace(/\r\n?/g, '\n')
    }

    function clampText(text) {
      const body = normalize(text)
      return body.length > MAX_SELECTION ? body.slice(0, MAX_SELECTION) + '\n…（已截断）' : body
    }

    function annotationCount(sessionId) {
      return sessionId === null || sessionId === undefined ? 0 : storeFor(sessionId).list.length
    }

    /**
     * Add one annotation. A DOM Range anchors it for the blue badge.
     * @returns the annotation item.
     */
    function addAnnotation(sessionId, text, comment, range) {
      const store = storeFor(sessionId)
      const anchorId = nextAnchorId
      nextAnchorId += 1
      store.anchors.set(anchorId, { range: range && typeof range.cloneRange === 'function' ? range.cloneRange() : null })
      const item = { id: nextAnnotationId, text: clampText(text), comment: normalize(comment), anchorId: anchorId }
      nextAnnotationId += 1
      store.list.push(item)
      emit(sessionId)
      scheduleBadges()
      return item
    }

    function findAnnotation(sessionId, id) {
      const store = storeFor(sessionId)
      for (const item of store.list) if (item.id === id) return item
      return null
    }

    function setAnnotationComment(sessionId, id, comment) {
      const store = storeFor(sessionId)
      store.list = store.list.map((item) =>
        item.id === id ? { id: item.id, text: item.text, comment: normalize(comment), anchorId: item.anchorId } : item,
      )
      emit(sessionId)
    }

    function removeAnnotation(sessionId, id) {
      const store = storeFor(sessionId)
      const item = findAnnotation(sessionId, id)
      if (item === null) return
      store.list = store.list.filter((entry) => entry.id !== id)
      store.anchors.delete(item.anchorId)
      emit(sessionId)
      scheduleBadges()
    }

    function clearAnnotations(sessionId) {
      const store = storeFor(sessionId)
      if (store.list.length === 0) return
      store.list = []
      store.anchors.clear()
      emit(sessionId)
      scheduleBadges()
    }

    function setExpanded(sessionId, expanded) {
      const store = storeFor(sessionId)
      store.expanded = expanded
      emit(sessionId)
    }

    // ------------------------------------------------------- payload text ----

    function buildAttachedBlock(list) {
      const out = [SENT_START]
      list.forEach((item, index) => {
        const number = String(index + 1)
        out.push('注解 ' + number + ' · 选中文本：')
        out.push(normalize(item.text).replace(/\s+$/, ''))
        out.push('注解 ' + number + ' · 用户注释：')
        out.push(normalize(item.comment).trim() === '' ? '（无）' : normalize(item.comment).trim())
      })
      out.push(SENT_END)
      return out.join('\n')
    }

    /** Parse the attached block back out of a sent message text. */
    function parseAttachedBlock(text) {
      const body = normalize(text)
      const start = body.indexOf(SENT_START)
      if (start === -1) return null
      const end = body.indexOf(SENT_END, start + SENT_START.length)
      const question = body.slice(0, start).trim()
      const inner = body.slice(start + SENT_START.length, end === -1 ? body.length : end)
      const lines = inner.split('\n')
      const items = []
      let current = null
      let mode = 'text'
      for (const line of lines) {
        const textHead = /^注解\s*(\d+)\s*·\s*选中文本：\s*$/.exec(line)
        const commentHead = /^注解\s*(\d+)\s*·\s*用户注释：\s*$/.exec(line)
        if (textHead !== null) {
          current = { text: [], comment: [] }
          mode = 'text'
          items.push(current)
          continue
        }
        if (commentHead !== null) {
          mode = 'comment'
          continue
        }
        if (current === null) continue
        if (mode === 'comment') current.comment.push(line)
        else current.text.push(line)
      }
      return {
        question: question,
        items: items.map((item) => ({
          text: item.text.join('\n').trim(),
          comment: item.comment.join('\n').trim(),
        })),
      }
    }

    // -------------------------------------------------------------- editor ---

    function composerEditableOf(target) {
      const el = target === null || target === undefined ? null : target.nodeType === 1 ? target : target.parentElement
      if (el === null || el === undefined || typeof el.closest !== 'function') return null
      return el.closest('[contenteditable="true"],[contenteditable=""]')
    }

    function pasteIntoComposer(editable, text) {
      try {
        const data = new DataTransfer()
        data.setData('text/plain', text)
        const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })
        editable.dispatchEvent(event)
        return true
      } catch {
        return false
      }
    }

    function editorContains(editable, needle) {
      try {
        const text = editable.innerText !== undefined && editable.innerText !== null ? editable.innerText : editable.textContent
        return String(text || '').indexOf(needle) !== -1
      } catch {
        return false
      }
    }

    function findComposerEditable() {
      try {
        const active = document.activeElement
        if (active !== null && active !== undefined && active.nodeType === 1 && typeof active.closest === 'function') {
          const own = active.closest('[contenteditable="true"],[contenteditable=""]')
          if (own !== null) return own
        }
        const all = document.querySelectorAll('[contenteditable="true"],[contenteditable=""]')
        for (const el of all) {
          if (typeof el.closest === 'function' && el.closest('.dsa-panel,.dsa-bar,.dsa-pop,.dsa-dock') === null) return el
        }
      } catch {
        // no editor in this view
      }
      return null
    }

    // ------------------------------------------------------- send wrapping ---

    function replayEnter(editable) {
      try {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
          composed: true,
        })
        Object.defineProperty(event, 'keyCode', { get: () => 13 })
        Object.defineProperty(event, 'which', { get: () => 13 })
        editable.dispatchEvent(event)
      } catch {
        try {
          state.inputActions.submit()
        } catch {
          // nothing else we can do here
        }
      }
    }

    function flushAnnotationsThenSend(editable, replay) {
      const sessionId = state.sessionId
      if (sessionId === null || sessionId === undefined) return
      const store = storeFor(sessionId)
      if (store.list.length === 0) return
      const block = buildAttachedBlock(store.list.slice())
      const pasted = pasteIntoComposer(editable, '\n\n' + block)

      window.setTimeout(() => {
        const attached = pasted && (editorContains(editable, SENT_START) || normalize(state.draft).indexOf(SENT_START) !== -1)
        if (!attached) {
          const draft = normalize(state.draft)
          const next = draft.trim() === '' ? block : draft.replace(/\s+$/, '') + '\n\n' + block
          try {
            state.inputActions.setDraft(next)
          } catch {
            // give up silently; the user still has the chip
          }
        }
        clearAnnotations(sessionId)
        window.setTimeout(() => replay(), 0)
      }, 30)
    }

    // -------------------------------------------------------------- events ---

    function onKeyDownCapture(event) {
      try {
        if (event === null || event === undefined || event.defaultPrevented) return
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
        if (event.isComposing || event.keyCode === 229) return
        const sessionId = state.sessionId
        if (annotationCount(sessionId) === 0) return
        if (state.phase !== 'plain') return
        const draft = normalize(state.draft).trim()
        if (draft.startsWith('/')) return
        const editable = composerEditableOf(event.target)
        if (editable === null) return
        event.preventDefault()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
        event.stopPropagation()
        flushAnnotationsThenSend(editable, () => replayEnter(editable))
      } catch {
        // never break ordinary Enter handling
      }
    }

    function isSendButton(button) {
      return /(发送|提交|send|submit)/i.test(String(button.getAttribute('aria-label') || ''))
    }

    function onClickCapture(event) {
      try {
        if (event === null || event === undefined || event.defaultPrevented) return
        const sessionId = state.sessionId
        if (annotationCount(sessionId) === 0) return
        if (state.phase !== 'plain') return
        const target = event.target
        const el = target === null || target === undefined ? null : target.nodeType === 1 ? target : target.parentElement
        if (el === null || el === undefined || typeof el.closest !== 'function') return
        const button = el.closest('button')
        if (button === null || button.disabled) return
        if (!isSendButton(button)) return
        const editable = findComposerEditable()
        if (editable === null) return
        event.preventDefault()
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
        event.stopPropagation()
        flushAnnotationsThenSend(editable, () => {
          try {
            button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
          } catch {
            try {
              state.inputActions.submit()
            } catch {
              // nothing else we can do here
            }
          }
        })
      } catch {
        // never break ordinary clicks
      }
    }

    // -------------------------------------------------------- overlay UI -----

    let mounted = 0
    let ui = null
    let current = null
    let popover = null
    let badgeEls = new Map()
    let badgeFrame = null
    let observer = null
    let scanTimer = null

    function svgIcon(path, size) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 20 20',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: path }),
      )
    }

    const PENCIL_PATH =
      'M12.1 3.4a1.7 1.7 0 0 1 2.4 0l2.1 2.1a1.7 1.7 0 0 1 0 2.4l-8.4 8.4a1 1 0 0 1-.5.3l-3.4.8a.5.5 0 0 1-.6-.6l.8-3.4a1 1 0 0 1 .3-.5l8.4-8.4z'
    const TRASH_PATH =
      'M4 6h12M8.5 3.5h3M6 6l.7 10.1a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6M8.5 9v5M11.5 9v5'
    const CHEVRON_PATH = 'M5 7.5 10 12.5 15 7.5'

    function createUi() {
      const root = document.createElement('div')
      root.className = 'dsa-bar'
      root.setAttribute('data-open', '0')
      const btnAdd = document.createElement('button')
      btnAdd.type = 'button'
      btnAdd.className = 'dsa-bar-btn'
      btnAdd.textContent = '加入对话'
      root.appendChild(btnAdd)
      document.body.appendChild(root)

      const pop = document.createElement('div')
      pop.className = 'dsa-pop'
      pop.setAttribute('data-open', '0')
      const preview = document.createElement('div')
      preview.className = 'dsa-pop-preview'
      const edit = document.createElement('textarea')
      edit.className = 'dsa-pop-edit'
      edit.rows = 3
      edit.placeholder = '输入执行结果或注释，Enter 保存'
      const foot = document.createElement('div')
      foot.className = 'dsa-pop-foot'
      const hint = document.createElement('span')
      hint.className = 'dsa-pop-hint'
      hint.textContent = 'Enter 保存 · Shift+Enter 换行 · Esc 取消'
      const save = document.createElement('button')
      save.type = 'button'
      save.className = 'dsa-pop-save'
      save.textContent = '保存'
      foot.appendChild(hint)
      foot.appendChild(save)
      pop.appendChild(preview)
      pop.appendChild(edit)
      pop.appendChild(foot)
      document.body.appendChild(pop)

      const badges = document.createElement('div')
      badges.className = 'dsa-badges'
      document.body.appendChild(badges)

      const created = { root: root, btnAdd: btnAdd, pop: pop, preview: preview, edit: edit, save: save, badges: badges }

      btnAdd.addEventListener('click', () => {
        if (current === null) return
        openCreatePopover(current.text, current.range)
        hideBar()
      })
      save.addEventListener('click', () => commitPopover())
      edit.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          commitPopover()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          closePopover()
        }
      })
      pop.addEventListener('mousedown', (event) => event.stopPropagation())
      return created
    }

    function rectOfRange(range) {
      try {
        if (range === null || range === undefined || typeof range.getBoundingClientRect !== 'function') return null
        const rect = range.getBoundingClientRect()
        if (rect === null || rect === undefined || (rect.width === 0 && rect.height === 0)) return null
        return rect
      } catch {
        return null
      }
    }

    function positionNear(node, rect, widthHint) {
      const width = widthHint || node.offsetWidth || 300
      const height = node.offsetHeight || 40
      const vw = (typeof window.innerWidth === 'number' && window.innerWidth) || 1200
      const vh = (typeof window.innerHeight === 'number' && window.innerHeight) || 800
      const gap = 8
      let left = rect.left + rect.width / 2 - width / 2
      left = Math.max(8, Math.min(left, vw - width - 8))
      let top = rect.top - height - gap
      if (top < 8) top = rect.bottom + gap
      if (top + height > vh - 8) top = Math.max(8, vh - height - 8)
      node.style.left = left + 'px'
      node.style.top = top + 'px'
    }

    function hideBar() {
      current = null
      if (ui !== null) ui.root.setAttribute('data-open', '0')
    }

    // ----- popover -----

    function openCreatePopover(text, range) {
      if (ui === null) return
      popover = { mode: 'create', text: clampText(text), range: range || null, annotationId: null }
      ui.preview.textContent = clampText(text).split('\n').slice(0, 2).join('\n')
      ui.edit.value = ''
      ui.pop.setAttribute('data-open', '1')
      const rect = rectOfRange(range)
      if (rect !== null) positionNear(ui.pop, rect)
      else {
        ui.pop.style.left = Math.max(8, ((window.innerWidth || 1200) - 320) / 2) + 'px'
        ui.pop.style.top = Math.max(8, (window.innerHeight || 800) - 200) + 'px'
      }
      try {
        ui.edit.focus()
      } catch {
        // focus is a nicety
      }
    }

    function openEditPopover(sessionId, annotationId) {
      if (ui === null) return
      const item = findAnnotation(sessionId, annotationId)
      if (item === null) return
      const store = storeFor(sessionId)
      const anchor = store.anchors.get(item.anchorId) || { range: null }
      popover = { mode: 'edit', text: item.text, range: anchor.range || null, annotationId: item.id }
      ui.preview.textContent = item.text.split('\n').slice(0, 2).join('\n')
      ui.edit.value = item.comment
      ui.pop.setAttribute('data-open', '1')
      const rect = rectOfRange(popover.range)
      if (rect !== null) positionNear(ui.pop, rect)
      else {
        ui.pop.style.left = Math.max(8, ((window.innerWidth || 1200) - 320) / 2) + 'px'
        ui.pop.style.top = Math.max(8, (window.innerHeight || 800) / 2) + 'px'
      }
      try {
        ui.edit.focus()
      } catch {
        // focus is a nicety
      }
    }

    function closePopover() {
      popover = null
      if (ui !== null) {
        ui.pop.setAttribute('data-open', '0')
        ui.edit.value = ''
      }
    }

    function commitPopover() {
      if (popover === null) return
      const sessionId = state.sessionId
      const value = ui !== null ? ui.edit.value : ''
      if (sessionId !== null && sessionId !== undefined) {
        if (popover.mode === 'create') {
          addAnnotation(sessionId, popover.text, value, popover.range)
        } else if (popover.annotationId !== null) {
          setAnnotationComment(sessionId, popover.annotationId, value)
        }
      }
      try {
        const selection = window.getSelection ? window.getSelection() : null
        if (selection !== null && typeof selection.removeAllRanges === 'function') selection.removeAllRanges()
      } catch {
        // selection cleanup is optional
      }
      closePopover()
    }

    // ----- badges -----

    function scheduleBadges() {
      if (badgeFrame !== null) return
      const run = () => {
        badgeFrame = null
        renderBadges()
      }
      if (typeof window.requestAnimationFrame === 'function') badgeFrame = window.requestAnimationFrame(run)
      else badgeFrame = window.setTimeout(run, 60)
    }

    function renderBadges() {
      if (ui === null) return
      const sessionId = state.sessionId
      if (sessionId === null || sessionId === undefined) {
        ui.badges.textContent = ''
        badgeEls = new Map()
        return
      }
      const store = storeFor(sessionId)
      const seen = new Set()
      for (const item of store.list) {
        seen.add(item.id)
        const anchor = store.anchors.get(item.anchorId)
        const rect = anchor === undefined ? null : rectOfRange(anchor.range)
        let entry = badgeEls.get(item.id)
        if (rect === null) {
          if (entry !== undefined) entry.el.style.display = 'none'
          continue
        }
        if (entry === undefined) {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'dsa-badge'
          el.title = '点击编辑注解'
          el.setAttribute('aria-label', '编辑注解')
          el.innerHTML =
            '<svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
            PENCIL_PATH +
            '"></path></svg>'
          el.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            openEditPopover(state.sessionId, item.id)
          })
          ui.badges.appendChild(el)
          entry = { el: el }
          badgeEls.set(item.id, entry)
        }
        entry.el.style.display = 'flex'
        entry.el.style.left = Math.max(4, Math.min(rect.right + 6, ((window.innerWidth || 1200) - 26))) + 'px'
        entry.el.style.top = Math.max(4, rect.top - 8) + 'px'
      }
      for (const [id, entry] of [...badgeEls]) {
        if (!seen.has(id)) {
          try {
            entry.el.remove()
          } catch {
            // ignore
          }
          badgeEls.delete(id)
        }
      }
    }

    // ----- attach / detach -----

    function selectElementOf(node) {
      if (node === null || node === undefined) return null
      if (node.nodeType === 1) return node
      return node.parentElement === undefined ? null : node.parentElement
    }

    function handleSelection() {
      if (ui === null) return
      const selection = typeof window.getSelection === 'function' ? window.getSelection() : null
      if (selection === null || selection.rangeCount === 0) {
        hideBar()
        return
      }
      let text = ''
      try {
        text = String(selection.toString() || '').trim()
      } catch {
        text = ''
      }
      if (text === '') {
        hideBar()
        return
      }
      const host = selectElementOf(selection.anchorNode)
      if (host !== null && typeof host.closest === 'function') {
        if (host.closest('.dsa-panel,.dsa-bar,.dsa-pop,.dsa-badge,.dsa-dock') !== null) {
          hideBar()
          return
        }
        if (host.closest('[contenteditable="true"],[contenteditable=""],textarea,input') !== null) {
          hideBar()
          return
        }
      }
      let range = null
      let rect = null
      try {
        range = selection.getRangeAt(0)
        rect = range.getBoundingClientRect()
      } catch {
        range = null
        rect = null
      }
      if (rect === null || rect === undefined || (rect.width === 0 && rect.height === 0)) {
        hideBar()
        return
      }
      current = { text: clampText(text), rect: rect, range: range }
      ui.root.setAttribute('data-open', '1')
      positionNear(ui.root, rect, 150)
    }

    function onMouseUp(event) {
      if (ui === null) return
      if (event !== null && event !== undefined && event.target !== undefined && ui.root.contains(event.target)) return
      window.setTimeout(() => {
        try {
          if (ui === null || popover !== null) return
          handleSelection()
        } catch {
          hideBar()
        }
      }, 0)
    }

    function onMouseDown(event) {
      if (ui === null) return
      const target = event === null || event === undefined ? undefined : event.target
      if (target !== undefined && (ui.root.contains(target) || ui.pop.contains(target))) return
      if (popover !== null && target !== undefined && ui.pop.contains(target)) return
      hideBar()
      if (popover !== null && target !== undefined && !ui.pop.contains(target) && !(ui.badges.contains(target) || false)) {
        // Clicking elsewhere closes the popover unless the click targets a badge.
        if (!(target.nodeType === 1 && target.closest && target.closest('.dsa-badge') !== null)) closePopover()
      }
    }

    function onEscape(event) {
      if (event === null || event === undefined) return
      if (event.key !== 'Escape' && event.key !== 'Esc') return
      if (popover !== null) closePopover()
      else hideBar()
    }

    function attach() {
      if (ui !== null || typeof document === 'undefined') return
      ui = createUi()
      document.addEventListener('mouseup', onMouseUp, true)
      document.addEventListener('mousedown', onMouseDown, true)
      document.addEventListener('keydown', onKeyDownCapture, true)
      document.addEventListener('keydown', onEscape, true)
      document.addEventListener('click', onClickCapture, true)
      window.addEventListener('scroll', () => scheduleBadges(), true)
      window.addEventListener('resize', () => scheduleBadges(), true)
      startTranscriptObserver()
      enhanceTranscript(document.body)
      scheduleBadges()
    }

    function detach() {
      if (ui === null) return
      document.removeEventListener('mouseup', onMouseUp, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKeyDownCapture, true)
      document.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('click', onClickCapture, true)
      if (observer !== null) {
        observer.disconnect()
        observer = null
      }
      for (const el of [ui.root, ui.pop, ui.badges]) {
        try {
          if (typeof el.remove === 'function') el.remove()
        } catch {
          // ignore teardown races
        }
      }
      ui = null
      current = null
      popover = null
      badgeEls = new Map()
    }

    function retain() {
      mounted += 1
      if (mounted === 1) attach()
    }

    function release() {
      mounted = Math.max(0, mounted - 1)
      if (mounted === 0) detach()
    }

    // -------------------------------------------------- transcript enhancer --

    function markerLeavesIn(root, out) {
      if (root === null || root === undefined || root.nodeType !== 1) return
      if (root.dataset !== undefined && root.dataset.dsaDone === '1') return
      if (root.children.length === 0) {
        if (String(root.textContent || '').indexOf(SENT_START) !== -1) out.push(root)
        return
      }
      let leaves
      try {
        leaves = root.querySelectorAll('*')
      } catch {
        return
      }
      for (const el of leaves) {
        if (el.children.length !== 0) continue
        if (el.dataset !== undefined && el.dataset.dsaDone === '1') continue
        if (String(el.textContent || '').indexOf(SENT_START) === -1) continue
        if (typeof el.closest === 'function' && el.closest('pre,code,.dsa-bar,.dsa-pop,.dsa-panel,.dsa-sent,.dsa-dock') !== null) continue
        out.push(el)
      }
    }

    function buildSentCard(items) {
      const wrap = document.createElement('div')
      wrap.className = 'dsa-sent'
      const head = document.createElement('button')
      head.type = 'button'
      head.className = 'dsa-sent-head'
      head.title = '展开/收起注解'
      const count = document.createElement('span')
      count.className = 'dsa-sent-count'
      count.textContent = String(items.length)
      const label = document.createElement('span')
      label.textContent = String(items.length) + ' 条注解'
      const chev = document.createElement('span')
      chev.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
        CHEVRON_PATH +
        '"></path></svg>'
      head.appendChild(count)
      head.appendChild(label)
      head.appendChild(chev)
      const list = document.createElement('div')
      list.className = 'dsa-sent-list'
      list.setAttribute('data-open', '0')
      items.forEach((item, index) => {
        const card = document.createElement('div')
        card.className = 'dsa-sent-card'
        const t = document.createElement('div')
        t.className = 'dsa-sent-label'
        t.textContent = String(index + 1) + '. 选中文本'
        const quote = document.createElement('div')
        quote.className = 'dsa-sent-quote'
        quote.textContent = item.text
        card.appendChild(t)
        card.appendChild(quote)
        if (item.comment !== '' && item.comment !== '（无）') {
          const c = document.createElement('div')
          c.className = 'dsa-sent-label'
          c.style.marginTop = '5px'
          c.textContent = '用户注释'
          const body = document.createElement('div')
          body.className = 'dsa-sent-comment'
          body.textContent = item.comment
          card.appendChild(c)
          card.appendChild(body)
        }
        list.appendChild(card)
      })
      head.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const open = list.getAttribute('data-open') === '1'
        list.setAttribute('data-open', open ? '0' : '1')
      })
      wrap.appendChild(head)
      wrap.appendChild(list)
      return wrap
    }

    function processBubble(el) {
      if (el === null || el === undefined) return
      if (el.dataset !== undefined) el.dataset.dsaDone = '1'
      const parsed = parseAttachedBlock(el.textContent || '')
      if (parsed === null) return
      const parent = el.parentElement
      if (parent === null || parent === undefined) return
      try {
        if (parsed.question === '') {
          el.style.display = 'none'
        } else {
          el.textContent = parsed.question
        }
        parent.insertBefore(buildSentCard(parsed.items), el.nextSibling)
      } catch {
        try {
          el.textContent = (el.textContent || '').length > 0 ? el.textContent : ''
        } catch {
          // leave as-is
        }
      }
    }

    function enhanceTranscript(root) {
      try {
        if (root === null || root === undefined) return
        const leaves = []
        markerLeavesIn(root, leaves)
        for (const el of leaves) processBubble(el)
      } catch {
        // enhancement must never break the transcript
      }
    }

    function scheduleScan(nodes) {
      if (scanTimer !== null) {
        // accumulate on the pending scan
        if (nodes !== undefined) pendingScanNodes.push(...nodes)
        return
      }
      const start = () => {
        scanTimer = null
        const roots = pendingScanNodes.splice(0, pendingScanNodes.length)
        try {
          if (roots.length === 0) {
            enhanceTranscript(document.body)
          } else {
            for (const node of roots) if (node !== undefined && node !== null) enhanceTranscript(node)
          }
        } catch {
          // ignore
        }
      }
      if (nodes !== undefined) pendingScanNodes.push(...nodes)
      scanTimer = window.setTimeout(start, 120)
    }
    const pendingScanNodes = []

    function startTranscriptObserver() {
      if (observer !== null || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
      observer = new MutationObserver((records) => {
        const added = []
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) added.push(node)
          }
        }
        if (added.length > 0) scheduleScan(added)
      })
      try {
        observer.observe(document.body, { childList: true, subtree: true })
      } catch {
        observer = null
      }
    }

    // ------------------------------------------------------------- panel -----

    function iconButton(label, path, onClick) {
      return h(
        'button',
        { type: 'button', className: 'dsa-icon-btn', 'aria-label': label, title: label, onClick: onClick },
        svgIcon(path, 14),
      )
    }

    function AnnotationDock(props) {
      const sessionId = props.sessionId
      state.sessionId = sessionId
      state.inputActions = props.inputActions
      state.draft = props.useInput((snapshot) => snapshot.draft)
      state.phase = props.useInput((snapshot) => snapshot.phase)

      const [, tick] = react.useReducer((value) => value + 1, 0)

      react.useEffect(() => {
        const store = storeFor(sessionId)
        const listener = () => tick({})
        store.listeners.add(listener)
        return () => {
          store.listeners.delete(listener)
        }
      }, [sessionId])

      react.useEffect(() => {
        retain()
        return () => release()
      }, [])

      const store = storeFor(sessionId)
      const list = store.list
      if (list.length === 0) return null

      function manualInsert() {
        const editable = findComposerEditable()
        if (editable === null) return
        const block = buildAttachedBlock(list.slice())
        if (!pasteIntoComposer(editable, '\n\n' + block)) {
          const draftNow = normalize(state.draft)
          const next = draftNow.trim() === '' ? block : draftNow.replace(/\s+$/, '') + '\n\n' + block
          state.inputActions.setDraft(next)
        }
        clearAnnotations(sessionId)
      }

      if (!store.expanded) {
        return h(
          'div',
          { className: 'dsa-dock' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsa-mini',
              title: '展开注解',
              onClick: () => setExpanded(sessionId, true),
            },
            h('span', { className: 'dsa-mini-count' }, String(list.length)),
            h('span', null, String(list.length) + ' 条注释'),
            h('span', { className: 'dsa-mini-chev' }, svgIcon(CHEVRON_PATH, 12)),
          ),
        )
      }

      const cards = list.map((item, index) =>
        h(
          'div',
          { className: 'dsa-card', key: item.id },
          h(
            'div',
            { className: 'dsa-card-head' },
            h('div', { className: 'dsa-label' }, String(index + 1) + '. 选中文本'),
            h(
              'div',
              { className: 'dsa-actions' },
              iconButton('编辑注解', PENCIL_PATH, () => openEditPopover(sessionId, item.id)),
              iconButton('删除注解', TRASH_PATH, () => removeAnnotation(sessionId, item.id)),
            ),
          ),
          h('div', { className: 'dsa-quote' }, item.text),
          h('div', { className: 'dsa-comment-label' }, '用户注释'),
          h(
            'div',
            {
              className: 'dsa-comment' + (item.comment.trim() === '' ? ' dsa-comment-empty' : ''),
              onClick: () => openEditPopover(sessionId, item.id),
            },
            item.comment.trim() === '' ? '点击添加注释…' : item.comment,
          ),
        ),
      )

      return h(
        'div',
        { className: 'dsa-panel' },
        h(
          'div',
          { className: 'dsa-panel-head' },
          h('span', { className: 'dsa-panel-title' }, '对话注解'),
          h('span', { className: 'dsa-panel-spacer' }),
          h(
            'button',
            { type: 'button', className: 'dsa-icon-btn', title: '收起', onClick: () => setExpanded(sessionId, false) },
            svgIcon(CHEVRON_PATH, 14),
          ),
        ),
        h('div', { style: { maxHeight: '44vh', overflowY: 'auto' } }, cards),
        h(
          'div',
          { className: 'dsa-foot' },
          h(
            'button',
            { type: 'button', className: 'dsa-chip', title: '清除全部注解', onClick: () => clearAnnotations(sessionId) },
            String(list.length) + ' 条注解 ×',
          ),
          h('span', { className: 'dsa-hint' }, '回车发送时自动附加'),
          h('button', { type: 'button', className: 'dsa-ghost', onClick: manualInsert }, '插入输入框'),
        ),
      )
    }

    // ------------------------------------------------------------- plugin ----

    const inject = ['slots']

    function apply(ctx) {
      ctx.slots.inject('conversation.input.dock', () =>
        ctx.slots.register(
          {
            name: 'conversation.input.dock',
            id: 'annotation-cards-v2',
            order: 30,
            inject: (sessionId) => ({ sessionId: sessionId }),
          },
          AnnotationDock,
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    exports.AnnotationDock = AnnotationDock
    exports.__internals = {
      state: state,
      storeFor: storeFor,
      addAnnotation: addAnnotation,
      removeAnnotation: removeAnnotation,
      setAnnotationComment: setAnnotationComment,
      clearAnnotations: clearAnnotations,
      setExpanded: setExpanded,
      annotationCount: annotationCount,
      buildAttachedBlock: buildAttachedBlock,
      parseAttachedBlock: parseAttachedBlock,
      attach: attach,
      detach: detach,
      retain: retain,
      release: release,
      handleSelection: handleSelection,
      openEditPopover: openEditPopover,
      commitPopover: commitPopover,
      closePopover: closePopover,
      enhanceTranscript: enhanceTranscript,
      onKeyDownCapture: onKeyDownCapture,
      onClickCapture: onClickCapture,
      findComposerEditable: findComposerEditable,
      pasteIntoComposer: pasteIntoComposer,
      ui: () => ui,
      pop: () => popover,
      current: () => current,
      badgeCount: () => badgeEls.size,
    }

    return module.exports
  },
})
