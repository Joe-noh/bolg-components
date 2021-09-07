import { LitElement, html, css } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('bl-loader')
export class BlLoader extends LitElement {
  static styles = css`
    .loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #fafafa;
      opacity: 0.4;
      z-index: 2130000000;
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 30px;
      height: 30px;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `

  render() {
    return html`
      <div class="loader">
        <div class="spinner">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.9998 2C11.9921 2 9.07757 3.04285 6.75266 4.95086C4.42774 6.85887 2.83632 9.51399 2.24957 12.4638C1.66281 15.4136 2.11702 18.4756 3.5348 21.1281C4.95258 23.7806 7.24621 25.8594 10.0249 27.0104C12.8036 28.1614 15.8953 28.3132 18.7735 27.4402C21.6516 26.5671 24.1379 24.7231 25.8088 22.2224C27.4798 19.7216 28.2319 16.7189 27.9371 13.7258C27.6423 10.7326 26.3188 7.93431 24.1921 5.80761"
              stroke="#444"
              stroke-width="3"
            />
          </svg>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bl-loader': BlLoader
  }
}
