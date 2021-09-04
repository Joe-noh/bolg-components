import { expect, fixture, html } from '@open-wc/testing'
import { BlButton } from './bl-button'
import '../../../'

describe('BlButton', () => {
  it('renders slot content', async () => {
    const el = await fixture(html`<bl-button>Hello</bl-button>`)

    expect(el.textContent).to.equal('Hello')
  })

  it('emits click event', (done) => {
    fixture(html`<bl-button></bl-button>`).then((el) => {
      const checkbox = el as BlButton

      checkbox.addEventListener('click', (e) => done())
      checkbox.click()
    })
  })
})
