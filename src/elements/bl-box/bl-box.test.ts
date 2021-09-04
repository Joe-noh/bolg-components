import { expect, fixture, html } from '@open-wc/testing'
import { BlBox } from './bl-box'
import '../../../'

describe('BlBox', () => {
  it('renders slot content', async () => {
    const el: BlBox = await fixture(html`<bl-box>Goodbye</bl-box>`)

    expect(el.textContent).to.equal('Goodbye')
  })
})
