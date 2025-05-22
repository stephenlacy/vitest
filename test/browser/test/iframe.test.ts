import { page } from '@vitest/browser/context'
import { beforeEach, expect, test } from 'vitest'

beforeEach(() => {
  // clear body
  document.body.replaceChildren()
})

test('can create and use a frame page from an iframe element', async () => {
  document.body.innerHTML = `
    <div>
      <iframe id="test-iframe" style="width: 300px; height: 300px;"></iframe>
    </div>
  `

  const iframe = document.getElementById('test-iframe') as HTMLIFrameElement
  const iframeDoc = iframe.contentDocument

  if (!iframeDoc) {
    throw new Error('Could not access iframe document')
  }

  iframeDoc.body.innerHTML = `
    <div>
      <button data-testid="iframe-button">Click me</button>
      <p>This is text inside the iframe</p>
    </div>
  `

  const framePage = page.createFramePage(iframe)

  const button = framePage.getByTestId('iframe-button')
  const text = framePage.getByText('This is text inside the iframe')

  const buttonEl = button.element()
  const textEl = text.element()

  expect(buttonEl).toBeDefined()
  expect(buttonEl.textContent?.trim()).toBe('Click me')
  expect(textEl).toBeDefined()
  expect(textEl.textContent?.trim()).toBe('This is text inside the iframe')

  const bodyText = framePage.getByText('inside the iframe').element()
  expect(bodyText).toBeDefined()
  expect(bodyText.textContent).toContain('inside the iframe')
})

test('can create a frame page from a locator', async () => {
  document.body.innerHTML = `
    <div>
      <iframe data-testid="test-iframe" style="width: 300px; height: 300px;"></iframe>
    </div>
  `

  const iframeLocator = page.getByTestId('test-iframe')
  const iframe = iframeLocator.element() as HTMLIFrameElement
  const iframeDoc = iframe.contentDocument

  if (!iframeDoc) {
    throw new Error('Could not access iframe document')
  }

  iframeDoc.body.innerHTML = `
    <div>
      <button>A button in iframe</button>
      <p>Text inside iframe from locator</p>
    </div>
  `

  const framePage = page.createFramePage(iframeLocator)

  const button = framePage.getByRole('button', { name: 'A button in iframe' })
  const text = framePage.getByText('Text inside iframe from locator')

  const buttonEl = button.element()
  const textEl = text.element()

  expect(buttonEl).toBeDefined()
  expect(buttonEl.textContent?.trim()).toBe('A button in iframe')
  expect(textEl).toBeDefined()
  expect(textEl.textContent?.trim()).toBe('Text inside iframe from locator')
})

test('throws error when trying to create a frame page from non-iframe element', () => {
  document.body.innerHTML = `
    <div id="not-an-iframe">
      <button>Not an iframe</button>
    </div>
  `

  const notIframe = document.getElementById('not-an-iframe')!

  expect(() => page.createFramePage(notIframe)).toThrow('Expected frameElement to be an iframe element')
})

test('can use locator methods within a frame page', async () => {
  document.body.innerHTML = `
    <div>
      <iframe id="test-iframe" style="width: 300px; height: 300px;"></iframe>
    </div>
  `

  const iframe = document.getElementById('test-iframe') as HTMLIFrameElement
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

  if (!iframeDoc) {
    throw new Error('Could not access iframe document')
  }

  iframeDoc.body.innerHTML = `
    <div>
      <label for="test-input">Input Label</label>
      <input id="test-input" placeholder="Test placeholder" />
      <img alt="Test image" src="" />
      <div title="Test title">Title element</div>
      <button role="button" aria-label="Special button">Button text</button>
    </div>
  `

  const framePage = page.createFramePage(iframe)

  const byLabel = framePage.getByLabelText('Input Label')
  const byPlaceholder = framePage.getByPlaceholder('Test placeholder')
  const byAlt = framePage.getByAltText('Test image')
  const byTitle = framePage.getByTitle('Test title')
  const byRole = framePage.getByRole('button', { name: 'Special button' })

  const labelEl = byLabel.element()
  const placeholderEl = byPlaceholder.element()
  const altEl = byAlt.element()
  const titleEl = byTitle.element()
  const roleEl = byRole.element()

  expect(labelEl).toBeDefined()
  expect(labelEl.getAttribute('id')).toBe('test-input')

  expect(placeholderEl).toBeDefined()
  expect(placeholderEl.getAttribute('placeholder')).toBe('Test placeholder')

  expect(altEl).toBeDefined()
  expect(altEl.getAttribute('alt')).toBe('Test image')

  expect(titleEl).toBeDefined()
  expect(titleEl.getAttribute('title')).toBe('Test title')

  expect(roleEl).toBeDefined()
  expect(roleEl.getAttribute('aria-label')).toBe('Special button')
})
