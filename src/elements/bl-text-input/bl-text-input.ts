import { LitElement, html, css } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'

@customElement('bl-text-input')
export class BlTextInput extends LitElement {
  static styles = css`
    .input {
      width: 100%;
      font-size: 16px;
      border-radius: 5px;
      border: solid 1px #dddddd;
      padding: 10px;
      color: #444444;
      background-color: #ffffff;
      box-sizing: border-box;
    }
  `

  @property({ type: String, reflect: true })
  value: String = ''

  @property({ type: String, reflect: true })
  placeholder: String = ''

  @property({ type: Boolean, reflect: true })
  disabled: Boolean = false

  @query('input')
  input!: HTMLInputElement

  render() {
    return html`
      <input type="text" class="input" .value=${live(this.value)} .placeholder=${this.placeholder} ?disabled=${this.disabled} @input=${this.handleInput} />
    `
  }

  private handleInput() {
    this.value = this.input.value
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bl-text-input': BlTextInput
  }
}
