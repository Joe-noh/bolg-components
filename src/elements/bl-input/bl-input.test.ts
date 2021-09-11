import { expect, fixture, html } from '@open-wc/testing'
import { BlInput } from './bl-input'
import '../../../'

describe('BlInput', () => {
  it('set given value', async () => {
    const el: BlInput = await fixture(html`<bl-input value="Hello" />`)

    expect(el.input.value).to.equal('Hello')
    expect(el.input.disabled).to.equal(false)
  })

  it('set given native-type as type', async () => {
    const el: BlInput = await fixture(html`<bl-input native-type="number" />`)

    expect(el.input.type).to.equal('number')
  })

  it('set given placeholder', async () => {
    const el: BlInput = await fixture(html`<bl-input placeholder="Hey" />`)

    expect(el.input.placeholder).to.equal('Hey')
  })

  it('disable input element', async () => {
    const el: BlInput = await fixture(html`<bl-input disabled />`)

    expect(el.input.disabled).to.equal(true)
  })
})
