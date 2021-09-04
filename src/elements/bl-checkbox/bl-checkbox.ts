import { LitElement, html, css } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

@customElement('bl-checkbox')
export class BlCheckbox extends LitElement {
  static styles = css`
    :host {
      --primary-color: #e3564f;
    }

    .checkbox {
      cursor: pointer;
    }

    @supports (-webkit-appearance: none) or (-moz-appearance: none) {
      .checkbox {
        position: relative;
        padding-left: 17px;
      }

      .input {
        margin-right: 4px;
        cursor: pointer;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
      }
      .input:after {
        transition: opacity 0.1s;
        opacity: 0;
        content: '';
        display: block;
        position: absolute;
        z-index: 2;
        top: 3px;
        left: 7px;
        width: 4px;
        height: 10px;
        transform: rotate(45deg);
        border-bottom: 3px solid var(--primary-color);
        border-right: 3px solid var(--primary-color);
      }
      .input:checked:after {
        opacity: 1;
      }

      .label:before {
        content: '';
        display: block;
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        width: 19px;
        height: 19px;
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        background-color: white;
      }

      .input:focus + .label:before {
        box-shadow: 0 0 5px var(--primary-color);
      }
    }
  `

  @property({ type: Boolean, reflect: true })
  checked: boolean = false

  @query('input')
  input: HTMLInputElement | undefined

  render() {
    return html`
      <label class="checkbox">
        <input type="checkbox" class="input" ?checked=${this.checked} @click=${this.handleClick} />
        <span class="label">
          <slot></slot>
        </span>
      </label>
    `
  }

  click() {
    this.input?.click()
  }

  private handleClick() {
    this.checked = !this.checked

    const event = new Event('change', { bubbles: true, composed: true })
    this.dispatchEvent(event)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bl-checkbox': BlCheckbox
  }
}
