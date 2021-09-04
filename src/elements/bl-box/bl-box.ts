import { LitElement, html, css } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('bl-box')
export class BlBox extends LitElement {
  static styles = css`
    .box {
      background-color: #ffffff;
      border-radius: 5px;
      border: 1px solid #dddddd;
      padding: 14px;
    }
  `

  render() {
    return html`
      <div class="box">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bl-box': BlBox
  }
}
