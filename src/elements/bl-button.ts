import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js';

@customElement('bl-button')
export class BlButton extends LitElement {
  static styles = css`
    button {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: center;
      border: solid 1px var(--primary-color);
      border-radius: 5px;
    }

    .sizeNormal {
      padding: 0.5rem 1.5rem;
      font-size: var(--font-size-normal);
    }
    .sizeSmall {
      padding: 0.3rem 1rem;
      font-size: var(--font-size-small);
    }
  `

  @property({ type: String })
  size: string = 'normal';

  render() {
    const classes = {
      sizeSmall: this.size === 'small',
      sizeNormal: this.size === 'normal',
    }

    return html`<button class=${classMap(classes)}><slot></slot></button>`
  }
}
