import { LitElement, html, css } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('bl-button')
export class BlButton extends LitElement {
  static styles = css`
    button {
      color: resd;
    }
  `

  render() {
    return html`<button><slot></slot></button>`
  }
}
