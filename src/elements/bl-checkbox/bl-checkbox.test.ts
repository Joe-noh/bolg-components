import { expect, fixture, html } from '@open-wc/testing'
import { BlCheckbox } from './bl-checkbox'
import '../../../'

describe('BlCheckbox', () => {
  it('renders slot content', async () => {
    const el = await fixture(html`<bl-checkbox>Hello</bl-checkbox>`)

    expect(el.textContent).to.equal('Hello')
  })

  it('toggled on when checked attribute is present', async () => {
    const el: BlCheckbox = await fixture(html`<bl-checkbox checked></bl-checkbox>`)

    expect(el.checked).to.equal(true)
  })

  it('toggles when clicked', async () => {
    const el: BlCheckbox = await fixture(html`<bl-checkbox></bl-checkbox>`)

    expect(el.checked).to.equal(false)

    el.click()
    expect(el.checked).to.equal(true)

    el.click()
    expect(el.checked).to.equal(false)
  })

  it('emits change event', (done) => {
    fixture(html`<bl-checkbox></bl-checkbox>`).then(el => {
      const checkbox = el as BlCheckbox

      checkbox.addEventListener('change', () => done())
      checkbox.click()
    })
  })
})
