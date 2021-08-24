import { html, css, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('bl-button')
export class BlButton extends LitElement {
  static styles = css`p { color: blue }`

  render() {
    return html`<button><slot></slot></button>`
  }
}
