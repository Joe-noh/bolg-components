import { LitElement, html, css, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { primaryColor } from '../../styles/colors'

@customElement('bl-button')
export class BlButton extends LitElement {
  static styles = css`
    :host {
      --primary-color: var(--button-color, ${unsafeCSS(primaryColor)});
      --button-text-color: var(--text-color, #fafafa);
      --font-size-small: 14px;
      --font-size-normal: 16px;
    }

    button {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: center;
      border: solid 1px var(--primary-color);
      border-radius: 5px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sizeNormal {
      padding: 0.5rem 1.5rem;
      font-size: var(--font-size-normal);
    }
    .sizeSmall {
      padding: 0.3rem 1rem;
      font-size: var(--font-size-small);
    }

    .typePrimary {
      background-color: var(--primary-color);
      color: var(--button-text-color);
    }
    .typeOutline {
      background-color: transparent;
      color: var(--primary-color);
    }
    .typeClear {
      background-color: transparent;
      border-color: transparent;
      color: var(--primary-color);
    }
    .typeClear:hover {
      background-color: #3333330d;
    }

    .fluid {
      width: 100%;
    }
  `

  @property({ type: String })
  size: string = 'normal'

  @property({ type: String })
  type: string = 'primary'

  @property({ type: String })
  nativeType: string = 'button'

  @property({ type: Boolean })
  disabled: boolean = false

  @property({ type: Boolean })
  fluid: boolean = false

  render() {
    const classes = {
      sizeSmall: this.size === 'small',
      sizeNormal: this.size === 'normal',
      typePrimary: this.type === 'primary',
      typeOutline: this.type === 'outline',
      typeClear: this.type === 'clear',
      fluid: this.fluid,
    }

    return html`
      <button class=${classMap(classes)} type=${this.nativeType} ?disabled=${!!this.disabled}>
        <slot></slot>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bl-button': BlButton
  }
}
