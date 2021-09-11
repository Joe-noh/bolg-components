import { expect, fixture, html } from '@open-wc/testing'
import { BlTextInput } from './bl-text-input'
import '../../../'

describe('BlTextInput', () => {
  it('set given value', async () => {
    const el: BlTextInput = await fixture(html`<bl-text-input value="Hello" />`)

    expect(el.input.value).to.equal('Hello')
    expect(el.input.disabled).to.equal(false)
  })

  it('set given native-type as type', async () => {
    const el: BlTextInput = await fixture(html`<bl-text-input native-type="number" />`)

    expect(el.input.type).to.equal('number')
  })

  it('set given placeholder', async () => {
    const el: BlTextInput = await fixture(html`<bl-text-input placeholder="Hey" />`)

    expect(el.input.placeholder).to.equal('Hey')
  })

  it('disable input element', async () => {
    const el: BlTextInput = await fixture(html`<bl-text-input disabled />`)

    expect(el.input.disabled).to.equal(true)
  })
})
